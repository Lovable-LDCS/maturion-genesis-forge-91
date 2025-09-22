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

    const { organizationId, dryRun = true } = await req.json();
    
    if (!organizationId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Organization ID is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`${dryRun ? 'Analyzing' : 'Cleaning up'} legacy documents for organization: ${organizationId}`);
    
    // Find potentially legacy documents
    const { data: documents, error: fetchError } = await supabase
      .from('ai_documents')
      .select('id, title, file_name, processing_status, total_chunks, created_at, file_path, metadata, source')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch documents: ${fetchError.message}`);
    }

    // Identify legacy/orphaned documents - ONLY documents with 0 chunks
    const legacyDocuments = documents.filter((doc: any) => {
      // CRITICAL: Only consider documents with 0 chunks as legacy
      if (doc.total_chunks > 0) {
        return false; // Skip any document that has been chunked - these are current documents
      }
      
      const isStuckPending = doc.processing_status === 'pending' && 
                           new Date(doc.created_at) < new Date(Date.now() - 2 * 60 * 60 * 1000); // older than 2 hours
      
      const isFailedProcessing = doc.processing_status === 'failed';
      
      const hasLegacyMetadata = doc.metadata && (
        doc.metadata.legacy_upload === true ||
        doc.metadata.upload_version < 2
      );
      
      const hasLegacyFilePath = doc.file_path && (
        doc.file_path.includes('temp/') ||
        doc.file_path.includes('legacy/')
      );
      
      // Only flag as legacy if it has 0 chunks AND meets other criteria
      return isStuckPending || isFailedProcessing || hasLegacyMetadata || hasLegacyFilePath;
    });

    console.log(`Found ${legacyDocuments.length} potentially legacy documents`);

    const cleanupResults = [];
    let totalCleaned = 0;

    if (!dryRun && legacyDocuments.length > 0) {
      // Actually remove the legacy documents
      for (const doc of legacyDocuments) {
        try {
          // Delete chunks first
          const { error: chunksError } = await supabase
            .from('ai_document_chunks')
            .delete()
            .eq('document_id', doc.id);

          if (chunksError) {
            console.error(`Error deleting chunks for ${doc.id}:`, chunksError);
            cleanupResults.push({
              id: doc.id,
              title: doc.title || doc.file_name,
              reason: 'Failed to delete chunks',
              success: false
            });
            continue;
          }

          // Delete document
          const { error: docError } = await supabase
            .from('ai_documents')
            .delete()
            .eq('id', doc.id);

          if (docError) {
            console.error(`Error deleting document ${doc.id}:`, docError);
            cleanupResults.push({
              id: doc.id,
              title: doc.title || doc.file_name,
              reason: 'Failed to delete document',
              success: false
            });
            continue;
          }

          totalCleaned++;
          cleanupResults.push({
            id: doc.id,
            title: doc.title || doc.file_name,
            reason: getCleanupReason(doc),
            success: true
          });

          console.log(`Successfully cleaned up legacy document: ${doc.id}`);
        } catch (error) {
          console.error(`Error cleaning up document ${doc.id}:`, error);
          cleanupResults.push({
            id: doc.id,
            title: doc.title || doc.file_name,
            reason: `Error: ${error.message}`,
            success: false
          });
        }
      }
    } else {
      // Dry run - just analyze
      for (const doc of legacyDocuments) {
        cleanupResults.push({
          id: doc.id,
          title: doc.title || doc.file_name,
          reason: getCleanupReason(doc),
          wouldDelete: true,
          created: doc.created_at,
          status: doc.processing_status,
          chunks: doc.total_chunks
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      dryRun: dryRun,
      message: dryRun 
        ? `Found ${legacyDocuments.length} legacy documents that would be cleaned up`
        : `Successfully cleaned up ${totalCleaned} legacy documents`,
      totalFound: legacyDocuments.length,
      totalCleaned: dryRun ? 0 : totalCleaned,
      details: cleanupResults
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in legacy cleanup function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function getCleanupReason(doc: any): string {
  const reasons = [];
  
  // Always mention 0 chunks as primary indicator
  reasons.push('0 chunks (never processed)');
  
  if (doc.processing_status === 'pending') {
    const hoursSincePending = Math.floor((Date.now() - new Date(doc.created_at).getTime()) / (60 * 60 * 1000));
    if (hoursSincePending > 2) {
      reasons.push(`Stuck in pending for ${Math.floor(hoursSincePending / 24)} days`);
    }
  }
  
  if (doc.processing_status === 'failed') {
    reasons.push('Failed processing');
  }
  
  if (doc.metadata?.legacy_upload) {
    reasons.push('Marked as legacy upload');
  }
  
  if (doc.metadata?.upload_version < 2) {
    reasons.push('Old upload version');
  }
  
  if (doc.file_path?.includes('temp/') || doc.file_path?.includes('legacy/')) {
    reasons.push('Legacy file path');
  }
  
  return reasons.join(', ');
}