import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

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
    console.log('=== Corrupted Chunk Deletion Started ===');

    const { documentId, organizationId, mpsNumber } = await req.json();

    if (!documentId || !organizationId) {
      throw new Error('Missing required parameters: documentId and organizationId');
    }

    // Initialize Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log(`🗑️ Deleting corrupted chunks for document: ${documentId}`);
    console.log(`📊 Organization: ${organizationId}, MPS: ${mpsNumber}`);

    // Step 1: Identify corrupted chunks first for logging
    const { data: existingChunks, error: fetchError } = await supabase
      .from('ai_document_chunks')
      .select('id, content')
      .eq('document_id', documentId)
      .eq('organization_id', organizationId);

    if (fetchError) {
      console.error('Failed to fetch existing chunks:', fetchError);
      throw new Error(`Failed to fetch chunks: ${fetchError.message}`);
    }

    console.log(`📋 Found ${existingChunks?.length || 0} chunks to analyze for corruption`);

    // Analyze chunks for corruption
    const corruptedChunkIds: string[] = [];
    const cleanChunkIds: string[] = [];

    existingChunks?.forEach(chunk => {
      const content = chunk.content || '';
      
      // Apply same corruption detection logic as frontend
      const isCorrupted = 
        content.length < 10 ||
        content.includes('_rels/') || 
        content.includes('customXml/') || 
        content.includes('word/_rels') ||
        content.includes('.xml.rels') || 
        content.includes('tomXml/') ||
        ((content.match(/[\x00-\x08\x0E-\x1F\x7F-\xFF]/g) || []).length / content.length > 0.3) ||
        ((content.match(/\?/g) || []).length / content.length > 0.2 && content.includes('\\\\\\\\'));

      if (isCorrupted) {
        corruptedChunkIds.push(chunk.id);
        console.log(`🚨 Identified corrupted chunk: ${chunk.id} (${content.length} chars)`);
      } else {
        cleanChunkIds.push(chunk.id);
      }
    });

    console.log(`📊 Analysis: ${corruptedChunkIds.length} corrupted, ${cleanChunkIds.length} clean chunks`);

    // Step 2: Delete corrupted chunks only (preserve any clean ones)
    if (corruptedChunkIds.length > 0) {
      const { error: deleteError } = await supabase
        .from('ai_document_chunks')
        .delete()
        .in('id', corruptedChunkIds);

      if (deleteError) {
        console.error('Failed to delete corrupted chunks:', deleteError);
        throw new Error(`Failed to delete chunks: ${deleteError.message}`);
      }

      console.log(`✅ Successfully deleted ${corruptedChunkIds.length} corrupted chunks`);
    } else {
      console.log(`ℹ️ No corrupted chunks found to delete`);
    }

    // Step 3: Reset document processing status if all chunks were corrupted
    if (cleanChunkIds.length === 0) {
      const { error: resetError } = await supabase
        .from('ai_documents')
        .update({
          processing_status: 'pending',
          processed_at: null,
          total_chunks: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId);

      if (resetError) {
        console.error('Failed to reset document status:', resetError);
        // Don't throw error - chunk deletion was successful
      } else {
        console.log(`✅ Reset document processing status for clean reprocessing`);
      }
    }

    // Step 4: Log audit trail
    try {
      await supabase
        .from('audit_trail')
        .insert({
          organization_id: organizationId,
          table_name: 'ai_document_chunks',
          record_id: documentId,
          action: 'CORRUPTION_CLEANUP',
          changed_by: '00000000-0000-0000-0000-000000000000', // System user
          change_reason: `Deleted ${corruptedChunkIds.length} corrupted chunks for MPS ${mpsNumber} corruption recovery`
        });
    } catch (auditError) {
      console.error('Failed to log audit trail:', auditError);
      // Don't fail the operation for audit logging issues
    }

    console.log('=== Corrupted Chunk Deletion Completed Successfully ===');

    return new Response(JSON.stringify({
      success: true,
      deletedChunks: corruptedChunkIds.length,
      remainingChunks: cleanChunkIds.length,
      documentReset: cleanChunkIds.length === 0,
      message: `Successfully deleted ${corruptedChunkIds.length} corrupted chunks`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in delete-corrupted-chunks function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});