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

    // Extract text content based on file type
    let textContent: string;
    try {
      textContent = await extractTextContent(fileData, document.mime_type, document.file_name);
      console.log(`Extracted text content: ${textContent.length} characters from ${document.file_name}`);
    } catch (extractError) {
      console.error('Text extraction failed:', extractError);
      throw new Error(`Failed to extract text from ${document.file_name}: ${extractError.message}`);
    }

    if (!textContent || textContent.trim().length === 0) {
      throw new Error(`No extractable text content found in ${document.file_name}`);
    }

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
          document_type: document.document_type,
          file_type: document.mime_type
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
          file_type: document.mime_type,
          processing_completed_at: new Date().toISOString()
        }
      });

    console.log(`Document processing completed: ${chunks.length} chunks created for ${document.file_name}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        chunks_created: chunks.length,
        document_id: documentId,
        file_name: document.file_name,
        text_length: textContent.length
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

// Helper function to extract text content from various file types
async function extractTextContent(fileData: Blob, mimeType: string, fileName: string): Promise<string> {
  console.log(`Extracting text from ${fileName} (${mimeType})`);
  
  // Text and Markdown files
  if (mimeType === 'text/plain' || mimeType === 'text/markdown' || mimeType === 'text/x-markdown') {
    return await fileData.text();
  }
  
  // PDF files
  if (mimeType === 'application/pdf') {
    return await extractPdfText(fileData);
  }
  
  // Word documents
  if (mimeType.includes('word') || mimeType.includes('msword') || 
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return await extractWordText(fileData);
  }
  
  // Structured data files
  if (mimeType === 'application/json' || fileName.endsWith('.json')) {
    const jsonText = await fileData.text();
    try {
      const jsonData = JSON.parse(jsonText);
      return `JSON Document Content:\n${JSON.stringify(jsonData, null, 2)}`;
    } catch (e) {
      return `JSON Document (raw):\n${jsonText}`;
    }
  }
  
  if (mimeType === 'application/x-yaml' || mimeType === 'text/yaml' || 
      fileName.endsWith('.yml') || fileName.endsWith('.yaml')) {
    const yamlText = await fileData.text();
    return `YAML Document:\n${yamlText}`;
  }
  
  if (mimeType === 'text/csv' || fileName.endsWith('.csv')) {
    const csvText = await fileData.text();
    return `CSV Data:\n${csvText}`;
  }
  
  if (mimeType === 'application/sql' || fileName.endsWith('.sql')) {
    const sqlText = await fileData.text();
    return `SQL Script:\n${sqlText}`;
  }
  
  // Code files
  if (mimeType === 'application/javascript' || fileName.endsWith('.js') || 
      fileName.endsWith('.ts') || fileName.endsWith('.jsx') || fileName.endsWith('.tsx')) {
    const codeText = await fileData.text();
    return `JavaScript/TypeScript Code:\n${codeText}`;
  }
  
  if (fileName.endsWith('.py')) {
    const codeText = await fileData.text();
    return `Python Code:\n${codeText}`;
  }
  
  // Images - OCR processing placeholder
  if (mimeType.startsWith('image/')) {
    return await extractImageText(fileData, mimeType, fileName);
  }
  
  // HTML files
  if (mimeType === 'text/html' || fileName.endsWith('.html') || fileName.endsWith('.htm')) {
    const htmlText = await fileData.text();
    return await extractHtmlText(htmlText);
  }
  
  // XML files
  if (mimeType === 'application/xml' || mimeType === 'text/xml' || fileName.endsWith('.xml')) {
    const xmlText = await fileData.text();
    return `XML Document:\n${xmlText}`;
  }
  
  // RTF files
  if (mimeType === 'application/rtf' || fileName.endsWith('.rtf')) {
    const rtfText = await fileData.text();
    return await extractRtfText(rtfText);
  }
  
  // Fallback for any text-based content
  try {
    const textContent = await fileData.text();
    if (textContent && textContent.trim().length > 0) {
      // Check if it looks like readable text
      const printableChars = textContent.replace(/[^\x20-\x7E\n\r\t]/g, '').length;
      const ratio = printableChars / textContent.length;
      
      if (ratio > 0.7) { // If more than 70% printable characters
        return `Text Content (${fileName}):\n${textContent}`;
      }
    }
  } catch (e) {
    console.log('Failed to extract as text, trying other methods...');
  }
  
  throw new Error(`Unsupported file type: ${mimeType} for file: ${fileName}. Supported formats include: PDF, Word, text, markdown, HTML, JSON, YAML, CSV, SQL, code files, and images.`);
}

// PDF text extraction using basic pattern matching
async function extractPdfText(fileData: Blob): Promise<string> {
  try {
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Convert to string for pattern matching
    const pdfText = new TextDecoder('latin1').decode(uint8Array);
    
    // Look for text content in various PDF structures
    const textExtractions: string[] = [];
    
    // Method 1: Extract text between BT/ET markers
    const btMatches = pdfText.match(/BT\s+.*?ET/gs) || [];
    for (const match of btMatches) {
      const textContent = match.match(/\(([^)]*)\)/g);
      if (textContent) {
        textContent.forEach(text => {
          const cleanText = text.replace(/[()]/g, '');
          if (cleanText.length > 0) {
            textExtractions.push(cleanText);
          }
        });
      }
    }
    
    // Method 2: Look for stream objects containing text
    const streamMatches = pdfText.match(/stream\s+(.*?)\s+endstream/gs) || [];
    for (const stream of streamMatches) {
      const lines = stream.split('\n');
      for (const line of lines) {
        if (line.includes('(') && line.includes(')')) {
          const textContent = line.match(/\(([^)]*)\)/g);
          if (textContent) {
            textContent.forEach(text => {
              const cleanText = text.replace(/[()]/g, '');
              if (cleanText.length > 5) {
                textExtractions.push(cleanText);
              }
            });
          }
        }
      }
    }
    
    // Method 3: Direct text extraction from readable parts
    const readableText = pdfText
      .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && /^[a-zA-Z0-9]/.test(word))
      .join(' ');
    
    if (readableText.length > 100) {
      textExtractions.push(readableText);
    }
    
    const result = [...new Set(textExtractions)].join(' ').trim();
    
    if (result.length === 0) {
      return 'PDF Document: This PDF contains content that requires advanced PDF processing for full text extraction. The document structure and formatting may contain important information for the maturity model.';
    }
    
    return `PDF Document Content:\n${result}`;
  } catch (error) {
    console.error('PDF extraction error:', error);
    return 'PDF Document: This PDF could not be processed for text extraction. It may contain images, complex formatting, or be password protected.';
  }
}

// Word document text extraction
async function extractWordText(fileData: Blob): Promise<string> {
  try {
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Check if it's a .docx file (ZIP format)
    if (uint8Array[0] === 0x50 && uint8Array[1] === 0x4B) {
      // DOCX files are ZIP archives containing XML
      const docText = new TextDecoder('utf-8', { fatal: false }).decode(uint8Array);
      
      // Extract text from Word XML structure
      const textMatches = docText.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
      const extractedText = textMatches
        .map(match => match.replace(/<w:t[^>]*>|<\/w:t>/g, ''))
        .filter(text => text.trim().length > 0)
        .join(' ');
      
      if (extractedText.trim().length > 0) {
        return `Word Document Content:\n${extractedText}`;
      }
      
      // Fallback: look for any readable text in the document
      const readableContent = docText
        .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2 && /^[a-zA-Z0-9]/.test(word))
        .slice(0, 1000) // Limit to prevent noise
        .join(' ');
      
      if (readableContent.length > 50) {
        return `Word Document Content (extracted):\n${readableContent}`;
      }
    } else {
      // Legacy .doc format
      const docText = new TextDecoder('utf-8', { fatal: false }).decode(uint8Array);
      const cleanText = docText
        .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (cleanText.length > 100) {
        return `Word Document Content:\n${cleanText}`;
      }
    }
    
    return 'Word Document: This document contains content that requires advanced processing for full text extraction.';
  } catch (error) {
    console.error('Word extraction error:', error);
    return 'Word Document: Unable to extract text content from this Word document.';
  }
}

// Image text extraction placeholder (for OCR integration)
async function extractImageText(fileData: Blob, mimeType: string, fileName: string): Promise<string> {
  // For now, return a descriptive placeholder
  // In a production environment, you would integrate with OCR services like:
  // - Google Cloud Vision API
  // - AWS Textract
  // - Azure Computer Vision
  // - Tesseract.js
  
  return `Image Document: ${fileName} (${mimeType}) - This image may contain text, diagrams, charts, or visual information relevant to the maturity model. OCR processing would be required to extract any textual content. Consider converting to PDF or text format for full searchability.`;
}

// HTML text extraction
async function extractHtmlText(htmlContent: string): Promise<string> {
  // Remove script and style elements
  let cleanHtml = htmlContent.replace(/<script[^>]*>.*?<\/script>/gis, '');
  cleanHtml = cleanHtml.replace(/<style[^>]*>.*?<\/style>/gis, '');
  
  // Remove HTML tags but preserve some structure
  cleanHtml = cleanHtml.replace(/<\/?(h[1-6]|p|div|br)[^>]*>/gi, '\n');
  cleanHtml = cleanHtml.replace(/<[^>]*>/g, ' ');
  
  // Decode HTML entities
  cleanHtml = cleanHtml
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
  
  // Clean up whitespace
  cleanHtml = cleanHtml.replace(/\s+/g, ' ').trim();
  
  return `HTML Document Content:\n${cleanHtml}`;
}

// RTF text extraction
async function extractRtfText(rtfContent: string): Promise<string> {
  // Basic RTF text extraction
  let text = rtfContent;
  
  // Remove RTF control words
  text = text.replace(/\{\\[^}]*\}/g, '');
  text = text.replace(/\\[a-z]+\d*\s*/gi, '');
  text = text.replace(/[{}]/g, '');
  
  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  return `RTF Document Content:\n${text}`;
}

// Helper function to split text into chunks
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
      const lastSpace = chunk.lastIndexOf(' ');
      const breakPoint = Math.max(lastSentenceEnd, lastNewline, lastSpace);
      
      if (breakPoint > start + chunkSize * 0.5) {
        chunk = chunk.slice(0, breakPoint + 1);
      }
    }
    
    const trimmedChunk = chunk.trim();
    if (trimmedChunk.length > 0) {
      chunks.push(trimmedChunk);
    }
    
    start = end - overlap;
    if (start <= 0) start = end;
  }

  return chunks;
}

// Helper function to generate embeddings using OpenAI
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