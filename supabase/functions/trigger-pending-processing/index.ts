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

    const { organizationId } = await req.json();
    console.log('Processing pending documents for organization:', organizationId);

    // Get all pending documents with 0 chunks
    const { data: pendingDocs, error: fetchError } = await supabase
      .from('ai_documents')
      .select('id, file_name, processing_status, total_chunks')
      .eq('organization_id', organizationId)
      .eq('processing_status', 'pending')
      .eq('total_chunks', 0);

    if (fetchError) {
      throw new Error(`Failed to fetch pending documents: ${fetchError.message}`);
    }

    if (!pendingDocs || pendingDocs.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No pending documents found',
        processed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Found ${pendingDocs.length} pending documents to process`);
    const results = [];

    // Process each pending document
    for (const doc of pendingDocs) {
      console.log(`Processing document: ${doc.file_name} (${doc.id})`);
      
      try {
        // Trigger processing via the existing function
        const { error: processError } = await supabase.functions.invoke('process-ai-document', {
          body: { 
            documentId: doc.id,
            forceReprocess: true 
          }
        });

        if (processError) {
          console.error(`Failed to process ${doc.file_name}:`, processError);
          results.push({
            documentId: doc.id,
            fileName: doc.file_name,
            success: false,
            error: processError.message
          });
        } else {
          console.log(`Successfully triggered processing for ${doc.file_name}`);
          results.push({
            documentId: doc.id,
            fileName: doc.file_name,
            success: true
          });
        }
      } catch (error) {
        console.error(`Exception processing ${doc.file_name}:`, error);
        results.push({
          documentId: doc.id,
          fileName: doc.file_name,
          success: false,
          error: error.message
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Triggered processing for ${pendingDocs.length} pending documents`,
      totalFound: pendingDocs.length,
      results: results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error triggering pending document processing:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});