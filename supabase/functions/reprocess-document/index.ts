import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReprocessRequest {
  documentId: string;
  organizationId: string;
  forceReprocess?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { documentId, organizationId, forceReprocess = false }: ReprocessRequest = await req.json();

    if (!documentId || !organizationId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Document ID and Organization ID are required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Reprocessing document ${documentId} for organization ${organizationId}, force: ${forceReprocess}`);

    // Get the document details
    const { data: document, error: docError } = await supabase
      .from('ai_documents')
      .select('*')
      .eq('id', documentId)
      .eq('organization_id', organizationId)
      .single();

    if (docError || !document) {
      console.error('Document not found:', docError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Document not found or access denied' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Update document status to pending
    const { error: updateError } = await supabase
      .from('ai_documents')
      .update({
        processing_status: 'pending',
        processed_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId);

    if (updateError) {
      console.error('Error updating document status:', updateError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to update document status' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Delete existing chunks if force reprocessing
    if (forceReprocess) {
      console.log(`Force reprocessing: deleting existing chunks for document ${documentId}`);
      
      const { error: deleteChunksError } = await supabase
        .from('ai_document_chunks')
        .delete()
        .eq('document_id', documentId);

      if (deleteChunksError) {
        console.error('Error deleting existing chunks:', deleteChunksError);
      } else {
        console.log('Successfully deleted existing chunks');
      }
    }

    // Trigger document processing
    const { data: processResult, error: processError } = await supabase.functions.invoke('process-ai-document', {
      body: {
        documentId: documentId,
        forceReprocess: forceReprocess
      }
    });

    if (processError) {
      console.error('Error triggering document processing:', processError);

      // Try to extract detailed error from downstream function
      let downstream: any = null;
      try {
        const res: Response | undefined = (processError as any).context;
        if (res) {
          const ct = res.headers.get('content-type') || '';
          downstream = ct.includes('application/json') ? await res.json() : await res.text();
        }
      } catch (e) {
        // ignore parsing issues
      }
      const detailMsg = typeof downstream === 'string' ? downstream : downstream?.error || downstream?.message || processError.message;
      const status = (processError as any)?.context?.status || 500;
      
      // Revert status back to error
      await supabase
        .from('ai_documents')
        .update({
          processing_status: 'error',
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId);

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to trigger document processing',
          details: detailMsg,
          status
        }),
        {
          status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Log audit trail
    await supabase
      .from('audit_trail')
      .insert({
        organization_id: organizationId,
        table_name: 'ai_documents',
        record_id: documentId,
        action: forceReprocess ? 'force_reprocess' : 'reprocess',
        changed_by: '00000000-0000-0000-0000-000000000001', // System user
        change_reason: `Document reprocessing triggered ${forceReprocess ? 'with force flag' : 'for retry'}`
      });

    console.log(`Successfully triggered reprocessing for document ${documentId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Document reprocessing triggered successfully',
        documentId: documentId,
        forceReprocess: forceReprocess
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error in reprocess-document function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error occurred'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});