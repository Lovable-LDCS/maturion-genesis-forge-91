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

serve(async (req: Request): Promise<Response> => {
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
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Processing timeout after 90 seconds')), 90000);
    });

    const processingPromise = async () => {
      console.log('=== Document Processing Started ===');
      console.log('🔧 FULL DEBUG MODE: Enhanced Mammoth.js Pipeline Analysis');
      
      // Parse request body first
      console.log('📄 Parsing request body...');
      const requestBody = await req.json();
      console.log('📄 Request body parsed:', JSON.stringify(requestBody));
      documentId = requestBody.documentId;
      const corruptionRecovery = requestBody.corruptionRecovery || false;
      
      console.log('Text validation:', !!requestBody.documentId);
      console.log('Corruption recovery mode:', corruptionRecovery);
      
      if (!documentId) {
        throw new Error('No documentId provided');
      }

      console.log('Processing document:', documentId);
      
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
      
      console.log('Target chunk size: 2000, Min: 1500');
      
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false }
      });

      // Update document status
      await supabase
        .from('ai_documents')
        .update({ 
          processing_status: 'processing', 
          updated_at: new Date().toISOString() 
        })
        .eq('id', documentId);

      console.log('Document status updated to processing');

      // Fetch document details
      const { data: document, error: docError } = await supabase
        .from('ai_documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (docError || !document) {
        throw new Error(`Document not found: ${docError?.message}`);
      }

      console.log(`Document found: ${document.title} (${document.mime_type})`);
      console.log('Document type:', document.document_type);

      // Check if it's a governance document for special handling
      const isGovernanceDocument = document.document_type === 'governance' || 
        document.title.toLowerCase().includes('governance') ||
        document.title.toLowerCase().includes('policy');

      if (isGovernanceDocument) {
        console.log('🏛️ GOVERNANCE DOCUMENT DETECTED: Applying specialized processing rules');
      }

      // Download file from Supabase Storage
      const { data: fileData, error: fileError } = await supabase.storage
        .from('ai_documents')
        .download(document.file_path);

      if (fileError || !fileData) {
        throw new Error(`Failed to download file: ${fileError?.message}`);
      }

      console.log('File downloaded successfully');

      let extractedText = '';
      let extractionMethod = 'unknown';

      // Enhanced text extraction with mammoth.js for .docx files
      if (document.mime_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
          document.file_name.endsWith('.docx')) {
        
        console.log('🔧 Processing DOCX file with enhanced mammoth.js extraction...');
        
        try {
          const arrayBuffer = await fileData.arrayBuffer();
          
          // Check if it's actually a valid ZIP file (DOCX format)
          const uint8Array = new Uint8Array(arrayBuffer);
          const signature = Array.from(uint8Array.slice(0, 4))
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join('');
          
          if (!signature.startsWith('504b')) { // ZIP file signature
            console.warn('⚠️ File does not have DOCX signature, falling back to text extraction');
            extractedText = new TextDecoder().decode(arrayBuffer);
            extractionMethod = 'text_fallback';
          } else {
            const result = await mammoth.extractRawText({ arrayBuffer });
            extractedText = result.value;
            extractionMethod = 'mammoth_docx';
            
            console.log(`📄 DOCX text extraction successful: ${extractedText.length} characters`);
            
            // Additional quality checks for DOCX
            const wordCount = extractedText.split(/\s+/).filter(word => word.length > 0).length;
            const hasStructuralContent = /(?:section|chapter|heading|title|paragraph)/i.test(extractedText);
            
            if (wordCount < 100) {
              extractionMethod = 'mammoth_docx_minimal';
            } else if (hasStructuralContent && wordCount > 500) {
              extractionMethod = 'mammoth_docx_rich';
            } else if (wordCount > 200) {
              extractionMethod = 'mammoth_docx_standard';
            } else {
              extractionMethod = 'mammoth_docx_basic';
            }
          }
        } catch (mammothError: any) {
          console.error('❌ Mammoth.js extraction failed:', mammothError.message);
          console.log('🔄 Falling back to raw text extraction...');
          
          const arrayBuffer = await fileData.arrayBuffer();
          extractedText = new TextDecoder().decode(arrayBuffer);
          extractionMethod = 'docx_emergency_fallback';
        }
        
      } else if (document.mime_type === 'text/plain' || document.file_name.endsWith('.txt')) {
        console.log('📄 Processing plain text file...');
        extractedText = await fileData.text();
        extractionMethod = 'plain_text';
        
      } else if (document.mime_type === 'text/markdown' || document.file_name.endsWith('.md')) {
        console.log('📄 Processing Markdown file...');
        extractedText = await fileData.text();
        extractionMethod = 'markdown';
        
      } else if (document.mime_type === 'application/pdf' || document.file_name.endsWith('.pdf')) {
        console.log('🔧 Processing PDF file with emergency text extraction...');
        
        try {
          const arrayBuffer = await fileData.arrayBuffer();
          const text = new TextDecoder().decode(arrayBuffer);
          extractedText = text.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
          extractionMethod = 'pdf_emergency';
          console.log(`📄 PDF emergency processing: ${extractedText.length} characters (fallback mode)`);
        } catch (pdfError: any) {
          console.error('❌ PDF emergency extraction failed:', pdfError.message);
          console.log('🚨 Using minimal fallback extraction...');
          
          extractedText = `Document processing failed for PDF: ${document.title}. Manual review required.`;
          extractionMethod = 'pdf_extraction_failed';
        }
        
      } else {
        console.log('⚠️ Unsupported file type, attempting raw text extraction...');
        try {
          extractedText = await fileData.text();
          extractionMethod = 'unsupported_text_attempt';
        } catch {
          extractedText = `Unsupported file type: ${document.mime_type}. Manual processing required.`;
          extractionMethod = 'unsupported_emergency';
        }
      }

      console.log(`🔍 DEBUG: Text length: ${extractedText.length} characters, method: ${extractionMethod}`);

      // Force emergency chunking for certain extraction methods
      const isForcedEmergency = extractionMethod === 'pdf_emergency' || extractionMethod === 'emergency_fallback' || extractionMethod === 'unsupported_emergency';
      
      if (isForcedEmergency) {
        console.log('🚨 EMERGENCY MODE: minChunkSize adjusted to 30 characters');
      } else {
        console.log('📊 STANDARD MODE: Normal validation applied');
      }

      // Apply AI Policy validation
      console.log('🔍 Applying AI Policy validation...');
      
      // For PDFs and unsupported types, force chunk creation regardless of content quality
      if (extractionMethod === 'pdf_emergency' || extractionMethod === 'unsupported_emergency' || extractionMethod === 'pdf_extraction_failed' || document.mime_type === 'application/pdf') {
        console.log('🚨 FORCING EMERGENCY CHUNK CREATION FOR PDF/UNSUPPORTED - BYPASSING ALL VALIDATION');
        
        // Create emergency chunk regardless of content quality
        let emergencyChunkText = '';
        
        if (extractedText && extractedText.length > 10) {
          emergencyChunkText = extractedText.substring(0, 2000);
        } else {
          emergencyChunkText = `[Forced fallback chunk – low quality]\n\nDocument: ${document.title}\nFile Type: ${document.mime_type}\nExtraction Method: emergency_pdf_override\nNote: Content extraction was limited. Manual review recommended.\n\nOriginal extracted content (${extractedText.length} chars): ${extractedText.substring(0, 500)}`;
        }
        
        console.log(`📋 Emergency chunk text length: ${emergencyChunkText.length} characters`);
        
        // Delete existing chunks
        await supabase
          .from('ai_document_chunks')
          .delete()
          .eq('document_id', documentId);

        console.log('🗑️ Existing chunks deleted for emergency processing');

        // Insert emergency chunk with comprehensive metadata
        const { error: chunkError } = await supabase
          .from('ai_document_chunks')
          .insert({
            document_id: documentId,
            organization_id: document.organization_id,
            content: emergencyChunkText,
            chunk_index: 0,
            content_hash: `emergency_${Date.now()}`,
            metadata: {
              extraction_method: 'emergency_pdf_override',
              extraction_quality: 'poor',
              reason: 'forced_emergency_override',
              quality_score: 0,
              forced_emergency_override: true,
              manual_review_required: true,
              original_extraction_method: extractionMethod,
              original_text_length: extractedText.length,
              file_type: document.mime_type,
              processing_timestamp: new Date().toISOString()
            }
          });

        if (chunkError) {
          console.error('❌ Error creating emergency chunk:', chunkError);
          throw chunkError;
        }

        console.log('✅ Emergency chunk created successfully');

        // Update document status with emergency metadata
        await supabase
          .from('ai_documents')
          .update({
            processing_status: 'completed',
            updated_at: new Date().toISOString(),
            metadata: {
              chunks_created: 1,
              extraction_method: 'emergency_pdf_override',
              forced_emergency_override: true,
              quality_score: 0,
              processing_duration_ms: Date.now(),
              emergency_processing_reason: 'PDF content below quality threshold - forced chunk creation'
            }
          })
          .eq('id', documentId);

        console.log('✅ Document status updated with emergency metadata');
        return { success: true, chunks: 1, emergency_override: true, quality_score: 0 };
      }

      // Standard validation for other file types
      const binaryContentRatio = extractedText.length > 0 ? 
        (extractedText.match(/[\x00-\x08\x0E-\x1F\x7F-\xFF]/g) || []).length / extractedText.length : 0;
      
      console.log(`🔍 DEBUG: Validation checks - Binary ratio: ${(binaryContentRatio * 100).toFixed(2)}%, XML artifacts: ${/(<[^>]+>|&[a-zA-Z]+;)/g.test(extractedText)}, Corruption markers: ${/(\uFFFD|\\x[0-9A-Fa-f]{2}|[\x00-\x08\x0E-\x1F])/g.test(extractedText)}`);

      if (!isGovernanceDocument) {
        if (binaryContentRatio > 0.1) {
          throw new Error(`BLOCKED: High binary content ratio (${(binaryContentRatio * 100).toFixed(1)}%) - AI Policy violation`);
        }
        
        const hasXMLArtifacts = /(<[^>]+>|&[a-zA-Z]+;)/g.test(extractedText);
        if (hasXMLArtifacts) {
          throw new Error('BLOCKED: Contains XML/HTML artifacts - AI Policy violation');
        }
        
        const hasCorruptedMarkers = /(\uFFFD|\\x[0-9A-Fa-f]{2}|[\x00-\x08\x0E-\x1F])/g.test(extractedText);
        if (hasCorruptedMarkers) {
          throw new Error('BLOCKED: Contains corruption markers - AI Policy violation');
        }
        
        const emergencyMinLength = isForcedEmergency ? 50 : 500;
        if (extractedText.length < emergencyMinLength) {
          throw new Error(`BLOCKED: Content too short (${extractedText.length} chars, minimum ${emergencyMinLength}) - AI Policy violation`);
        }
        
        const strictWordCount = extractedText.split(/\s+/).filter(word => word.length > 0).length;
        const emergencyMinWords = (extractionMethod === 'pdf_emergency' || extractionMethod === 'emergency_fallback' || extractionMethod === 'unsupported_emergency') ? 5 : 50;
        
        if (strictWordCount < emergencyMinWords) {
          throw new Error(`BLOCKED: Insufficient word count (${strictWordCount} words, minimum ${emergencyMinWords}) - AI Policy violation`);
        }
      } else {
        // Relaxed validation for governance documents
        console.log('📄 GOVERNANCE DOCUMENT: Applying relaxed validation rules');
        
        if (binaryContentRatio > 0.3) {
          throw new Error(`BLOCKED: Extremely high binary content ratio (${(binaryContentRatio * 100).toFixed(1)}%) - Even governance documents must be readable`);
        }
        
        const hasCorruptedMarkers = /(\uFFFD|\\x[0-9A-Fa-f]{2}|[\x00-\x08\x0E-\x1F])/g.test(extractedText);
        if (hasCorruptedMarkers) {
          console.warn('⚠️ GOVERNANCE: Corruption markers detected but proceeding due to governance document type');
        }
        
        if (extractedText.length < 200) {
          throw new Error(`BLOCKED: Governance document too short (${extractedText.length} chars, minimum 200) - AI Policy violation`);
        }
        
        const governanceWordCount = extractedText.split(/\s+/).filter(word => word.length > 0).length;
        if (governanceWordCount < 20) {
          throw new Error(`BLOCKED: Governance document insufficient content (${governanceWordCount} words, minimum 20) - AI Policy violation`);
        }
      }

      console.log('✅ AI Policy validation passed');

      // Text chunking
      const targetChunkSize = 2000;
      const overlap = 200;
      const minChunkSizeForValidation = isForcedEmergency ? 30 : 1500;

      let chunks: string[] = [];

      // Special handling for governance documents
      if (isGovernanceDocument) {
        console.log('🏛️ GOVERNANCE: Applying specialized chunking strategy');
        chunks = splitTextIntoChunks(extractedText, targetChunkSize, overlap);
        
        if (chunks.length === 0) {
          console.log('🚨 GOVERNANCE: Emergency single chunk creation');
          chunks = [extractedText];
        }
      } else {
        chunks = splitTextIntoChunks(extractedText, targetChunkSize, overlap);
      }

      if (chunks.length === 0) {
        console.log('🚨 EMERGENCY: Creating minimal fallback chunk');
        chunks = [`Document: ${document.title}\nContent: Processing failed, manual review required.`];
      }

      console.log(`📄 Created ${chunks.length} chunks for processing`);

      // Delete existing chunks
      const { error: deleteError } = await supabase
        .from('ai_document_chunks')
        .delete()
        .eq('document_id', documentId);

      if (deleteError) {
        console.error('⚠️ Error deleting existing chunks:', deleteError);
      } else {
        console.log('🗑️ Existing chunks deleted successfully');
      }

      // Process chunks and create embeddings
      const chunkPromises = chunks.map(async (chunk, index) => {
        try {
          console.log(`📦 Processing chunk ${index + 1}/${chunks.length}: ${chunk.length} characters`);

          // Validate chunk size
          if (chunk.length < minChunkSizeForValidation) {
            console.warn(`⚠️ Chunk ${index + 1} below minimum size (${chunk.length} < ${minChunkSizeForValidation}), but proceeding due to emergency mode`);
          }

          // Create embedding
          let embedding: number[] | null = null;
          const isEmergencyMode = extractionMethod === 'fallback_pdf_emergency';
          
          if (!isEmergencyMode && chunk.length >= 100) {
            embedding = await generateEmbedding(chunk);
            if (!embedding) {
              console.warn(`⚠️ Failed to generate embedding for chunk ${index + 1}`);
            }
          } else {
            console.log(`📊 Skipping embedding for chunk ${index + 1} (emergency mode or insufficient content)`);
          }

          // Insert chunk into database
          const { data: chunkData, error: chunkError } = await supabase
            .from('ai_document_chunks')
            .insert({
              document_id: documentId,
              organization_id: document.organization_id,
              content: chunk,
              chunk_index: index,
              content_hash: `chunk_${index}_${Date.now()}`,
              metadata: {
                extraction_method: extractionMethod,
                chunk_size: chunk.length,
                is_governance: isGovernanceDocument,
                extraction_quality: isEmergencyMode ? 'poor' : 'standard',
                reason: isEmergencyMode ? 'content_too_short_but_forced' : 'normal_processing'
              }
            })
            .select()
            .single();

          if (chunkError) {
            console.error(`❌ Error inserting chunk ${index + 1}:`, chunkError);
            throw chunkError;
          }

          console.log(`✅ Chunk ${index + 1} inserted successfully with ID: ${chunkData.id}`);
          return chunkData;

        } catch (error: any) {
          console.error(`❌ Error processing chunk ${index + 1}:`, error.message);
          throw error;
        }
      });

      // Wait for all chunks to be processed
      const processedChunks = await Promise.all(chunkPromises);
      console.log(`✅ All ${processedChunks.length} chunks processed successfully`);

      // Verify final chunk count
      const { count: finalChunkCount, error: verifyError } = await supabase
        .from('ai_document_chunks')
        .select('*', { count: 'exact' })
        .eq('document_id', documentId);

      if (verifyError) {
        console.error('❌ Error verifying chunk count:', verifyError);
      } else {
        console.log(`🔍 Verification: ${finalChunkCount} chunks confirmed in database`);
      }

      // Update document status to completed
      const updateResult = await supabase
        .from('ai_documents')
        .update({
          processing_status: 'completed',
          updated_at: new Date().toISOString(),
          metadata: {
            chunks_created: finalChunkCount,
            extraction_method: extractionMethod,
            processing_duration_ms: Date.now()
          }
        })
        .eq('id', documentId);

      if (updateResult.error) {
        console.error('❌ FAILED TO UPDATE DOCUMENT STATUS:', updateResult.error);
      } else {
        console.log('✅ DOCUMENT STATUS UPDATED SUCCESSFULLY');
      }

      console.log('✅ Document processing completed successfully');
      return { success: true, chunks: finalChunkCount || 0, emergency_override: false };
    };

    // Race between processing and timeout
    const result = await Promise.race([processingPromise(), timeoutPromise]);
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: `Document ${documentId} processed successfully`,
      ...result
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error: any) {
    console.error('❌ CRITICAL ERROR in process-ai-document function:', error.message);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Full error object:', JSON.stringify(error, null, 2));
    
    // Try to extract documentId from the error context if possible
    if (!documentId) {
      try {
        const requestBody = await req.json();
        documentId = requestBody.documentId;
      } catch {
        // If we can't parse the body, documentId remains undefined
      }
    }
    
    // Update document status to failed if we have documentId
    if (documentId) {
      try {
        console.log(`🔄 Updating document status to failed for: ${documentId}`);
        
        const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
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
        console.error('❌ Failed to update document status:', updateError);
      }
    }

    return new Response(JSON.stringify({ 
      success: false, 
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
    
    // Prevent infinite loop
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
    console.warn('⚠️ OpenAI API key not found, skipping embedding generation');
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
        model: 'text-embedding-ada-002'
      })
    });

    if (!response.ok) {
      console.error(`❌ OpenAI API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error: any) {
    console.error('❌ Error generating embedding:', error.message);
    return null;
  }
}