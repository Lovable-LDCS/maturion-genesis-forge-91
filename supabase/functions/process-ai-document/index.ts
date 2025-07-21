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

  let documentId: string | undefined;
  
  try {
    console.log('=== Document Processing Started ===');
    
    // Parse request body first
    const requestBody = await req.json();
    documentId = requestBody.documentId;
    
    if (!documentId) {
      throw new Error('documentId is required');
    }

    console.log(`Processing document: ${documentId}`);

    // Check environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Get document details
    console.log('Fetching document details...');
    const { data: document, error: docError } = await supabase
      .from('ai_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      console.error('Document not found:', docError);
      throw new Error(`Document not found: ${docError?.message || 'No document returned'}`);
    }

    console.log(`Found document: ${document.file_name} (${document.mime_type})`);

    // Update status to processing
    console.log('Updating status to processing...');
    await supabase
      .from('ai_documents')
      .update({ processing_status: 'processing' })
      .eq('id', documentId);

    // Download file from storage
    console.log('Downloading file from storage...');
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('ai-documents')
      .download(document.file_path);

    if (downloadError || !fileData) {
      console.error('Failed to download file:', downloadError);
      throw new Error(`Failed to download file: ${downloadError?.message || 'No file data'}`);
    }

    console.log(`Downloaded file: ${fileData.size} bytes`);

    // Extract text content based on file type (simplified)
    let textContent: string;
    try {
      textContent = await extractTextContent(fileData, document.mime_type, document.file_name);
      console.log(`Extracted text: ${textContent.length} characters`);
    } catch (extractError) {
      console.error('Text extraction failed:', extractError);
      throw new Error(`Failed to extract text: ${extractError.message}`);
    }

    if (!textContent || textContent.trim().length === 0) {
      throw new Error(`No extractable text content found in ${document.file_name}`);
    }

    // Split text into smaller chunks (very conservative approach)
    const chunkSize = 300; // Smaller chunks
    const overlap = 50;
    const maxChunks = 20; // Limit chunks to prevent memory issues
    
    const chunks = splitTextIntoChunks(textContent, chunkSize, overlap).slice(0, maxChunks);
    console.log(`Created ${chunks.length} chunks (limited to ${maxChunks})`);

    // Process chunks in small batches
    const batchSize = 3; // Very small batches
    let totalProcessed = 0;
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(chunks.length/batchSize)}`);
      
      const processedChunks = [];
      
      for (let j = 0; j < batch.length; j++) {
        const chunkIndex = i + j;
        const chunk = batch[j];
        
        // Create simple hash
        const encoder = new TextEncoder();
        const data = encoder.encode(chunk);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        processedChunks.push({
          document_id: documentId,
          organization_id: document.organization_id,
          chunk_index: chunkIndex,
          content: chunk,
          content_hash: hashHex,
          embedding: null, // No embeddings for now
          metadata: {
            chunk_length: chunk.length,
            position_in_document: chunkIndex / chunks.length,
            document_type: document.document_type,
            file_type: document.mime_type
          }
        });
      }
      
      // Insert batch
      console.log(`Inserting ${processedChunks.length} chunks...`);
      const { error: insertError } = await supabase
        .from('ai_document_chunks')
        .insert(processedChunks);
      
      if (insertError) {
        console.error('Failed to insert chunks:', insertError);
        throw new Error(`Failed to insert chunks: ${insertError.message}`);
      }
      
      totalProcessed += processedChunks.length;
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Update document status to completed
    console.log('Updating document status to completed...');
    await supabase
      .from('ai_documents')
      .update({ 
        processing_status: 'completed',
        total_chunks: totalProcessed,
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
          chunks_created: totalProcessed,
          text_length: textContent.length,
          file_type: document.mime_type,
          processing_completed_at: new Date().toISOString()
        }
      });

    console.log(`=== Processing completed successfully: ${totalProcessed} chunks created ===`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        chunks_created: totalProcessed,
        document_id: documentId,
        file_name: document.file_name,
        text_length: textContent.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('=== Processing failed ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    // Try to update document status to failed
    if (documentId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        
        if (supabaseUrl && supabaseServiceRoleKey) {
          const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
          
          await supabase
            .from('ai_documents')
            .update({ processing_status: 'failed' })
            .eq('id', documentId);
          
          console.log(`Updated document ${documentId} status to failed`);
        }
      } catch (updateError) {
        console.error('Failed to update document status:', updateError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        documentId: documentId 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Simplified text extraction function
async function extractTextContent(fileData: Blob, mimeType: string, fileName: string): Promise<string> {
  console.log(`Extracting text from ${fileName} (${mimeType})`);
  
  // Text files
  if (mimeType === 'text/plain' || mimeType === 'text/markdown' || fileName.endsWith('.txt') || fileName.endsWith('.md')) {
    return await fileData.text();
  }
  
  // Try to extract as text for any other file type
  try {
    const textContent = await fileData.text();
    if (textContent && textContent.trim().length > 0) {
      // Check if it's mostly readable text
      const printableChars = textContent.replace(/[^\x20-\x7E\n\r\t]/g, '').length;
      const ratio = printableChars / textContent.length;
      
      if (ratio > 0.3) { // If more than 30% printable characters
        return `${fileName} Content:\n${textContent}`;
      }
    }
  } catch (e) {
    console.log('Failed to extract as plain text');
  }
  
  // For files we can't process, return a descriptive placeholder
  return `Document: ${fileName} (${mimeType})\n\nThis document contains content that requires advanced processing for full text extraction. The document may contain important information for the maturity model assessment but needs specialized processing to extract all text content.`;
}

// Simple text chunking function
function splitTextIntoChunks(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  let startIndex = 0;
  
  while (startIndex < text.length) {
    const endIndex = Math.min(startIndex + chunkSize, text.length);
    const chunk = text.slice(startIndex, endIndex);
    
    if (chunk.trim().length > 0) {
      chunks.push(chunk.trim());
    }
    
    startIndex += chunkSize - overlap;
    
    // Safety check to prevent infinite loops
    if (startIndex <= chunks.length * (chunkSize - overlap) - chunkSize) {
      break;
    }
  }
  
  return chunks;
}