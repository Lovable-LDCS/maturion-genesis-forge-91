
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

interface MPS {
  id: string;
  number: string;
  title: string;
  intent: string;
  criteriaCount: number;
  selected: boolean;
  rationale?: string;
  aiSourceType?: 'internal' | 'external';
  hasDocumentContext?: boolean;
}

export const useAIMPSGeneration = () => {
  const { currentOrganization } = useOrganization();
  const [generatedMPSs, setGeneratedMPSs] = useState<MPS[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateMPSsForDomain = useCallback(async (domainName: string) => {
    if (!currentOrganization?.id) {
      setError('Organization context not loaded. Please refresh and try again.');
      return;
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(currentOrganization.id)) {
      setError(`Invalid organization ID format: ${currentOrganization.id}`);
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedMPSs([]);

    try {
      const { data, error: fxError } = await supabase.functions.invoke('generate-mps-list', {
        body: {
          organizationId: currentOrganization.id,
          domainName
        }
      });

      if (fxError) throw fxError;

      const mpsArray = (data?.mps || []) as Array<{
        number: string;
        title: string;
        intent: string;
        rationale?: string;
        source_document?: string;
        knowledge_base_used?: boolean;
      }>;

      if (!Array.isArray(mpsArray) || mpsArray.length === 0) {
        throw new Error('No MPS items returned');
      }

      const mapped: MPS[] = mpsArray.map((mps, idx) => ({
        id: `mps-${mps.number}-${Date.now()}-${idx}`,
        number: mps.number,
        title: mps.title || `MPS ${mps.number}`,
        intent: mps.intent || '',
        criteriaCount: 0,
        selected: false,
        rationale: mps.rationale,
        aiSourceType: mps.knowledge_base_used ? 'internal' : 'external',
        hasDocumentContext: !!mps.knowledge_base_used
      }));

      setGeneratedMPSs(mapped);
    } catch (e: any) {
      console.error('Error generating MPS list:', e);
      setError(e?.message || 'Failed to generate MPSs');
      const fallbackMPSs: MPS[] = ['1','2','3','4','5'].map((n, i) => ({
        id: `fallback-${n}-${Date.now()}-${i}`,
        number: n,
        title: `MPS ${n}`,
        intent: '',
        criteriaCount: 0,
        selected: false,
        aiSourceType: 'external',
        hasDocumentContext: false
      }));
      setGeneratedMPSs(fallbackMPSs);
    } finally {
      setIsLoading(false);
    }
  }, [currentOrganization]);

  return {
    generatedMPSs,
    isLoading,
    error,
    generateMPSsForDomain
  };
};
