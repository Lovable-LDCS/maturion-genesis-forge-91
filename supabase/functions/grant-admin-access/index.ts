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

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('Missing authorization header')
      return new Response(
        JSON.stringify({ error: 'Authorization header missing' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract the token
    const token = authHeader.replace('Bearer ', '')
    console.log('Token received, length:', token.length)

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Create a separate client with the user's token to verify authentication
    const userSupabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      auth: {
        persistSession: false
      }
    })

    // Set the user's session
    const { data: { user }, error: authError } = await userSupabase.auth.getUser(token)

    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ 
          error: 'Invalid authentication', 
          details: authError?.message || 'User not found' 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User authenticated:', user.id, user.email)

    // Check if user is already an admin
    const { data: existingAdmin } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (existingAdmin) {
      console.log('User is already an admin')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'User already has admin access',
          user_id: user.id,
          email: user.email
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Grant admin access to the authenticated user using service role
    const { data: insertData, error: insertError } = await supabase
      .from('admin_users')
      .insert({
        user_id: user.id,
        role: 'admin',
        email: user.email,
        granted_by: user.id
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to grant admin access', 
          details: insertError.message,
          code: insertError.code 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Admin access granted successfully:', insertData)

    // Log the action in audit trail
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
      // Don't fail the request for audit log errors
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Admin access granted successfully',
        user_id: user.id,
        email: user.email
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})