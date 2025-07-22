
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

export interface DomainProgress {
  id: string;
  name: string;
  description: string;
  mpsRange: string;
  mpsCount: number;
  criteriaCount: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'locked';
  completionPercentage: number;
  currentStep: 'mps' | 'intent' | 'criteria' | 'completed';
  isUnlocked: boolean;
}

const DOMAIN_ORDER = [
  'leadership-governance',
  'process-integrity', 
  'people-culture',
  'protection',
  'proof-it-works'
];

const DOMAIN_INFO = {
  'leadership-governance': {
    name: 'Leadership & Governance',
    description: 'Strategic oversight, risk management, and compliance frameworks',
    mpsRange: 'MPS 1–5',
    dbNames: ['Leadership & Governance', 'leadership-governance']
  },
  'process-integrity': {
    name: 'Process Integrity',
    description: 'Document management, version control, and quality assurance processes',
    mpsRange: 'MPS 6–10',
    dbNames: ['Process Integrity', 'process-integrity']
  },
  'people-culture': {
    name: 'People & Culture', 
    description: 'Training, awareness, and organizational behavior standards',
    mpsRange: 'MPS 11–14',
    dbNames: ['People & Culture', 'people-culture']
  },
  'protection': {
    name: 'Protection',
    description: 'Security controls, access management, and data protection',
    mpsRange: 'MPS 15–20',
    dbNames: ['Protection', 'protection']
  },
  'proof-it-works': {
    name: 'Proof it Works',
    description: 'Monitoring, testing, and validation mechanisms',
    mpsRange: 'MPS 21–25',
    dbNames: ['Proof it Works', 'proof-it-works']
  }
};

export const useDomainProgress = () => {
  const { currentOrganization } = useOrganization();
  const [domainProgress, setDomainProgress] = useState<DomainProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentOrganization?.id) {
      fetchDomainProgress();
    }
  }, [currentOrganization?.id]);

  const fetchDomainProgress = async () => {
    if (!currentOrganization?.id) return;

    try {
      // Fetch domains and their MPSs
      const { data: domainsData, error: domainsError } = await supabase
        .from('domains')
        .select(`
          id,
          name,
          intent_statement,
          status,
          display_order,
          maturity_practice_statements (
            id,
            name,
            mps_number,
            status,
            intent_statement,
            criteria (
              id,
              criteria_number,
              status
            )
          )
        `)
        .eq('organization_id', currentOrganization.id)
        .order('display_order', { ascending: true });

      if (domainsError) throw domainsError;

      // Calculate progress for each domain
      const progressData: DomainProgress[] = DOMAIN_ORDER.map((domainKey, index) => {
        const domainInfo = DOMAIN_INFO[domainKey as keyof typeof DOMAIN_INFO];
        
        // Improved domain matching using multiple possible names
        const domainData = domainsData?.find(d => 
          domainInfo.dbNames.some(name => 
            d.name === name || 
            d.name.toLowerCase().replace(/\s+/g, '-').replace(/&/g, '').replace(/'/g, '') === name.toLowerCase().replace(/\s+/g, '-').replace(/&/g, '').replace(/'/g, '')
          )
        );

        let mpsCount = 0;
        let criteriaCount = 0;
        let mpsWithIntent = 0;
        let mpsCompleted = 0;
        let criteriaCompleted = 0;

        if (domainData?.maturity_practice_statements) {
          mpsCount = domainData.maturity_practice_statements.length;
          mpsWithIntent = domainData.maturity_practice_statements.filter(
            (mps: any) => mps.intent_statement && mps.intent_statement.trim() !== ''
          ).length;
          mpsCompleted = domainData.maturity_practice_statements.filter(
            (mps: any) => mps.status === 'approved'
          ).length;

          domainData.maturity_practice_statements.forEach((mps: any) => {
            if (mps.criteria) {
              criteriaCount += mps.criteria.length;
              criteriaCompleted += mps.criteria.filter((c: any) => c.status === 'approved').length;
            }
          });
        }

        // Determine current step and status
        let currentStep: DomainProgress['currentStep'] = 'mps';
        let status: DomainProgress['status'] = 'not_started';
        let completionPercentage = 0;

        if (mpsCount > 0) {
          status = 'in_progress';
          if (mpsWithIntent === mpsCount && criteriaCompleted === criteriaCount && criteriaCount > 0) {
            currentStep = 'completed';
            status = 'completed';
            completionPercentage = 100;
          } else if (criteriaCount > 0) {
            currentStep = 'criteria';
            completionPercentage = Math.round((criteriaCompleted / Math.max(criteriaCount, 1)) * 100);
          } else if (mpsWithIntent === mpsCount) {
            currentStep = 'criteria';
            completionPercentage = 66;
          } else if (mpsWithIntent > 0) {
            currentStep = 'intent';
            completionPercentage = 33;
          } else {
            currentStep = 'intent';
            completionPercentage = 20;
          }
        }

        // Determine if domain is unlocked - STRICT SEQUENTIAL LOCKING
        let isUnlocked = index === 0; // First domain is always unlocked
        if (index > 0) {
          // Check if previous domain is completed
          const prevDomainKey = DOMAIN_ORDER[index - 1];
          const prevDomainInfo = DOMAIN_INFO[prevDomainKey as keyof typeof DOMAIN_INFO];
          const prevDomainData = domainsData?.find(d => 
            prevDomainInfo.dbNames.some(name => 
              d.name === name || 
              d.name.toLowerCase().replace(/\s+/g, '-').replace(/&/g, '').replace(/'/g, '') === name.toLowerCase().replace(/\s+/g, '-').replace(/&/g, '').replace(/'/g, '')
            )
          );
          
          if (prevDomainData?.maturity_practice_statements) {
            const prevMpsCount = prevDomainData.maturity_practice_statements.length;
            const prevMpsWithIntent = prevDomainData.maturity_practice_statements.filter(
              (mps: any) => mps.intent_statement && mps.intent_statement.trim() !== ''
            ).length;
            let prevCriteriaCount = 0;
            let prevCriteriaCompleted = 0;

            prevDomainData.maturity_practice_statements.forEach((mps: any) => {
              if (mps.criteria) {
                prevCriteriaCount += mps.criteria.length;
                prevCriteriaCompleted += mps.criteria.filter((c: any) => c.status === 'approved').length;
              }
            });

            isUnlocked = prevMpsCount > 0 && prevMpsWithIntent === prevMpsCount && 
                        prevCriteriaCompleted === prevCriteriaCount && prevCriteriaCount > 0;
          }
        }

        if (!isUnlocked && status !== 'completed') {
          status = 'locked';
        }

        return {
          id: domainKey,
          name: domainInfo.name,
          description: domainInfo.description,
          mpsRange: domainInfo.mpsRange,
          mpsCount,
          criteriaCount,
          status,
          completionPercentage,
          currentStep,
          isUnlocked
        };
      });

      setDomainProgress(progressData);
    } catch (error) {
      console.error('Error fetching domain progress:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    domainProgress,
    loading,
    refetch: fetchDomainProgress
  };
};
