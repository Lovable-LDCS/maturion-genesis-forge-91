import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { documentId } = await req.json();
    
    if (!documentId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Document ID is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Cleaning up duplicate document: ${documentId}`);

    // First delete all chunks for this document
    const { error: chunksError } = await supabase
      .from('ai_document_chunks')
      .delete()
      .eq('document_id', documentId);

    if (chunksError) {
      console.error('Error deleting chunks:', chunksError);
      return new Response(JSON.stringify({
        success: false,
        error: `Failed to delete chunks: ${chunksError.message}`
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Then delete the document
    const { error: docError } = await supabase
      .from('ai_documents')
      .delete()
      .eq('id', documentId);

    if (docError) {
      console.error('Error deleting document:', docError);
      return new Response(JSON.stringify({
        success: false,
        error: `Failed to delete document: ${docError.message}`
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Successfully cleaned up document: ${documentId}`);
    
    return new Response(JSON.stringify({
      success: true,
      message: `Document ${documentId} and its chunks have been cleaned up`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error cleaning up duplicate document:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});