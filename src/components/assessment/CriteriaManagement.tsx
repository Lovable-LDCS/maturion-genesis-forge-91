import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Plus, Sparkles, Bot } from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AIGeneratedCriteriaCards } from './AIGeneratedCriteriaCards';
import { EnhancedCriterionModal } from './EnhancedCriterionModal';
import { EnhancedPlacementModal } from './EnhancedPlacementModal';
import { useCustomCriterion } from '@/hooks/useCustomCriterion';

interface MPS {
  id: string;
  name: string;
  mps_number: number;
  intent_statement?: string;
  summary?: string;
  status: string;
}

interface Criteria {
  id: string;
  mps_id: string;
  criteria_number: string;
  statement: string;
  summary?: string;
  status: string;
  ai_suggested_statement?: string;
  ai_suggested_summary?: string;
  statement_approved_by?: string;
  statement_approved_at?: string;
  deferral_status?: string | null;
}

interface CriteriaManagementProps {
  isOpen: boolean;
  onClose: () => void;
  domainName: string;
  onCriteriaFinalized: (approvedCriteria: Criteria[]) => void;
}

export const CriteriaManagement: React.FC<CriteriaManagementProps> = ({
  isOpen,
  onClose,
  domainName,
  onCriteriaFinalized
}) => {
  const [mpsList, setMPSList] = useState<MPS[]>([]);
  const [criteriaList, setCriteriaList] = useState<Criteria[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAIGeneration, setShowAIGeneration] = useState<string | null>(null);
  const [showManualModal, setShowManualModal] = useState<string | null>(null);
  const [showPlacementModal, setShowPlacementModal] = useState(false);
  const [placementData, setPlacementData] = useState<any>(null);
  const [aiPhaseCompleted, setAIPhaseCompleted] = useState<Set<string>>(new Set());
  
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();

  const fetchMPSsAndCriteria = async () => {
    if (!currentOrganization?.id) return;

    setIsLoading(true);
    try {
      // Use a simplified fetch approach to avoid TypeScript inference issues
      const fetchMPS = async () => {
        return await fetch('/api/supabase-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table: 'maturity_practice_statements',
            action: 'select',
            filters: {
              organization_id: currentOrganization.id,
              domain_name: domainName
            }
          })
        });
      };

      // For now, let's use mock data to get the component working
      const mockMPSData = [
        {
          id: '1',
          name: 'Sample MPS 1',
          mps_number: 1,
          status: 'approved_locked',
          intent_statement: 'Sample intent',
          summary: 'Sample summary'
        },
        {
          id: '2', 
          name: 'Sample MPS 2',
          mps_number: 2,
          status: 'in_progress',
          intent_statement: 'Sample intent 2',
          summary: 'Sample summary 2'
        }
      ];

      const mockCriteriaData = [
        {
          id: '1',
          mps_id: '1',
          criteria_number: '1.1',
          statement: 'Sample criteria statement 1',
          summary: 'Sample criteria summary 1',
          status: 'approved_locked'
        },
        {
          id: '2',
          mps_id: '2', 
          criteria_number: '2.1',
          statement: 'Sample criteria statement 2',
          summary: 'Sample criteria summary 2',
          status: 'in_progress'
        }
      ];

      setMPSList(mockMPSData);
      setCriteriaList(mockCriteriaData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load criteria data.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch MPSs and criteria on modal open
  useEffect(() => {
    if (isOpen && currentOrganization?.id) {
      fetchMPSsAndCriteria();
    }
  }, [isOpen, currentOrganization?.id, domainName]); // eslint-disable-line react-hooks/exhaustive-deps

  const getCriteriaForMPS = (mpsId: string): Criteria[] => {
    return criteriaList.filter(criteria => criteria.mps_id === mpsId);
  };

  const getApprovedCriteriaCount = (): number => {
    return criteriaList.filter(criteria => criteria.status === 'approved_locked').length;
  };

  // Custom criterion hook setup
  const customCriterionHook = useCustomCriterion({
    organizationId: currentOrganization?.id || '',
    organizationOwnerId: currentOrganization?.owner_id || '',
    domainName: domainName,
    getMPSByID: (id: string) => mpsList.find(mps => mps.id === id),
    getCriteriaForMPS: (mpsId: string) => getCriteriaForMPS(mpsId),
    checkForDuplicateCriteria: async (statement: string, criteria: Criteria[]) => {
      // Simple duplicate check - in production this would be more sophisticated
      const isDuplicate = criteria.some(c => 
        c.statement.toLowerCase().includes(statement.toLowerCase().substring(0, 20))
      );
      return !isDuplicate;
    },
    determinePlacementScenario: async (suggestedDomain: string, currentDomain: string) => {
      if (suggestedDomain === currentDomain) return 'same_domain';
      // Simple heuristic - in production this would check against domain configuration
      return 'future_domain';
    },
    onRefreshData: fetchMPSsAndCriteria,
    onShowPlacementModal: (data) => {
      setPlacementData(data);
      setShowPlacementModal(true);
    }
  });

  const handleStartAIGeneration = (mpsId: string) => {
    setShowAIGeneration(mpsId);
  };

  const handleAIGenerationComplete = (mpsId: string, approvedCriteria: any[]) => {
    // Add approved AI criteria to the criteria list
    const newCriteria = approvedCriteria.map((criterion, index) => ({
      id: `ai-${mpsId}-${index}`,
      mps_id: mpsId,
      criteria_number: `${mpsList.find(m => m.id === mpsId)?.mps_number}.${index + 1}`,
      statement: criterion.statement,
      summary: criterion.summary,
      status: 'approved_locked'
    }));
    
    setCriteriaList(prev => [...prev, ...newCriteria]);
    setAIPhaseCompleted(prev => new Set([...prev, mpsId]));
    setShowAIGeneration(null);
    
    toast({
      title: "AI Criteria Added",
      description: `${approvedCriteria.length} AI-generated criteria have been added.`,
    });
  };

  const handleOpenManualModal = (mpsId: string) => {
    if (!aiPhaseCompleted.has(mpsId)) {
      // If AI phase not completed, start AI generation first
      handleStartAIGeneration(mpsId);
    } else {
      // AI phase completed, open manual modal
      setShowManualModal(mpsId);
    }
  };

  const handleManualCriterionSubmit = async (criterion: { statement: string; summary: string }) => {
    if (!showManualModal) return { success: false };
    
    const result = await customCriterionHook.addCustomCriterion(criterion, showManualModal);
    
    if (result.success && !result.placementModalTriggered) {
      // Refresh data only if placement modal wasn't triggered
      await fetchMPSsAndCriteria();
    }
    
    return result;
  };

  const handlePlacementData = (data: any) => {
    setPlacementData(data);
    setShowPlacementModal(true);
  };

  const handleFinalizeCriteria = () => {
    const approvedCriteria = criteriaList.filter(criteria => criteria.status === 'approved_locked');
    onCriteriaFinalized(approvedCriteria);
    onClose();
  };

  const progressPercentage = mpsList.length > 0 
    ? Math.round((getApprovedCriteriaCount() / criteriaList.length) * 100) 
    : 0;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Criteria Management - {domainName}
            </DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <Sparkles className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                <p>Loading criteria data...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Progress Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Progress Overview
                    <Badge variant="outline">
                      {getApprovedCriteriaCount()} / {criteriaList.length} Approved
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Progress value={progressPercentage} className="w-full" />
                  <p className="text-sm text-muted-foreground mt-2">
                    {progressPercentage}% of criteria approved
                  </p>
                </CardContent>
              </Card>

              {/* MPSs Section */}
              <div className="space-y-4">
                {mpsList.map((mps) => {
                  const mpscriteria = getCriteriaForMPS(mps.id);
                  const approvedCount = mpscriteria.filter(c => c.status === 'approved_locked').length;
                  
                  return (
                    <Card key={mps.id}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>MPS {mps.mps_number}: {mps.name}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant={approvedCount === mpscriteria.length ? "default" : "secondary"}>
                              {approvedCount} / {mpscriteria.length} criteria
                            </Badge>
                            {!aiPhaseCompleted.has(mps.id) ? (
                              <Button
                                size="sm"
                                onClick={() => handleStartAIGeneration(mps.id)}
                                className="flex items-center gap-1"
                              >
                                <Bot className="h-4 w-4" />
                                Generate AI Criteria
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handleOpenManualModal(mps.id)}
                                className="flex items-center gap-1"
                              >
                                <Plus className="h-4 w-4" />
                                Add Manual Criterion
                              </Button>
                            )}
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {mpscriteria.length > 0 ? (
                          <div className="space-y-2">
                            {mpscriteria.map((criteria) => (
                              <div key={criteria.id} className="flex items-center justify-between p-3 border rounded">
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{criteria.statement}</p>
                                  {criteria.summary && (
                                    <p className="text-xs text-muted-foreground">{criteria.summary}</p>
                                  )}
                                </div>
                                <Badge variant={criteria.status === 'approved_locked' ? "default" : "secondary"}>
                                  {criteria.status}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted-foreground">No criteria yet. Add some to get started.</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
                <Button 
                  onClick={handleFinalizeCriteria}
                  disabled={getApprovedCriteriaCount() === 0}
                >
                  Finalize Criteria ({getApprovedCriteriaCount()})
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* AI Generation Modal */}
      {showAIGeneration && (
        <Dialog open={!!showAIGeneration} onOpenChange={() => setShowAIGeneration(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Criteria Generation
              </DialogTitle>
            </DialogHeader>
            <AIGeneratedCriteriaCards
              mps={mpsList.find(m => m.id === showAIGeneration)!}
              organizationId={currentOrganization?.id || ''}
              domainName={domainName}
              onComplete={(approvedCriteria) => 
                handleAIGenerationComplete(showAIGeneration, approvedCriteria)
              }
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Manual Criterion Modal */}
      <EnhancedCriterionModal
        isOpen={!!showManualModal}
        onClose={() => setShowManualModal(null)}
        mpsId={showManualModal || ''}
        mpsName={mpsList.find(m => m.id === showManualModal)?.name || ''}
        mpsNumber={mpsList.find(m => m.id === showManualModal)?.mps_number || 0}
        onSubmitCriterion={handleManualCriterionSubmit}
        isProcessing={customCriterionHook.isProcessing}
      />

      {/* Enhanced Placement Modal */}
      <EnhancedPlacementModal
        isOpen={showPlacementModal}
        onClose={() => setShowPlacementModal(false)}
        placementData={placementData}
        onApprove={(data) => {
          console.log('Approved placement:', data);
          setShowPlacementModal(false);
          fetchMPSsAndCriteria();
        }}
        onDefer={(data) => {
          console.log('Deferred placement:', data);
          setShowPlacementModal(false);
          fetchMPSsAndCriteria();
        }}
        onReject={(data) => {
          console.log('Rejected placement:', data);
          setShowPlacementModal(false);
        }}
        onSplit={(data) => {
          console.log('Split criterion:', data);
          setShowPlacementModal(false);
          fetchMPSsAndCriteria();
        }}
      />
    </>
  );
};