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
    const { orgId } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check crawl status by looking at recent documents and chunks
    const { data: domains, error: domainError } = await supabase
      .from('org_domains')
      .select('*')
      .eq('organization_id', orgId)
      .eq('is_enabled', true);

    if (domainError) throw domainError;

    // Check for recent crawl activity via ai_documents first
    const { data: recentDocs, error: docsError } = await supabase
      .from('ai_documents')
      .select('id, processing_status, created_at, total_chunks')
      .eq('organization_id', orgId)
      .eq('document_type', 'web_crawl')
      .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString()) // Last 10 minutes
      .order('created_at', { ascending: false });

    if (docsError) throw docsError;

    // Count chunks from web crawl documents
    const { data: chunks, error: chunksError } = await supabase
      .from('ai_document_chunks')
      .select('id')
      .in('document_id', recentDocs?.map(d => d.id) || []);

    if (chunksError) throw chunksError;

    // Determine status
    let status = {
      state: 'idle' as 'idle' | 'running' | 'success' | 'failed',
      domains: domains?.length || 0,
      pages: recentDocs?.length || 0,
      chunks: chunks?.length || 0,
      message: ''
    };

    if (recentDocs && recentDocs.length > 0) {
      const hasProcessing = recentDocs.some(d => d.processing_status === 'processing');
      const hasFailed = recentDocs.some(d => d.processing_status === 'failed');
      const allCompleted = recentDocs.every(d => d.processing_status === 'completed');

      if (hasProcessing) {
        status.state = 'running';
        status.message = 'Processing web content...';
      } else if (allCompleted && status.chunks > 0) {
        status.state = 'success';
        status.message = `Successfully crawled ${status.domains} domains`;
      } else if (hasFailed) {
        status.state = 'failed';
        status.message = 'Some pages failed to process';
      }
    }

    // Fallback: infer from org_pages/org_page_chunks if no ai_documents yet
    if (status.state === 'idle' || (status.state !== 'success' && status.chunks === 0)) {
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data: pages } = await supabase
        .from('org_pages')
        .select('id')
        .eq('org_id', orgId)
        .gte('fetched_at', tenMinAgo);
      const pageIds = (pages || []).map(p => p.id);
      const { data: pageChunks } = await supabase
        .from('org_page_chunks')
        .select('id')
        .in('page_id', pageIds);

      status.pages = pages?.length || 0;
      status.chunks = pageChunks?.length || 0;
      if (status.pages > 0 && status.chunks > 0) {
        status.state = 'success';
        status.message = `Successfully crawled ${status.domains} domains`;
      }
    }

    return new Response(JSON.stringify(status), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error checking crawl status:', error);
    return new Response(JSON.stringify({ 
      state: 'failed', 
      message: error.message,
      domains: 0,
      pages: 0,
      chunks: 0
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});