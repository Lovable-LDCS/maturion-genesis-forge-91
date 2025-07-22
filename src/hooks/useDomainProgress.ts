
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
      // Fetch domains and their MPSs from database ONLY
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

      // Create clean progress data based ONLY on database state
      const progressData: DomainProgress[] = DOMAIN_ORDER.map((domainKey, index) => {
        const domainInfo = DOMAIN_INFO[domainKey as keyof typeof DOMAIN_INFO];
        
        // Find matching domain in database
        const domainData = domainsData?.find(d => 
          domainInfo.dbNames.some(name => 
            d.name === name || 
            d.name.toLowerCase().replace(/\s+/g, '-').replace(/&/g, '').replace(/'/g, '') === name.toLowerCase().replace(/\s+/g, '-').replace(/&/g, '').replace(/'/g, '')
          )
        );

        // NO MOCK DATA - All values start at zero
        let mpsCount = 0;
        let criteriaCount = 0;
        let mpsWithIntent = 0;
        let criteriaCompleted = 0;

        // Only count if real database data exists
        if (domainData?.maturity_practice_statements?.length > 0) {
          mpsCount = domainData.maturity_practice_statements.length;
          mpsWithIntent = domainData.maturity_practice_statements.filter(
            (mps: any) => mps.intent_statement && mps.intent_statement.trim() !== ''
          ).length;

          domainData.maturity_practice_statements.forEach((mps: any) => {
            if (mps.criteria?.length > 0) {
              criteriaCount += mps.criteria.length;
              criteriaCompleted += mps.criteria.filter((c: any) => c.status === 'approved_locked').length;
            }
          });
        }

        // Determine status based ONLY on database data
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
            completionPercentage = Math.round((criteriaCompleted / criteriaCount) * 100);
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

        // STRICT SEQUENTIAL UNLOCKING - NO EXCEPTIONS
        let isUnlocked = index === 0; // ONLY first domain unlocked by default
        
        if (index > 0) {
          // Check if ALL previous domains are 100% completed
          let allPreviousCompleted = true;
          
          for (let i = 0; i < index; i++) {
            const prevDomainKey = DOMAIN_ORDER[i];
            const prevDomainInfo = DOMAIN_INFO[prevDomainKey as keyof typeof DOMAIN_INFO];
            const prevDomainData = domainsData?.find(d => 
              prevDomainInfo.dbNames.some(name => 
                d.name === name || 
                d.name.toLowerCase().replace(/\s+/g, '-').replace(/&/g, '').replace(/'/g, '') === name.toLowerCase().replace(/\s+/g, '-').replace(/&/g, '').replace(/'/g, '')
              )
            );
            
            // Previous domain MUST exist and be completed
            if (!prevDomainData?.maturity_practice_statements?.length) {
              allPreviousCompleted = false;
              break;
            }
            
            const prevMpsCount = prevDomainData.maturity_practice_statements.length;
            const prevMpsWithIntent = prevDomainData.maturity_practice_statements.filter(
              (mps: any) => mps.intent_statement && mps.intent_statement.trim() !== ''
            ).length;
            let prevCriteriaCount = 0;
            let prevCriteriaCompleted = 0;

            prevDomainData.maturity_practice_statements.forEach((mps: any) => {
              if (mps.criteria?.length > 0) {
                prevCriteriaCount += mps.criteria.length;
                prevCriteriaCompleted += mps.criteria.filter((c: any) => c.status === 'approved_locked').length;
              }
            });

            // Domain is complete ONLY if all requirements met
            const isDomainComplete = prevMpsCount > 0 && 
                                   prevMpsWithIntent === prevMpsCount && 
                                   prevCriteriaCompleted === prevCriteriaCount && 
                                   prevCriteriaCount > 0;
            
            if (!isDomainComplete) {
              allPreviousCompleted = false;
              break;
            }
          }
          
          isUnlocked = allPreviousCompleted;
        }

        // Force locked status if not unlocked
        if (!isUnlocked) {
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
