import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
// Add mammoth.js for clean .docx text extraction
import * as mammoth from "https://esm.sh/mammoth@1.6.0";

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
    const corruptionRecovery = requestBody.corruptionRecovery || false;
    const validateTextOnly = requestBody.validateTextOnly || false;
    const targetChunkSize = requestBody.targetChunkSize || 1500;
    const minChunkSize = requestBody.minChunkSize || 800;
    
    if (!documentId) {
      throw new Error('documentId is required');
    }

    console.log(`Processing document: ${documentId}`);
    console.log(`Corruption recovery mode: ${corruptionRecovery}`);
    console.log(`Text validation: ${validateTextOnly}`);
    console.log(`Target chunk size: ${targetChunkSize}, Min: ${minChunkSize}`);

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

    // Enhanced chunking for corruption recovery mode
    const chunkSize = corruptionRecovery ? targetChunkSize : 1500;
    const overlap = corruptionRecovery ? 200 : 200;
    const maxChunks = 100; // Allow more chunks for comprehensive coverage
    
    console.log(`🔧 Chunking parameters: size=${chunkSize}, overlap=${overlap}, corruptionRecovery=${corruptionRecovery}`);
    
    // Enhanced text validation for corruption recovery
    if (corruptionRecovery && validateTextOnly) {
      console.log(`🔍 Corruption recovery: Validating text-only content`);
      
      // Check for XML artifacts and binary data
      const xmlArtifacts = textContent.includes('_rels/') || textContent.includes('customXml/') || 
                          textContent.includes('word/_rels') || textContent.includes('.xml.rels');
      const binaryRatio = (textContent.match(/[\x00-\x08\x0E-\x1F\x7F-\xFF]/g) || []).length / textContent.length;
      const questionMarkRatio = (textContent.match(/\?/g) || []).length / textContent.length;
      
      if (xmlArtifacts || binaryRatio > 0.3 || (questionMarkRatio > 0.2 && textContent.includes('\\\\\\\\'))) {
        throw new Error(`Corruption detected in extracted text: XML artifacts=${xmlArtifacts}, binary ratio=${binaryRatio.toFixed(3)}, question marks=${questionMarkRatio.toFixed(3)}`);
      }
      
      console.log(`✅ Text validation passed: clean content detected`);
    }
    
    const chunks = splitTextIntoChunks(textContent, chunkSize, overlap).slice(0, maxChunks);
    console.log(`Created ${chunks.length} chunks for ${corruptionRecovery ? 'corruption recovery' : 'standard'} processing (up to ${maxChunks} allowed)`);

    // Process chunks in optimized batches
    const batchSize = 8; // Better batch size for comprehensive content processing
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

    // 🚀 ROOT CAUSE FIX: Update document metadata with corruption recovery status
    const updateMetadata = {
      corruptionRecoveryAttempted: corruptionRecovery || false,
      processingMethod: corruptionRecovery ? 'mammoth_clean_extraction' : 'standard_extraction',
      textValidationEnabled: validateTextOnly || false,
      chunkingParameters: {
        targetSize: chunkSize,
        overlap,
        totalChunks: totalProcessed
      },
      extractionQuality: {
        textLength: textContent?.length || 0,
        processingTimestamp: new Date().toISOString()
      }
    };

    // Update document status to completed with enhanced metadata
    console.log('Updating document status to completed...');
    await supabase
      .from('ai_documents')
      .update({ 
        processing_status: 'completed',
        total_chunks: totalProcessed,
        processed_at: new Date().toISOString(),
        metadata: updateMetadata
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

// 🚀 ROOT CAUSE FIX: Clean mammoth.js extraction (body text only)
async function extractDocxTextEnhanced(fileData: Blob, fileName: string): Promise<string> {
  try {
    console.log(`🔧 Clean mammoth.js extraction for: ${fileName}`);
    
    const arrayBuffer = await fileData.arrayBuffer();
    
    // Check if file starts with PK (ZIP signature) - valid docx files are ZIP archives
    const uint8Array = new Uint8Array(arrayBuffer);
    if (uint8Array[0] !== 0x50 || uint8Array[1] !== 0x4B) {
      throw new Error(`Invalid docx file signature. File may be corrupted or not a valid Word document.`);
    }
    
    console.log(`✅ Valid ZIP signature detected for ${fileName}`);
    
    // Use mammoth.js to extract clean body text only
    const result = await mammoth.extractRawText({
      arrayBuffer: arrayBuffer
    });
    
    console.log(`📄 Mammoth.js extraction complete`);
    
    // Get clean body text
    let cleanText = result.value;
    
    // Log any conversion messages (but don't fail on warnings)
    if (result.messages && result.messages.length > 0) {
      console.log(`ℹ️ Mammoth.js messages:`, result.messages.map(m => `${m.type}: ${m.message}`));
      
      // Only fail on errors, not warnings
      const errors = result.messages.filter(m => m.type === 'error');
      if (errors.length > 0) {
        console.error(`❌ Mammoth.js errors:`, errors);
        throw new Error(`Document processing errors: ${errors.map(e => e.message).join(', ')}`);
      }
    }
    
    // Fail fast: Check if we got meaningful body content
    if (!cleanText || cleanText.trim().length < 100) {
      throw new Error(`No meaningful body content detected in ${fileName}. Extracted only ${cleanText.length} characters. Document may be corrupted, password-protected, or contain only images/tables.`);
    }
    
    // Additional sanitization for any remaining artifacts
    cleanText = cleanText
      // Remove any remaining XML-like patterns
      .replace(/<[^>]*>/g, ' ')
      // Remove file path artifacts that might leak through
      .replace(/[A-Z]:\\[^\\s]*/g, ' ')
      .replace(/\/_rels\/[^\s]*/g, ' ')
      .replace(/\/customXml\/[^\s]*/g, ' ')
      .replace(/\/word\/[^\s]*/g, ' ')
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      .trim();
    
    // Final validation - ensure no corruption artifacts remain
    const corruptionChecks = {
      xmlRels: cleanText.includes('_rels/') || cleanText.includes('customXml/'),
      binaryRatio: (cleanText.match(/[\x00-\x08\x0E-\x1F\x7F-\xFF]/g) || []).length / cleanText.length,
      questionMarkRatio: (cleanText.match(/\?/g) || []).length / cleanText.length
    };
    
    if (corruptionChecks.xmlRels) {
      throw new Error(`XML artifacts detected in extracted text from ${fileName}`);
    }
    
    if (corruptionChecks.binaryRatio > 0.1) {
      throw new Error(`High binary content ratio (${(corruptionChecks.binaryRatio * 100).toFixed(1)}%) in extracted text from ${fileName}`);
    }
    
    if (corruptionChecks.questionMarkRatio > 0.15 && cleanText.includes('\\\\\\\\')) {
      throw new Error(`Encoding artifacts detected in extracted text from ${fileName}`);
    }
    
    console.log(`✅ Clean extraction successful: ${cleanText.length} characters, no corruption artifacts`);
    console.log(`📊 Quality metrics: ${(corruptionChecks.binaryRatio * 100).toFixed(2)}% binary, ${(corruptionChecks.questionMarkRatio * 100).toFixed(2)}% question marks`);
    
    return cleanText;
    
  } catch (error) {
    console.error(`❌ Mammoth.js extraction failed for ${fileName}:`, error);
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

// Function to detect placeholder content with intelligent knowledge document handling
function isPlaceholderContent(content: string, fileName: string): boolean {
  const placeholderPatterns = [
    { pattern: /Criterion [A-Z]/gi, name: 'Generic criteria markers', weight: 2 },
    { pattern: /\[document_type\]/gi, name: 'Document type placeholders', weight: 3 },
    { pattern: /\[action_verb\]/gi, name: 'Action verb placeholders', weight: 3 },
    { pattern: /placeholder/gi, name: 'Placeholder text', weight: 2 },
    { pattern: /lorem ipsum/gi, name: 'Lorem ipsum text', weight: 5 },
    { pattern: /This document has been processed for AI analysis/gi, name: 'AI processing text', weight: 4 },
    { pattern: /Content extracted from.*File type:/gi, name: 'Extraction metadata', weight: 4 },
    { pattern: /fallback/gi, name: 'Fallback content', weight: 2 },
    { pattern: /template/gi, name: 'Template text', weight: 1 }
  ];
  
  // More nuanced Annex 1 pattern - check context
  const annexPattern = /Annex\s*1/gi;
  
  const words = content.split(/\s+/).filter(w => w.length > 0).length;
  const lines = content.split(/\n/).length;
  
  console.log(`📊 Content analysis for ${fileName}:`);
  console.log(`   Words: ${words}, Lines: ${lines}`);
  console.log(`   Sample: "${content.substring(0, 400)}..."`);
  
  // Identify knowledge documents
  const isKnowledgeDocument = fileName.toLowerCase().includes('knowledge') || 
                             fileName.toLowerCase().includes('guidance') ||
                             fileName.toLowerCase().includes('criteria') ||
                             fileName.toLowerCase().includes('handbook') ||
                             fileName.toLowerCase().includes('manual');
  
  console.log(`📚 Document type: ${isKnowledgeDocument ? 'Knowledge Document' : 'Regular Document'}`);
  
  // Enhanced content structure analysis
  const hasStructure = {
    bullets: /[•\-\*]\s+/.test(content) || /^\s*[\-\*•]\s+/m.test(content),
    headings: /^#+\s+/m.test(content) || /^[A-Z][^.]*:$/m.test(content),
    paragraphs: content.split(/\n\s*\n/).length > 2,
    verbs: (content.match(/\b(implement|establish|develop|ensure|define|create|manage|monitor|evaluate|assess|review|update|maintain|provide|support|identify|analyze|document|track|report|compliance|requirement|process|procedure|policy|standard|guideline|framework|approach|method|technique|practice|control|measure|action|step|phase|stage|level|category|type|kind|example|instance|case|scenario|situation|context|environment|system|application|tool|resource|reference|source|evidence|proof|demonstration|verification|validation|testing|audit|inspection|examination|investigation|analysis|study|research|survey|assessment|evaluation|review|measurement|metric|indicator|criteria|threshold|target|objective|goal|purpose|scope|boundary|limitation|constraint|assumption|dependency|risk|issue|challenge|problem|solution|recommendation|suggestion|advice|guidance|instruction|direction|procedure|process|workflow|sequence|order|priority|importance|significance|relevance|applicability|suitability|appropriateness|effectiveness|efficiency|quality|performance|capability|capacity|ability|skill|competence|expertise|knowledge|understanding|awareness|recognition|identification|classification|categorization|organization|structure|hierarchy|relationship|connection|association|correlation|dependency|interaction|integration|coordination|collaboration|cooperation|communication|information|data|details|specifics|particulars|characteristics|features|attributes|properties|qualities|aspects|elements|components|parts|sections|subsections|chapters|appendices|references|sources|citations|footnotes|endnotes|bibliography|glossary|index|table|figure|diagram|chart|graph|illustration|image|picture|photo)\b/gi) || []).length,
    realWords: (content.match(/\b[a-zA-Z]{4,}\b/g) || []).length
  };
  
  console.log(`🔍 Content structure analysis:`);
  console.log(`   Has bullets: ${hasStructure.bullets}`);
  console.log(`   Has headings: ${hasStructure.headings}`);
  console.log(`   Has paragraphs: ${hasStructure.paragraphs}`);
  console.log(`   Business verbs: ${hasStructure.verbs}`);
  console.log(`   Real words (4+ chars): ${hasStructure.realWords}`);
  
  // Apply fallback rule for substantial knowledge documents
  const isSubstantialContent = words >= 500 && 
                              (hasStructure.bullets || hasStructure.headings || hasStructure.paragraphs) &&
                              hasStructure.verbs >= 10 &&
                              hasStructure.realWords >= 100;
  
  if (isKnowledgeDocument && isSubstantialContent) {
    console.log(`✅ Fallback rule applied: Substantial knowledge document (${words} words, structured content, ${hasStructure.verbs} business verbs)`);
  }
  
  // Basic length check with different thresholds
  const minWords = isKnowledgeDocument ? 30 : 50;
  if (words < minWords) {
    console.log(`❌ Content too short: ${words} words (minimum ${minWords} for ${isKnowledgeDocument ? 'knowledge' : 'regular'} documents)`);
    return true;
  }
  
  // Weighted placeholder pattern analysis
  const detectedPatterns: string[] = [];
  let totalWeight = 0;
  let totalMatches = 0;
  
  placeholderPatterns.forEach(({ pattern, name, weight }) => {
    const matches = (content.match(pattern) || []).length;
    if (matches > 0) {
      const patternWeight = matches * weight;
      detectedPatterns.push(`${name} (${matches} matches, weight: ${patternWeight})`);
      totalWeight += patternWeight;
      totalMatches += matches;
    }
  });
  
  // Annex 1 analysis with context
  const annexMatches = (content.match(annexPattern) || []).length;
  if (annexMatches > 0) {
    const annexRatio = annexMatches / words;
    console.log(`📋 Annex 1 references: ${annexMatches} matches (${(annexRatio * 100).toFixed(2)}% of content)`);
    
    // Only flag as problematic if Annex 1 dominates AND there's no other substantial content
    if (annexRatio > 0.3 && !isSubstantialContent) {
      detectedPatterns.push(`Annex 1 dominance (${annexMatches} matches, ${(annexRatio * 100).toFixed(2)}%, no substantial content)`);
      totalWeight += annexMatches * 3;
      totalMatches += annexMatches;
    } else if (annexMatches > 0) {
      console.log(`ℹ️ Annex 1 references present but content appears substantial - allowing`);
    }
  }
  
  // Calculate placeholder percentage
  const placeholderPercentage = (totalMatches / words) * 100;
  
  console.log(`📊 Placeholder analysis:`);
  console.log(`   Total patterns detected: ${detectedPatterns.length}`);
  console.log(`   Total matches: ${totalMatches}`);
  console.log(`   Total weight: ${totalWeight}`);
  console.log(`   Placeholder percentage: ${placeholderPercentage.toFixed(2)}%`);
  
  if (detectedPatterns.length > 0) {
    console.log(`⚠️ Detected patterns: ${detectedPatterns.join(', ')}`);
  }
  
  // Enhanced decision logic
  if (isKnowledgeDocument && isSubstantialContent) {
    // Fallback rule: substantial knowledge documents with <20% placeholder patterns pass
    if (placeholderPercentage < 20) {
      console.log(`✅ ALLOWED: Knowledge document with ${placeholderPercentage.toFixed(2)}% placeholder content (under 20% threshold)`);
      return false;
    }
  }
  
  // Warning mode for borderline cases (8-12 pattern matches or moderate weight)
  if (totalMatches >= 8 && totalMatches <= 12 && totalWeight < 30) {
    console.log(`⚠️ WARNING: Borderline placeholder detection - allowing with warning (${totalMatches} matches, weight: ${totalWeight})`);
    if (isKnowledgeDocument) {
      console.log(`ℹ️ Knowledge document benefit of doubt applied`);
      return false;
    }
  }
  
  // Strict rejection criteria
  const shouldReject = totalWeight > 25 || 
                      placeholderPercentage > 30 || 
                      (totalMatches > 15 && !isSubstantialContent);
  
  if (shouldReject) {
    console.log(`❌ REJECTED: Excessive placeholder content (weight: ${totalWeight}, percentage: ${placeholderPercentage.toFixed(2)}%, matches: ${totalMatches})`);
    return true;
  }
  
  // Check repetition with knowledge-aware thresholds
  const uniqueWords = new Set(content.toLowerCase().split(/\s+/)).size;
  const repetitionRatio = uniqueWords / words;
  const minRepetitionRatio = isKnowledgeDocument ? 0.15 : 0.25;
  
  if (repetitionRatio < minRepetitionRatio) {
    console.log(`❌ Content too repetitive: ${uniqueWords} unique words out of ${words} (ratio: ${repetitionRatio.toFixed(3)}, minimum: ${minRepetitionRatio})`);
    return true;
  }
  
  // Check alphabetic content ratio
  const alphabeticChars = (content.match(/[a-zA-Z]/g) || []).length;
  const alphabeticRatio = alphabeticChars / content.length;
  
  if (alphabeticRatio < 0.25) {
    console.log(`❌ Content mostly non-alphabetic: ${alphabeticRatio.toFixed(3)} ratio (minimum: 0.25)`);
    return true;
  }
  
  console.log(`✅ CONTENT VALIDATION PASSED for ${fileName}`);
  console.log(`📈 Final metrics: ${words} words, ${uniqueWords} unique (${repetitionRatio.toFixed(3)} ratio), ${(alphabeticRatio * 100).toFixed(1)}% alphabetic, ${placeholderPercentage.toFixed(2)}% placeholder patterns`);
  
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