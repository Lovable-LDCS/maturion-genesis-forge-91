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
    const { documentId } = await req.json();
    const requestId = crypto.randomUUID();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[requeue] requestId=${requestId} documentId=${documentId}`);

    // Reset document status to pending and clear any existing chunks
    const { error: deleteError } = await supabase
      .from('ai_document_chunks')
      .delete()
      .eq('document_id', documentId);

    if (deleteError) {
      console.warn('Could not delete existing chunks:', deleteError);
    }

    // Update document status
    const { data: updatedDoc, error: updateError } = await supabase
      .from('ai_documents')
      .update({
        processing_status: 'pending',
        processed_at: null,
        total_chunks: 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Stamp requestId into document metadata for traceability
    const { error: metaError } = await supabase
      .from('ai_documents')
      .update({
        metadata: {
          ...(updatedDoc?.metadata || {}),
          last_requeue_request_id: requestId,
          last_requeue_time: new Date().toISOString()
        }
      })
      .eq('id', documentId);
    if (metaError) {
      console.warn('Could not update document metadata with requestId:', metaError);
    }

    // Trigger reprocessing
    const { error: processError } = await supabase.functions.invoke('process-ai-document', {
      body: { 
        documentId: documentId,
        organizationId: updatedDoc.organization_id
      }
    });

    if (processError) {
      console.warn('Processing trigger failed:', processError);
      // Don't fail the request, just log the warning
    }

    return new Response(JSON.stringify({ 
      success: true, 
      requestId,
      document: updatedDoc,
      storagePath: updatedDoc?.file_path || null,
      bucketsTried: ['documents','ai_documents'],
      message: 'Document requeued for processing'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error requeuing document:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});