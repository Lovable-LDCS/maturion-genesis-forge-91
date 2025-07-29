import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('Grant admin access function called at:', new Date().toISOString())
  
  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    console.log('Authorization header present:', !!authHeader)
    console.log('Authorization header preview:', authHeader ? authHeader.substring(0, 20) + '...' : 'none')
    
    if (!authHeader) {
      console.error('Missing authorization header')
      return new Response(
        JSON.stringify({ 
          error: 'Authorization header missing',
          debug: 'No Authorization header found in request'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract the token
    const token = authHeader.replace('Bearer ', '')
    console.log('Token extracted, length:', token.length)

    // Initialize Supabase client with environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    
    console.log('Environment check:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      hasAnonKey: !!supabaseAnonKey
    })
    
    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      console.error('Missing environment variables')
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error',
          debug: 'Missing required environment variables'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase clients
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false }
    })

    console.log('Supabase clients created successfully')

    // Verify user authentication
    console.log('Attempting to verify user with token...')
    const { data: { user }, error: authError } = await userSupabase.auth.getUser(token)

    console.log('Auth result:', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      authError: authError ? authError.message : 'none'
    })

    if (authError || !user) {
      console.error('Authentication failed:', authError)
      return new Response(
        JSON.stringify({ 
          error: 'Invalid authentication', 
          details: authError?.message || 'User not found',
          debug: {
            authError: authError,
            tokenLength: token.length,
            tokenPreview: token.substring(0, 20) + '...'
          }
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User authenticated successfully:', user.id, user.email)

    // Check if user is already an admin
    console.log('Checking if user is already an admin...')
    const { data: existingAdmin, error: checkError } = await supabase
      .from('admin_users')
      .select('id, role')
      .eq('user_id', user.id)
      .single()

    console.log('Admin check result:', {
      existingAdmin: !!existingAdmin,
      checkError: checkError ? checkError.message : 'none'
    })

    if (existingAdmin) {
      console.log('User is already an admin')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'User already has admin access',
          user_id: user.id,
          email: user.email,
          debug: 'User already exists in admin_users table'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Grant admin access
    console.log('Attempting to insert user into admin_users table...')
    const insertData = {
      user_id: user.id,
      role: 'admin',
      email: user.email,
      granted_by: user.id
    }
    console.log('Insert data:', insertData)

    const { data: adminData, error: insertError } = await supabase
      .from('admin_users')
      .insert(insertData)
      .select()
      .single()

    console.log('Insert result:', {
      success: !!adminData,
      insertError: insertError ? insertError.message : 'none',
      insertErrorCode: insertError?.code,
      insertErrorDetails: insertError?.details
    })

    if (insertError) {
      console.error('Insert failed:', insertError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to grant admin access', 
          details: insertError.message,
          code: insertError.code,
          debug: {
            insertError,
            attemptedData: insertData
          }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Admin access granted successfully:', adminData)

    // Log the action in audit trail
    console.log('Logging to audit trail...')
    const { error: auditError } = await supabase
      .from('audit_trail')
      .insert({
        organization_id: '00000000-0000-0000-0000-000000000000',
        table_name: 'admin_users',
        record_id: user.id,
        action: 'ADMIN_GRANTED_VIA_FUNCTION',
        changed_by: user.id,
        change_reason: 'Superuser granted admin access via edge function'
      })

    if (auditError) {
      console.error('Audit log error:', auditError)
    } else {
      console.log('Audit trail logged successfully')
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Admin access granted successfully',
        user_id: user.id,
        email: user.email,
        debug: 'Successfully inserted into admin_users and logged to audit_trail'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message,
        debug: {
          errorStack: error.stack,
          errorName: error.name
        }
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})