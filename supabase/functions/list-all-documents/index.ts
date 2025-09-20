import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace('Bearer ', '')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || !serviceKey || !anonKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Service role client for privileged reads
    const adminClient = createClient(supabaseUrl, serviceKey)
    // User client to validate token
    const userClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } })

    const { data: userData, error: authError } = await userClient.auth.getUser(token)
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userId = userData.user.id

    // Superuser check (service role bypasses RLS safely)
    const { data: suCheck, error: suError } = await adminClient
      .from('admin_users')
      .select('id')
      .eq('user_id', userId)
      .limit(1)

    const { data: boCheck, error: boError } = await adminClient
      .from('backoffice_admins')
      .select('id')
      .eq('user_id', userId)
      .limit(1)

    if (suError || boError) {
      console.error('Superuser check error', { suError, boError })
      return new Response(JSON.stringify({ error: 'Superuser check failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const isSuperuser = (suCheck && suCheck.length > 0) || (boCheck && boCheck.length > 0)

    if (!isSuperuser) {
      return new Response(JSON.stringify({ error: 'Forbidden: not superuser' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch ALL documents with service role
    const { data: documents, error: docsError } = await adminClient
      .from('ai_documents')
      .select('*')
      .order('created_at', { ascending: false })

    if (docsError) {
      console.error('Documents fetch error', docsError)
      return new Response(JSON.stringify({ error: 'Failed to fetch documents' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({ count: documents?.length || 0, documents }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.error('list-all-documents error', e)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
