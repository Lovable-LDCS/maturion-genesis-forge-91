import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });

    console.log('🔧 Fixing pending organization uploads...');

    // Step 1: Normalize MIME types for markdown and text files
    const { data: mimeFixData, error: mimeError } = await supabase
      .from('ai_documents')
      .update({ 
        mime_type: 'text/markdown',
        updated_at: new Date().toISOString()
      })
      .or('mime_type.is.null,mime_type.eq.')
      .ilike('file_name', '%.md');

    if (mimeError) {
      console.warn('MIME type fix warning:', mimeError);
    } else {
      console.log('✅ Fixed MIME types for .md files');
    }

    // Step 2: Reset stuck documents to pending for reprocessing
    const { data: resetData, error: resetError } = await supabase
      .from('ai_documents')
      .update({
        processing_status: 'pending',
        processed_at: null,
        total_chunks: 0,
        updated_at: new Date().toISOString()
      })
      .or('processing_status.eq.processing,processing_status.eq.failed')
      .or(
        'file_name.ilike.%organization%profile%,file_name.ilike.%organization_profile%,file_name.ilike.%.md,file_name.ilike.%.txt'
      )
      .lt('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()); // 5 minutes ago

    console.log('Reset result:', resetData);

    // Step 3: Find and reprocess pending organization documents
    const { data: pendingDocs, error: pendingError } = await supabase
      .from('ai_documents')
      .select('id, file_name, processing_status, organization_id')
      .eq('processing_status', 'pending')
      .or(
        'file_name.ilike.%organization%profile%,file_name.ilike.%organization_profile%,file_name.ilike.%.md'
      );

    if (pendingError) {
      throw new Error(`Failed to fetch pending documents: ${pendingError.message}`);
    }

    const reprocessResults = [];
    
    // Process each pending document
    for (const doc of pendingDocs || []) {
      console.log(`Processing document: ${doc.file_name} (${doc.id})`);
      
      try {
        const { data: processResult, error: processError } = await supabase.functions.invoke('process-ai-document', {
          body: { 
            documentId: doc.id,
            organizationId: doc.organization_id,
            forceReprocess: true 
          }
        });
        
        if (processError) {
          console.error(`Processing failed for ${doc.file_name}:`, processError);
          reprocessResults.push({
            docId: doc.id,
            fileName: doc.file_name,
            success: false,
            error: processError.message
          });
        } else {
          console.log(`✅ Successfully processed ${doc.file_name}`);
          reprocessResults.push({
            docId: doc.id,
            fileName: doc.file_name,
            success: true,
            result: processResult
          });
        }
      } catch (error: any) {
        console.error(`Exception processing ${doc.file_name}:`, error);
        reprocessResults.push({
          docId: doc.id,
          fileName: doc.file_name,
          success: false,
          error: error.message
        });
      }

      // Small delay between processing to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Pending upload fix completed',
      documentsProcessed: pendingDocs?.length || 0,
      reprocessResults
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Fix pending uploads error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});