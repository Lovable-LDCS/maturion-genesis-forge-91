import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Dynamic CORS headers supporting both preview and prod origins
const getAllowedOrigins = () => [
  'https://3c69e685-8e54-4e6e-839f-825a37d4f745.lovableproject.com', // Preview
  'https://dmhlxhatogrrrvuruayv.supabase.co', // Prod
  'https://lovableproject.com', // Prod
  'https://*.lovableproject.com' // Prod wildcard
];

const getCorsHeaders = (origin: string | null) => {
  const allowedOrigins = getAllowedOrigins();
  let allowedOrigin = '*';
  
  // Check exact matches first
  if (origin && allowedOrigins.some(allowed => allowed === origin)) {
    allowedOrigin = origin;
  }
  // Check wildcard patterns
  else if (origin && allowedOrigins.some(allowed => {
    if (allowed.includes('*')) {
      const pattern = allowed.replace('*', '.*');
      return new RegExp(`^${pattern}$`).test(origin);
    }
    return false;
  })) {
    allowedOrigin = origin;
  }
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin'
  };
};

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204, 
      headers: corsHeaders 
    });
  }

  // Simple readiness check on GET
  if (req.method === 'GET') {
    return new Response(JSON.stringify({ ok: true, service: 'requeue-pending-document' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const clientInfo = req.headers.get('x-client-info') || 'maturion-ui';
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { documentId: bodyDocId, fileName } = await req.json();
    let documentId = bodyDocId as string | undefined;
    const requestId = crypto.randomUUID();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Service role client for privileged operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    // Authed client (propagates caller JWT) for user/context lookups
    const supabaseAuthed = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Validate caller
    const { data: userInfo, error: userError } = await supabaseAuthed.auth.getUser();
    if (userError || !userInfo?.user) {
      console.warn('[requeue] Unauthorized user:', userError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If only fileName provided, resolve to documentId within caller org
    if (!documentId && fileName) {
      const { data: orgCtx } = await supabaseAuthed.rpc('get_user_organization_context', {});
      const orgId = Array.isArray(orgCtx) && orgCtx[0]?.organization_id ? orgCtx[0].organization_id : null;
      if (!orgId) {
        return new Response(JSON.stringify({ error: 'Could not resolve caller organization' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: docLookup, error: docLookupErr } = await supabase
        .from('ai_documents')
        .select('*')
        .eq('file_name', fileName)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (docLookupErr) throw docLookupErr;
      if (!docLookup) {
        return new Response(JSON.stringify({ error: 'Document not found for fileName within organization' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      documentId = docLookup.id;
    }

    if (!documentId) {
      return new Response(JSON.stringify({ error: 'documentId or fileName is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
        updated_at: new Date().toISOString(),
        metadata: {
          // Stamp request for traceability
          last_requeue_request_id: requestId,
          last_requeue_time: new Date().toISOString(),
          ...(typeof userInfo?.user?.id === 'string' ? { last_requeue_user_id: userInfo.user.id } : {}),
        },
      })
      .eq('id', documentId)
      .select()
      .single();
    if (updateError) throw updateError;

    // Attempt to repair storage path to org/<orgId>/uploads/<file_name>
    let bucketsTried = ['documents', 'ai_documents'];
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
            contentType: updatedDoc.mime_type || 'application/octet-stream',
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

    const contentType = updatedDoc?.mime_type || 'application/octet-stream';

    // Trigger reprocessing with caller Authorization so verify_jwt passes
    const { error: processError } = await supabase.functions.invoke('process-ai-document', {
      headers: { Authorization: authHeader, 'x-client-info': clientInfo },
      body: {
        documentId: documentId,
        organizationId: updatedDoc.organization_id,
      },
    });
    if (processError) {
      console.warn('Processing trigger failed:', processError);
      // surface specific error
      return new Response(JSON.stringify({
        success: false,
        requestId,
        repaired,
        storagePath: finalPath,
        expectedPath,
        contentType,
        error: 'PROCESS_TRIGGER_FAILED',
        details: processError?.message || String(processError),
      }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      requestId,
      repaired,
      storagePath: finalPath,
      expectedPath,
      contentType,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error requeuing document:', error);
    const msg = error?.message || String(error);
    const isForbidden = msg?.includes('401') || msg?.includes('403');
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: isForbidden ? 403 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});