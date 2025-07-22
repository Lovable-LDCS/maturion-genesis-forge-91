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
  const [acceptedMPSs, setAcceptedMPSs] = useState<MPS[]>([]);
  const [mpsCompleted, setMpsCompleted] = useState(false);
  const [intentCompleted, setIntentCompleted] = useState(false);

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

  const persistMPSsToDatabase = async (mpsList: MPS[]) => {
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

      // Insert MPSs
      const mpsData = mpsList.map(mps => ({
        domain_id: domainDbId,
        organization_id: currentOrganization.id,
        name: mps.name || mps.title || 'Untitled MPS',
        summary: mps.description || '',
        mps_number: parseInt(mps.number || '0'),
        status: 'not_started' as const,
        created_by: user.id,
        updated_by: user.id
      }));

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
    setAcceptedMPSs(selectedMPSs);
    setMpsCompleted(true);
    setIsMPSModalOpen(false);
    
    // Persist MPSs to database
    await persistMPSsToDatabase(selectedMPSs);
  };

  const handleIntentsFinalized = async (mpssWithIntents: MPS[]) => {
    if (!currentOrganization?.id || !user?.id) return;

    try {
      // Update the MPSs in the database with intent statements
      for (const mps of mpssWithIntents) {
        if (mps.intent) {
          await supabase
            .from('maturity_practice_statements')
            .update({ 
              intent_statement: mps.intent,
              status: 'submitted_for_approval' as const,
              updated_by: user.id
            })
            .eq('organization_id', currentOrganization.id)
            .eq('mps_number', parseInt(mps.number || '0'));
        }
      }

      setAcceptedMPSs(mpssWithIntents);
      setIntentCompleted(true);
      setIsIntentCreatorOpen(false);

      toast({
        title: "Intents Finalized",
        description: "Intent statements have been saved successfully.",
      });

    } catch (error) {
      console.error('Error finalizing intents:', error);
      toast({
        title: "Error Saving Intents",
        description: "There was an error saving the intent statements.",
        variant: "destructive"
      });
    }
  };

  const handleStepClick = async (stepId: number) => {
    if (stepId === 1) {
      if (mpsCompleted) {
        // If already completed, allow editing
        setIsMPSModalOpen(true);
      } else {
        // Show loading state and auto-generate MPSs
        setIsGeneratingMPSs(true);
        // Simulate brief loading period for better UX
        setTimeout(() => {
          setIsGeneratingMPSs(false);
          setIsMPSModalOpen(true);
        }, 2000);
      }
    } else if (stepId === 2) {
      if (mpsCompleted) {
        setIsIntentCreatorOpen(true);
      }
    } else {
      // Future step - not yet implemented
    }
  };

  const isStepClickable = (step: AuditStep) => {
    return step.status === 'completed' || step.status === 'active';
  };

  const getStepStatus = (step: AuditStep) => {
    if (step.status === 'completed') {
      return { bgColor: 'bg-green-100', textColor: 'text-green-600', border: 'border-green-200' };
    } else if (step.status === 'active') {
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
    acceptedMPSs,
    mpsCompleted,
    intentCompleted,
    
    // Actions
    handleAcceptMPSs,
    handleIntentsFinalized,
    handleStepClick,
    isStepClickable,
    getStepStatus
  };
};