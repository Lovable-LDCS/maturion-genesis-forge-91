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

      // Process documents in smaller batches to avoid URL length issues
      const batchSize = 10;
      const documentIds = documents.map(doc => doc.id);
      
      let totalChunksByDoc: Record<string, number> = {};
      let embeddedChunksByDoc: Record<string, number> = {};
      
      // Process documents in batches
      for (let i = 0; i < documentIds.length; i += batchSize) {
        const batch = documentIds.slice(i, i + batchSize);
        
        // Get total chunk counts for this batch
        const { data: allChunks, error: countsError } = await supabase
          .from('ai_document_chunks')
          .select('document_id')
          .in('document_id', batch);

        // Get embedding counts for this batch  
        const { data: embeddedChunks, error: embeddingError } = await supabase
          .from('ai_document_chunks')
          .select('document_id')
          .in('document_id', batch)
          .not('embedding', 'is', null);

        if (countsError || embeddingError) {
          console.error('Error fetching chunk counts for batch:', { countsError, embeddingError });
          continue;
        }

        // Aggregate batch results
        allChunks?.forEach(chunk => {
          if (!totalChunksByDoc[chunk.document_id]) {
            totalChunksByDoc[chunk.document_id] = 0;
          }
          totalChunksByDoc[chunk.document_id]++;
        });

        embeddedChunks?.forEach(chunk => {
          if (!embeddedChunksByDoc[chunk.document_id]) {
            embeddedChunksByDoc[chunk.document_id] = 0;
          }
          embeddedChunksByDoc[chunk.document_id]++;
        });
      }

      // totalChunksByDoc and embeddedChunksByDoc are already built above

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