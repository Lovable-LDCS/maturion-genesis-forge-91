/**
 * Maturion RAG (Retrieval-Augmented Generation) System
 * Handles document interpretation, embedding generation, and semantic search
 */

import { supabase } from '@/integrations/supabase/client';

export interface DocumentChunk {
  id: string;
  documentId: string;
  chunkText: string;
  chunkIndex: number;
  embedding?: number[]; // Vector embedding
  metadata: {
    fileName?: string;
    fileType?: string;
    domain?: string;
    page?: string;
    [key: string]: unknown;
  };
}

export interface RetrievalResult {
  chunk: DocumentChunk;
  similarity: number;
  documentName: string;
}

/**
 * Chunk size configuration (800-1200 tokens as recommended)
 */
const CHUNK_CONFIG = {
  minSize: 800,
  maxSize: 1200,
  overlap: 100, // Token overlap between chunks
};

/**
 * Chunks a document into smaller pieces for embedding
 */
export function chunkDocument(
  documentText: string,
  metadata: DocumentChunk['metadata']
): Omit<DocumentChunk, 'id' | 'embedding'>[] {
  const words = documentText.split(/\s+/);
  const chunks: Omit<DocumentChunk, 'id' | 'embedding'>[] = [];

  let chunkIndex = 0;
  let startIdx = 0;

  while (startIdx < words.length) {
    // Calculate chunk size (aim for middle of range)
    const targetSize = Math.floor((CHUNK_CONFIG.minSize + CHUNK_CONFIG.maxSize) / 2);
    const endIdx = Math.min(startIdx + targetSize, words.length);

    const chunkWords = words.slice(startIdx, endIdx);
    const chunkText = chunkWords.join(' ');

    chunks.push({
      documentId: metadata.fileName || 'unknown',
      chunkText,
      chunkIndex,
      metadata,
    });

    chunkIndex++;
    // Move start index forward with overlap
    startIdx = endIdx - CHUNK_CONFIG.overlap;

    // Prevent infinite loop
    if (startIdx >= endIdx) break;
  }

  return chunks;
}

/**
 * Generates embedding for a text chunk using OpenAI
 * This would be called via a Supabase Edge Function in production
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Call Supabase Edge Function to generate embedding
    const { data, error } = await supabase.functions.invoke('generate-embedding', {
      body: { text },
    });

    if (error) {
      console.error('[Maturion RAG] Embedding generation error:', error);
      throw error;
    }

    return data.embedding;
  } catch (error) {
    console.error('[Maturion RAG] Failed to generate embedding:', error);
    // Return zero vector as fallback
    return new Array(1536).fill(0); // OpenAI embeddings are 1536 dimensions
  }
}

/**
 * Performs semantic search across document chunks
 */
export async function searchDocuments(
  query: string,
  options: {
    organizationId: string;
    domain?: string;
    limit?: number;
    similarityThreshold?: number;
  }
): Promise<RetrievalResult[]> {
  const { organizationId, domain, limit = 5, similarityThreshold = 0.7 } = options;

  try {
    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(query);

    // Perform vector similarity search
    const { data, error } = await supabase.rpc('search_document_chunks', {
      query_embedding: queryEmbedding,
      org_id: organizationId,
      domain_filter: domain || null,
      match_threshold: similarityThreshold,
      match_count: limit,
    });

    if (error) {
      console.error('[Maturion RAG] Document search error:', error);
      return [];
    }

    // Transform results
    return (data || []).map((result: {
      id: string;
      document_id: string;
      chunk_text: string;
      chunk_index: number;
      similarity: number;
      metadata: DocumentChunk['metadata'];
      file_name: string;
    }) => ({
      chunk: {
        id: result.id,
        documentId: result.document_id,
        chunkText: result.chunk_text,
        chunkIndex: result.chunk_index,
        metadata: result.metadata,
      },
      similarity: result.similarity,
      documentName: result.file_name || 'Unknown Document',
    }));
  } catch (error) {
    console.error('[Maturion RAG] Search failed:', error);
    return [];
  }
}

/**
 * Retrieves relevant context from documents for AI query
 */
export async function retrieveContext(
  query: string,
  organizationId: string,
  domain?: string
): Promise<string> {
  const results = await searchDocuments(query, {
    organizationId,
    domain,
    limit: 5,
    similarityThreshold: 0.7,
  });

  if (results.length === 0) {
    return 'No relevant documents found.';
  }

  const contextSections = results.map(
    (result, index) =>
      `[Document ${index + 1}: ${result.documentName} (${Math.round(result.similarity * 100)}% match)]
${result.chunk.chunkText}`
  );

  return `Relevant information from uploaded documents:\n\n${contextSections.join('\n\n---\n\n')}`;
}

/**
 * Processes a newly uploaded document
 */
export async function processDocument(
  documentId: string,
  documentText: string,
  metadata: DocumentChunk['metadata']
): Promise<{ success: boolean; chunksCreated: number }> {
  try {
    // Chunk the document
    const chunks = chunkDocument(documentText, metadata);

    console.log(`[Maturion RAG] Processing document ${documentId}: ${chunks.length} chunks`);

    // Generate embeddings and store chunks
    let chunksCreated = 0;
    for (const chunk of chunks) {
      try {
        // Generate embedding
        const embedding = await generateEmbedding(chunk.chunkText);

        // Store chunk in database
        const { error } = await supabase.from('document_chunks').insert({
          document_id: documentId,
          chunk_text: chunk.chunkText,
          chunk_index: chunk.chunkIndex,
          embedding,
          metadata: chunk.metadata,
        });

        if (error) {
          console.error('[Maturion RAG] Failed to store chunk:', error);
        } else {
          chunksCreated++;
        }
      } catch (chunkError) {
        console.error('[Maturion RAG] Failed to process chunk:', chunkError);
      }
    }

    console.log(`[Maturion RAG] Successfully processed ${chunksCreated}/${chunks.length} chunks`);

    return {
      success: chunksCreated > 0,
      chunksCreated,
    };
  } catch (error) {
    console.error('[Maturion RAG] Document processing failed:', error);
    return {
      success: false,
      chunksCreated: 0,
    };
  }
}
