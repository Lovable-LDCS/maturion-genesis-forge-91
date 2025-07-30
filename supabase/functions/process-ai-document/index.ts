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
  console.log("✅ Function reached");
  
  // Early diagnostic return to test if function is hit
  if (req.url.includes('diagnostic')) {
    return new Response("Received doc: " + req.headers.get("content-type"), { 
      headers: corsHeaders 
    });
  }
  
  try {
    console.log("✅ Document ingestion function reached");
    console.log(`Request method: ${req.method}`);
    console.log(`Request URL: ${req.url}`);
    
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      console.log("Handling CORS preflight request");
      return new Response(null, { headers: corsHeaders });
    }

    let documentId: string | undefined;
    
    // Set up timeout for the entire operation (90 seconds)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Processing timeout after 90 seconds')), 90000);
    });

    const processingPromise = (async () => {
      console.log('=== Document Processing Started ===');
      console.log('🔧 FULL DEBUG MODE: Enhanced Mammoth.js Pipeline Analysis');
      
      // Parse request body first
      console.log('📄 Parsing request body...');
      const requestBody = await req.json();
      console.log('📄 Request body parsed:', JSON.stringify(requestBody));
      documentId = requestBody.documentId;
      const corruptionRecovery = requestBody.corruptionRecovery || false;
      const validateTextOnly = requestBody.validateTextOnly || true; // Enable by default
      const targetChunkSize = requestBody.targetChunkSize || 2000; // Increased from 1500
      const minChunkSize = requestBody.minChunkSize || 1500; // AI Policy minimum
      
      if (!documentId) {
        throw new Error('documentId is required');
      }

      console.log(`Processing document: ${documentId}`);
      console.log(`Corruption recovery mode: ${corruptionRecovery}`);
      console.log(`Text validation: ${validateTextOnly}`);
      console.log(`Target chunk size: ${targetChunkSize}, Min: ${minChunkSize}`);

      // Initialize Supabase client
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false }
      });

      // Update document status to processing
      await supabase
        .from('ai_documents')
        .update({ 
          processing_status: 'processing', 
          updated_at: new Date().toISOString() 
        })
        .eq('id', documentId);

      console.log('Document status updated to processing');

      // Get the document information
      const { data: document, error: docError } = await supabase
        .from('ai_documents')
        .select('file_path, file_name, title, mime_type, organization_id, document_type')
        .eq('id', documentId)
        .single();

      if (docError || !document) {
        throw new Error(`Document not found: ${docError?.message || 'No document data'}`);
      }

      console.log(`Document found: ${document.title} (${document.mime_type})`);
      console.log(`Document type: ${document.document_type}`);
      
      // Check if this is a governance document requiring relaxed validation
      const isGovernanceDocument = document.document_type === 'governance_reasoning_manifest';
      if (isGovernanceDocument) {
        console.log('📄 Manifest fallback mode activated - Relaxed validation for governance document');
      }

      // Download the file from Supabase storage
      const { data: fileData, error: fileError } = await supabase
        .storage
        .from('ai-documents')
        .download(document.file_path);

      if (fileError || !fileData) {
        throw new Error(`Failed to download file: ${fileError?.message || 'No file data'}`);
      }

      console.log('File downloaded successfully');

      let extractedText = '';
      let extractionMethod = 'unknown';
      let extractionQuality = 'unknown';

      // Extract text based on file type with enhanced Mammoth.js for DOCX
      if (document.mime_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
          document.file_name.endsWith('.docx')) {
        
        console.log('🔧 Processing DOCX file with enhanced Mammoth.js extraction...');
        console.log('📋 DEBUG: File type detected as DOCX, proceeding with Mammoth.js pipeline');
        
        try {
          // Convert file to array buffer for Mammoth.js
          const arrayBuffer = await fileData.arrayBuffer();
          
          // Validate DOCX file signature (ZIP header)
          const uint8Array = new Uint8Array(arrayBuffer);
          const signature = Array.from(uint8Array.slice(0, 4))
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join('');
          
          if (!signature.startsWith('504b')) { // ZIP file signature
            throw new Error('Invalid docx file signature - file may be corrupted');
          }
          
          console.log('✅ DOCX file signature validated - proceeding with Mammoth.js extraction');
          
          // Use Mammoth.js to extract clean text
          console.log('📄 DEBUG: Starting Mammoth.js text extraction...');
          const result = await mammoth.extractRawText({ arrayBuffer });
          extractedText = result.value;
          extractionMethod = 'mammoth_enhanced';
          console.log(`📄 DEBUG: Mammoth.js extraction completed - ${extractedText.length} characters extracted`);
          
          // Quality assessment
          const wordCount = extractedText.split(/\s+/).filter(word => word.length > 0).length;
          const hasStructuralContent = extractedText.includes('MPS') || 
                                     extractedText.includes('Requirement') || 
                                     extractedText.includes('Evidence');
          
          if (wordCount < 100) {
            extractionQuality = 'insufficient_content';
            throw new Error(`Mammoth extraction yielded insufficient content: ${wordCount} words`);
          } else if (hasStructuralContent && wordCount > 500) {
            extractionQuality = 'excellent';
          } else if (wordCount > 200) {
            extractionQuality = 'good';
          } else {
            extractionQuality = 'minimal';
          }
          
          console.log(`✅ Mammoth.js extraction successful: ${wordCount} words, quality: ${extractionQuality}`);
          
        } catch (mammothError: any) {
          console.error('❌ Mammoth.js extraction failed:', mammothError.message);
          extractionMethod = 'mammoth_failed';
          extractionQuality = 'failed';
          
          // STRICT: No fallback - reject corrupted content
          throw new Error(`DOCX processing failed with Mammoth.js: ${mammothError.message}. Enhanced pipeline blocks corrupted content.`);
        }
        
      } else if (document.mime_type === 'text/plain' || document.file_name.endsWith('.txt')) {
        extractedText = await fileData.text();
        extractionMethod = 'text_direct';
        extractionQuality = 'direct';
        console.log('Text file processed directly');
        
      } else if (document.mime_type === 'text/markdown' || document.file_name.endsWith('.md')) {
        extractedText = await fileData.text();
        extractionMethod = 'markdown_direct';
        extractionQuality = 'direct';
        console.log('Markdown file processed directly');
        
      } else {
        throw new Error(`Unsupported file type: ${document.mime_type}. Enhanced pipeline only supports DOCX, TXT, and MD files.`);
      }

      // AI POLICY VALIDATION: Enhanced corruption detection (relaxed for governance documents)
      console.log('🔍 Applying AI Policy validation...');
      console.log(`🔍 DEBUG: Text length: ${extractedText.length} characters, method: ${extractionMethod}`);
      
      // Check for binary content patterns
      const binaryContentRatio = (extractedText.match(/[\x00-\x08\x0E-\x1F\x7F-\xFF]/g) || []).length / extractedText.length;
      const hasXMLArtifacts = extractedText.includes('<?xml') || 
                            extractedText.includes('<w:') || 
                            extractedText.includes('</w:') ||
                            extractedText.includes('<pkg:');
      const hasCorruptedMarkers = extractedText.includes('PK\x03\x04') || 
                                extractedText.includes('\x00') ||
                                extractedText.includes('��');
      
      // VALIDATION based on document type
      console.log(`🔍 DEBUG: Validation checks - Binary ratio: ${(binaryContentRatio * 100).toFixed(2)}%, XML artifacts: ${hasXMLArtifacts}, Corruption markers: ${hasCorruptedMarkers}`);
      
      if (!isGovernanceDocument) {
        // Strict validation for regular documents
        if (binaryContentRatio > 0.1) {
          throw new Error(`BLOCKED: High binary content ratio (${(binaryContentRatio * 100).toFixed(1)}%) - AI Policy violation`);
        }
        
        if (hasXMLArtifacts) {
          throw new Error('BLOCKED: XML artifacts detected - AI Policy violation. Enhanced Mammoth.js should have prevented this.');
        }
        
        if (hasCorruptedMarkers) {
          throw new Error('BLOCKED: File corruption markers detected - AI Policy violation');
        }
        
        if (extractedText.length < minChunkSize) {
          throw new Error(`BLOCKED: Content too short (${extractedText.length} chars, minimum ${minChunkSize}) - AI Policy violation`);
        }
        
         // Additional content quality checks
         const strictWordCount = extractedText.split(/\s+/).filter(word => word.length > 0).length;
         if (strictWordCount < 50) {
           throw new Error(`BLOCKED: Insufficient word count (${strictWordCount} words) - AI Policy violation`);
         }
       } else {
         // Relaxed validation for governance documents
         console.log('📄 GOVERNANCE DOCUMENT: Applying relaxed validation rules');
        
        if (binaryContentRatio > 0.3) { // More lenient
          throw new Error(`BLOCKED: Extremely high binary content ratio (${(binaryContentRatio * 100).toFixed(1)}%) - Even governance documents must be readable`);
        }
        
        if (hasCorruptedMarkers) {
          console.warn('⚠️ GOVERNANCE: Corruption markers detected but proceeding due to governance document type');
        }
        
        if (extractedText.length < 200) { // Much lower minimum
          throw new Error(`BLOCKED: Content too short (${extractedText.length} chars, minimum 200 for governance docs)`);
        }
        
         const governanceWordCount = extractedText.split(/\s+/).filter(word => word.length > 0).length;
         if (governanceWordCount < 20) { // Much lower minimum
           throw new Error(`BLOCKED: Insufficient word count (${governanceWordCount} words, minimum 20 for governance docs)`);
         }
      }
      
      // Calculate word count for later use
      const wordCount = extractedText.split(/\s+/).filter(word => word.length > 0).length;
      console.log(`✅ AI Policy validation passed: ${extractedText.length} chars, ${wordCount} words, extraction: ${extractionMethod}`);
      console.log(`📄 Validation mode: ${isGovernanceDocument ? 'RELAXED (governance)' : 'STRICT (standard)'}`);

      // Clean and normalize the text
      extractedText = extractedText
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      console.log(`Text extraction complete. Length: ${extractedText.length} characters`);

      // Split text into chunks with enhanced logic for governance documents
      let chunks = [];
      
      if (isGovernanceDocument) {
        console.log('📄 GOVERNANCE: Applying enhanced chunking for concept-heavy document');
        chunks = splitGovernanceTextIntoChunks(extractedText, targetChunkSize, 200);
        console.log(`📄 GOVERNANCE: Initial chunking created ${chunks.length} chunks`);
        
        // Fallback chunking if no semantic chunks created
        if (chunks.length === 0) {
          console.log('📄 GOVERNANCE: No semantic chunks created, applying fallback chunking');
          chunks = splitFallbackChunks(extractedText, 800, 100); // 800-1000 character chunks
          console.log(`📄 GOVERNANCE: Fallback chunking created ${chunks.length} chunks`);
        }
      } else {
        chunks = splitTextIntoChunks(extractedText, targetChunkSize, 200);
      }
      
      console.log(`Text split into ${chunks.length} chunks (mode: ${isGovernanceDocument ? 'GOVERNANCE' : 'STANDARD'})`);

      if (chunks.length === 0) {
        if (isGovernanceDocument) {
          // One more fallback for governance docs - just split by paragraphs
          console.log('📄 GOVERNANCE: Final fallback - splitting by paragraphs');
          chunks = extractedText.split(/\n\s*\n/).filter(chunk => chunk.trim().length > 30);
          console.log(`📄 GOVERNANCE: Paragraph split created ${chunks.length} chunks`);
          
          // Absolute last resort for governance documents - create at least one chunk
          if (chunks.length === 0) {
            console.log('📄 GOVERNANCE: EMERGENCY FALLBACK - Creating single chunk from entire content');
            chunks = [extractedText.trim()];
            console.log(`📄 GOVERNANCE: Emergency fallback created ${chunks.length} chunk(s)`);
          }
        }
        
        if (chunks.length === 0) {
          throw new Error('No valid chunks created from document content');
        }
      }

      // Clear any existing chunks for this document (for reprocessing)
      const { error: deleteError } = await supabase
        .from('ai_document_chunks')
        .delete()
        .eq('document_id', documentId);

      if (deleteError) {
        console.warn('Warning: Could not clear existing chunks:', deleteError.message);
      } else {
        console.log('Existing chunks cleared for reprocessing');
      }

      // Generate embeddings and store chunks
      let successfulChunks = 0;
      const chunkPromises = chunks.map(async (chunk, index) => {
        try {
          // Final chunk validation - much more relaxed for governance documents
          const minChunkSizeForValidation = isGovernanceDocument ? 50 : minChunkSize;
          if (chunk.length < minChunkSizeForValidation) {
            console.error(`Skipping chunk ${index}: too short (${chunk.length} chars, min: ${minChunkSizeForValidation})`);
            return null;
          }
          
          console.log(`Processing chunk ${index}: ${chunk.length} chars (${isGovernanceDocument ? 'GOVERNANCE' : 'STANDARD'} mode)`);
          
          // For governance documents, accept even shorter chunks if they contain meaningful content
          if (isGovernanceDocument && chunk.length < 200) {
            const hasHeadings = /^#+\s|\*\*.*\*\*|##|---|•|◦/.test(chunk);
            const hasStructure = /:|;|\.|,|\(|\)/.test(chunk);
            const wordCount = chunk.split(/\s+/).filter(w => w.length > 0).length;
            
            if (wordCount < 5 && !hasHeadings && !hasStructure) {
              console.error(`Skipping governance chunk ${index}: insufficient content (${wordCount} words, no structure)`);
              return null;
            }
            
            console.log(`📄 GOVERNANCE: Accepting short chunk ${index} due to structure/content (${wordCount} words)`);
          }
          
          // Generate embedding
          const embedding = await generateEmbedding(chunk);
          if (!embedding) {
            console.warn(`Failed to generate embedding for chunk ${index}`);
            return null;
          }

          // Generate content hash for chunk
          const encoder = new TextEncoder();
          const data = encoder.encode(chunk);
          const hashBuffer = await crypto.subtle.digest('SHA-256', data);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const contentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

          // Store the chunk
          const { error: chunkError } = await supabase
            .from('ai_document_chunks')
            .insert({
              document_id: documentId,
              content: chunk,
              content_hash: contentHash,
              chunk_index: index,
              embedding: embedding,
              organization_id: document.organization_id,
              metadata: {
                extraction_method: extractionMethod,
                extraction_quality: extractionQuality,
                word_count: chunk.split(/\s+/).filter(word => word.length > 0).length,
                character_count: chunk.length,
                processing_timestamp: new Date().toISOString()
              }
            });

          if (chunkError) {
            console.error(`Error storing chunk ${index}:`, chunkError);
            return null;
          }

          successfulChunks++;
          return { index, success: true };
        } catch (error: any) {
          console.error(`Error processing chunk ${index}:`, error);
          return null;
        }
      });

      const chunkResults = await Promise.all(chunkPromises);
      const validChunks = chunkResults.filter(result => result !== null).length;

      console.log(`Successfully stored ${successfulChunks}/${chunks.length} chunks`);

      // EMERGENCY GOVERNANCE OVERRIDE: Force at least one chunk for governance documents
      if (successfulChunks === 0 && isGovernanceDocument) {
        console.log('🚨 GOVERNANCE EMERGENCY: Zero chunks stored, implementing emergency override');
        
        try {
          // Create a simple chunk from the first 1000 characters
          const emergencyChunk = extractedText.substring(0, Math.min(1000, extractedText.length));
          console.log(`🚨 EMERGENCY CHUNK: ${emergencyChunk.length} characters`);
          
          // Generate content hash
          const encoder = new TextEncoder();
          const data = encoder.encode(emergencyChunk);
          const hashBuffer = await crypto.subtle.digest('SHA-256', data);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const contentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          
          // Store WITHOUT embedding first (embedding might be the problem)
          const { error: emergencyError } = await supabase
            .from('ai_document_chunks')
            .insert({
              document_id: documentId,
              content: emergencyChunk,
              content_hash: contentHash,
              chunk_index: 0,
              embedding: null, // Skip embedding for now
              organization_id: document.organization_id,
              metadata: {
                extraction_method: extractionMethod,
                extraction_quality: 'emergency_override',
                word_count: emergencyChunk.split(/\s+/).filter(word => word.length > 0).length,
                character_count: emergencyChunk.length,
                processing_timestamp: new Date().toISOString(),
                governance_emergency: true
              }
            });
            
          if (!emergencyError) {
            successfulChunks = 1;
            console.log('🚨 EMERGENCY CHUNK: Successfully stored emergency governance chunk without embedding');
          } else {
            console.error('🚨 EMERGENCY CHUNK FAILED:', emergencyError);
          }
        } catch (emergencyError: any) {
          console.error('🚨 EMERGENCY OVERRIDE FAILED:', emergencyError.message);
        }
      }

      // Update document status
      if (successfulChunks > 0) {
        await supabase
          .from('ai_documents')
          .update({
            processing_status: 'completed',
            processed_at: new Date().toISOString(),
            total_chunks: successfulChunks,
            updated_at: new Date().toISOString(),
            metadata: {
              extraction_method: extractionMethod,
              extraction_quality: extractionQuality,
              original_length: extractedText.length,
              word_count: wordCount,
              processing_duration_ms: Date.now(),
              ai_policy_compliant: true,
              document_type: document.document_type,
              governance_mode: isGovernanceDocument,
              emergency_override_used: successfulChunks === 1 && isGovernanceDocument
            }
          })
          .eq('id', documentId);

        console.log('✅ Document processing completed successfully');
        return { success: true, chunks: successfulChunks, emergency_override: successfulChunks === 1 && isGovernanceDocument };
      } else {
        await supabase
          .from('ai_documents')
          .update({
            processing_status: 'failed',
            updated_at: new Date().toISOString(),
            metadata: {
              error: 'No valid chunks created',
              extraction_method: extractionMethod,
              processing_duration_ms: Date.now()
            }
          })
          .eq('id', documentId);

        throw new Error('No valid chunks were created from the document');
      }
    })();

    // Race between processing and timeout
    await Promise.race([processingPromise, timeoutPromise]);
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: `Document ${documentId} processed successfully` 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error: any) {
    console.error('❌ CRITICAL ERROR in process-ai-document function:', error.message);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Full error object:', JSON.stringify(error, null, 2));
    
    let documentId: string | undefined;
    
    // Try to extract documentId from the error context if possible
    try {
      const requestBody = await req.json();
      documentId = requestBody.documentId;
    } catch {
      // If we can't parse the body, documentId remains undefined
    }
    
    // Update document status to failed if we have a documentId
    if (documentId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey, {
          auth: { persistSession: false }
        });
        
        await supabase
          .from('ai_documents')
          .update({
            processing_status: 'failed',
            updated_at: new Date().toISOString(),
            metadata: {
              error: error.message,
              processing_duration_ms: Date.now()
            }
          })
          .eq('id', documentId);
      } catch (updateError) {
        console.error('Failed to update document status:', updateError);
      }
    }
    
    return new Response(JSON.stringify({ 
      error: error.message || 'Unknown processing error',
      documentId: documentId || 'unknown'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Function to split text into chunks
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

// Enhanced governance document chunking function
function splitGovernanceTextIntoChunks(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  
  // First try to split by headings and structure
  const sections = text.split(/(?=^#{1,6}\s|\n•|\n-|\n\d+\.|\nSection|\nChapter)/gm);
  
  for (const section of sections) {
    const trimmedSection = section.trim();
    if (trimmedSection.length === 0) continue;
    
    if (trimmedSection.length <= chunkSize) {
      // Section fits in one chunk
      chunks.push(trimmedSection);
    } else {
      // Split large sections by paragraphs
      const paragraphs = trimmedSection.split(/\n\s*\n/);
      let currentChunk = '';
      
      for (const paragraph of paragraphs) {
        if ((currentChunk + paragraph).length <= chunkSize) {
          currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
        } else {
          if (currentChunk) {
            chunks.push(currentChunk.trim());
          }
          currentChunk = paragraph;
        }
      }
      
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
    }
  }
  
  return chunks.filter(chunk => chunk.length > 30); // Very permissive filter for governance docs
}

// Fallback chunking for when semantic splitting fails
function splitFallbackChunks(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  let startIndex = 0;
  
  while (startIndex < text.length) {
    const endIndex = Math.min(startIndex + chunkSize, text.length);
    let chunk = text.slice(startIndex, endIndex);
    
    // Try to end at a sentence boundary if possible
    if (endIndex < text.length) {
      const nextPeriod = chunk.lastIndexOf('.');
      const nextNewline = chunk.lastIndexOf('\n');
      const boundary = Math.max(nextPeriod, nextNewline);
      
      if (boundary > chunkSize * 0.7) { // Don't truncate too much
        chunk = chunk.slice(0, boundary + 1);
      }
    }
    
    if (chunk.trim().length > 50) { // Very relaxed minimum for governance docs
      chunks.push(chunk.trim());
    }
    
    startIndex += chunk.length - overlap;
    
    // Safety check
    if (startIndex <= 0) {
      startIndex = endIndex;
    }
  }
  
  return chunks;
}