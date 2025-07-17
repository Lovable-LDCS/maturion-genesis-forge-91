import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessDocumentRequest {
  documentId: string;
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

    const { documentId }: ProcessDocumentRequest = await req.json();

    console.log(`Processing document: ${documentId}`);

    // Get document details
    const { data: document, error: docError } = await supabase
      .from('ai_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      console.error('Document not found:', docError);
      throw new Error('Document not found');
    }

    // Update status to processing
    await supabase
      .from('ai_documents')
      .update({ processing_status: 'processing' })
      .eq('id', documentId);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('ai-documents')
      .download(document.file_path);

    if (downloadError || !fileData) {
      console.error('Failed to download file:', downloadError);
      throw new Error('Failed to download file');
    }

    // Convert file to text based on mime type
    let textContent = '';
    
    if (document.mime_type === 'text/plain' || document.mime_type === 'text/markdown') {
      textContent = await fileData.text();
    } else if (document.mime_type === 'application/pdf') {
      // For PDF processing, we'll need to implement PDF parsing
      // For now, we'll throw an error for PDFs
      throw new Error('PDF processing not yet implemented. Please use text files for now.');
    } else if (document.mime_type.includes('word')) {
      // For Word doc processing, we'll need to implement doc parsing
      // For now, we'll throw an error for Word docs
      throw new Error('Word document processing not yet implemented. Please use text files for now.');
    } else {
      throw new Error(`Unsupported file type: ${document.mime_type}`);
    }

    console.log(`Extracted text content: ${textContent.length} characters`);

    // Split text into chunks (approximately 1000 characters each with overlap)
    const chunks = splitTextIntoChunks(textContent, 1000, 200);
    console.log(`Split into ${chunks.length} chunks`);

    // Process each chunk
    const processedChunks = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Generate embedding for chunk
      console.log(`Generating embedding for chunk ${i + 1}/${chunks.length}`);
      const embedding = await generateEmbedding(chunk, openaiApiKey);
      
      // Create content hash
      const contentHash = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(chunk)
      );
      const hashArray = Array.from(new Uint8Array(contentHash));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      processedChunks.push({
        document_id: documentId,
        organization_id: document.organization_id,
        chunk_index: i,
        content: chunk,
        content_hash: hashHex,
        embedding: `[${embedding.join(',')}]`, // Store as PostgreSQL array string
        metadata: {
          chunk_length: chunk.length,
          position_in_document: i / chunks.length,
          document_type: document.document_type
        }
      });
    }

    // Insert all chunks into database
    console.log('Inserting chunks into database...');
    const { error: chunksError } = await supabase
      .from('ai_document_chunks')
      .insert(processedChunks);

    if (chunksError) {
      console.error('Failed to insert chunks:', chunksError);
      throw new Error('Failed to store processed chunks');
    }

    // Update document status to completed
    await supabase
      .from('ai_documents')
      .update({ 
        processing_status: 'completed',
        total_chunks: chunks.length,
        processed_at: new Date().toISOString()
      })
      .eq('id', documentId);

    // Create audit log
    await supabase
      .from('ai_upload_audit')
      .insert({
        organization_id: document.organization_id,
        document_id: documentId,
        action: 'process',
        user_id: document.uploaded_by,
        metadata: {
          chunks_created: chunks.length,
          text_length: textContent.length,
          processing_completed_at: new Date().toISOString()
        }
      });

    console.log(`Document processing completed: ${chunks.length} chunks created`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        chunks_created: chunks.length,
        document_id: documentId 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error processing document:', error);
    
    // Try to update document status to failed if we have the documentId
    try {
      const { documentId } = await req.json();
      if (documentId) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
        
        await supabase
          .from('ai_documents')
          .update({ processing_status: 'failed' })
          .eq('id', documentId);
      }
    } catch (updateError) {
      console.error('Failed to update document status to failed:', updateError);
    }

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

function splitTextIntoChunks(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    let chunk = text.slice(start, end);
    
    // Try to break at sentence boundaries if possible
    if (end < text.length) {
      const lastSentenceEnd = chunk.lastIndexOf('.');
      const lastNewline = chunk.lastIndexOf('\n');
      const breakPoint = Math.max(lastSentenceEnd, lastNewline);
      
      if (breakPoint > start + chunkSize * 0.5) {
        chunk = chunk.slice(0, breakPoint + 1);
      }
    }
    
    chunks.push(chunk.trim());
    start = end - overlap;
  }

  return chunks.filter(chunk => chunk.length > 0);
}

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