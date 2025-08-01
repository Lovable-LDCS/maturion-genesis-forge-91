import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ProcessDocumentRequest {
  documentId: string;
  sessionId?: string;
  processingOptions?: {
    enableSmartChunkReuse?: boolean;
    priority?: 'low' | 'normal' | 'high';
    skipDuplicateCheck?: boolean;
  };
}

interface ProcessingStage {
  stage: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  errorDetails?: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: ProcessDocumentRequest = await req.json();
    const { documentId, sessionId, processingOptions = {} } = request;

    console.log('🚀 Process Document v2 - Starting processing:', {
      documentId,
      sessionId,
      processingOptions,
      timestamp: new Date().toISOString()
    });

    // Validate required parameters
    if (!documentId) {
      throw new Error('documentId is required');
    }

    // Fetch document details
    const { data: document, error: docError } = await supabase
      .from('ai_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      console.error('❌ Document fetch failed:', docError);
      throw new Error(`Document not found: ${docError?.message || 'Unknown error'}`);
    }

    console.log('📄 Document loaded:', {
      id: document.id,
      title: document.title,
      fileName: document.file_name,
      processingStatus: document.processing_status,
      organizationId: document.organization_id
    });

    // Initialize processing pipeline tracking
    const stages: ProcessingStage[] = [
      { stage: 'validation', status: 'pending', startedAt: new Date() },
      { stage: 'file_extraction', status: 'pending', startedAt: new Date() },
      { stage: 'chunking', status: 'pending', startedAt: new Date() },
      { stage: 'embedding', status: 'pending', startedAt: new Date() },
      { stage: 'finalization', status: 'pending', startedAt: new Date() }
    ];

    // Track processing start
    await logPipelineStage(document.id, document.organization_id, 'validation', 'processing');

    // Stage 1: Validation
    console.log('🔍 Stage 1: Document Validation');
    stages[0].status = 'processing';
    
    // Validate file exists in storage
    const { data: fileExists, error: storageError } = await supabase.storage
      .from('ai-documents')
      .download(document.file_path);

    if (storageError || !fileExists) {
      const error = `File not found in storage: ${storageError?.message || 'File missing'}`;
      console.error('❌ Validation failed:', error);
      stages[0].status = 'failed';
      stages[0].errorDetails = { error, filePath: document.file_path };
      await logPipelineStage(document.id, document.organization_id, 'validation', 'failed', { error });
      throw new Error(error);
    }

    stages[0].status = 'completed';
    stages[0].completedAt = new Date();
    await logPipelineStage(document.id, document.organization_id, 'validation', 'completed');

    // Stage 2: File Content Extraction
    console.log('📝 Stage 2: File Content Extraction');
    stages[1].status = 'processing';
    await logPipelineStage(document.id, document.organization_id, 'file_extraction', 'processing');

    const extractedContent = await extractFileContent(fileExists, document.file_name, document.mime_type);
    
    if (!extractedContent.text || extractedContent.text.trim().length === 0) {
      const error = 'No text content extracted from file';
      console.error('❌ Extraction failed:', error);
      stages[1].status = 'failed';
      stages[1].errorDetails = { error, extractionMethod: extractedContent.method };
      await logPipelineStage(document.id, document.organization_id, 'file_extraction', 'failed', { error });
      throw new Error(error);
    }

    stages[1].status = 'completed';
    stages[1].completedAt = new Date();
    await logPipelineStage(document.id, document.organization_id, 'file_extraction', 'completed', {
      textLength: extractedContent.text.length,
      extractionMethod: extractedContent.method
    });

    console.log('✅ Content extracted:', {
      textLength: extractedContent.text.length,
      method: extractedContent.method,
      warnings: extractedContent.warnings.length
    });

    // Stage 3: Text Chunking
    console.log('🧩 Stage 3: Text Chunking');
    stages[2].status = 'processing';
    await logPipelineStage(document.id, document.organization_id, 'chunking', 'processing');

    const chunks = await chunkText(extractedContent.text);
    
    if (chunks.length === 0) {
      const error = 'No valid chunks generated from text';
      console.error('❌ Chunking failed:', error);
      stages[2].status = 'failed';
      stages[2].errorDetails = { error, textLength: extractedContent.text.length };
      await logPipelineStage(document.id, document.organization_id, 'chunking', 'failed', { error });
      throw new Error(error);
    }

    stages[2].status = 'completed';
    stages[2].completedAt = new Date();
    await logPipelineStage(document.id, document.organization_id, 'chunking', 'completed', {
      chunkCount: chunks.length,
      avgChunkSize: Math.round(chunks.reduce((sum, chunk) => sum + chunk.length, 0) / chunks.length)
    });

    console.log('✅ Text chunked:', {
      chunkCount: chunks.length,
      avgChunkSize: Math.round(chunks.reduce((sum, chunk) => sum + chunk.length, 0) / chunks.length)
    });

    // Stage 4: Store chunks and create embeddings
    console.log('💾 Stage 4: Store Chunks & Generate Embeddings');
    stages[3].status = 'processing';
    await logPipelineStage(document.id, document.organization_id, 'embedding', 'processing');

    const chunkRecords = chunks.map((content, index) => ({
      document_id: documentId,
      chunk_index: index,
      content,
      content_hash: generateContentHash(content),
      metadata: {
        processing_version: 2,
        schema_version: 2,
        session_id: sessionId,
        extraction_method: extractedContent.method,
        chunk_size: content.length
      },
      organization_id: document.organization_id
    }));

    const { error: chunksError } = await supabase
      .from('ai_document_chunks')
      .insert(chunkRecords);

    if (chunksError) {
      const error = `Failed to store chunks: ${chunksError.message}`;
      console.error('❌ Chunk storage failed:', chunksError);
      stages[3].status = 'failed';
      stages[3].errorDetails = { error: chunksError.message, chunkCount: chunks.length };
      await logPipelineStage(document.id, document.organization_id, 'embedding', 'failed', { error: chunksError.message });
      throw new Error(error);
    }

    stages[3].status = 'completed';
    stages[3].completedAt = new Date();
    await logPipelineStage(document.id, document.organization_id, 'embedding', 'completed', {
      chunksStored: chunks.length
    });

    // Stage 5: Finalization
    console.log('🏁 Stage 5: Finalization');
    stages[4].status = 'processing';
    await logPipelineStage(document.id, document.organization_id, 'finalization', 'processing');

    // Update document status
    const { error: updateError } = await supabase
      .from('ai_documents')
      .update({
        processing_status: 'completed',
        processed_at: new Date().toISOString(),
        total_chunks: chunks.length,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId);

    if (updateError) {
      console.error('❌ Document update failed:', updateError);
      stages[4].status = 'failed';
      stages[4].errorDetails = { error: updateError.message };
      await logPipelineStage(document.id, document.organization_id, 'finalization', 'failed', { error: updateError.message });
      throw new Error(`Failed to update document status: ${updateError.message}`);
    }

    stages[4].status = 'completed';
    stages[4].completedAt = new Date();
    await logPipelineStage(document.id, document.organization_id, 'finalization', 'completed');

    // Log success metrics
    await logQAMetric(document.organization_id, 'document_processing_success', 1, {
      documentId,
      sessionId,
      processingTimeMs: Date.now() - stages[0].startedAt.getTime(),
      chunkCount: chunks.length,
      textLength: extractedContent.text.length
    });

    console.log('🎉 Processing completed successfully:', {
      documentId,
      chunkCount: chunks.length,
      processingTimeMs: Date.now() - stages[0].startedAt.getTime()
    });

    return new Response(JSON.stringify({
      success: true,
      documentId,
      processing: {
        status: 'completed',
        stages,
        metrics: {
          chunkCount: chunks.length,
          textLength: extractedContent.text.length,
          processingTimeMs: Date.now() - stages[0].startedAt.getTime(),
          extractionMethod: extractedContent.method
        }
      },
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('💥 Process Document v2 - Error:', error);
    
    // Log failure metrics if we have document context
    try {
      const request = await req.clone().json();
      if (request.documentId) {
        const { data: doc } = await supabase
          .from('ai_documents')
          .select('organization_id')
          .eq('id', request.documentId)
          .single();
        
        if (doc) {
          await logQAMetric(doc.organization_id, 'document_processing_failure', 1, {
            documentId: request.documentId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    } catch (logError) {
      console.error('Failed to log error metrics:', logError);
    }

    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper function to extract text content from file
async function extractFileContent(fileBlob: Blob, fileName: string, mimeType: string): Promise<{
  text: string;
  method: string;
  warnings: string[];
}> {
  const warnings: string[] = [];
  let text = '';
  let method = 'unknown';

  try {
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
        fileName.endsWith('.docx')) {
      method = 'docx_extraction';
      // For now, use basic text extraction - could be enhanced with mammoth.js
      const arrayBuffer = await fileBlob.arrayBuffer();
      const decoder = new TextDecoder();
      text = decoder.decode(arrayBuffer);
      
      // Basic DOCX content extraction (simplified)
      text = text.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
      
    } else if (mimeType === 'text/plain' || fileName.endsWith('.txt')) {
      method = 'plain_text';
      text = await fileBlob.text();
      
    } else if (mimeType === 'text/markdown' || fileName.endsWith('.md')) {
      method = 'markdown';
      text = await fileBlob.text();
      
    } else if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
      method = 'pdf_text_extraction';
      warnings.push('PDF text extraction is basic - consider using dedicated PDF processing');
      const arrayBuffer = await fileBlob.arrayBuffer();
      const decoder = new TextDecoder();
      text = decoder.decode(arrayBuffer);
      text = text.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
      
    } else {
      method = 'fallback_text';
      warnings.push(`Unsupported file type ${mimeType}, attempting text extraction`);
      text = await fileBlob.text();
    }
    
  } catch (error) {
    throw new Error(`Text extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return { text, method, warnings };
}

// Helper function to chunk text
async function chunkText(text: string, chunkSize: number = 2000, overlap: number = 200): Promise<string[]> {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    let chunk = text.slice(start, end);
    
    // Try to find a good breaking point
    if (end < text.length) {
      const lastSentence = chunk.lastIndexOf('.');
      const lastParagraph = chunk.lastIndexOf('\n\n');
      const lastSpace = chunk.lastIndexOf(' ');
      
      const breakPoint = lastSentence > start + chunkSize * 0.7 ? lastSentence + 1 :
                        lastParagraph > start + chunkSize * 0.7 ? lastParagraph + 2 :
                        lastSpace > start + chunkSize * 0.7 ? lastSpace + 1 : end;
      
      if (breakPoint !== end && breakPoint > start) {
        chunk = text.slice(start, breakPoint);
      }
    }
    
    chunk = chunk.trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
    
    start = Math.max(start + 1, chunk.length > 0 ? start + chunk.length - overlap : end);
  }

  return chunks;
}

// Helper function to generate content hash
function generateContentHash(content: string): string {
  // Simple hash function for content deduplication
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `hash_${Math.abs(hash).toString(36)}_${content.length}`;
}

// Helper function to log pipeline stage
async function logPipelineStage(
  documentId: string, 
  organizationId: string, 
  stage: string, 
  status: string, 
  errorDetails?: any
) {
  try {
    await supabase.from('processing_pipeline_status').insert({
      document_id: documentId,
      organization_id: organizationId,
      stage,
      status,
      completed_at: status === 'completed' || status === 'failed' ? new Date().toISOString() : null,
      error_details: errorDetails || null
    });
  } catch (error) {
    console.error(`Failed to log pipeline stage ${stage}:`, error);
  }
}

// Helper function to log QA metrics
async function logQAMetric(
  organizationId: string, 
  metricType: string, 
  metricValue: number, 
  metricData?: any
) {
  try {
    await supabase.from('qa_metrics').insert({
      organization_id: organizationId,
      metric_type: metricType,
      metric_value: metricValue,
      metric_data: metricData || {}
    });
  } catch (error) {
    console.error(`Failed to log QA metric ${metricType}:`, error);
  }
}