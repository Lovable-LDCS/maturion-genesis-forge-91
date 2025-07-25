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
import { DeferredCriteriaReminder } from './DeferredCriteriaReminder';
import { useCustomCriterion } from '@/hooks/useCustomCriterion';
import { useDeferredCriteria } from '@/hooks/useDeferredCriteria';

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
  try {
    const [mpsList, setMPSList] = useState<MPS[]>([]);
    const [criteriaList, setCriteriaList] = useState<Criteria[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAIGeneration, setShowAIGeneration] = useState<string | null>(null);
    const [showManualModal, setShowManualModal] = useState<string | null>(null);
    const [showPlacementModal, setShowPlacementModal] = useState(false);
    const [placementData, setPlacementData] = useState<any>(null);
    const [showReminderModal, setShowReminderModal] = useState(false);
    const [currentReminderData, setCurrentReminderData] = useState<any>(null);
    const [aiPhaseCompleted, setAIPhaseCompleted] = useState<Set<string>>(new Set());
    const [collapsedMPS, setCollapsedMPS] = useState<Set<string>>(new Set());
    
    const { currentOrganization } = useOrganization();
    const { toast } = useToast();

    // Deferred criteria management
    const {
      deferredQueue,
      addDeferredCriterion,
      getRemindersForMPS,
      handleDeferredAction,
      refreshQueue
    } = useDeferredCriteria(currentOrganization?.id || '');

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

    // Check for deferred criteria reminders when MPS data loads
    useEffect(() => {
      if (mpsList.length > 0 && currentOrganization?.id) {
        checkForDeferredReminders();
      }
    }, [mpsList, currentOrganization?.id]);

    const checkForDeferredReminders = () => {
      if (!domainName) {
        console.log('⚠️ CriteriaManagement: No domainName provided, skipping reminder check');
        return;
      }
      
      console.log('🔍 CriteriaManagement: Checking for deferred reminders');
      console.log('🔍 Current domain:', domainName);
      console.log('🔍 Available MPS list:', mpsList.map(m => ({ id: m.id, number: m.mps_number, name: m.name })));
      console.log('🔍 Deferred queue contents:', deferredQueue.map(d => ({
        id: d.id,
        targetDomain: d.targetDomain,
        targetMPS: d.targetMPS,
        status: d.status,
        originalStatement: d.originalStatement.substring(0, 50) + '...'
      })));
      
      // Check each MPS for deferred criteria
      mpsList.forEach(mps => {
        console.log(`🔍 Checking MPS ${mps.mps_number} for deferrals...`);
        const reminder = getRemindersForMPS(domainName, mps.mps_number.toString());
        if (reminder && reminder.reminderCount > 0) {
          console.log('🔔 Found deferred criteria reminder for MPS', mps.mps_number, ':', reminder);
          // Show reminder for the first MPS with deferrals
          if (!showReminderModal) {
            console.log('✅ Setting reminder modal data and showing modal');
            setCurrentReminderData(reminder);
            setShowReminderModal(true);
            return; // Exit early after showing first reminder
          }
        } else {
          console.log(`ℹ️ No deferrals found for MPS ${mps.mps_number}`);
        }
      });
      
      if (!showReminderModal) {
        console.log('ℹ️ No reminder modals triggered for any MPS');
      }
    };

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
        // Enhanced duplicate detection with semantic similarity across ALL criteria
        const normalizedStatement = statement.toLowerCase().trim();
        
        // Check against ALL criteria in the domain, not just current MPS
        const allCriteria = criteriaList; // Use the full criteria list from state
        
        const duplicateFound = allCriteria.find(c => {
          const normalizedExisting = c.statement.toLowerCase().trim();
          
          // Check for exact matches
          if (normalizedStatement === normalizedExisting) return true;
          
          // Check for high similarity (≥80% overlap of key words)
          const statementWords = normalizedStatement.split(' ').filter(w => w.length > 3);
          const existingWords = normalizedExisting.split(' ').filter(w => w.length > 3);
          
          const commonWords = statementWords.filter(word => 
            existingWords.some(existingWord => 
              existingWord.includes(word) || word.includes(existingWord)
            )
          );
          
          const similarity = commonWords.length / Math.max(statementWords.length, existingWords.length);
          return similarity >= 0.8;
        });
        
        if (duplicateFound) {
          // Trigger the placement modal with duplicate scenario
          const duplicateScenario = {
            scenario: 'duplicate' as const,
            suggestion: {
              duplicateOf: duplicateFound.statement,
              rationale: `This criterion appears to be very similar to an existing criterion. Similarity: ${Math.round(
                (duplicateFound.statement.toLowerCase().split(' ').filter(w => w.length > 3).filter(word => 
                  normalizedStatement.split(' ').some(newWord => newWord.includes(word) || word.includes(newWord))
                ).length / Math.max(
                  duplicateFound.statement.toLowerCase().split(' ').filter(w => w.length > 3).length,
                  normalizedStatement.split(' ').filter(w => w.length > 3).length
                )) * 100
              )}%`
            },
            originalStatement: statement
          };
          
          setPlacementData(duplicateScenario);
          setShowPlacementModal(true);
          return false; // Prevent normal processing
        }
        
        return true; // No duplicates found
      },
      determinePlacementScenario: async (suggestedDomain: string, currentDomain: string) => {
        if (suggestedDomain === currentDomain) return 'same_domain';
        // Simple heuristic - in production this would check against domain configuration
        return 'future_domain';
      },
      onRefreshData: fetchMPSsAndCriteria,
      onShowPlacementModal: (data) => {
        console.log('🎯 Placement modal triggered with data:', data);
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


    // Deferred criteria handlers
    const handleReminderView = (deferral: any) => {
      console.log('👁️ Viewing deferred criterion:', deferral);
      // Could open a detailed view modal
    };

    const handleReminderApprove = async (deferral: any) => {
      const result = await handleDeferredAction(deferral.id, 'approve');
      if (result.success) {
        await fetchMPSsAndCriteria();
        await refreshQueue();
      }
    };

    const handleReminderEdit = async (deferral: any) => {
      const result = await handleDeferredAction(deferral.id, 'edit');
      if (result.success && result.requiresEdit) {
        // Open edit modal with deferred criterion data
        console.log('📝 Opening edit modal for deferred criterion');
        // Could trigger the enhanced criterion modal with pre-filled data
      }
    };

    const handleReminderDiscard = async (deferral: any) => {
      const result = await handleDeferredAction(deferral.id, 'discard');
      if (result.success) {
        await refreshQueue();
      }
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
          onApprove={async (data) => {
            // Add to deferred queue for tracking
            if (currentOrganization?.owner_id) {
              await addDeferredCriterion({
                criteriaId: data.criteriaId,
                originalStatement: data.originalStatement,
                originalSummary: data.originalSummary,
                sourceDomain: domainName || '',
                sourceMPS: '', // Will be populated
                targetDomain: data.suggestion.targetDomain,
                targetMPS: data.suggestion.targetMPS,
                deferralReason: data.suggestion.rationale,
                deferralType: 'correct_domain',
                organizationId: currentOrganization.id,
                deferredBy: currentOrganization.owner_id
              });
            }

            toast({
              title: "✅ Criterion Deferred",
              description: `Will remind you when you reach ${data.suggestion.targetDomain}`,
            });
            setShowPlacementModal(false);
            await fetchMPSsAndCriteria();
          }}
          onDefer={async (data) => {
            // Add to deferred queue for review
            if (currentOrganization?.owner_id) {
              await addDeferredCriterion({
                criteriaId: data.criteriaId,
                originalStatement: data.originalStatement,
                originalSummary: data.originalSummary,
                sourceDomain: domainName || '',
                sourceMPS: '', // Will be populated
                targetDomain: data.suggestion.targetDomain || domainName || '',
                targetMPS: data.suggestion.targetMPS || '1',
                deferralReason: 'Deferred for manual review',
                deferralType: 'review',
                organizationId: currentOrganization.id,
                deferredBy: currentOrganization.owner_id
              });
            }

            toast({
              title: "⏸️ Deferred for Review", 
              description: "Criterion marked for later review",
            });
            setShowPlacementModal(false);
          }}
          onReject={async (data) => {
            // Update the criterion to remove pending placement status
            try {
              const { error } = await supabase
                .from('criteria')
                .update({ 
                  deferral_status: null,
                  status: 'not_started'
                })
                .eq('id', data.criteriaId);

              if (error) {
                console.error('Error updating criterion status:', error);
              }
              
              toast({
                title: "✅ Kept in Current Location",
                description: "Criterion will remain in the current MPS",
              });
              await fetchMPSsAndCriteria();
            } catch (error) {
              console.error('Error in handlePlacementReject:', error);
            }
            setShowPlacementModal(false);
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

        {/* Deferred Criteria Reminder Modal - RE-ENABLED FOR TESTING */}
        {showReminderModal && currentReminderData && (
          <DeferredCriteriaReminder
            isOpen={showReminderModal}
            onClose={() => setShowReminderModal(false)}
            targetDomain={currentReminderData?.targetDomain || ''}
            targetMPS={currentReminderData?.targetMPS || ''}
            deferrals={currentReminderData?.deferrals || []}
            onView={handleReminderView}
            onApprove={handleReminderApprove}
            onEdit={handleReminderEdit}
            onDiscard={handleReminderDiscard}
          />
        )}
      </>
    );

  } catch (error) {
    console.error('❌ CriteriaManagement: Critical error caught in component:', error);
    
    // Return a safe fallback UI
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Component Error</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              A critical error occurred in the Criteria Management component. This has been logged for debugging.
            </p>
            <div className="flex justify-end">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
};