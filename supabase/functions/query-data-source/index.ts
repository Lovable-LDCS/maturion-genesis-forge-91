import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QueryRequest {
  data_source_id: string;
  organization_id: string;
  query: string;
  query_type: 'sql' | 'search' | 'list' | 'get';
  parameters?: Record<string, any>;
  limit?: number;
  offset?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const queryRequest: QueryRequest = await req.json();
    const { data_source_id, organization_id, query, query_type, parameters = {}, limit = 100, offset = 0 } = queryRequest;

    console.log('Executing query:', { data_source_id, query_type, query });

    // Fetch data source configuration
    const { data: dataSource, error: fetchError } = await supabase
      .from('data_sources')
      .select('*')
      .eq('id', data_source_id)
      .eq('organization_id', organization_id)
      .single();

    if (fetchError || !dataSource) {
      throw new Error(`Data source not found: ${fetchError?.message}`);
    }

    if (!dataSource.is_active) {
      throw new Error('Data source is not active');
    }

    // Execute query based on data source type
    let queryResult;
    switch (dataSource.source_type) {
      case 'supabase':
        queryResult = await querySupabase(dataSource, queryRequest);
        break;
      case 'google_drive':
        queryResult = await queryGoogleDrive(dataSource, queryRequest);
        break;
      case 'sharepoint':
        queryResult = await querySharePoint(dataSource, queryRequest);
        break;
      case 'api':
        queryResult = await queryAPI(dataSource, queryRequest);
        break;
      default:
        throw new Error(`Unsupported data source type: ${dataSource.source_type}`);
    }

    // Log query execution
    await supabase
      .from('api_usage_log')
      .insert({
        organization_id,
        data_source_id,
        endpoint: `/query-data-source/${query_type}`,
        method: 'POST',
        request_payload: { query, parameters },
        response_status: queryResult.success ? 200 : 400,
        response_data: queryResult.success ? { row_count: queryResult.data?.length || 0 } : { error: queryResult.error },
        execution_time_ms: queryResult.execution_time_ms
      });

    return new Response(JSON.stringify({
      success: queryResult.success,
      data: queryResult.data,
      metadata: {
        data_source_id,
        query_type,
        execution_time_ms: queryResult.execution_time_ms,
        row_count: queryResult.data?.length || 0,
        has_more: queryResult.has_more || false
      },
      error: queryResult.error
    }), {
      status: queryResult.success ? 200 : 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Query execution error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function querySupabase(dataSource: any, queryRequest: QueryRequest) {
  const startTime = Date.now();
  
  try {
    const config = dataSource.connection_config;
    const credentials = await parseCredentials(dataSource.credentials_encrypted);

    const client = createClient(config.url, credentials.anon_key);

    let result;
    switch (queryRequest.query_type) {
      case 'sql':
        // For security, only allow SELECT queries
        if (!queryRequest.query.trim().toLowerCase().startsWith('select')) {
          throw new Error('Only SELECT queries are allowed');
        }
        result = await client.rpc('execute_sql', { 
          query: queryRequest.query,
          params: queryRequest.parameters 
        });
        break;
      
      case 'list':
        // List tables or data from a specific table
        const tableName = queryRequest.parameters?.table || queryRequest.query;
        let selectQuery = client.from(tableName).select('*');
        
        if (queryRequest.limit) {
          selectQuery = selectQuery.limit(queryRequest.limit);
        }
        if (queryRequest.offset) {
          selectQuery = selectQuery.range(queryRequest.offset, queryRequest.offset + queryRequest.limit - 1);
        }
        
        result = await selectQuery;
        break;

      case 'search':
        // Full-text search across specified columns
        const searchTable = queryRequest.parameters?.table;
        const searchColumn = queryRequest.parameters?.column || 'content';
        const searchQuery = queryRequest.query;
        
        result = await client
          .from(searchTable)
          .select('*')
          .textSearch(searchColumn, searchQuery)
          .limit(queryRequest.limit);
        break;

      case 'get':
        // Get specific record by ID
        const getTable = queryRequest.parameters?.table;
        const recordId = queryRequest.parameters?.id || queryRequest.query;
        
        result = await client
          .from(getTable)
          .select('*')
          .eq('id', recordId)
          .single();
        break;

      default:
        throw new Error(`Unsupported query type: ${queryRequest.query_type}`);
    }

    return {
      success: !result.error,
      data: result.data,
      execution_time_ms: Date.now() - startTime,
      error: result.error?.message
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      execution_time_ms: Date.now() - startTime
    };
  }
}

async function queryGoogleDrive(dataSource: any, queryRequest: QueryRequest) {
  const startTime = Date.now();
  
  try {
    const credentials = await parseCredentials(dataSource.credentials_encrypted);

    let url = 'https://www.googleapis.com/drive/v3/files';
    const params = new URLSearchParams();

    switch (queryRequest.query_type) {
      case 'list':
        params.append('fields', 'files(id,name,mimeType,modifiedTime,size)');
        if (queryRequest.limit) {
          params.append('pageSize', queryRequest.limit.toString());
        }
        break;

      case 'search':
        params.append('q', `name contains '${queryRequest.query}'`);
        params.append('fields', 'files(id,name,mimeType,modifiedTime,size)');
        break;

      case 'get':
        url = `https://www.googleapis.com/drive/v3/files/${queryRequest.query}`;
        params.append('fields', 'id,name,mimeType,modifiedTime,size,parents');
        break;

      default:
        throw new Error(`Unsupported query type for Google Drive: ${queryRequest.query_type}`);
    }

    const response = await fetch(`${url}?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${credentials.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Google Drive API error: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      success: true,
      data: queryRequest.query_type === 'get' ? data : data.files,
      execution_time_ms: Date.now() - startTime,
      has_more: data.nextPageToken ? true : false
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      execution_time_ms: Date.now() - startTime
    };
  }
}

async function querySharePoint(dataSource: any, queryRequest: QueryRequest) {
  const startTime = Date.now();
  
  try {
    const credentials = await parseCredentials(dataSource.credentials_encrypted);
    const siteId = queryRequest.parameters?.site_id || 'root';

    let url = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root/children`;
    
    switch (queryRequest.query_type) {
      case 'list':
        // Default URL is correct for listing files
        break;

      case 'search':
        url = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root/search(q='${queryRequest.query}')`;
        break;

      case 'get':
        url = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${queryRequest.query}`;
        break;

      default:
        throw new Error(`Unsupported query type for SharePoint: ${queryRequest.query_type}`);
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${credentials.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`SharePoint API error: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      success: true,
      data: queryRequest.query_type === 'get' ? data : data.value,
      execution_time_ms: Date.now() - startTime,
      has_more: data['@odata.nextLink'] ? true : false
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      execution_time_ms: Date.now() - startTime
    };
  }
}

async function queryAPI(dataSource: any, queryRequest: QueryRequest) {
  const startTime = Date.now();
  
  try {
    const config = dataSource.connection_config;
    const credentials = await parseCredentials(dataSource.credentials_encrypted);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (credentials.api_key) {
      headers['Authorization'] = `Bearer ${credentials.api_key}`;
    }

    let url = config.api_endpoint;
    let method = 'GET';
    let body = null;

    // Append query parameters or modify URL based on query type
    switch (queryRequest.query_type) {
      case 'search':
        url += `?q=${encodeURIComponent(queryRequest.query)}`;
        break;
      case 'get':
        url += `/${queryRequest.query}`;
        break;
      case 'list':
        if (queryRequest.limit) {
          url += `?limit=${queryRequest.limit}`;
        }
        break;
    }

    const response = await fetch(url, {
      method,
      headers,
      body
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return {
      success: true,
      data,
      execution_time_ms: Date.now() - startTime
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      execution_time_ms: Date.now() - startTime
    };
  }
}

async function parseCredentials(encryptedCredentials: string | null): Promise<Record<string, string>> {
  if (!encryptedCredentials) return {};
  
  try {
    // Production encryption handling
    if (encryptedCredentials.startsWith('encrypted:v1:')) {
      const decryptResponse = await supabase.functions.invoke('encrypt-credentials', {
        body: { action: 'decrypt', data: encryptedCredentials }
      });
      
      if (decryptResponse.error) {
        console.error('Credential decryption failed:', decryptResponse.error);
        throw new Error('Failed to decrypt credentials');
      }
      
      return decryptResponse.data.decrypted;
    }
    
    // Legacy fallback - for backwards compatibility during migration
    if (encryptedCredentials.startsWith('encrypted:')) {
      const mockDecrypted = encryptedCredentials.replace('encrypted:', '');
      return JSON.parse(mockDecrypted);
    }
    
    // Unencrypted JSON (legacy)
    return JSON.parse(encryptedCredentials);
  } catch (error) {
    console.error('Credential parsing error:', error);
    return { api_key: encryptedCredentials };
  }
}