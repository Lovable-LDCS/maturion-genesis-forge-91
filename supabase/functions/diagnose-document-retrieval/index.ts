import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { organizationId, testQuery = "diamond security procedures" } = await req.json();

    console.log(`🔍 Diagnosing document retrieval for org: ${organizationId}`);

    // 1. Check total documents
    const { data: docs, error: docsError } = await supabase
      .from('ai_documents')
      .select('id, title, processing_status, context_level, total_chunks')
      .eq('organization_id', organizationId);

    // 2. Check chunks and embeddings
    const { data: chunkStats } = await supabase
      .rpc('regenerate_missing_embeddings_for_org', { org_id: organizationId });

    // 3. Test match_ai_chunks with a dummy embedding
    const dummyEmbedding = new Array(1536).fill(0.01); // Create proper 1536-dim vector
    const { data: matchResults, error: matchError } = await supabase
      .rpc('match_ai_chunks', {
        p_org_id: organizationId,
        p_query_embedding: `[${dummyEmbedding.join(',')}]`,
        p_match_count: 5,
        p_min_score: 0.1
      });

    // 4. Test search-ai-context function
    let searchResults = null;
    try {
      const searchResponse = await supabase.functions.invoke('search-ai-context', {
        body: {
          query: testQuery,
          organizationId: organizationId,
          limit: 5
        }
      });
      searchResults = searchResponse.data;
    } catch (searchError) {
      console.error('Search function error:', searchError);
    }

    // 5. Check chunks directly
    const { data: directChunks, error: chunksError } = await supabase
      .from('ai_document_chunks')
      .select(`
        id, content, embedding,
        ai_documents!inner(id, title, organization_id)
      `)
      .eq('ai_documents.organization_id', organizationId)
      .limit(5);

    const diagnosis = {
      organizationId,
      testQuery,
      documents: {
        total: docs?.length || 0,
        error: docsError?.message,
        sample: docs?.slice(0, 3)
      },
      embeddingStats: chunkStats,
      matchAiChunks: {
        error: matchError?.message,
        results: matchResults?.length || 0,
        sample: matchResults?.slice(0, 2)
      },
      searchFunction: {
        success: searchResults?.success,
        results: searchResults?.results?.length || 0,
        error: !searchResults?.success ? 'Function failed' : null
      },
      directChunks: {
        total: directChunks?.length || 0,
        withEmbeddings: directChunks?.filter(c => c.embedding !== null).length || 0,
        error: chunksError?.message
      },
      recommendations: []
    };

    // Generate recommendations
    if (chunkStats?.missing_embeddings > 0) {
      diagnosis.recommendations.push(`Regenerate ${chunkStats.missing_embeddings} missing embeddings`);
    }
    
    if (matchError) {
      diagnosis.recommendations.push(`Fix match_ai_chunks RPC error: ${matchError.message}`);
    }

    if (!searchResults?.success) {
      diagnosis.recommendations.push('Fix search-ai-context function');
    }

    if (diagnosis.recommendations.length === 0) {
      diagnosis.recommendations.push('System appears functional - check organization context in chat function');
    }

    return new Response(JSON.stringify(diagnosis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Diagnosis error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});