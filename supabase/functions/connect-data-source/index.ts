import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConnectionRequest {
  data_source_id: string;
  organization_id: string;
  connection_test?: boolean;
}

interface SupabaseConfig {
  url: string;
  anon_key: string;
  service_role_key?: string;
}

interface GoogleDriveConfig {
  client_id: string;
  client_secret: string;
  refresh_token: string;
  access_token?: string;
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

    const { data_source_id, organization_id, connection_test = false }: ConnectionRequest = await req.json();

    console.log('Connecting to data source:', { data_source_id, organization_id, connection_test });

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

    // Handle different data source types
    let connectionResult;
    switch (dataSource.source_type) {
      case 'supabase':
        connectionResult = await connectSupabase(dataSource, connection_test);
        break;
      case 'google_drive':
        connectionResult = await connectGoogleDrive(dataSource, connection_test);
        break;
      case 'sharepoint':
        connectionResult = await connectSharePoint(dataSource, connection_test);
        break;
      case 'api':
        connectionResult = await connectAPI(dataSource, connection_test);
        break;
      default:
        throw new Error(`Unsupported data source type: ${dataSource.source_type}`);
    }

    // Update connection status if this is not just a test
    if (!connection_test) {
      await supabase
        .from('data_sources')
        .update({
          connection_status: connectionResult.success ? 'connected' : 'failed',
          last_connection_at: new Date().toISOString(),
          connection_error_message: connectionResult.success ? null : connectionResult.error,
          updated_at: new Date().toISOString()
        })
        .eq('id', data_source_id);
    }

    return new Response(JSON.stringify({
      success: connectionResult.success,
      data_source_id,
      connection_type: 'live',
      capabilities: connectionResult.capabilities,
      connection_info: connectionResult.connection_info,
      error: connectionResult.error
    }), {
      status: connectionResult.success ? 200 : 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Connection error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function connectSupabase(dataSource: any, testOnly = false) {
  try {
    const config = dataSource.connection_config as SupabaseConfig;
    const credentials = await parseCredentials(dataSource.credentials_encrypted);

    if (!config.url || !credentials.anon_key) {
      throw new Error('Missing Supabase URL or anon key');
    }

    // Create Supabase client for testing
    const client = createClient(config.url, credentials.anon_key);
    
    // Test connection by fetching auth info
    const { data, error } = await client.auth.getSession();
    
    if (error && !error.message.includes('session_not_found')) {
      throw error;
    }

    return {
      success: true,
      capabilities: ['query', 'realtime', 'auth', 'storage'],
      connection_info: {
        url: config.url,
        authenticated: !!data?.session,
        database_available: true,
        realtime_available: true
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function connectGoogleDrive(dataSource: any, testOnly = false) {
  try {
    const config = dataSource.connection_config as GoogleDriveConfig;
    const credentials = await parseCredentials(dataSource.credentials_encrypted);

    if (!credentials.access_token && !credentials.refresh_token) {
      throw new Error('Missing Google Drive authentication tokens');
    }

    // Test connection by fetching user info
    const response = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
      headers: {
        'Authorization': `Bearer ${credentials.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Google Drive API error: ${response.statusText}`);
    }

    const userInfo = await response.json();

    return {
      success: true,
      capabilities: ['list_files', 'read_files', 'search'],
      connection_info: {
        user_email: userInfo.user?.emailAddress,
        authenticated: true,
        api_available: true
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function connectSharePoint(dataSource: any, testOnly = false) {
  try {
    const config = dataSource.connection_config;
    const credentials = await parseCredentials(dataSource.credentials_encrypted);

    if (!credentials.access_token) {
      throw new Error('Missing SharePoint access token');
    }

    // Test connection by fetching site info
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${credentials.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`SharePoint API error: ${response.statusText}`);
    }

    const userInfo = await response.json();

    return {
      success: true,
      capabilities: ['list_files', 'read_files', 'search', 'metadata'],
      connection_info: {
        user_principal_name: userInfo.userPrincipalName,
        authenticated: true,
        api_available: true
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function connectAPI(dataSource: any, testOnly = false) {
  try {
    const config = dataSource.connection_config;
    const credentials = await parseCredentials(dataSource.credentials_encrypted);

    if (!config.api_endpoint) {
      throw new Error('Missing API endpoint URL');
    }

    // Test connection with a simple GET request
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (credentials.api_key) {
      headers['Authorization'] = `Bearer ${credentials.api_key}`;
    }

    const response = await fetch(config.api_endpoint, {
      method: 'GET',
      headers
    });

    return {
      success: response.ok,
      capabilities: ['query', 'read'],
      connection_info: {
        endpoint: config.api_endpoint,
        status_code: response.status,
        authenticated: !!credentials.api_key,
        api_available: response.ok
      },
      error: response.ok ? undefined : `API returned ${response.status}: ${response.statusText}`
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
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
    
    // Legacy fallback
    if (encryptedCredentials.startsWith('encrypted:')) {
      const mockDecrypted = encryptedCredentials.replace('encrypted:', '');
      return JSON.parse(mockDecrypted);
    }
    
    return JSON.parse(encryptedCredentials);
  } catch (error) {
    console.error('Credential parsing error:', error);
    return { api_key: encryptedCredentials };
  }
}