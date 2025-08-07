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

      // Get total chunks count
      const { count: totalCount, error: countError } = await supabase
        .from('ai_document_chunks')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', currentOrganization.id);

      if (countError) {
        console.error('Error fetching total chunks:', countError);
        setStatus(prev => ({ ...prev, loading: false }));
        return;
      }

      // Get embedded chunks count
      const { count: embeddedCount, error: embeddedError } = await supabase
        .from('ai_document_chunks')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', currentOrganization.id)
        .not('embedding', 'is', null);

      if (embeddedError) {
        console.error('Error fetching embedded chunks:', embeddedError);
        setStatus(prev => ({ ...prev, loading: false }));
        return;
      }

      const totalChunks = totalCount || 0;
      const chunksWithEmbeddings = embeddedCount || 0;
      const embeddingPercentage = totalChunks > 0 ? (chunksWithEmbeddings / totalChunks) * 100 : 0;

      setStatus({
        totalChunks,
        chunksWithEmbeddings,
        embeddingPercentage: Math.round(embeddingPercentage * 10) / 10,
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