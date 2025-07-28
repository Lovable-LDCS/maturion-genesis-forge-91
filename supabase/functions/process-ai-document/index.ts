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

    // Extract and sanitize text content
    console.log(`Extracting text from ${document.file_name} (${document.mime_type})`);
    let textContent = await extractTextContent(fileData, document.mime_type, document.file_name);
    console.log(`Extracted text: ${textContent.length} characters`);
    
    // Additional sanitization after extraction
    textContent = sanitizeTextForJson(textContent);
    console.log(`Sanitized text: ${textContent.length} characters`);

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

        // Generate embedding for this chunk
        let embedding = null;
        try {
          console.log(`Generating embedding for chunk ${chunkIndex + 1}...`);
          embedding = await generateEmbedding(chunk);
        } catch (embeddingError) {
          console.error(`Failed to generate embedding for chunk ${chunkIndex + 1}:`, embeddingError);
          // Continue without embedding rather than failing the entire process
        }

        // Create safe metadata object
        const safeChunkMetadata = {
          chunk_length: chunk?.length || 0,
          position_in_document: Number((chunkIndex / chunks.length).toFixed(4)),
          document_type: document.document_type || 'unknown',
          file_type: document.mime_type || 'unknown',
          has_embedding: embedding !== null
        };

        // Ensure content is safe for JSON storage
        const safeContent = sanitizeTextForJson(chunk || '');

        processedChunks.push({
          document_id: documentId,
          organization_id: document.organization_id,
          chunk_index: chunkIndex,
          content: safeContent,
          content_hash: hashHex,
          embedding: embedding, // Now includes actual embeddings
          metadata: safeChunkMetadata
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

    // Create audit log with safe JSON metadata
    try {
      const safeMetadata = {
        chunks_created: totalProcessed || 0,
        text_length: textContent?.length || 0,
        file_type: document.mime_type || 'unknown',
        processing_completed_at: new Date().toISOString()
      };
      
      await supabase
        .from('ai_upload_audit')
        .insert({
          organization_id: document.organization_id,
          document_id: documentId,
          action: 'process',
          user_id: document.uploaded_by,
          metadata: safeMetadata
        });
    } catch (auditError) {
      console.error('Failed to create audit log (non-critical):', auditError);
      // Don't fail the entire process for audit log issues
    }

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

// Comprehensive text sanitization for JSON safety
function sanitizeTextForJson(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  return text
    // Remove null bytes and other control characters
    .replace(/\0/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Fix common problematic characters
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    // Replace problematic Unicode sequences
    .replace(/\uFEFF/g, '') // BOM
    .replace(/\uFFFD/g, '?') // Replacement character
    // Fix unescaped backslashes and quotes
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    // Remove or replace high surrogate pairs that might be incomplete
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '?')
    .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '?')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

// Helper function to extract text content from files
async function extractTextContent(fileData: Blob, mimeType: string, fileName: string): Promise<string> {
  try {
    if (mimeType.startsWith('text/') || fileName.endsWith('.txt') || fileName.endsWith('.md')) {
      const text = await fileData.text();
      const sanitized = sanitizeTextForJson(text);
      
      // Validate this isn't placeholder content
      if (isPlaceholderContent(sanitized, fileName)) {
        throw new Error(`Placeholder content detected in ${fileName}`);
      }
      
      return sanitized;
    }
    
    // For non-text files, throw error instead of placeholder
    throw new Error(`Unsupported file type: ${mimeType} for file: ${fileName}. Only text files are supported.`);
  } catch (error) {
    console.error('Error extracting text:', error);
    throw error;
  }
}

// Function to detect placeholder content
function isPlaceholderContent(content: string, fileName: string): boolean {
  const placeholderPatterns = [
    /Criterion [A-Z]/gi,
    /\[document_type\]/gi,
    /\[action_verb\]/gi,
    /placeholder/gi,
    /lorem ipsum/gi,
    /This document has been processed for AI analysis/gi,
    /Content extracted from.*File type:/gi,
    /Annex\s*1/gi, // Block Annex 1 references
    /fallback/gi,
    /generic\s+mining/gi,
    /template/gi
  ];
  
  const words = content.split(/\s+/).length;
  const lines = content.split(/\n/).length;
  
  console.log(`📊 Content analysis for ${fileName}:`);
  console.log(`   Words: ${words}, Lines: ${lines}`);
  console.log(`   Sample: "${content.substring(0, 200)}..."`);
  
  // Too short to be real content - more lenient threshold
  if (words < 50) {
    console.log(`❌ Content too short: ${words} words (minimum 50)`);
    return true;
  }
  
  // Check for placeholder patterns
  const detectedPatterns: string[] = [];
  const hasPlaceholders = placeholderPatterns.some(pattern => {
    const matches = pattern.test(content);
    if (matches) {
      detectedPatterns.push(pattern.toString());
    }
    return matches;
  });
  
  if (hasPlaceholders) {
    console.log(`❌ Placeholder patterns detected: ${detectedPatterns.join(', ')}`);
    return true;
  }
  
  // Check for suspiciously repetitive content
  const uniqueWords = new Set(content.toLowerCase().split(/\s+/)).size;
  const repetitionRatio = uniqueWords / words;
  if (repetitionRatio < 0.3) {
    console.log(`❌ Content too repetitive: ${uniqueWords} unique words out of ${words} (ratio: ${repetitionRatio.toFixed(2)})`);
    return true;
  }
  
  console.log(`✅ Content validation passed for ${fileName}`);
  return false;
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

// Function to generate embeddings using OpenAI
async function generateEmbedding(text: string): Promise<number[] | null> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openaiApiKey) {
    console.error('OpenAI API key not configured');
    return null;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
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
      return null;
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    return null;
  }
}