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

    const { documentId, organizationId, autoCleanAll } = await req.json();
    
    if (autoCleanAll && organizationId) {
      console.log(`Auto-cleaning all duplicates for organization: ${organizationId}`);
      return await cleanAllDuplicates(supabase, organizationId);
    }
    
    if (!documentId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Document ID is required for single document cleanup'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Cleaning up duplicate document: ${documentId}`);
    const result = await cleanupSingleDocument(supabase, documentId);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in cleanup function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function cleanAllDuplicates(supabase: any, organizationId: string) {
  try {
    // Find all documents grouped by title (ignoring case and extra spaces)
    const { data: documents, error: fetchError } = await supabase
      .from('ai_documents')
      .select('id, title, file_name, total_chunks, processing_status, created_at')
      .eq('organization_id', organizationId)
      .order('title', { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch documents: ${fetchError.message}`);
    }

    // Group documents by normalized title
    const groupedDocs = new Map();
    
    documents.forEach((doc: any) => {
      const normalizedTitle = (doc.title || doc.file_name || 'untitled')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
      
      if (!groupedDocs.has(normalizedTitle)) {
        groupedDocs.set(normalizedTitle, []);
      }
      groupedDocs.get(normalizedTitle).push(doc);
    });

    // Find duplicates and identify which ones to keep vs remove
    const duplicateSets = Array.from(groupedDocs.entries())
      .filter(([_, docs]) => docs.length > 1);

    console.log(`Found ${duplicateSets.length} sets of duplicate documents`);

    const cleanupResults = [];
    let totalCleaned = 0;

    for (const [title, docs] of duplicateSets) {
      // Sort by quality: completed status > higher chunk count > newer creation date
      docs.sort((a: any, b: any) => {
        // Prioritize completed documents
        if (a.processing_status === 'completed' && b.processing_status !== 'completed') return -1;
        if (b.processing_status === 'completed' && a.processing_status !== 'completed') return 1;
        
        // Then by chunk count (higher is better)
        if (a.total_chunks !== b.total_chunks) return (b.total_chunks || 0) - (a.total_chunks || 0);
        
        // Finally by creation date (newer is better)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      const keepDoc = docs[0]; // Keep the best quality document
      const removeList = docs.slice(1); // Remove all others

      console.log(`For "${title}": keeping ${keepDoc.id} (${keepDoc.total_chunks || 0} chunks), removing ${removeList.length} duplicates`);

      // Remove duplicates
      for (const duplicateDoc of removeList) {
        const result = await cleanupSingleDocument(supabase, duplicateDoc.id);
        if (result.success) {
          totalCleaned++;
        }
        cleanupResults.push({
          title: title,
          removedId: duplicateDoc.id,
          keptId: keepDoc.id,
          removedChunks: duplicateDoc.total_chunks || 0,
          keptChunks: keepDoc.total_chunks || 0,
          success: result.success
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Cleaned up ${totalCleaned} duplicate documents from ${duplicateSets.length} duplicate sets`,
      duplicateSets: duplicateSets.length,
      totalCleaned: totalCleaned,
      details: cleanupResults
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in auto-cleanup:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function cleanupSingleDocument(supabase: any, documentId: string) {
  try {
    // First delete all chunks for this document
    const { error: chunksError } = await supabase
      .from('ai_document_chunks')
      .delete()
      .eq('document_id', documentId);

    if (chunksError) {
      console.error('Error deleting chunks:', chunksError);
      return {
        success: false,
        error: `Failed to delete chunks: ${chunksError.message}`
      };
    }

    // Then delete the document
    const { error: docError } = await supabase
      .from('ai_documents')
      .delete()
      .eq('id', documentId);

    if (docError) {
      console.error('Error deleting document:', docError);
      return {
        success: false,
        error: `Failed to delete document: ${docError.message}`
      };
    }

    console.log(`Successfully cleaned up document: ${documentId}`);
    
    return {
      success: true,
      message: `Document ${documentId} and its chunks have been cleaned up`
    };

  } catch (error) {
    console.error('Error cleaning up document:', error);
    return {
      success: false,
      error: error.message
    };
  }
}