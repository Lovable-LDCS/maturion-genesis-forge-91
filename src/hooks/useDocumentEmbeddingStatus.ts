import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './useOrganization';

export interface DocumentEmbeddingStatus {
  documentId: string;
  documentTitle: string;
  totalChunks: number;
  chunksWithEmbeddings: number;
  embeddingPercentage: number;
  status: 'completed' | 'partial' | 'not_started';
}

export const useDocumentEmbeddingStatus = () => {
  const { currentOrganization } = useOrganization();
  const [documentStatuses, setDocumentStatuses] = useState<DocumentEmbeddingStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshDocumentStatuses = async () => {
    if (!currentOrganization?.id) return;

    try {
      setLoading(true);

      // Get all documents first with simpler query
      const { data: documents, error: docsError } = await supabase
        .from('ai_documents')
        .select('id, title, total_chunks')
        .eq('organization_id', currentOrganization.id)
        .eq('processing_status', 'completed')
        .order('title');

      if (docsError) {
        console.error('Error fetching documents:', docsError);
        setLoading(false);
        return;
      }

      if (!documents || documents.length === 0) {
        setDocumentStatuses([]);
        setLoading(false);
        return;
      }

      // Get embedding counts for all documents in one query
      const documentIds = documents.map(doc => doc.id);
      const { data: chunkCounts, error: countsError } = await supabase
        .from('ai_document_chunks')
        .select('document_id, embedding')
        .in('document_id', documentIds);

      if (countsError) {
        console.error('Error fetching chunk counts:', countsError);
        setLoading(false);
        return;
      }

      // Group chunks by document and calculate stats
      const chunksByDoc = chunkCounts?.reduce((acc, chunk) => {
        if (!acc[chunk.document_id]) {
          acc[chunk.document_id] = { total: 0, embedded: 0 };
        }
        acc[chunk.document_id].total++;
        if (chunk.embedding !== null) {
          acc[chunk.document_id].embedded++;
        }
        return acc;
      }, {} as Record<string, { total: number; embedded: number }>) || {};

      const statuses: DocumentEmbeddingStatus[] = documents.map(doc => {
        const chunks = chunksByDoc[doc.id] || { total: 0, embedded: 0 };
        const totalChunks = chunks.total;
        const chunksWithEmbeddings = chunks.embedded;
        const embeddingPercentage = totalChunks > 0 ? (chunksWithEmbeddings / totalChunks) * 100 : 0;
        
        let status: 'completed' | 'partial' | 'not_started' = 'not_started';
        if (embeddingPercentage >= 100) {
          status = 'completed';
        } else if (embeddingPercentage > 0) {
          status = 'partial';
        }

        return {
          documentId: doc.id,
          documentTitle: doc.title || 'Untitled Document',
          totalChunks,
          chunksWithEmbeddings,
          embeddingPercentage: Math.round(embeddingPercentage * 10) / 10,
          status
        };
      });

      setDocumentStatuses(statuses);
    } catch (error) {
      console.error('Error refreshing document statuses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshDocumentStatuses();
  }, [currentOrganization?.id]);

  return {
    documentStatuses,
    loading,
    refreshDocumentStatuses
  };
};