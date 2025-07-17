import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchRequest {
  query: string;
  organizationId: string;
  documentTypes?: string[];
  limit?: number;
  threshold?: number;
}

interface SearchResult {
  chunk_id: string;
  document_id: string;
  document_name: string;
  document_type: string;
  content: string;
  similarity: number;
  metadata: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { 
      query, 
      organizationId, 
      documentTypes = [], 
      limit = 10, 
      threshold = 0.7 
    }: SearchRequest = await req.json();

    console.log(`Searching for: "${query}" in organization: ${organizationId}`);

    // Generate embedding for the search query
    const queryEmbedding = await generateEmbedding(query, openaiApiKey);
    console.log('Generated query embedding');

    // Build the SQL query for semantic search
    let searchQuery = supabase
      .from('ai_document_chunks')
      .select(`
        id,
        document_id,
        content,
        metadata,
        ai_documents!inner(file_name, document_type)
      `)
      .eq('organization_id', organizationId);

    // Filter by document types if specified
    if (documentTypes.length > 0) {
      searchQuery = searchQuery.in('ai_documents.document_type', documentTypes);
    }

    // For now, we'll do a simple text search since vector similarity search 
    // requires custom SQL with the vector extension
    searchQuery = searchQuery
      .textSearch('content', query, { type: 'websearch' })
      .limit(limit);

    const { data: chunks, error: searchError } = await searchQuery;

    if (searchError) {
      console.error('Search error:', searchError);
      throw new Error('Failed to search documents');
    }

    console.log(`Found ${chunks?.length || 0} matching chunks`);

    // For each chunk, calculate similarity using OpenAI embeddings
    const results: SearchResult[] = [];
    
    if (chunks) {
      for (const chunk of chunks) {
        try {
          // Generate embedding for this chunk's content
          const chunkEmbedding = await generateEmbedding(chunk.content, openaiApiKey);
          
          // Calculate cosine similarity
          const similarity = cosineSimilarity(queryEmbedding, chunkEmbedding);
          
          // Only include results above threshold
          if (similarity >= threshold) {
            results.push({
              chunk_id: chunk.id,
              document_id: chunk.document_id,
              document_name: chunk.ai_documents.file_name,
              document_type: chunk.ai_documents.document_type,
              content: chunk.content,
              similarity: similarity,
              metadata: chunk.metadata
            });
          }
        } catch (embeddingError) {
          console.error('Error processing chunk embedding:', embeddingError);
          // Continue with other chunks
        }
      }
    }

    // Sort by similarity (highest first)
    results.sort((a, b) => b.similarity - a.similarity);

    // Create access audit log
    await supabase
      .from('ai_upload_audit')
      .insert({
        organization_id: organizationId,
        action: 'access',
        user_id: 'system', // This is a system search
        metadata: {
          query: query,
          results_count: results.length,
          document_types: documentTypes,
          search_timestamp: new Date().toISOString()
        }
      });

    console.log(`Returning ${results.length} relevant results`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        results: results,
        query: query,
        total_results: results.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error searching AI context:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error occurred',
        results: []
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: text,
      model: 'text-embedding-3-small'
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('OpenAI API error:', errorData);
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}