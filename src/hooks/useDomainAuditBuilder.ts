import { useState } from 'react';

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

export const useDomainAuditBuilder = () => {
  const [isMPSModalOpen, setIsMPSModalOpen] = useState(false);
  const [isGeneratingMPSs, setIsGeneratingMPSs] = useState(false);
  const [isIntentCreatorOpen, setIsIntentCreatorOpen] = useState(false);
  const [acceptedMPSs, setAcceptedMPSs] = useState<MPS[]>([]);
  const [mpsCompleted, setMpsCompleted] = useState(false);
  const [intentCompleted, setIntentCompleted] = useState(false);

  const handleAcceptMPSs = (selectedMPSs: MPS[]) => {
    setAcceptedMPSs(selectedMPSs);
    setMpsCompleted(true);
    setIsMPSModalOpen(false);
  };

  const handleIntentsFinalized = (mpssWithIntents: MPS[]) => {
    setIntentCompleted(true);
    setIsIntentCreatorOpen(false);
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