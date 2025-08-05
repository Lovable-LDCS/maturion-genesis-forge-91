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

  console.log('Secure admin request function called at:', new Date().toISOString())
  
  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    
    if (!authHeader) {
      console.error('Missing authorization header')
      return new Response(
        JSON.stringify({ 
          error: 'Authorization header missing'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract the token
    const token = authHeader.replace('Bearer ', '')

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      console.error('Missing environment variables')
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase clients
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false }
    })

    // Verify user authentication
    const { data: { user }, error: authError } = await userSupabase.auth.getUser(token)

    if (authError || !user) {
      console.error('Authentication failed:', authError)
      return new Response(
        JSON.stringify({ 
          error: 'Invalid authentication'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const requestData = await req.json()
    const { target_email, justification } = requestData

    if (!target_email || !justification) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: target_email and justification'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use secure database function to request admin access
    const { data: result, error: requestError } = await supabase
      .rpc('request_admin_access', {
        target_user_email: target_email,
        justification: justification
      })

    if (requestError) {
      console.error('Admin request failed:', requestError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to process admin request',
          details: requestError.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Admin request processed:', result)

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})