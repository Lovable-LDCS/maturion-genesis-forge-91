import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔧 DOCUMENT FIX: Starting document reprocessing for all types');
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });

    // Find all AI documents that need reprocessing:
    // 1. Documents with status = 'pending' or 'failed'
    // 2. Documents marked 'completed' but with actual_chunks = 0 (false positives)
    const { data: documents, error: docError } = await supabase
      .from('ai_documents')
      .select('id, title, processing_status, total_chunks, document_type')
      .or('processing_status.eq.pending,processing_status.eq.failed');

    if (docError) {
      throw new Error(`Failed to fetch documents: ${docError.message}`);
    }

    // Also get all completed documents to check for false positives (completed but 0 chunks)
    const { data: completedDocs, error: completedError } = await supabase
      .from('ai_documents')
      .select('id, title, processing_status, total_chunks, document_type')
      .eq('processing_status', 'completed');

    const allDocuments = [...(documents || []), ...(completedDocs || [])];
    console.log(`🔧 Found ${documents?.length || 0} pending/failed and ${completedDocs?.length || 0} completed AI documents`);

    const results = [];
    for (const doc of allDocuments) {
      console.log(`🔧 Processing document: ${doc.title} (${doc.id}) - Type: ${doc.document_type} - Status: ${doc.processing_status}`);
      
      // Count actual chunks in database
      const { data: chunks, error: chunkError } = await supabase
        .from('ai_document_chunks')
        .select('id')
        .eq('document_id', doc.id);

      if (chunkError) {
        console.error(`❌ Failed to count chunks for ${doc.id}:`, chunkError);
        continue;
      }

      const actualChunkCount = chunks?.length || 0;
      console.log(`🔧 Document ${doc.id} has ${actualChunkCount} chunks in database`);

      // If document has 0 chunks, reset it for reprocessing regardless of current status
      if (actualChunkCount === 0) {
        console.log(`🔄 Resetting document ${doc.id} to pending (false positive: marked ${doc.processing_status} but has 0 chunks)`);
        
        const { error: resetError } = await supabase
          .from('ai_documents')
          .update({
            processing_status: 'pending',
            processed_at: null,
            total_chunks: 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', doc.id);

        if (resetError) {
          console.error(`❌ Failed to reset document ${doc.id}:`, resetError);
          results.push({ id: doc.id, title: doc.title, success: false, error: resetError.message, action: 'reset_failed' });
        } else {
          console.log(`✅ Reset document ${doc.id} to pending for reprocessing`);
          results.push({ id: doc.id, title: doc.title, success: true, action: 'reset_for_reprocessing', reason: 'Missing chunks' });
        }
      } else if (actualChunkCount > 0 && doc.processing_status !== 'completed') {
        // Update document status to completed if it has chunks but wrong status
        const { error: updateError } = await supabase
          .from('ai_documents')
          .update({
            processing_status: 'completed',
            processed_at: new Date().toISOString(),
            total_chunks: actualChunkCount,
            updated_at: new Date().toISOString()
          })
          .eq('id', doc.id);

        if (updateError) {
          console.error(`❌ Failed to update document ${doc.id}:`, updateError);
          results.push({ id: doc.id, title: doc.title, success: false, error: updateError.message, action: 'update_failed' });
        } else {
          console.log(`✅ Updated document ${doc.id} to completed with ${actualChunkCount} chunks`);
          results.push({ id: doc.id, title: doc.title, success: true, chunks: actualChunkCount, action: 'status_corrected' });
        }
      } else {
        console.log(`✅ Document ${doc.id} is already correctly marked as completed with ${actualChunkCount} chunks`);
        results.push({ id: doc.id, title: doc.title, success: true, chunks: actualChunkCount, action: 'no_change_needed' });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Document reprocessing fix completed for all types',
      results: results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Governance fix error:', error.message);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});