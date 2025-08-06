import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RegenerateRequest {
  organizationId: string;
  forceAll?: boolean;
  batchSize?: number;
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

    const { organizationId, forceAll = false, batchSize = 100 }: RegenerateRequest = await req.json();

    if (!organizationId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Organization ID is required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Starting embedding regeneration for organization: ${organizationId}`);

    // Get chunks that need embeddings
    let query = supabase
      .from('ai_document_chunks')
      .select(`
        id,
        content,
        ai_documents!inner(
          id,
          title,
          organization_id
        )
      `)
      .eq('ai_documents.organization_id', organizationId);

    if (!forceAll) {
      query = query.is('embedding', null);
    }

    const { data: chunks, error: fetchError } = await query.limit(batchSize);

    if (fetchError) {
      console.error('Error fetching chunks:', fetchError);
      throw new Error(`Failed to fetch chunks: ${fetchError.message}`);
    }

    if (!chunks || chunks.length === 0) {
      console.log('No chunks found needing embeddings');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No chunks need embedding generation',
          processed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${chunks.length} chunks for embedding generation`);
    let processed = 0;
    let errors = 0;

    // Process in smaller batches to avoid timeouts
    const EMBEDDING_BATCH_SIZE = 10;
    
    for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
      const batch = chunks.slice(i, i + EMBEDDING_BATCH_SIZE);
      
      await Promise.all(batch.map(async (chunk) => {
        try {
          if (!chunk.content || chunk.content.trim().length === 0) {
            console.log(`Skipping chunk ${chunk.id} - empty content`);
            return;
          }

          // Generate embedding using OpenAI
          const embedding = await generateEmbedding(chunk.content, openaiApiKey);
          
          // Update chunk with embedding
          const { error: updateError } = await supabase
            .from('ai_document_chunks')
            .update({ embedding: embedding })
            .eq('id', chunk.id);

          if (updateError) {
            console.error(`Error updating chunk ${chunk.id}:`, updateError);
            errors++;
          } else {
            processed++;
            if (processed % 10 === 0) {
              console.log(`Progress: ${processed}/${chunks.length} chunks processed`);
            }
          }
        } catch (error) {
          console.error(`Error processing chunk ${chunk.id}:`, error);
          errors++;
        }
      }));
      
      // Small delay between batches to avoid rate limits
      if (i + EMBEDDING_BATCH_SIZE < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Log completion
    await supabase
      .from('audit_trail')
      .insert({
        organization_id: organizationId,
        table_name: 'ai_document_chunks',
        record_id: organizationId,
        action: 'bulk_embedding_regeneration',
        changed_by: '00000000-0000-0000-0000-000000000001',
        change_reason: `Regenerated embeddings for ${processed} chunks (${errors} errors)`
      });

    console.log(`Embedding regeneration completed: ${processed} successful, ${errors} errors`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Embedding regeneration completed',
        processed: processed,
        errors: errors,
        total: chunks.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in regenerate-embeddings function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error occurred'
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
      input: text.substring(0, 8000), // Limit input length
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