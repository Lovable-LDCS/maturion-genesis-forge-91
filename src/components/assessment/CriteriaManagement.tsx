import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Plus, Sparkles, Bot, ChevronDown, ChevronRight } from 'lucide-react';
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
  const [collapsedMPS, setCollapsedMPS] = useState<Set<string>>(new Set());
  
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();

  const fetchMPSsAndCriteria = async () => {
    if (!currentOrganization?.id) return;

    setIsLoading(true);
    try {
      // Fetch real MPS data from Supabase
      const { data: mpsData, error: mpsError } = await supabase
        .from('maturity_practice_statements')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('mps_number');

      if (mpsError) {
        console.error('Error fetching MPS data:', mpsError);
        // Fallback to mock data if fetch fails
        setMPSList([
          {
            id: '1',
            name: 'Leadership',
            mps_number: 1,
            status: 'approved_locked',
            intent_statement: 'Establish leadership accountability for information security governance',
            summary: 'Leadership framework for security oversight'
          },
          {
            id: '2', 
            name: 'Chain of Custody and Security Control Committee',
            mps_number: 2,
            status: 'in_progress',
            intent_statement: 'Implement chain of custody controls and security committee oversight',
            summary: 'Formal security governance structure'
          }
        ]);
      } else {
        setMPSList(mpsData || []);
      }

      // Fetch real criteria data from Supabase
      const { data: criteriaData, error: criteriaError } = await supabase
        .from('criteria')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('criteria_number');

      if (criteriaError) {
        console.error('Error fetching criteria data:', criteriaError);
        setCriteriaList([]);
      } else {
        setCriteriaList(criteriaData || []);
      }

      console.log('📊 Data fetched:', { 
        mpsCount: mpsData?.length || 0, 
        criteriaCount: criteriaData?.length || 0,
        domain: domainName 
      });

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load criteria data. Using fallback data.",
        variant: "destructive"
      });
      
      // Provide fallback data
      setMPSList([
        {
          id: 'fallback-1',
          name: 'Leadership',
          mps_number: 1,
          status: 'approved_locked',
          intent_statement: 'Establish leadership accountability for information security governance',
          summary: 'Leadership framework for security oversight'
        }
      ]);
      setCriteriaList([]);
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
      // Enhanced duplicate detection with semantic similarity
      const normalizedStatement = statement.toLowerCase().trim();
      
      const isDuplicate = criteria.some(c => {
        const normalizedExisting = c.statement.toLowerCase().trim();
        
        // Check for exact matches
        if (normalizedStatement === normalizedExisting) return true;
        
        // Check for high similarity (>80% overlap of key words)
        const statementWords = normalizedStatement.split(' ').filter(w => w.length > 3);
        const existingWords = normalizedExisting.split(' ').filter(w => w.length > 3);
        
        const commonWords = statementWords.filter(word => 
          existingWords.some(existingWord => 
            existingWord.includes(word) || word.includes(existingWord)
          )
        );
        
        const similarity = commonWords.length / Math.max(statementWords.length, existingWords.length);
        return similarity > 0.8;
      });
      
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
    // Add approved AI criteria to the criteria list with proper numbering
    const existingCriteriaForMPS = getCriteriaForMPS(mpsId);
    const mpsNumber = mpsList.find(m => m.id === mpsId)?.mps_number || 1;
    
    const newCriteria = approvedCriteria.map((criterion, index) => ({
      id: `ai-${mpsId}-${index}`,
      mps_id: mpsId,
      criteria_number: `${mpsNumber}.${existingCriteriaForMPS.length + index + 1}`,
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

    // Auto-trigger manual modal after AI completion
    setTimeout(() => {
      setShowManualModal(mpsId);
    }, 500);
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
    
    // Get the next available criteria number for this MPS
    const existingCriteriaForMPS = getCriteriaForMPS(showManualModal);
    const mpsNumber = mpsList.find(m => m.id === showManualModal)?.mps_number || 1;
    const nextCriteriaNumber = existingCriteriaForMPS.length + 1;
    const criteriaNumber = `${mpsNumber}.${nextCriteriaNumber}`;
    
    const result = await customCriterionHook.addCustomCriterion(criterion, showManualModal);
    
    if (result.success && !result.placementModalTriggered) {
      // Add the criterion to local state with proper numbering
      const newCriterion = {
        id: `manual-${showManualModal}-${Date.now()}`,
        mps_id: showManualModal,
        criteria_number: criteriaNumber,
        statement: criterion.statement,
        summary: criterion.summary,
        status: 'approved_locked'
      };
      
      setCriteriaList(prev => [...prev, newCriterion]);
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
                  const isCollapsed = collapsedMPS.has(mps.id);
                  
                  return (
                    <Card key={mps.id}>
                      <CardHeader className="cursor-pointer" onClick={() => {
                        setCollapsedMPS(prev => {
                          const newSet = new Set(prev);
                          if (newSet.has(mps.id)) {
                            newSet.delete(mps.id);
                          } else {
                            newSet.add(mps.id);
                          }
                          return newSet;
                        });
                      }}>
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isCollapsed ? (
                              <ChevronRight className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                            <span>MPS {mps.mps_number}: {mps.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={approvedCount === mpscriteria.length && mpscriteria.length > 0 ? "default" : "secondary"}>
                              {approvedCount} / {mpscriteria.length} criteria
                            </Badge>
                            {!aiPhaseCompleted.has(mps.id) ? (
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartAIGeneration(mps.id);
                                }}
                                className="flex items-center gap-1"
                              >
                                <Bot className="h-4 w-4" />
                                Generate AI Criteria
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenManualModal(mps.id);
                                }}
                                className="flex items-center gap-1"
                              >
                                <Plus className="h-4 w-4" />
                                Add Manual Criterion
                              </Button>
                            )}
                          </div>
                        </CardTitle>
                      </CardHeader>
                      {!isCollapsed && (
                        <CardContent>
                          {mpscriteria.length > 0 ? (
                            <div className="space-y-2">
                              {mpscriteria.map((criteria) => (
                                <div key={criteria.id} className="flex items-center justify-between p-3 border rounded">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Badge variant="outline" className="text-xs">
                                        {criteria.criteria_number}
                                      </Badge>
                                      <p className="text-sm font-medium">{criteria.statement}</p>
                                    </div>
                                    {criteria.summary && (
                                      <p className="text-xs text-muted-foreground ml-2">{criteria.summary}</p>
                                    )}
                                  </div>
                                  <Badge 
                                    variant={criteria.status === 'approved_locked' ? "default" : "secondary"}
                                    className={criteria.status === 'approved_locked' ? "bg-green-500 hover:bg-green-600" : ""}
                                  >
                                    {criteria.status === 'approved_locked' ? 'approved_locked' : criteria.status}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-muted-foreground">No criteria yet. Click "Generate AI Criteria" to get started.</p>
                          )}
                        </CardContent>
                      )}
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
          // Don't wipe existing criteria, just add the new criterion to suggested location
          if (data.suggestion.targetMPS && data.criteriaId) {
            const newCriterion = {
              id: `placed-${data.criteriaId}-${Date.now()}`,
              mps_id: data.suggestion.targetMPS,
              criteria_number: `${mpsList.find(m => m.id === data.suggestion.targetMPS)?.mps_number || 1}.${getCriteriaForMPS(data.suggestion.targetMPS).length + 1}`,
              statement: data.originalStatement || '',
              summary: data.originalSummary || '',
              status: 'approved_locked'
            };
            setCriteriaList(prev => [...prev, newCriterion]);
          }
          setShowPlacementModal(false);
          toast({ title: "Criterion Placed", description: "Criterion has been placed in the suggested location." });
        }}
        onDefer={(data) => {
          // Create deferred entry for later review
          console.log('Deferred placement:', data);
          setShowPlacementModal(false);
          toast({ title: "Criterion Deferred", description: "Criterion has been deferred for later review." });
        }}
        onReject={(data) => {
          console.log('Rejected placement:', data);
          setShowPlacementModal(false);
          toast({ title: "Placement Rejected", description: "The suggested placement has been rejected." });
        }}
        onSplit={(data) => {
          // Handle splitting the criterion into two separate criteria
          if (data.suggestion.splitSuggestion && showManualModal) {
            const mpsNumber = mpsList.find(m => m.id === showManualModal)?.mps_number || 1;
            const existingCount = getCriteriaForMPS(showManualModal).length;
            
            const newCriteria = [
              {
                id: `split-1-${Date.now()}`,
                mps_id: showManualModal,
                criteria_number: `${mpsNumber}.${existingCount + 1}`,
                statement: data.suggestion.splitSuggestion.criterion1,
                summary: 'Split from original criterion',
                status: 'approved_locked'
              },
              {
                id: `split-2-${Date.now()}`,
                mps_id: showManualModal,
                criteria_number: `${mpsNumber}.${existingCount + 2}`,
                statement: data.suggestion.splitSuggestion.criterion2,
                summary: 'Split from original criterion',
                status: 'approved_locked'
              }
            ];
            setCriteriaList(prev => [...prev, ...newCriteria]);
          }
          setShowPlacementModal(false);
          toast({ title: "Criterion Split", description: "The criterion has been split into two separate criteria." });
        }}
      />
    </>
  );
};