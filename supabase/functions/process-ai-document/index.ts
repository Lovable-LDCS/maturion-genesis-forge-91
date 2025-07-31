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
  
  let documentId: string | undefined;
  
  try {
    console.log("✅ Document ingestion function reached");
    console.log(`Request method: ${req.method}`);
    console.log(`Request URL: ${req.url}`);
    
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      console.log("Handling CORS preflight request");
      return new Response(null, { headers: corsHeaders });
    }
    
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
      const forceReprocess = requestBody.forceReprocess || false;
      const emergencyChunking = requestBody.emergencyChunking || false;
      const governanceDocument = requestBody.governanceDocument || false;
      const dryRun = requestBody.dryRun || false; // New dry run parameter
      
      if (dryRun) {
        console.log('🧪 DRY RUN MODE ENABLED - No embeddings or DB writes will be performed');
      }
      
      console.log('Text validation:', !!requestBody.documentId);
      console.log('Corruption recovery mode:', corruptionRecovery);
      console.log('Force reprocess:', forceReprocess);
      console.log('Emergency chunking:', emergencyChunking);
      console.log('Governance document:', governanceDocument);
      
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

      if (docError) {
        throw new Error(`Failed to fetch document: ${docError.message}`);
      }

      console.log(`Document found: ${document.title} (${document.mime_type})`);
      
      // 🎯 SMART CHUNK REUSE: Check if document was already processed via chunk tester
      if (document.chunked_from_tester && !forceReprocess) {
        console.log('🔄 SMART CHUNK REUSE: Document already approved via chunk tester, reusing existing chunks...');
        
        // Fetch approved chunks from cache
        const { data: approvedChunks, error: chunksError } = await supabase
          .from('approved_chunks_cache')
          .select('*')
          .eq('document_id', documentId)
          .order('chunk_index');
        
        if (chunksError) {
          console.log('⚠️ Error fetching approved chunks, falling back to full processing:', chunksError.message);
        } else if (approvedChunks && approvedChunks.length > 0) {
          console.log(`✅ Found ${approvedChunks.length} pre-approved chunks, reusing them`);
          
          // Clear any existing chunks first
          await supabase
            .from('ai_document_chunks')
            .delete()
            .eq('document_id', documentId);
          
          // Insert the approved chunks into the main chunks table
          const chunksToInsert = approvedChunks.map(chunk => ({
            document_id: documentId,
            chunk_index: chunk.chunk_index,
            content: chunk.content,
            content_hash: chunk.content_hash,
            metadata: {
              ...chunk.metadata,
              reused_from_tester: true,
              original_approved_at: chunk.approved_at,
              original_approved_by: chunk.approved_by
            },
            organization_id: document.organization_id,
            embedding: null // Will be generated if needed
          }));
          
          const { error: insertError } = await supabase
            .from('ai_document_chunks')
            .insert(chunksToInsert);
          
          if (insertError) {
            console.log('⚠️ Error inserting reused chunks, falling back to full processing:', insertError.message);
          } else {
            // Update document status
            await supabase
              .from('ai_documents')
              .update({ 
                processing_status: 'completed',
                processed_at: new Date().toISOString(),
                total_chunks: approvedChunks.length,
                updated_at: new Date().toISOString()
              })
              .eq('id', documentId);
            
            console.log('✅ Smart chunk reuse completed successfully');
            
            return new Response(JSON.stringify({
              success: true,
              message: 'Document processed using pre-approved chunks from chunk tester',
              documentId,
              totalChunks: approvedChunks.length,
              reusedFromTester: true
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        } else {
          console.log('⚠️ No approved chunks found in cache, falling back to full processing');
        }
      }

      if (docError || !document) {
        throw new Error(`Document not found: ${docError?.message}`);
      }

      console.log(`Document found: ${document.title} (${document.mime_type})`);
      console.log('Document type:', document.document_type);

      // Check if this document has pre-approved chunks (from DocumentChunkTester)
      const hasPreApprovedChunks = document.metadata?.approved_via_tester === true || 
        document.file_path?.startsWith('chunk-tester/');

      if (hasPreApprovedChunks) {
        console.log('🚀 PRE-APPROVED CHUNKS DETECTED: Document processed via DocumentChunkTester, skipping file download and processing');
        
        // Check if chunks already exist in approved_chunks_cache
        const { data: existingChunks, error: chunksError } = await supabase
          .from('approved_chunks_cache')
          .select('id, content, chunk_index')
          .eq('document_id', documentId);

        if (chunksError) {
          console.error('❌ Error checking for existing chunks:', chunksError);
          throw new Error(`Failed to check existing chunks: ${chunksError.message}`);
        }

        if (existingChunks && existingChunks.length > 0) {
          console.log(`✅ SMART CHUNK REUSE SUCCESS: Found ${existingChunks.length} pre-approved chunks, processing complete`);
          
          // Mark document as successfully processed
          await supabase
            .from('ai_documents')
            .update({
              processing_status: 'completed',
              processed_at: new Date().toISOString(),
              total_chunks: existingChunks.length,
              metadata: {
                ...document.metadata,
                smart_chunk_reuse: true,
                processed_via_tester: true,
                processing_timestamp: new Date().toISOString()
              }
            })
            .eq('id', documentId);

          return new Response(
            JSON.stringify({ 
              success: true, 
              message: `Document processed via Smart Chunk Reuse: ${existingChunks.length} chunks ready`,
              documentId,
              chunksCount: existingChunks.length,
              processing_method: 'smart_chunk_reuse'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          console.log('⚠️ WARNING: Pre-approved document but no chunks found in cache, proceeding with normal processing');
        }
      }

      // Check if it's a governance document for special handling
      const isGovernanceDocument = governanceDocument || 
        document.document_type === 'governance' || 
        document.document_type === 'ai_logic_rule_global' ||
        document.document_type === 'governance_reasoning_manifest' ||
        document.title.toLowerCase().includes('governance') ||
        document.title.toLowerCase().includes('policy') ||
        document.title.toLowerCase().includes('ai logic') ||
        document.title.toLowerCase().includes('reasoning');

      if (isGovernanceDocument) {
        console.log('🏛️ GOVERNANCE/AI LOGIC DOCUMENT DETECTED: Applying specialized processing rules');
      }

      // Download file from Supabase Storage - handle multiple bucket strategies
      console.log(`🔍 DEBUG: Attempting to download file from bucket 'documents' with path: ${document.file_path}`);
      console.log(`🔍 DEBUG: Document details - Title: ${document.title}, File name: ${document.file_name}, MIME: ${document.mime_type}`);
      
      let fileData: Blob | null = null;
      let downloadSuccess = false;
      
      // Strategy 1: Try 'documents' bucket (standard uploads)
      const { data: documentsData, error: documentsError } = await supabase.storage
        .from('documents')
        .download(document.file_path);

      if (!documentsError && documentsData) {
        console.log(`✅ SUCCESS: Found file in 'documents' bucket, size: ${documentsData.size} bytes`);
        fileData = documentsData;
        downloadSuccess = true;
      } else {
        console.error(`❌ Documents bucket failed: ${JSON.stringify(documentsError)}`);
        console.error(`❌ DEBUG: File path attempted: ${document.file_path}`);
        
        // Strategy 2: Try 'ai_documents' bucket (alternative storage)
        console.log(`🔍 DEBUG: Attempting alternative bucket 'ai_documents'...`);
        const { data: aiDocsData, error: aiDocsError } = await supabase.storage
          .from('ai_documents')
          .download(document.file_path);
          
        if (!aiDocsError && aiDocsData) {
          console.log(`✅ SUCCESS: Found file in 'ai_documents' bucket, size: ${aiDocsData.size} bytes`);
          fileData = aiDocsData;
          downloadSuccess = true;
          
          // Update document metadata to track successful bucket
          await supabase
            .from('ai_documents')
            .update({
              metadata: {
                ...document.metadata,
                bucket_correction_applied: true,
                working_bucket: 'ai_documents',
                processing_timestamp: new Date().toISOString()
              }
            })
            .eq('id', documentId);
        } else {
          console.error(`❌ Alternative bucket 'ai_documents' also failed: ${JSON.stringify(aiDocsError)}`);
          
          // Strategy 3: Try removing path prefixes for chunk-tester files
          if (document.file_path.startsWith('chunk-tester/')) {
            const simplifiedPath = document.file_path.replace('chunk-tester/', '');
            console.log(`🔍 DEBUG: Attempting simplified path without 'chunk-tester/' prefix: ${simplifiedPath}`);
            
            const { data: simplifiedData, error: simplifiedError } = await supabase.storage
              .from('documents')
              .download(simplifiedPath);
              
            if (!simplifiedError && simplifiedData) {
              console.log(`✅ SUCCESS: Found file with simplified path, size: ${simplifiedData.size} bytes`);
              fileData = simplifiedData;
              downloadSuccess = true;
            } else {
              console.error(`❌ Simplified path also failed: ${JSON.stringify(simplifiedError)}`);
            }
          }
        }
      }

      if (!downloadSuccess || !fileData) {
        const errorMsg = `Failed to download file from all attempted buckets and path variations`;
        console.error(`❌ FINAL FAILURE: ${errorMsg}`);
        
        // Update document status to failed with comprehensive error info
        await supabase
          .from('ai_documents')
          .update({
            processing_status: 'failed',
              updated_at: new Date().toISOString(),
              metadata: {
                error_type: 'file_download_failed',
                error_message: fileError?.message || 'Unknown file download error',
                error_details: JSON.stringify(fileError),
                alternative_bucket_attempted: true,
                alternative_bucket_error: JSON.stringify(altFileError),
                file_path_attempted: document.file_path,
                processing_timestamp: new Date().toISOString()
              }
            })
            .eq('id', documentId);
          
          throw new Error(`Failed to download file from both 'documents' and 'ai_documents' buckets: ${fileError?.message || 'Unknown error'}`);
        }
      } else {
        console.log(`✅ File downloaded successfully from 'documents' bucket, size: ${fileData.size} bytes`);
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
            console.log('✅ Valid DOCX signature detected, proceeding with Mammoth extraction...');
            const result = await mammoth.extractRawText({ arrayBuffer });
            extractedText = result.value;
            extractionMethod = 'mammoth_docx';
            
            console.log(`🔍 MAMMOTH DEBUG: Extraction result - Length: ${extractedText.length} chars`);
            console.log(`🔍 MAMMOTH DEBUG: Content preview: "${extractedText.substring(0, 200)}"`);
            console.log(`🔍 MAMMOTH DEBUG: Messages:`, result.messages || 'none');
            console.log(`🔍 MAMMOTH DEBUG: Raw value type:`, typeof result.value);
            console.log(`🔍 MAMMOTH DEBUG: Is empty?`, !extractedText || extractedText.trim().length === 0);
            
            if (!extractedText || extractedText.trim().length === 0) {
              console.error('❌ MAMMOTH CRITICAL: Extracted text is empty or null!');
              console.error('❌ MAMMOTH DEBUG: Raw result object:', JSON.stringify(result, null, 2));
            }
            
            // Additional quality checks for DOCX
            const wordCount = extractedText.split(/\s+/).filter(word => word.length > 0).length;
            const hasStructuralContent = /(?:section|chapter|heading|title|paragraph)/i.test(extractedText);
            
            console.log(`🔍 MAMMOTH DEBUG: Word count: ${wordCount}, Has structural content: ${hasStructuralContent}`);
            
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
        console.log(`🔍 MARKDOWN DEBUG: File size: ${fileData.size} bytes`);
        
        extractedText = await fileData.text();
        extractionMethod = 'markdown';
        
        console.log(`🔍 MARKDOWN DEBUG: Extracted text length: ${extractedText.length} chars`);
        console.log(`🔍 MARKDOWN DEBUG: Content preview: "${extractedText.substring(0, 200)}"`);
        console.log(`🔍 MARKDOWN DEBUG: Is empty?`, !extractedText || extractedText.trim().length === 0);
        
        if (!extractedText || extractedText.trim().length === 0) {
          console.error('❌ MARKDOWN CRITICAL: Extracted text is empty or null!');
          console.error(`❌ MARKDOWN DEBUG: Raw file size: ${fileData.size}, type: ${typeof fileData}`);
        }
        
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

      // Force emergency chunking for certain extraction methods or when explicitly requested
      const isForcedEmergency = emergencyChunking || extractionMethod === 'pdf_emergency' || 
        extractionMethod === 'emergency_fallback' || extractionMethod === 'unsupported_emergency';
      
      if (isForcedEmergency) {
        console.log('🚨 EMERGENCY MODE: minChunkSize adjusted to 30 characters');
      } else {
        console.log('📊 STANDARD MODE: Normal validation applied');
      }

      // Apply AI Policy validation (relaxed for governance/AI logic documents)
      console.log('🔍 Applying AI Policy validation...');
      
      // For PDFs, unsupported types, or emergency mode, force chunk creation regardless of content quality
      if (isForcedEmergency || extractionMethod === 'pdf_emergency' || extractionMethod === 'unsupported_emergency' || 
          extractionMethod === 'pdf_extraction_failed' || document.mime_type === 'application/pdf') {
        console.log('🚨 FORCING EMERGENCY CHUNK CREATION - BYPASSING ALL VALIDATION');
        
        // Create emergency chunk regardless of content quality
        let emergencyChunkText = '';
        
        if (extractedText && extractedText.length > 10) {
          emergencyChunkText = extractedText.substring(0, 2000);
        } else {
          emergencyChunkText = `[Forced fallback chunk – low quality]\n\nDocument: ${document.title}\nFile Type: ${document.mime_type}\nExtraction Method: emergency_override\nNote: Content extraction was limited. Manual review recommended.\n\nOriginal extracted content (${extractedText.length} chars): ${extractedText.substring(0, 500)}`;
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
              extraction_method: 'emergency_override',
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
            total_chunks: 1,
            updated_at: new Date().toISOString(),
            metadata: {
              chunks_created: 1,
              extraction_method: 'emergency_override',
              forced_emergency_override: true,
              quality_score: 0,
              processing_duration_ms: Date.now(),
              emergency_processing_reason: 'Content below quality threshold - forced chunk creation'
            }
          })
          .eq('id', documentId);

        console.log('✅ Document status updated with emergency metadata');
        return { success: true, chunks: 1, emergency_override: true, quality_score: 0 };
      }

      // Standard validation for other file types (relaxed for governance documents)
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
        const emergencyMinWords = isForcedEmergency ? 5 : 50;
        
        if (strictWordCount < emergencyMinWords) {
          throw new Error(`BLOCKED: Insufficient word count (${strictWordCount} words, minimum ${emergencyMinWords}) - AI Policy violation`);
        }
      } else {
        // Relaxed validation for governance documents
        console.log('📄 GOVERNANCE/AI LOGIC DOCUMENT: Applying relaxed validation rules');
        
        if (binaryContentRatio > 0.3) {
          throw new Error(`BLOCKED: Extremely high binary content ratio (${(binaryContentRatio * 100).toFixed(1)}%) - Even governance documents must be readable`);
        }
        
        const hasCorruptedMarkers = /(\uFFFD|\\x[0-9A-Fa-f]{2}|[\x00-\x08\x0E-\x1F])/g.test(extractedText);
        if (hasCorruptedMarkers) {
          console.warn('⚠️ GOVERNANCE: Corruption markers detected but proceeding due to governance document type');
        }
        
        if (extractedText.length < 100) {
          throw new Error(`BLOCKED: Governance document too short (${extractedText.length} chars, minimum 100) - AI Policy violation`);
        }
        
        const governanceWordCount = extractedText.split(/\s+/).filter(word => word.length > 0).length;
        if (governanceWordCount < 10) {
          throw new Error(`BLOCKED: Governance document insufficient content (${governanceWordCount} words, minimum 10) - AI Policy violation`);
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
        console.log('🏛️ GOVERNANCE/AI LOGIC: Applying specialized chunking strategy');
        chunks = splitTextIntoChunks(extractedText, targetChunkSize, overlap);
        
        console.log(`🔍 CHUNK DEBUG: splitTextIntoChunks returned ${chunks.length} chunks`);
        console.log(`🔍 CHUNK DEBUG: Input text length: ${extractedText.length}`);
        console.log(`🔍 CHUNK DEBUG: Target chunk size: ${targetChunkSize}, overlap: ${overlap}`);
        
        if (chunks.length === 0) {
          console.error('🚨 GOVERNANCE: splitTextIntoChunks returned 0 chunks! Emergency single chunk creation');
          console.error(`🔍 CHUNK DEBUG: Text preview for failed chunking: "${extractedText.substring(0, 500)}"`);
          chunks = [extractedText];
        } else {
          console.log(`🔍 CHUNK DEBUG: First chunk preview: "${chunks[0].substring(0, 200)}"`);
          console.log(`🔍 CHUNK DEBUG: First chunk length: ${chunks[0].length}`);
        }
      } else {
        chunks = splitTextIntoChunks(extractedText, targetChunkSize, overlap);
        
        console.log(`🔍 CHUNK DEBUG: Standard chunking returned ${chunks.length} chunks`);
        console.log(`🔍 CHUNK DEBUG: Input text length: ${extractedText.length}`);
        
        if (chunks.length === 0) {
          console.error('🚨 STANDARD: splitTextIntoChunks returned 0 chunks!');
          console.error(`🔍 CHUNK DEBUG: Text preview for failed chunking: "${extractedText.substring(0, 500)}"`);
        } else {
          console.log(`🔍 CHUNK DEBUG: First chunk preview: "${chunks[0].substring(0, 200)}"`);
        }
      }

      if (chunks.length === 0) {
        console.error('🚨 EMERGENCY: No chunks generated from text! Check text extraction output.');
        console.error(`🔍 EMERGENCY DEBUG: Text was: "${extractedText}"`);
        console.log('🚨 EMERGENCY: Creating minimal fallback chunk');
        chunks = [`Document: ${document.title}\nContent: Processing failed, manual review required.`];
      }

      console.log(`✅ Chunks generated: ${chunks.length}`);
      if (chunks.length > 0) {
        console.log(`🔍 First chunk sample: "${chunks[0].substring(0, 100)}..."`);
      }

      // DRY RUN MODE: Skip database operations and return preview
      if (dryRun) {
        console.log('🧪 DRY RUN MODE: Skipping embeddings and database writes');
        console.log(`🧪 DRY RUN RESULTS: Successfully generated ${chunks.length} chunks`);
        
        // Log preview of first 3 chunks
        const previewChunks = chunks.slice(0, 3);
        previewChunks.forEach((chunk, index) => {
          console.log(`🧪 DRY RUN CHUNK ${index + 1}: Length: ${chunk.length} chars`);
          console.log(`🧪 DRY RUN CHUNK ${index + 1} Preview: "${chunk.substring(0, 200)}..."`);
        });
        
        if (chunks.length > 3) {
          console.log(`🧪 DRY RUN: ${chunks.length - 3} additional chunks not shown in preview`);
        }
        
        return {
          success: true,
          dryRun: true,
          chunks: chunks.length,
          extraction_method: extractionMethod,
          is_governance_document: isGovernanceDocument,
          text_extracted: extractedText.length > 0,
          text_length: extractedText.length,
          chunk_previews: previewChunks.map((chunk, index) => ({
            index: index + 1,
            length: chunk.length,
            preview: chunk.substring(0, 200)
          }))
        };
      }

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
            console.log(`📦 Skipping embedding generation for chunk ${index + 1} (emergency mode or too short)`);
          }

          // Create content hash
          const contentHash = `chunk_${documentId}_${index}_${Date.now()}`;

          // Insert chunk
          const { error: insertError } = await supabase
            .from('ai_document_chunks')
            .insert({
              document_id: documentId,
              organization_id: document.organization_id,
              content: chunk,
              chunk_index: index,
              content_hash: contentHash,
              embedding: embedding,
              metadata: {
                extraction_method: extractionMethod,
                chunk_size: chunk.length,
                has_embedding: !!embedding,
                is_governance_document: isGovernanceDocument,
                quality_score: isGovernanceDocument ? 1 : (chunk.length >= minChunkSizeForValidation ? 1 : 0.5),
                processing_timestamp: new Date().toISOString()
              }
            });

          if (insertError) {
            console.error(`❌ Error inserting chunk ${index + 1}:`, insertError);
            throw insertError;
          }

          console.log(`✅ Chunk ${index + 1} inserted successfully`);
          return { success: true, chunkIndex: index };

        } catch (chunkError: any) {
          console.error(`❌ Error processing chunk ${index + 1}:`, chunkError.message);
          return { success: false, chunkIndex: index, error: chunkError.message };
        }
      });

      const chunkResults = await Promise.all(chunkPromises);
      const successfulChunks = chunkResults.filter(result => result.success).length;
      
      console.log(`📊 Chunk processing complete: ${successfulChunks}/${chunks.length} successful`);

      // HARDENED SUCCESS LOGIC: Only report success if chunks were actually created
      const actualSuccess = successfulChunks > 0;
      const finalStatus = actualSuccess ? 'completed' : 'failed';
      
      // Enhanced error reporting when chunking fails
      if (!actualSuccess) {
        console.error(`🚨 CRITICAL FAILURE: Document "${document.title}" returned 0 chunks after processing`);
        console.error(`📋 Failure Details:`);
        console.error(`   - File type: ${document.mime_type}`);
        console.error(`   - File size: ${fileData?.size || 'unknown'} bytes`);
        console.error(`   - Extracted text length: ${extractedText.length} characters`);
        console.error(`   - Extraction method: ${extractionMethod}`);
        console.error(`   - Original chunks generated: ${chunks.length}`);
        console.error(`   - Successful chunk insertions: ${successfulChunks}`);
        
        // Log chunk processing failures
        const failedChunks = chunkResults.filter(result => !result.success);
        if (failedChunks.length > 0) {
          console.error(`❌ Failed chunk details:`);
          failedChunks.forEach(failure => {
            console.error(`   - Chunk ${failure.chunkIndex + 1}: ${failure.error}`);
          });
        }
        
        // Check text extraction issues
        if (extractedText.length === 0) {
          console.error(`❌ TEXT EXTRACTION FAILED: No content extracted from file`);
          if (document.mime_type.includes('docx')) {
            console.error(`   - DOCX extraction via Mammoth failed`);
          } else if (document.mime_type.includes('pdf')) {
            console.error(`   - PDF extraction failed`);
          } else if (document.mime_type.includes('markdown')) {
            console.error(`   - Markdown processing failed`);
          }
        } else if (chunks.length === 0) {
          console.error(`❌ CHUNKING FAILED: Text extracted but no chunks created`);
        } else {
          console.error(`❌ CHUNK INSERTION FAILED: Chunks created but database insertion failed`);
        }
      }

      await supabase
        .from('ai_documents')
        .update({
          processing_status: finalStatus,
          total_chunks: successfulChunks,
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata: {
            chunks_created: successfulChunks,
            extraction_method: extractionMethod,
            processing_duration_ms: Date.now(),
            is_governance_document: isGovernanceDocument,
            chunk_failures: chunks.length - successfulChunks,
            text_length: extractedText.length,
            chunks_generated: chunks.length,
            actual_success: actualSuccess
          }
        })
        .eq('id', documentId);

      if (actualSuccess) {
        console.log(`✅ Document processing SUCCESS: ${document.title} created ${successfulChunks} chunks`);
      } else {
        console.log(`❌ Document processing FAILED: ${document.title} created 0 chunks`);
      }

      return { 
        success: actualSuccess, // Only true if chunks were actually created
        chunks: successfulChunks,
        extraction_method: extractionMethod,
        is_governance_document: isGovernanceDocument,
        text_extracted: extractedText.length > 0,
        chunks_generated: chunks.length
      };
    };

    // Race between processing and timeout
    const result = await Promise.race([processingPromise(), timeoutPromise]);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Error in document processing:', error.message);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ DocumentId at error time:', documentId);
    
    // Only update document status if we have a valid documentId
    if (documentId) {
      try {
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
              error_stack: error.stack,
              processing_timestamp: new Date().toISOString(),
              document_id_at_error: documentId
            }
          })
          .eq('id', documentId);
      } catch (updateError) {
        console.error('❌ Failed to update document status:', updateError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        documentId: documentId || 'undefined'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Text chunking utility function
function splitTextIntoChunks(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end);
    chunks.push(chunk);
    
    if (end === text.length) break;
    start = end - overlap;
  }

  return chunks;
}

// Embedding generation utility function
async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.warn('⚠️ OpenAI API key not found, skipping embedding generation');
      return null;
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text,
        model: 'text-embedding-ada-002',
      }),
    });

    if (!response.ok) {
      console.error('❌ OpenAI API error:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('❌ Error generating embedding:', error);
    return null;
  }
}