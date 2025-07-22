import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

export interface AuditStep {
  id: number;
  title: string;
  description: string;
  timeEstimate: string;
  status: 'completed' | 'active' | 'locked';
  icon: any;
}

export const useStepStatusManagement = (domainId: string) => {
  const { currentOrganization } = useOrganization();
  const [stepStatuses, setStepStatuses] = useState<Record<number, 'completed' | 'active' | 'locked'>>({});

  const getDomainNameFromId = (id: string): string => {
    const nameMap: Record<string, string> = {
      'leadership-governance': 'Leadership & Governance',
      'process-integrity': 'Process Integrity',
      'people-culture': 'People & Culture',
      'protection': 'Protection',
      'proof-it-works': 'Proof it Works'
    };
    return nameMap[id] || id;
  };

  const fetchStepStatus = useCallback(async (stepId: number): Promise<'completed' | 'active' | 'locked'> => {
    if (!currentOrganization?.id) return stepId === 1 ? 'active' : 'locked';

    try {
      const { data: domainData } = await supabase
        .from('domains')
        .select(`
          id,
          status,
          maturity_practice_statements (
            id,
            status,
            intent_statement
          )
        `)
        .eq('organization_id', currentOrganization.id)
        .eq('name', getDomainNameFromId(domainId))
        .maybeSingle();

      if (!domainData) return stepId === 1 ? 'active' : 'locked';

      const mpsCount = domainData.maturity_practice_statements?.length || 0;
      const mpsWithIntent = domainData.maturity_practice_statements?.filter(
        (mps: any) => mps.intent_statement && mps.intent_statement.trim() !== ''
      ).length || 0;

      switch (stepId) {
        case 1:
          return mpsCount > 0 ? 'completed' : 'active';
        case 2:
          if (mpsCount === 0) return 'locked';
          return mpsWithIntent === mpsCount ? 'completed' : 'active';
        case 3:
          return mpsCount > 0 && mpsWithIntent === mpsCount ? 'active' : 'locked';
        default:
          return 'locked';
      }
    } catch (error) {
      console.error('Error getting step status:', error);
      return stepId === 1 ? 'active' : 'locked';
    }
  }, [currentOrganization?.id, domainId]);

  const refreshStepStatuses = useCallback(async () => {
    const statuses: Record<number, 'completed' | 'active' | 'locked'> = {};
    for (let i = 1; i <= 3; i++) {
      statuses[i] = await fetchStepStatus(i);
    }
    setStepStatuses(statuses);
  }, [fetchStepStatus]);

  const isStepClickable = async (step: AuditStep): Promise<boolean> => {
    const status = await fetchStepStatus(step.id);
    return status === 'completed' || status === 'active';
  };

  const getStepStatus = (status: 'completed' | 'active' | 'locked') => {
    if (status === 'completed') {
      return { bgColor: 'bg-green-100', textColor: 'text-green-600', border: 'border-green-200' };
    } else if (status === 'active') {
      return { bgColor: 'bg-blue-100', textColor: 'text-blue-600', border: 'border-blue-200' };
    } else {
      return { bgColor: 'bg-muted', textColor: 'text-muted-foreground', border: 'border-muted' };
    }
  };

  // Listen for MPS updates
  useEffect(() => {
    const handleMPSUpdate = () => {
      refreshStepStatuses();
    };

    window.addEventListener('mps-saved', handleMPSUpdate);
    window.addEventListener('intents-finalized', handleMPSUpdate);
    
    return () => {
      window.removeEventListener('mps-saved', handleMPSUpdate);
      window.removeEventListener('intents-finalized', handleMPSUpdate);
    };
  }, [refreshStepStatuses]);

  // Initial load
  useEffect(() => {
    refreshStepStatuses();
  }, [refreshStepStatuses]);

  return {
    stepStatuses,
    fetchStepStatus,
    refreshStepStatuses,
    isStepClickable,
    getStepStatus
  };
};