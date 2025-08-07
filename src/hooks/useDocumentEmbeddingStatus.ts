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

      // Get embedding counts for all documents using a more efficient approach
      // Use the RPC function to avoid large JSON parsing issues
      const { data: orgCounts } = await supabase.rpc('count_chunks_by_organization', {
        org_id: currentOrganization.id
      });

      // Get individual document chunk counts without embedding data to avoid JSON issues
      const documentIds = documents.map(doc => doc.id);
      const { data: chunkCounts, error: countsError } = await supabase
        .from('ai_document_chunks')
        .select('document_id, id')
        .in('document_id', documentIds);

      // Get embedding status separately to avoid JSON parsing large vectors
      const { data: embeddingCounts, error: embeddingError } = await supabase
        .from('ai_document_chunks')
        .select('document_id')
        .in('document_id', documentIds)
        .not('embedding', 'is', null);

      if (countsError) {
        console.error('Error fetching chunk counts:', countsError);
        setLoading(false);
        return;
      }

      if (embeddingError) {
        console.error('Error fetching embedding counts:', embeddingError);
        setLoading(false);
        return;
      }

      // Group total chunks by document
      const totalChunksByDoc = chunkCounts?.reduce((acc, chunk) => {
        if (!acc[chunk.document_id]) {
          acc[chunk.document_id] = 0;
        }
        acc[chunk.document_id]++;
        return acc;
      }, {} as Record<string, number>) || {};

      // Group embedded chunks by document
      const embeddedChunksByDoc = embeddingCounts?.reduce((acc, chunk) => {
        if (!acc[chunk.document_id]) {
          acc[chunk.document_id] = 0;
        }
        acc[chunk.document_id]++;
        return acc;
      }, {} as Record<string, number>) || {};

      const statuses: DocumentEmbeddingStatus[] = documents.map(doc => {
        const totalChunks = totalChunksByDoc[doc.id] || 0;
        const chunksWithEmbeddings = embeddedChunksByDoc[doc.id] || 0;
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