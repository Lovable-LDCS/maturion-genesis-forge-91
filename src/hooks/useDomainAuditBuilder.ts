import { useState } from 'react';
import { useMPSManagement, MPS } from './useMPSManagement';
import { useStepStatusManagement, AuditStep } from './useStepStatusManagement';

export type { MPS, AuditStep };

export const useDomainAuditBuilder = (domainId: string) => {
  const [isMPSModalOpen, setIsMPSModalOpen] = useState(false);
  const [isGeneratingMPSs, setIsGeneratingMPSs] = useState(false);
  const [isIntentCreatorOpen, setIsIntentCreatorOpen] = useState(false);
  const [isCriteriaManagementOpen, setIsCriteriaManagementOpen] = useState(false);

  const { saveMPSsToDatabase } = useMPSManagement(domainId);
  const { 
    stepStatuses,
    fetchStepStatus, 
    isStepClickable, 
    getStepStatus 
  } = useStepStatusManagement(domainId);

  const handleAcceptMPSs = async (selectedMPSs: MPS[]) => {
    try {
      await saveMPSsToDatabase(selectedMPSs);
      setIsMPSModalOpen(false);
      
      // Notify other components that MPSs were saved
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
          await import('@/integrations/supabase/client').then(({ supabase }) =>
            supabase
              .from('maturity_practice_statements')
              .update({ 
                intent_statement: mps.intent,
                status: 'approved_locked'
              })
              .eq('id', mps.id)
          );
        }
      }
      
      setIsIntentCreatorOpen(false);
      
      // Notify other components that intents were finalized
      window.dispatchEvent(new CustomEvent('intents-finalized'));
    } catch (error) {
      console.error('Error saving intents:', error);
    }
  };

  const handleCriteriaFinalized = async (criteria: any[]) => {
    try {
      console.log('Criteria finalized:', criteria);
      setIsCriteriaManagementOpen(false);
      
      // Notify other components that criteria were finalized
      window.dispatchEvent(new CustomEvent('criteria-finalized'));
    } catch (error) {
      console.error('Error finalizing criteria:', error);
    }
  };

  const handleStepClick = async (stepId: number) => {
    const stepStatus = await fetchStepStatus(stepId);
    
    if (stepId === 1 && (stepStatus === 'active' || stepStatus === 'completed')) {
      setIsGeneratingMPSs(true);
      setTimeout(() => {
        setIsGeneratingMPSs(false);
        setIsMPSModalOpen(true);
      }, 2000);
    } else if (stepId === 2 && (stepStatus === 'active' || stepStatus === 'completed')) {
      setIsIntentCreatorOpen(true);
    } else if (stepId === 3 && (stepStatus === 'active' || stepStatus === 'completed')) {
      setIsCriteriaManagementOpen(true);
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
    isCriteriaManagementOpen,
    setIsCriteriaManagementOpen,
    stepStatuses,
    
    // Actions
    handleAcceptMPSs,
    handleIntentsFinalized,
    handleCriteriaFinalized,
    handleStepClick,
    isStepClickable,
    getStepStatus,
    fetchStepStatus
  };
};