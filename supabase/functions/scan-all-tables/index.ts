import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Create admin client for authentication check
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);
    const userSupabase = createClient(supabaseUrl, supabaseAnon);

    // Get and validate auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({
        error: 'Authorization header required'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: user, error: authError } = await userSupabase.auth.getUser(token);
    
    if (authError || !user.user) {
      return new Response(JSON.stringify({
        error: 'Invalid or expired token'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401
      });
    }

    // Check if user is admin using the secure function
    const { data: isAdmin, error: adminError } = await adminSupabase.rpc('is_user_admin', {
      user_uuid: user.user.id
    });

    if (adminError || !isAdmin) {
      // Log security violation
      await adminSupabase.from('audit_trail').insert({
        organization_id: '00000000-0000-0000-0000-000000000000',
        table_name: 'security_violations',
        record_id: user.user.id,
        action: 'UNAUTHORIZED_TABLE_SCAN_ATTEMPT',
        changed_by: user.user.id,
        change_reason: 'Non-admin user attempted to access scan-all-tables function'
      });
      
      return new Response(JSON.stringify({
        error: 'Admin privileges required for table scanning'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403
      });
    }

    const supabase = adminSupabase;

    const { organizationId } = await req.json();

    console.log(`🔍 Scanning all tables for org: ${organizationId}`);

    // Get all public tables
    const { data: tables, error: tablesError } = await supabase.rpc('list_public_tables');
    
    if (tablesError) {
      console.error('Tables error:', tablesError);
      return new Response(JSON.stringify({ 
        error: 'Failed to list tables',
        details: tablesError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📋 Found ${tables?.length || 0} tables to scan`);

    const tableAnalysis = [];
    const errors = [];

    // Test access to each table
    for (const tableRow of tables || []) {
      const tableName = tableRow.table_name;
      
      try {
        console.log(`🔍 Testing access to table: ${tableName}`);
        
        // Try to query the table with minimal data
        let query = supabase.from(tableName).select('*', { count: 'exact', head: true });
        
        // Add organization filter if applicable
        const commonOrgColumns = ['organization_id', 'org_id'];
        let hasOrgFilter = false;
        
        for (const orgCol of commonOrgColumns) {
          try {
            if (organizationId) {
              const testQuery = supabase.from(tableName).select('*').eq(orgCol, organizationId).limit(1);
              const { error: testError } = await testQuery;
              
              if (!testError) {
                query = query.eq(orgCol, organizationId);
                hasOrgFilter = true;
                break;
              }
            }
          } catch (e) {
            // Column doesn't exist, continue
          }
        }

        const { count, error: accessError } = await query;
        
        if (accessError) {
          console.error(`❌ Access denied to ${tableName}:`, accessError);
          errors.push({
            table: tableName,
            error: accessError.message,
            code: accessError.code
          });
        } else {
          console.log(`✅ Access granted to ${tableName}, count: ${count}`);
          
          // Get a sample of actual data for analysis
          const { data: sampleData, error: sampleError } = await supabase
            .from(tableName)
            .select('*')
            .limit(3);
            
          tableAnalysis.push({
            tableName,
            recordCount: count || 0,
            hasOrganizationFilter: hasOrgFilter,
            accessible: true,
            sampleData: sampleError ? null : sampleData,
            error: sampleError ? sampleError.message : null
          });
        }
      } catch (error) {
        console.error(`❌ Exception accessing ${tableName}:`, error);
        errors.push({
          table: tableName,
          error: error.message,
          type: 'exception'
        });
      }
    }

    // Generate summary
    const accessibleTables = tableAnalysis.filter(t => t.accessible);
    const tablesWithData = accessibleTables.filter(t => t.recordCount > 0);
    
    const summary = {
      totalTables: tables?.length || 0,
      accessibleTables: accessibleTables.length,
      tablesWithData: tablesWithData.length,
      tablesWithOrgFilter: accessibleTables.filter(t => t.hasOrganizationFilter).length,
      errorCount: errors.length,
      timestamp: new Date().toISOString(),
      organizationId
    };

    console.log(`📊 Scan complete: ${summary.accessibleTables}/${summary.totalTables} tables accessible`);

    return new Response(JSON.stringify({
      success: true,
      summary,
      accessibleTables: tableAnalysis,
      errors,
      recommendations: generateRecommendations(summary, errors)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in scan-all-tables function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateRecommendations(summary: any, errors: any[]) {
  const recommendations = [];
  
  if (errors.length > 0) {
    recommendations.push({
      type: 'access_issues',
      message: `${errors.length} tables have access issues. Review RLS policies and service role permissions.`,
      tables: errors.map(e => e.table)
    });
  }
  
  if (summary.tablesWithData === 0) {
    recommendations.push({
      type: 'no_data',
      message: 'No tables contain data for analysis. Consider importing or creating test data.',
      action: 'Add sample data to key tables for meaningful analysis'
    });
  }
  
  if (summary.tablesWithOrgFilter < summary.accessibleTables / 2) {
    recommendations.push({
      type: 'organization_filtering',
      message: 'Many tables lack organization-level filtering. This may expose data across organizations.',
      action: 'Review RLS policies to ensure proper data isolation'
    });
  }
  
  return recommendations;
}