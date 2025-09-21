import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Starting database access check...')

    // Test 1: Check connection with simple query
    const startTime = Date.now()
    const { data: tablesData, error: tablesError } = await supabase.rpc('list_public_tables')
    const queryTime = Date.now() - startTime

    if (tablesError) {
      console.error('Database access error:', tablesError)
      return new Response(JSON.stringify({
        success: false,
        error: `Database connection failed: ${tablesError.message}`,
        queryTime,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      })
    }

    const tableCount = tablesData?.length || 0
    const tableNames = tablesData?.map((t: any) => t.table_name) || []

    console.log(`Database access successful: ${tableCount} tables found`)

    // Test 2: Check specific key tables for Maturion functionality
    const keyTables = [
      'organizations',
      'ai_documents', 
      'ai_document_chunks',
      'criteria',
      'assessments',
      'maturity_practice_statements'
    ]
    
    const foundKeyTables = keyTables.filter(table => tableNames.includes(table))
    const missingKeyTables = keyTables.filter(table => !tableNames.includes(table))

    // Test 3: Get basic counts from key tables
    const tableCounts: Record<string, number> = {}
    for (const table of foundKeyTables.slice(0, 5)) { // Limit to first 5 to avoid timeouts
      try {
        const { count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
        tableCounts[table] = count || 0
      } catch (error) {
        console.warn(`Could not count ${table}:`, error)
        tableCounts[table] = -1 // Indicate error
      }
    }

    return new Response(JSON.stringify({
      success: true,
      connection: {
        status: 'connected',
        queryTime,
        timestamp: new Date().toISOString()
      },
      database: {
        totalTables: tableCount,
        tableNames: tableNames.sort(),
        keyTables: {
          found: foundKeyTables,
          missing: missingKeyTables,
          counts: tableCounts
        }
      },
      message: `Successfully connected to Supabase database. Found ${tableCount} tables including key Maturion tables: ${foundKeyTables.join(', ')}.`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Database access check failed:', error)
    return new Response(JSON.stringify({
      success: false,
      error: `Database access check failed: ${error.message}`,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})