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
    console.log('🔧 GOVERNANCE FIX: Starting governance document status fix');
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });

    // Find governance documents that have chunks but are still pending
    const { data: documents, error: docError } = await supabase
      .from('ai_documents')
      .select('id, title, processing_status, total_chunks')
      .eq('document_type', 'governance_reasoning_manifest')
      .eq('processing_status', 'pending');

    if (docError) {
      throw new Error(`Failed to fetch documents: ${docError.message}`);
    }

    console.log(`🔧 Found ${documents?.length || 0} pending governance documents`);

    const results = [];
    for (const doc of documents || []) {
      console.log(`🔧 Processing document: ${doc.title} (${doc.id})`);
      
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

      if (actualChunkCount > 0) {
        // Update document status to completed
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
          results.push({ id: doc.id, title: doc.title, success: false, error: updateError.message });
        } else {
          console.log(`✅ Updated document ${doc.id} to completed with ${actualChunkCount} chunks`);
          results.push({ id: doc.id, title: doc.title, success: true, chunks: actualChunkCount });
        }
      } else {
        console.log(`⚠️ Document ${doc.id} has no chunks, keeping as pending`);
        results.push({ id: doc.id, title: doc.title, success: false, error: 'No chunks found' });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Governance document status fix completed',
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