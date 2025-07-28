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
  
  // Set up timeout for the entire operation (90 seconds)
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Processing timeout after 90 seconds')), 90000);
  });

  const processingPromise = (async () => {
  
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
  })();

  // Race between processing and timeout
  try {
    return await Promise.race([processingPromise, timeoutPromise]);
  } catch (error: any) {
    // Handle timeout error specifically
    if (error.message === 'Processing timeout after 90 seconds') {
      console.error('=== Processing timed out ===');
      
      // Try to update document status to failed due to timeout
      if (documentId) {
        try {
          const supabaseUrl = Deno.env.get('SUPABASE_URL');
          const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
          
          if (supabaseUrl && supabaseServiceRoleKey) {
            const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
            
            await supabase
              .from('ai_documents')
              .update({ 
                processing_status: 'failed',
                updated_at: new Date().toISOString()
              })
              .eq('id', documentId);
              
            console.log(`Updated document ${documentId} status to failed due to timeout`);
          }
        } catch (updateError) {
          console.error('Failed to update document status after timeout:', updateError);
        }
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Processing timeout after 90 seconds',
          documentId: documentId,
          timeout: true
        }),
        { 
          status: 408, // Request Timeout
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Re-throw other errors to be handled by the main catch block
    throw error;
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
    console.log(`🔍 Extracting content from ${fileName} (${mimeType})`);
    console.log(`📊 File size: ${fileData.size} bytes`);
    
    // Handle text files
    if (mimeType.startsWith('text/') || fileName.endsWith('.txt') || fileName.endsWith('.md')) {
      const text = await fileData.text();
      const sanitized = sanitizeTextForJson(text);
      
      console.log(`📄 Text file extracted: ${sanitized.length} characters`);
      
      // Validate this isn't placeholder content
      if (isPlaceholderContent(sanitized, fileName)) {
        throw new Error(`Placeholder content detected in ${fileName}`);
      }
      
      return sanitized;
    }
    
    // Handle Word documents (.docx)
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
        fileName.endsWith('.docx')) {
      
      console.log(`📄 Processing Word document: ${fileName}`);
      
      try {
        // Enhanced docx extraction with better error handling
        const text = await extractDocxTextEnhanced(fileData, fileName);
        const sanitized = sanitizeTextForJson(text);
        
        console.log(`📄 Word document extracted: ${sanitized.length} characters`);
        
        if (isPlaceholderContent(sanitized, fileName)) {
          throw new Error(`Placeholder content detected in ${fileName}`);
        }
        
        return sanitized;
      } catch (docxError) {
        console.error(`❌ Word extraction failed for ${fileName}:`, docxError);
        
        // Try fallback text extraction
        console.log(`🔄 Attempting fallback extraction for ${fileName}...`);
        const fallbackText = await extractFallbackText(fileData, fileName);
        
        if (fallbackText && fallbackText.length > 100) {
          console.log(`✅ Fallback extraction successful: ${fallbackText.length} characters`);
          return fallbackText;
        }
        
        throw new Error(`Failed to extract text from Word document ${fileName}: ${docxError.message}. File may be corrupted or use unsupported features.`);
      }
    }
    
    // Handle PDF files
    if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
      console.log(`📄 Processing PDF document: ${fileName}`);
      
      try {
        const text = await extractPdfText(fileData);
        const sanitized = sanitizeTextForJson(text);
        
        console.log(`📄 PDF extracted: ${sanitized.length} characters`);
        
        if (isPlaceholderContent(sanitized, fileName)) {
          throw new Error(`Placeholder content detected in ${fileName}`);
        }
        
        return sanitized;
      } catch (pdfError) {
        console.error(`❌ PDF extraction failed for ${fileName}:`, pdfError);
        throw new Error(`Failed to extract text from PDF ${fileName}: ${pdfError.message}`);
      }
    }
    
    // For unsupported file types
    throw new Error(`Unsupported file type: ${mimeType} for file: ${fileName}. Supported types: .txt, .md, .docx, .pdf`);
  } catch (error) {
    console.error(`❌ Text extraction failed for ${fileName}:`, error);
    throw error;
  }
}

// Enhanced docx text extraction with detailed error handling
async function extractDocxTextEnhanced(fileData: Blob, fileName: string): Promise<string> {
  try {
    console.log(`🔧 Enhanced docx extraction for: ${fileName}`);
    
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Check if file starts with PK (ZIP signature) - valid docx files are ZIP archives
    if (uint8Array[0] !== 0x50 || uint8Array[1] !== 0x4B) {
      throw new Error(`Invalid docx file signature. File may be corrupted or not a valid Word document.`);
    }
    
    console.log(`✅ Valid ZIP signature detected for ${fileName}`);
    
    // Try multiple text decoders for different encodings
    const decoders = [
      new TextDecoder('utf-8', { ignoreBOM: true, fatal: false }),
      new TextDecoder('utf-16', { ignoreBOM: true, fatal: false }),
      new TextDecoder('windows-1252', { ignoreBOM: true, fatal: false })
    ];
    
    let bestText = '';
    let bestScore = 0;
    
    for (const decoder of decoders) {
      try {
        let text = decoder.decode(uint8Array);
        
        // Clean up XML tags and extract readable content
        text = text
          .replace(/<w:t[^>]*>/g, ' ') // Word text elements
          .replace(/<\/w:t>/g, ' ')
          .replace(/<[^>]*>/g, ' ') // All other XML tags
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/\s+/g, ' ')
          .trim();
        
        // Score this extraction attempt
        const words = text.split(/\s+/).filter(word => word.length > 2);
        const readableWords = words.filter(word => /^[a-zA-Z0-9]+$/.test(word));
        const score = readableWords.length;
        
        console.log(`📊 Decoder ${decoder.encoding}: ${score} readable words from ${words.length} total`);
        
        if (score > bestScore) {
          bestScore = score;
          bestText = text;
        }
      } catch (decoderError) {
        console.log(`⚠️ Decoder ${decoder.encoding} failed:`, decoderError.message);
        continue;
      }
    }
    
    if (bestText.length < 50) {
      throw new Error(`Insufficient readable text extracted. Only ${bestText.length} characters found. File may be corrupted, password-protected, or contain only images/tables.`);
    }
    
    console.log(`✅ Best extraction result: ${bestText.length} characters with ${bestScore} readable words`);
    return bestText;
    
  } catch (error) {
    console.error(`❌ Enhanced docx extraction failed for ${fileName}:`, error);
    throw error;
  }
}

// Fallback text extraction for problematic files
async function extractFallbackText(fileData: Blob, fileName: string): Promise<string> {
  try {
    console.log(`🆘 Attempting fallback text extraction for: ${fileName}`);
    
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Try to find any readable ASCII text in the binary data
    let extractedText = '';
    let currentWord = '';
    
    for (let i = 0; i < uint8Array.length; i++) {
      const byte = uint8Array[i];
      
      // Check if byte represents a printable ASCII character
      if (byte >= 32 && byte <= 126) {
        currentWord += String.fromCharCode(byte);
      } else {
        // Non-printable character - save current word if it's meaningful
        if (currentWord.length >= 3 && /[a-zA-Z]/.test(currentWord)) {
          extractedText += currentWord + ' ';
        }
        currentWord = '';
      }
      
      // Prevent excessive memory usage
      if (extractedText.length > 50000) {
        break;
      }
    }
    
    // Add any remaining word
    if (currentWord.length >= 3 && /[a-zA-Z]/.test(currentWord)) {
      extractedText += currentWord;
    }
    
    // Clean up the extracted text
    extractedText = extractedText
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log(`🔍 Fallback extraction result: ${extractedText.length} characters`);
    
    if (extractedText.length < 100) {
      throw new Error(`Fallback extraction insufficient: only ${extractedText.length} characters found`);
    }
    
    return extractedText;
    
  } catch (error) {
    console.error(`❌ Fallback extraction failed for ${fileName}:`, error);
    throw error;
  }
}

// Simple docx text extraction (legacy function - kept for compatibility)
async function extractDocxText(fileData: Blob): Promise<string> {
  try {
    // This is a very basic approach - in production you'd use a proper docx parser
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const decoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: false });
    
    // Try to extract readable text - this won't be perfect but will catch basic content
    let text = decoder.decode(uint8Array);
    
    // Remove XML tags and clean up
    text = text.replace(/<[^>]*>/g, ' ')
               .replace(/\s+/g, ' ')
               .trim();
    
    // If we get very little readable text, it might be corrupted or empty
    if (text.length < 50) {
      throw new Error('Unable to extract meaningful text from Word document');
    }
    
    return text;
  } catch (error) {
    console.error('Error extracting docx text:', error);
    throw new Error('Failed to extract text from Word document');
  }
}

// Simple PDF text extraction (for demonstration - in production use a proper library)
async function extractPdfText(fileData: Blob): Promise<string> {
  try {
    // This is a basic approach - in production you'd use a proper PDF parser
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const decoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: false });
    
    // Try to extract readable text
    let text = decoder.decode(uint8Array);
    
    // Remove PDF-specific markers and clean up
    text = text.replace(/[\x00-\x1F\x7F-\x9F]/g, ' ')
               .replace(/\s+/g, ' ')
               .trim();
    
    // If we get very little readable text, it might be corrupted or empty
    if (text.length < 50) {
      throw new Error('Unable to extract meaningful text from PDF document');
    }
    
    return text;
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    throw new Error('Failed to extract text from PDF document');
  }
}

// Function to detect placeholder content with detailed reporting
function isPlaceholderContent(content: string, fileName: string): boolean {
  const placeholderPatterns = [
    { pattern: /Criterion [A-Z]/gi, name: 'Generic criteria markers' },
    { pattern: /\[document_type\]/gi, name: 'Document type placeholders' },
    { pattern: /\[action_verb\]/gi, name: 'Action verb placeholders' },
    { pattern: /placeholder/gi, name: 'Placeholder text' },
    { pattern: /lorem ipsum/gi, name: 'Lorem ipsum text' },
    { pattern: /This document has been processed for AI analysis/gi, name: 'AI processing text' },
    { pattern: /Content extracted from.*File type:/gi, name: 'Extraction metadata' },
    { pattern: /fallback/gi, name: 'Fallback content' },
    { pattern: /template/gi, name: 'Template text' }
  ];
  
  // More lenient Annex 1 pattern - only reject if it's predominantly Annex 1 content
  const annexPattern = /Annex\s*1/gi;
  
  const words = content.split(/\s+/).filter(w => w.length > 0).length;
  const lines = content.split(/\n/).length;
  
  console.log(`📊 Content analysis for ${fileName}:`);
  console.log(`   Words: ${words}, Lines: ${lines}`);
  console.log(`   Sample: "${content.substring(0, 300)}..."`);
  
  // More lenient threshold for knowledge base documents
  const isKnowledgeBase = fileName.toLowerCase().includes('knowledge') || 
                         fileName.toLowerCase().includes('guidance') ||
                         fileName.toLowerCase().includes('criteria');
  
  const minWords = isKnowledgeBase ? 30 : 50; // Lower threshold for knowledge docs
  
  // Too short to be real content
  if (words < minWords) {
    console.log(`❌ Content too short: ${words} words (minimum ${minWords})`);
    return true;
  }
  
  // Check for placeholder patterns with detailed reporting
  const detectedPatterns: string[] = [];
  let totalMatches = 0;
  
  placeholderPatterns.forEach(({ pattern, name }) => {
    const matches = (content.match(pattern) || []).length;
    if (matches > 0) {
      detectedPatterns.push(`${name} (${matches} matches)`);
      totalMatches += matches;
    }
  });
  
  // Check Annex 1 separately - only reject if it's more than 30% of content
  const annexMatches = (content.match(annexPattern) || []).length;
  if (annexMatches > 0) {
    const annexRatio = annexMatches / words;
    console.log(`📋 Annex 1 references: ${annexMatches} matches (${(annexRatio * 100).toFixed(2)}% of content)`);
    
    if (annexRatio > 0.3) { // Only reject if Annex 1 dominates the content
      detectedPatterns.push(`Annex 1 dominance (${annexMatches} matches, ${(annexRatio * 100).toFixed(2)}%)`);
      totalMatches += annexMatches;
    }
  }
  
  // For knowledge base documents, be more tolerant of some patterns
  if (isKnowledgeBase && totalMatches < 5) {
    console.log(`ℹ️ Knowledge base document with minor placeholder patterns (${totalMatches} matches) - allowing`);
    detectedPatterns.length = 0; // Clear patterns for knowledge docs with few matches
    totalMatches = 0;
  }
  
  if (detectedPatterns.length > 0) {
    console.log(`❌ Placeholder patterns detected: ${detectedPatterns.join(', ')}`);
    console.log(`📊 Total pattern matches: ${totalMatches} out of ${words} words`);
    
    // Only reject if there are significant placeholder patterns
    if (totalMatches > 10 || detectedPatterns.length > 3) {
      return true;
    }
  }
  
  // Check for suspiciously repetitive content (more lenient for knowledge docs)
  const uniqueWords = new Set(content.toLowerCase().split(/\s+/)).size;
  const repetitionRatio = uniqueWords / words;
  const minRepetitionRatio = isKnowledgeBase ? 0.2 : 0.3; // More tolerant for knowledge docs
  
  if (repetitionRatio < minRepetitionRatio) {
    console.log(`❌ Content too repetitive: ${uniqueWords} unique words out of ${words} (ratio: ${repetitionRatio.toFixed(2)}, minimum: ${minRepetitionRatio})`);
    return true;
  }
  
  // Check if content is mostly non-alphabetic characters
  const alphabeticChars = (content.match(/[a-zA-Z]/g) || []).length;
  const alphabeticRatio = alphabeticChars / content.length;
  
  if (alphabeticRatio < 0.3) {
    console.log(`❌ Content mostly non-alphabetic: ${alphabeticRatio.toFixed(2)} ratio`);
    return true;
  }
  
  console.log(`✅ Content validation passed for ${fileName}`);
  console.log(`📈 Quality metrics: ${words} words, ${uniqueWords} unique (${repetitionRatio.toFixed(2)} ratio), ${(alphabeticRatio * 100).toFixed(1)}% alphabetic`);
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