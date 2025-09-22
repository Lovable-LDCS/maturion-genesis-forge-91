import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { organizationId, dryRun = true, changeReason = "Change organisation" } = await req.json()
    console.log(`Starting bulk context update - organizationId: ${organizationId}, dryRun: ${dryRun}`)

    // Get current user for audit logging
    const authHeader = req.headers.get('Authorization')
    let currentUserId = null
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user } } = await supabaseClient.auth.getUser(token)
      currentUserId = user?.id
    }

    if (!currentUserId) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build query for documents to update
    let query = supabaseClient
      .from('ai_documents')
      .select('id, title, context_level, organization_id')
      .neq('context_level', 'global') // Only get documents that aren't already global
      .is('deleted_at', null) // Exclude soft-deleted documents

    // If organizationId is specified, filter by it
    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    const { data: documents, error: fetchError } = await query

    if (fetchError) {
      console.error('Error fetching documents:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch documents', details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${documents?.length || 0} documents to update`)

    const report = {
      totalDocuments: documents?.length || 0,
      updatedDocuments: 0,
      errors: [] as any[],
      auditEntries: 0,
      dryRun,
      scope: organizationId ? `Organization: ${organizationId}` : 'All organizations',
      timestamp: new Date().toISOString()
    }

    if (!documents || documents.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No documents found requiring context update',
          report 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!dryRun) {
      // Perform actual updates
      for (const doc of documents) {
        try {
          console.log(`Updating document ${doc.id} (${doc.title}) from ${doc.context_level} to global`)

          // Update the document context
          const { error: updateError } = await supabaseClient
            .from('ai_documents')
            .update({ 
              context_level: 'global',
              updated_at: new Date().toISOString(),
              updated_by: currentUserId
            })
            .eq('id', doc.id)

          if (updateError) {
            console.error(`Error updating document ${doc.id}:`, updateError)
            report.errors.push({
              documentId: doc.id,
              title: doc.title,
              error: updateError.message
            })
            continue
          }

          // Log the change in audit trail
          const { error: auditError } = await supabaseClient
            .from('audit_trail')
            .insert({
              organization_id: doc.organization_id,
              table_name: 'ai_documents',
              record_id: doc.id,
              action: 'UPDATE',
              field_name: 'context_level',
              old_value: doc.context_level,
              new_value: 'global',
              changed_by: currentUserId,
              change_reason: changeReason
            })

          if (auditError) {
            console.error(`Error creating audit trail for document ${doc.id}:`, auditError)
            report.errors.push({
              documentId: doc.id,
              title: doc.title,
              error: `Audit trail error: ${auditError.message}`
            })
            continue
          }

          report.updatedDocuments++
          report.auditEntries++

        } catch (error) {
          console.error(`Unexpected error processing document ${doc.id}:`, error)
          report.errors.push({
            documentId: doc.id,
            title: doc.title,
            error: error.message
          })
        }
      }
    } else {
      // Dry run - just simulate the updates
      report.updatedDocuments = documents.length
      console.log(`Dry run complete - would update ${documents.length} documents`)
    }

    console.log('Bulk context update completed:', report)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Context update ${dryRun ? 'preview' : 'completed'}`,
        report 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Bulk context update error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})