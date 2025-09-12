import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface IndexRequest {
  orgId: string;
  pageId?: string;
  forceReindex?: boolean;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check endpoint
  if (req.method === 'GET' && new URL(req.url).pathname.endsWith('/health')) {
    return new Response(JSON.stringify({ 
      status: 'ok', 
      version: '1.0.0',
      function: 'extract-and-index',
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const { orgId, pageId, forceReindex = false }: IndexRequest = await req.json();
    console.log(`🔍 Starting extraction and indexing for org: ${orgId}, page: ${pageId || 'all'}`);

    let pagesToProcess = [];

    if (pageId) {
      // Process specific page
      const { data: page } = await supabase
        .from('org_pages')
        .select('*')
        .eq('id', pageId)
        .single();
      
      if (page) pagesToProcess = [page];
    } else {
      // Process all pages without chunks or force reindex
      let query = supabase
        .from('org_pages')
        .select(`
          *,
          chunks:org_page_chunks(count)
        `)
        .eq('org_id', orgId);

      if (!forceReindex) {
        // Only pages without chunks
        query = query.is('org_page_chunks.id', null);
      }

      const { data: pages } = await query;
      pagesToProcess = pages || [];
    }

    if (pagesToProcess.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No pages to process',
        processed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📄 Processing ${pagesToProcess.length} pages`);

    let totalChunks = 0;
    let errors = 0;

    for (const page of pagesToProcess) {
      try {
        console.log(`🔄 Processing page: ${page.url}`);
        
        // Delete existing chunks if reindexing
        if (forceReindex) {
          await supabase
            .from('org_page_chunks')
            .delete()
            .eq('page_id', page.id);
        }

        // Extract and clean content
        const cleanText = await extractCleanText(page);
        
        if (!cleanText || cleanText.length < 50) {
          console.log(`⏭️ Skipping page with insufficient content: ${page.url}`);
          continue;
        }

        // Split into chunks
        const chunks = await createChunks(cleanText);
        
        if (chunks.length === 0) {
          console.log(`⏭️ No chunks created for: ${page.url}`);
          continue;
        }

        // Generate embeddings and store chunks
        const chunkPromises = chunks.map(async (chunk, index) => {
          try {
            const embedding = await generateEmbedding(chunk.text);
            
            return {
              org_id: orgId,
              page_id: page.id,
              chunk_idx: index,
              text: chunk.text,
              tokens: chunk.tokens,
              embedding: `[${embedding.join(',')}]` // PostgreSQL vector format
            };
          } catch (error) {
            console.error(`❌ Error creating chunk ${index} for ${page.url}:`, error);
            return null;
          }
        });

        const chunkData = (await Promise.all(chunkPromises)).filter(Boolean);
        
        if (chunkData.length > 0) {
          const { error: insertError } = await supabase
            .from('org_page_chunks')
            .insert(chunkData);

          if (insertError) {
            console.error(`❌ Error inserting chunks for ${page.url}:`, insertError);
            errors++;
          } else {
            console.log(`✅ Indexed ${chunkData.length} chunks for: ${page.url}`);
            totalChunks += chunkData.length;
          }
        }

      } catch (error) {
        console.error(`❌ Error processing page ${page.url}:`, error);
        errors++;
      }
    }

    console.log(`✅ Extraction completed: ${totalChunks} chunks created, ${errors} errors`);

    return new Response(JSON.stringify({
      success: true,
      processed: pagesToProcess.length,
      chunks: totalChunks,
      errors
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Extract and index error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});

async function extractCleanText(page: any): Promise<string> {
  let text = page.text || '';

  // If it's a PDF, we need to extract text from the URL
  if (page.content_type?.includes('application/pdf')) {
    try {
      // For now, return existing text or fetch and parse PDF
      // In production, you'd use a PDF parsing library
      if (!text || text === 'PDF document - content will be extracted during indexing') {
        console.log(`📄 PDF processing needed for: ${page.url}`);
        // TODO: Implement PDF text extraction
        text = `PDF content from ${page.title || page.url}. This content requires PDF parsing to extract full text.`;
      }
    } catch (error) {
      console.error('PDF extraction error:', error);
      return '';
    }
  }

  // Clean and normalize text
  text = text
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '') // Remove control characters
    .trim();

  return text;
}

async function createChunks(text: string, maxTokens: number = 1500): Promise<Array<{text: string, tokens: number}>> {
  const chunks: Array<{text: string, tokens: number}> = [];
  
  // Simple sentence-based chunking
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  let currentChunk = '';
  let currentTokens = 0;
  
  for (const sentence of sentences) {
    const sentenceText = sentence.trim() + '.';
    const sentenceTokens = estimateTokens(sentenceText);
    
    if (currentTokens + sentenceTokens > maxTokens && currentChunk.length > 0) {
      // Save current chunk
      chunks.push({
        text: currentChunk.trim(),
        tokens: currentTokens
      });
      
      // Start new chunk
      currentChunk = sentenceText;
      currentTokens = sentenceTokens;
    } else {
      currentChunk += ' ' + sentenceText;
      currentTokens += sentenceTokens;
    }
  }
  
  // Save last chunk
  if (currentChunk.trim().length > 0) {
    chunks.push({
      text: currentChunk.trim(),
      tokens: currentTokens
    });
  }
  
  return chunks.filter(chunk => chunk.text.length > 50); // Minimum chunk size
}

function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters for English
  return Math.ceil(text.length / 4);
}

async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text.substring(0, 8000), // Limit input size
        encoding_format: 'float'
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data[0].embedding;

  } catch (error) {
    console.error('Embedding generation error:', error);
    throw error;
  }
}