import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './useOrganization';

export interface EmbeddingStatus {
  totalChunks: number;
  chunksWithEmbeddings: number;
  embeddingPercentage: number;
  loading: boolean;
}

export const useEmbeddingStatus = () => {
  const { currentOrganization } = useOrganization();
  const [status, setStatus] = useState<EmbeddingStatus>({
    totalChunks: 0,
    chunksWithEmbeddings: 0,
    embeddingPercentage: 0,
    loading: true
  });

  const refreshStatus = async () => {
    if (!currentOrganization?.id) return;

    try {
      setStatus(prev => ({ ...prev, loading: true }));

      // Get all chunks for this organization and count them
      const { data: allChunks, error: totalError } = await supabase
        .from('ai_document_chunks')
        .select('id, embedding, ai_documents!inner(organization_id)')
        .eq('ai_documents.organization_id', currentOrganization.id);

      if (totalError) {
        console.error('Error fetching chunks:', totalError);
        return;
      }

      const totalChunks = allChunks?.length || 0;
      const chunksWithEmbeddings = allChunks?.filter(chunk => chunk.embedding !== null).length || 0;

      const embeddingPercentage = totalChunks > 0 ? (chunksWithEmbeddings / totalChunks) * 100 : 0;

      setStatus({
        totalChunks,
        chunksWithEmbeddings,
        embeddingPercentage: Math.round(embeddingPercentage * 10) / 10, // Round to 1 decimal
        loading: false
      });
    } catch (error) {
      console.error('Error refreshing embedding status:', error);
      setStatus(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    refreshStatus();
  }, [currentOrganization?.id]);

  return {
    ...status,
    refreshStatus
  };
};