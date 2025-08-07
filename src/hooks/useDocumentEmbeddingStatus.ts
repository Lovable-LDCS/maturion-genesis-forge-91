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

      // Get document embedding status
      const { data: documents, error } = await supabase
        .from('ai_documents')
        .select(`
          id,
          title,
          total_chunks,
          ai_document_chunks(
            id,
            embedding
          )
        `)
        .eq('organization_id', currentOrganization.id)
        .eq('processing_status', 'completed');

      if (error) {
        console.error('Error fetching document statuses:', error);
        return;
      }

      const statuses: DocumentEmbeddingStatus[] = (documents || []).map(doc => {
        const chunks = doc.ai_document_chunks || [];
        const totalChunks = chunks.length;
        const chunksWithEmbeddings = chunks.filter(chunk => chunk.embedding !== null).length;
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