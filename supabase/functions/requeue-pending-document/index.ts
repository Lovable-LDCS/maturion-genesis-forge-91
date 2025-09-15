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
    const { documentId } = await req.json();
    const requestId = crypto.randomUUID();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[requeue] requestId=${requestId} documentId=${documentId}`);

    // Reset document status to pending and clear any existing chunks
    const { error: deleteError } = await supabase
      .from('ai_document_chunks')
      .delete()
      .eq('document_id', documentId);

    if (deleteError) {
      console.warn('Could not delete existing chunks:', deleteError);
    }

    // Update document status and prepare for path repair
    const { data: updatedDoc, error: updateError } = await supabase
      .from('ai_documents')
      .update({
        processing_status: 'pending',
        processed_at: null,
        total_chunks: 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Attempt to repair storage path to org/<orgId>/uploads/<file_name>
    let bucketsTried = ['documents','ai_documents'];
    let finalPath = updatedDoc?.file_path || null;
    const expectedPath = `org/${updatedDoc.organization_id}/uploads/${updatedDoc.file_name}`;
    let repaired = false;

    try {
      if (updatedDoc?.file_path !== expectedPath && updatedDoc?.file_name) {
        console.log(`[requeue] Repairing path. current=${updatedDoc.file_path} expected=${expectedPath}`);
        const candidates = [
          { bucket: 'documents', path: updatedDoc.file_path },
          { bucket: 'ai_documents', path: updatedDoc.file_path },
        ];
        let sourceBucket: string | null = null;
        let blob: Blob | null = null;

        for (const c of candidates) {
          const { data: dl, error: dlErr } = await supabase.storage.from(c.bucket).download(c.path);
          if (!dlErr && dl) {
            sourceBucket = c.bucket;
            blob = dl;
            console.log(`[requeue] Found source file in bucket=${sourceBucket}`);
            break;
          } else {
            console.warn(`[requeue] Not found in ${c.bucket}:`, dlErr?.message);
          }
        }

        if (blob) {
          // Upload to canonical location in 'documents'
          const { error: upErr } = await supabase.storage.from('documents').upload(expectedPath, blob, {
            upsert: true,
            contentType: updatedDoc.mime_type || 'application/octet-stream'
          });
          if (upErr) {
            console.error('[requeue] Upload to expectedPath failed:', upErr.message);
          } else {
            // Optionally delete old object
            if (sourceBucket) {
              const { error: rmErr } = await supabase.storage.from(sourceBucket).remove([updatedDoc.file_path]);
              if (rmErr) console.warn('[requeue] Could not remove old object:', rmErr.message);
            }

            // Update DB path
            const { data: patchedDoc, error: patchErr } = await supabase
              .from('ai_documents')
              .update({ file_path: expectedPath, updated_at: new Date().toISOString() })
              .eq('id', documentId)
              .select()
              .maybeSingle();

            if (patchErr) {
              console.warn('[requeue] Could not update file_path to expectedPath:', patchErr.message);
            } else {
              finalPath = expectedPath;
              repaired = true;
              console.log(`[requeue] Path repaired to ${finalPath}`);
            }
          }
        } else {
          console.warn('[requeue] Source file not found in any bucket; proceeding with existing path');
        }
      }
    } catch (repairErr) {
      console.warn('[requeue] Path repair error (non-fatal):', repairErr);
    }

    // Stamp requestId into document metadata for traceability
    const { error: metaError } = await supabase
      .from('ai_documents')
      .update({
        metadata: {
          ...(updatedDoc?.metadata || {}),
          last_requeue_request_id: requestId,
          last_requeue_time: new Date().toISOString(),
          path_repaired: repaired,
          expected_path: expectedPath,
        }
      })
      .eq('id', documentId);
    if (metaError) {
      console.warn('Could not update document metadata with requestId:', metaError);
    }

    // Trigger reprocessing
    const { error: processError } = await supabase.functions.invoke('process-ai-document', {
      body: { 
        documentId: documentId,
        organizationId: updatedDoc.organization_id
      }
    });

    if (processError) {
      console.warn('Processing trigger failed:', processError);
      // Don't fail the request, just log the warning
    }

    return new Response(JSON.stringify({ 
      success: true, 
      requestId,
      document: updatedDoc,
      storagePath: finalPath,
      expectedPath,
      repaired,
      bucketsTried,
      message: 'Document requeued for processing'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error requeuing document:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});