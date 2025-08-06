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
  mpsNumber?: number;
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

    const body = await req.json();
    const { 
      query, 
      organization_id,
      organizationId, 
      documentTypes = [], 
      limit = 10, 
      threshold = 0.7,
      mpsNumber
    }: SearchRequest & { organization_id?: string } = body;

    // Handle both organizationId and organization_id parameter names
    const orgId = organization_id || organizationId;
    
    if (!orgId) {
      console.error('No organization ID provided in request:', body);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Organization ID is required',
          results: []
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Searching for: "${query}" in organization: ${orgId}${mpsNumber ? ` (MPS ${mpsNumber} specific)` : ''}`);

    // Generate embedding for the search query
    const queryEmbedding = await generateEmbedding(query, openaiApiKey);
    console.log('Generated query embedding');

    // First, get all chunks with their stored embeddings for semantic search
    console.log('Fetching chunks with embeddings for semantic search');
    
    let baseQuery = supabase
      .from('ai_document_chunks')
      .select(`
        id,
        content,
        chunk_index,
        embedding,
        ai_documents!inner(
          id,
          title,
          organization_id,
          document_type
        )
      `)
      .eq('ai_documents.organization_id', orgId)
      .not('embedding', 'is', null); // Only get chunks with embeddings

    // Filter by document types if specified
    if (documentTypes.length > 0) {
      console.log('Filtering by document types:', documentTypes);
      // Map document type aliases for better compatibility
      const typeMapping: Record<string, string> = {
        'mps': 'mps_document',
        'standard': 'mps_document',
        'governance': 'governance_reasoning_manifest',
        'ai_logic': 'ai_logic_rule_global',
        'system': 'system_instruction'
      };
      const mappedTypes = documentTypes.map(type => typeMapping[type] || type);
      console.log('Mapped document types:', mappedTypes);
      baseQuery = baseQuery.in('ai_documents.document_type', mappedTypes);
    }

    // Get all relevant chunks for semantic comparison - REMOVED ARBITRARY LIMIT
    const { data: chunks, error: fetchError } = await baseQuery.limit(10000); // Allow access to all processed chunks

    if (fetchError) {
      console.error('Error fetching chunks:', fetchError);
      throw new Error(`Failed to fetch document chunks: ${fetchError.message}`);
    }

    console.log(`Found ${chunks?.length || 0} chunks with embeddings for organization ${orgId}`);
    
    // If no chunks found in the specified organization, check if this user has access to other organizations
    if (!chunks || chunks.length === 0) {
      console.log('No chunks found in specified organization, checking for user organizations...');
      
      // Get all organizations this user has access to - but we need a user_id, not org_id
      // Skip this fallback for now since we don't have user context
      console.log('Skipping user organization fallback - no user context available');
    }
    
    // If no chunks with embeddings, fall back to text search
    if (!chunks || chunks.length === 0) {
      console.log('No chunks with embeddings found, falling back to enhanced text search...');
      
      // Enhanced text search with better organization targeting
      const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
      console.log('Using search terms:', searchTerms);
      
      if (searchTerms.length > 0) {
        console.log('Attempting comprehensive text search on ai_document_chunks...');
        
        // Build comprehensive text search query
        let textQuery = supabase
          .from('ai_document_chunks')
          .select(`
            id,
            content,
            chunk_index,
            ai_documents!inner(
              id,
              title,
              organization_id,
              document_type
            )
          `)
          .eq('ai_documents.organization_id', orgId);

        // Apply document type filters if specified
        if (documentTypes.length > 0) {
          const typeMapping: Record<string, string> = {
            'mps': 'mps_document',
            'standard': 'mps_document'
          };
          const mappedTypes = documentTypes.map(type => typeMapping[type] || type);
          console.log('Filtering by document types:', mappedTypes);
          textQuery = textQuery.in('ai_documents.document_type', mappedTypes);
        }

        // Enhanced search strategy - try multiple approaches
        const searchStrategies = [
          // 1. Direct title/filename match
          query.toLowerCase(),
          // 2. Key terms from query
          searchTerms.join(' '),
          // 3. Individual significant terms
          ...searchTerms.filter(term => term.length > 3)
        ];

        let allTextResults: any[] = [];

        for (const searchTerm of searchStrategies.slice(0, 3)) {
          try {
            console.log(`🔍 Text search strategy: "${searchTerm}"`);
            
            const { data: textChunks, error: textError } = await textQuery
              .or(`content.ilike.%${searchTerm}%,ai_documents.title.ilike.%${searchTerm}%`)
              .limit(20);
            
            if (!textError && textChunks && textChunks.length > 0) {
              console.log(`✅ Found ${textChunks.length} results for "${searchTerm}"`);
              allTextResults.push(...textChunks);
            } else {
              console.log(`⚠️ No results for query: "${searchTerm}"`);
            }
          } catch (error) {
            console.error(`Error in text search for "${searchTerm}":`, error);
          }
        }

        // Deduplicate and score results
        const uniqueTextResults = Array.from(
          new Map(allTextResults.map(chunk => [chunk.id, chunk])).values()
        );

        if (uniqueTextResults.length > 0) {
          console.log(`📊 Total unique text search results: ${uniqueTextResults.length}`);
          
          const textResults = uniqueTextResults.map(chunk => {
            // Calculate relevance score based on content matching
            let relevanceScore = 0.5; // Base score for text search
            
            const content = chunk.content.toLowerCase();
            const title = chunk.ai_documents?.title?.toLowerCase() || '';
            
            // Boost score for title matches
            if (title.includes(query.toLowerCase())) {
              relevanceScore += 0.3;
            }
            
            // Boost score for multiple term matches
            const termMatches = searchTerms.filter(term => content.includes(term)).length;
            relevanceScore += (termMatches / searchTerms.length) * 0.2;
            
            // MPS-specific boost
            if (mpsNumber) {
              const mpsMatch = content.includes(`mps ${mpsNumber}`) || 
                             content.includes(`mps${mpsNumber}`) ||
                             title.includes(`mps ${mpsNumber}`);
              if (mpsMatch) relevanceScore += 0.3;
            }

            return {
              chunk_id: chunk.id,
              document_id: chunk.ai_documents?.id || '',
              document_name: chunk.ai_documents?.title || 'Unknown',
              document_type: chunk.ai_documents?.document_type || 'mps',
              content: chunk.content,
              similarity: Math.min(1.0, relevanceScore),
              metadata: { 
                chunk_index: chunk.chunk_index,
                search_method: 'text_search',
                term_matches: termMatches
              }
            };
          });

          // Sort by relevance
          textResults.sort((a, b) => b.similarity - a.similarity);
          
          console.log(`📈 Text search results sorted by relevance, top score: ${textResults[0]?.similarity}`);

          return new Response(
            JSON.stringify({ 
              success: true, 
              results: textResults.slice(0, limit),
              query: query,
              total_results: textResults.length,
              search_type: 'enhanced_text_search',
              debug: { 
                organizationId: orgId, 
                searchTerms,
                strategies: searchStrategies.slice(0, 3),
                uniqueResults: uniqueTextResults.length
              }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        if (textError) {
          console.error('Text search error:', textError);
          
          // Final fallback - try searching without document type filter
          console.log('Attempting simpler search...');
          const { data: simpleChunks, error: simpleError } = await supabase
            .from('ai_document_chunks')
            .select(`
              id,
              content,
              chunk_index,
              ai_documents!inner(
                id,
                title,
                organization_id
              )
            `)
            .eq('ai_documents.organization_id', orgId)
            .ilike('content', `%${searchTerms[0]}%`)
            .limit(10);

          if (!simpleError && simpleChunks && simpleChunks.length > 0) {
            const simpleResults = simpleChunks.map(chunk => ({
              chunk_id: chunk.id,
              document_id: chunk.ai_documents?.id || '',
              document_name: chunk.ai_documents?.title || 'Unknown',
              document_type: 'mps',
              content: chunk.content,
              similarity: 0.5,
              metadata: { chunk_index: chunk.chunk_index }
            }));

            return new Response(
              JSON.stringify({ 
                success: true, 
                results: simpleResults,
                query: query,
                total_results: simpleResults.length,
                search_type: 'simple_text',
                debug: { organizationId: orgId, searchTerms }
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'No matching documents found',
              debug: { 
                organizationId: orgId, 
                searchTerms,
                textError: textError.message,
                simpleError: simpleError?.message
              },
              results: []
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const textResults = textChunks?.map(chunk => ({
          chunk_id: chunk.id,
          document_id: chunk.ai_documents?.id || '',
          document_name: chunk.ai_documents?.title || 'Unknown',
          document_type: chunk.ai_documents?.document_type || 'mps',
          content: chunk.content,
          similarity: 0.7, // Default similarity for text search
          metadata: { chunk_index: chunk.chunk_index }
        })) || [];
        
        if (textResults.length > 0) {
          return new Response(
            JSON.stringify({ 
              success: true, 
              results: textResults,
              query: query,
              total_results: textResults.length,
              search_type: 'text',
              debug: { organizationId: orgId, searchTerms }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
      
      // No results found
      return new Response(
        JSON.stringify({ 
          success: true, 
          results: [],
          query: query,
          total_results: 0,
          search_type: 'no_results',
          message: 'No matching content found in organization documents',
          debug: { 
            organizationId: orgId, 
            searchTerms,
            chunksWithEmbeddings: 0,
            textSearchResults: 0
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Perform semantic search using stored embeddings
    const results: SearchResult[] = [];
    
    for (const chunk of chunks) {
      try {
        // Parse the stored embedding - handle multiple formats from reprocessing
        let chunkEmbedding: number[];
        
        if (Array.isArray(chunk.embedding)) {
          chunkEmbedding = chunk.embedding;
        } else if (chunk.embedding && typeof chunk.embedding === 'object') {
          // Handle case where embedding might be stored as object with numeric keys
          chunkEmbedding = Object.values(chunk.embedding as Record<string, number>);
        } else if (typeof chunk.embedding === 'string') {
          // Handle case where embedding is stored as JSON string
          try {
            const parsed = JSON.parse(chunk.embedding);
            if (Array.isArray(parsed)) {
              chunkEmbedding = parsed;
            } else if (typeof parsed === 'object') {
              chunkEmbedding = Object.values(parsed as Record<string, number>);
            } else {
              console.error(`Chunk ${chunk.id} has unparseable string embedding format, skipping`);
              continue;
            }
          } catch (parseError) {
            console.error(`Chunk ${chunk.id} has invalid JSON string embedding format, skipping:`, parseError);
            continue;
          }
        } else {
          console.error(`Chunk ${chunk.id} has invalid embedding format (${typeof chunk.embedding}), skipping`);
          continue;
        }
        
        // Validate embedding is an array of numbers
        if (!Array.isArray(chunkEmbedding) || chunkEmbedding.length === 0 || !chunkEmbedding.every(val => typeof val === 'number' && !isNaN(val))) {
          console.error(`Chunk ${chunk.id} has invalid embedding data (not numeric array), skipping`);
          continue;
        }
        
        // Calculate cosine similarity with query embedding
        let similarity = cosineSimilarity(queryEmbedding, chunkEmbedding);
        
        // Boost similarity for MPS-specific content if MPS number is provided
        if (mpsNumber) {
          const mpsMatch = chunk.content.toLowerCase().includes(`mps ${mpsNumber}`) ||
                          chunk.content.toLowerCase().includes(`mps${mpsNumber}`) ||
                          chunk.content.includes(`${mpsNumber}.`) ||
                          (chunk.ai_documents?.title || '').toLowerCase().includes(`mps ${mpsNumber}`) ||
                          (chunk.ai_documents?.title || '').toLowerCase().includes(`mps${mpsNumber}`);
          
          if (mpsMatch) {
            similarity = Math.min(1.0, similarity * 1.5); // Boost MPS-specific content
            console.log(`Boosted similarity for MPS ${mpsNumber} content: ${similarity.toFixed(3)}`);
          }
        }
        
        // Only include results above threshold
        if (similarity >= threshold) {
          results.push({
            chunk_id: chunk.id,
            document_id: chunk.ai_documents?.id || '',
            document_name: chunk.ai_documents?.title || 'Unknown',
            document_type: chunk.ai_documents?.document_type || 'mps',
            content: chunk.content,
            similarity: similarity,
            metadata: { 
              chunk_index: chunk.chunk_index,
              mps_match: mpsNumber ? (chunk.content.toLowerCase().includes(`mps ${mpsNumber}`) || 
                                     chunk.content.toLowerCase().includes(`mps${mpsNumber}`) ||
                                     chunk.content.includes(`${mpsNumber}.`)) : false
            }
          });
        }
      } catch (embeddingError) {
        console.error(`Error processing chunk ${chunk.id} embedding:`, embeddingError);
        // Continue with other chunks
      }
    }

    // Sort by MPS-specific relevance first, then similarity
    results.sort((a, b) => {
      if (mpsNumber) {
        const aMpsMatch = a.metadata?.mps_match || false;
        const bMpsMatch = b.metadata?.mps_match || false;
        
        if (aMpsMatch && !bMpsMatch) return -1;
        if (bMpsMatch && !aMpsMatch) return 1;
      }
      
      return b.similarity - a.similarity;
    });

    // Create access audit log
    await supabase
      .from('audit_trail')
      .insert({
        organization_id: orgId,
        table_name: 'ai_document_chunks',
        record_id: orgId,
        action: 'search_ai_context_semantic',
        changed_by: '00000000-0000-0000-0000-000000000001',
        change_reason: JSON.stringify({
          query: query,
          results_count: results.length,
          document_types: documentTypes,
          mps_number: mpsNumber,
          search_timestamp: new Date().toISOString()
        })
      });

    console.log(`Returning ${results.length} relevant results`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        results: results,
        query: query,
        total_results: results.length,
        search_type: 'semantic'
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