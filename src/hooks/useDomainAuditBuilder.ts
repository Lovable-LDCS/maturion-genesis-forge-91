import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface MPS {
  id: string;
  name?: string;
  title?: string;
  number?: string;
  intent?: string;
  description?: string;
  rationale?: string;
  selected?: boolean;
  accepted?: boolean;
  aiSourceType?: 'internal' | 'external';
  hasDocumentContext?: boolean;
}

export interface AuditStep {
  id: number;
  title: string;
  description: string;
  timeEstimate: string;
  status: 'completed' | 'active' | 'locked';
  icon: any;
}

export const useDomainAuditBuilder = (domainId: string) => {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isMPSModalOpen, setIsMPSModalOpen] = useState(false);
  const [isGeneratingMPSs, setIsGeneratingMPSs] = useState(false);
  const [isIntentCreatorOpen, setIsIntentCreatorOpen] = useState(false);

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

  const getDomainOrder = (id: string): number => {
    const orderMap: Record<string, number> = {
      'leadership-governance': 1,
      'process-integrity': 2,
      'people-culture': 3,
      'protection': 4,
      'proof-it-works': 5
    };
    return orderMap[id] || 99;
  };

  const saveMPSsToDatabase = async (mpsList: MPS[]) => {
    if (!currentOrganization?.id || !user?.id) return;

    try {
      // First, ensure the domain exists
      const { data: existingDomain } = await supabase
        .from('domains')
        .select('id')
        .eq('organization_id', currentOrganization.id)
        .eq('name', getDomainNameFromId(domainId))
        .single();

      let domainDbId = existingDomain?.id;

      if (!domainDbId) {
        // Create the domain
        const { data: newDomain, error: domainError } = await supabase
          .from('domains')
          .insert({
            name: getDomainNameFromId(domainId),
            organization_id: currentOrganization.id,
            status: 'not_started' as const,
            display_order: getDomainOrder(domainId),
            created_by: user.id,
            updated_by: user.id
          })
          .select('id')
          .single();

        if (domainError) throw domainError;
        domainDbId = newDomain.id;
      }

      // Insert MPSs with proper numbering
      const mpsData = mpsList.map((mps, index) => {
        // Ensure mps_number is always a valid integer
        let mpsNumber = index + 1; // Default fallback
        if (mps.number) {
          const parsed = parseInt(mps.number.toString());
          if (!isNaN(parsed) && parsed > 0) {
            mpsNumber = parsed;
          }
        }
        
        return {
          domain_id: domainDbId,
          organization_id: currentOrganization.id,
          name: mps.name || mps.title || 'Untitled MPS',
          summary: mps.description || '',
          mps_number: mpsNumber,
          status: 'not_started' as const,
          created_by: user.id,
          updated_by: user.id
        };
      });

      const { error: mpsError } = await supabase
        .from('maturity_practice_statements')
        .insert(mpsData);

      if (mpsError) throw mpsError;

      toast({
        title: "MPSs Saved",
        description: "MPSs have been saved to the database successfully.",
      });

    } catch (error) {
      console.error('Error persisting MPSs:', error);
      toast({
        title: "Error Saving MPSs",
        description: "There was an error saving the MPSs to the database.",
        variant: "destructive"
      });
    }
  };

  const handleAcceptMPSs = async (selectedMPSs: MPS[]) => {
    try {
      console.log('Saving selected MPSs to database:', selectedMPSs.map(mps => ({ 
        name: mps.name || mps.title, 
        number: mps.number,
        selected: mps.selected 
      })));
      
      // Save MPSs directly to database
      await saveMPSsToDatabase(selectedMPSs);
      setIsMPSModalOpen(false);
      
      // Instead of page reload, just refresh the step status
      // This maintains the flow and allows proper state updates
      window.dispatchEvent(new CustomEvent('mps-saved'));
    } catch (error) {
      console.error('Error saving MPSs:', error);
    }
  };

  const handleIntentsFinalized = async (mpssWithIntents: MPS[]) => {
    try {
      // Save intents to database 
      for (const mps of mpssWithIntents) {
        if (mps.intent && mps.id) {
          await supabase
            .from('maturity_practice_statements')
            .update({ 
              intent_statement: mps.intent,
              status: 'approved_locked'
            })
            .eq('id', mps.id);
        }
      }
      
      setIsIntentCreatorOpen(false);
    } catch (error) {
      console.error('Error saving intents:', error);
    }
  };

  // Get database-driven step status
  const getDatabaseStepStatus = async (stepId: number): Promise<'completed' | 'active' | 'locked'> => {
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

      // If no domain exists yet, Step 1 should be active to start the process
      if (!domainData) return stepId === 1 ? 'active' : 'locked';

      const mpsCount = domainData.maturity_practice_statements?.length || 0;
      const mpsWithIntent = domainData.maturity_practice_statements?.filter(
        (mps: any) => mps.intent_statement && mps.intent_statement.trim() !== ''
      ).length || 0;

      if (stepId === 1) {
        return mpsCount > 0 ? 'completed' : 'active';
      } else if (stepId === 2) {
        if (mpsCount === 0) return 'locked';
        return mpsWithIntent === mpsCount ? 'completed' : 'active';
      } else if (stepId === 3) {
        return mpsCount > 0 && mpsWithIntent === mpsCount ? 'active' : 'locked';
      }

      return 'locked';
    } catch (error) {
      console.error('Error getting step status:', error);
      return stepId === 1 ? 'active' : 'locked';
    }
  };

  const handleStepClick = async (stepId: number) => {
    const stepStatus = await getDatabaseStepStatus(stepId);
    
    if (stepId === 1 && (stepStatus === 'active' || stepStatus === 'completed')) {
      setIsGeneratingMPSs(true);
      // Simulate brief loading period for better UX
      setTimeout(() => {
        setIsGeneratingMPSs(false);
        setIsMPSModalOpen(true);
      }, 2000);
    } else if (stepId === 2 && (stepStatus === 'active' || stepStatus === 'completed')) {
      setIsIntentCreatorOpen(true);
    }
  };

  const isStepClickable = async (step: AuditStep): Promise<boolean> => {
    const status = await getDatabaseStepStatus(step.id);
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

  return {
    // State
    isMPSModalOpen,
    setIsMPSModalOpen,
    isGeneratingMPSs,
    setIsGeneratingMPSs,
    isIntentCreatorOpen,
    setIsIntentCreatorOpen,
    
    // Actions
    handleAcceptMPSs,
    handleIntentsFinalized,
    handleStepClick,
    isStepClickable,
    getStepStatus,
    getDatabaseStepStatus
  };
};