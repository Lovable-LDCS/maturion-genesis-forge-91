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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { organizationId } = await req.json();

    console.log('🔧 Triggering document reprocess for organization:', organizationId);

    // Get failed/stuck documents
    const { data: documents, error: docError } = await supabase
      .from('ai_documents')
      .select('id, file_name, processing_status')
      .eq('organization_id', organizationId)
      .in('processing_status', ['failed', 'processing', 'pending']);

    if (docError) {
      throw new Error(`Failed to get documents: ${docError.message}`);
    }

    console.log(`📄 Found ${documents?.length || 0} documents to reprocess`);

    const results = [];
    
    for (const doc of documents || []) {
      console.log(`🔄 Reprocessing document: ${doc.file_name} (${doc.id})`);
      
      // Reset document status
      const { error: resetError } = await supabase
        .from('ai_documents')
        .update({
          processing_status: 'pending',
          updated_at: new Date().toISOString(),
          metadata: {
            ...doc.metadata,
            reprocessing_triggered: true,
            reprocessing_timestamp: new Date().toISOString()
          }
        })
        .eq('id', doc.id);

      if (resetError) {
        console.error(`❌ Failed to reset ${doc.id}:`, resetError);
        results.push({
          documentId: doc.id,
          fileName: doc.file_name,
          success: false,
          error: resetError.message
        });
        continue;
      }

      // Trigger processing
      try {
        const { error: processError } = await supabase.functions.invoke('process-ai-document', {
          body: {
            documentId: doc.id,
            organizationId,
            forceReprocess: true
          }
        });

        if (processError) {
          throw processError;
        }

        results.push({
          documentId: doc.id,
          fileName: doc.file_name,
          success: true
        });
        
        console.log(`✅ Successfully triggered reprocessing for: ${doc.file_name}`);
      } catch (processError) {
        console.error(`❌ Failed to trigger processing for ${doc.id}:`, processError);
        results.push({
          documentId: doc.id,
          fileName: doc.file_name,
          success: false,
          error: processError.message
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Triggered reprocessing for ${results.filter(r => r.success).length} documents`,
      results,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in trigger-document-reprocess:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});