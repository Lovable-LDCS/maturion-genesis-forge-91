import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ArrowLeft, Database, Target, CheckSquare, BarChart3, ClipboardCheck, Sparkles } from 'lucide-react';
import { MPSSelectionModal } from '@/components/assessment/MPSSelectionModal';
import { IntentCreator } from '@/components/assessment/IntentCreator';
import { CriteriaManagement } from '@/components/assessment/CriteriaManagement';
import DomainMPSRunner from '@/components/assessment/DomainMPSRunner';
import MPSDashboard from '@/components/assessment/MPSDashboard';
import DomainCriteriaRunner from '@/components/assessment/DomainCriteriaRunner';

import { useDomainAuditBuilder, type AuditStep } from '@/hooks/useDomainAuditBuilder';
import { useDeferredCriteria } from '@/hooks/useDeferredCriteria';
import { useOrganization } from '@/hooks/useOrganization';
import { DeferredCriteriaReminder } from '@/components/assessment/DeferredCriteriaReminder';

const DomainAuditBuilder = () => {
  const navigate = useNavigate();
  const { domainId } = useParams();
  
  const {
    isMPSModalOpen,
    setIsMPSModalOpen,
    isGeneratingMPSs,
    setIsGeneratingMPSs,
    isIntentCreatorOpen,
    setIsIntentCreatorOpen,
    isCriteriaManagementOpen,
    setIsCriteriaManagementOpen,
    handleAcceptMPSs,
    handleIntentsFinalized,
    handleCriteriaFinalized,
    handleStepClick,
    getStepStatus,
    fetchStepStatus,
    stepStatuses
  } = useDomainAuditBuilder(domainId || '');

  // Add deferred criteria management
  const { currentOrganization } = useOrganization();
  const {
    deferredQueue,
    getRemindersForMPS,
    handleDeferredAction,
    refreshQueue
  } = useDeferredCriteria(currentOrganization?.id || '');

  // State for deferred reminder modal
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [currentReminderData, setCurrentReminderData] = useState<any>(null);

  // Domain name mapping
  const domainNames: Record<string, string> = {
    'process-integrity': 'Process Integrity',
    'people-culture': 'People & Culture',
    'protection': 'Protection',
    'proof-it-works': 'Proof it Works',
    'leadership-governance': 'Leadership & Governance'
  };

  const domainName = domainNames[domainId || ''] || 'Unknown Domain';

  // FORCE TEST: Check for deferred reminders on page load
  useEffect(() => {
    if (currentOrganization?.id && domainName !== 'Unknown Domain') {
      console.log('🚨 DomainAuditBuilder: FORCE CHECKING for deferred reminders on page load');
      console.log('🔍 Current route domain:', domainName);
      console.log('🔍 Current route domainId:', domainId);
      console.log('🔍 Deferred queue size:', deferredQueue.length);
      
      // Check all possible MPS numbers for this domain
      for (let mpsNumber = 1; mpsNumber <= 10; mpsNumber++) {
        console.log(`🔍 FORCE TEST: Checking MPS ${mpsNumber} in ${domainName}...`);
        
        const reminder = getRemindersForMPS(domainName, mpsNumber.toString());
        if (reminder && reminder.reminderCount > 0) {
          console.log('🔔 FORCE TEST: Found deferred criteria reminder!', reminder);
          setCurrentReminderData(reminder);
          setShowReminderModal(true);
          break; // Show first match
        }
        
        // Also do force test ignoring domain
        const forceMatches = deferredQueue.filter(def => 
          def.targetMPS === mpsNumber.toString() && def.status === 'pending'
        );
        
        if (forceMatches.length > 0) {
          console.log('🚨 FORCE TEST: Found MPS number match ignoring domain for MPS', mpsNumber, ':', {
            matches: forceMatches.length,
            currentDomain: domainName,
            deferredDomains: forceMatches.map(d => d.targetDomain)
          });
          
          const forceReminderData = {
            targetDomain: domainName,
            targetMPS: mpsNumber.toString(),
            deferrals: forceMatches,
            reminderCount: forceMatches.length
          };
          
          console.log('🚨 FORCE TEST: Triggering reminder modal!');
          setCurrentReminderData(forceReminderData);
          setShowReminderModal(true);
          break;
        }
      }
    }
  }, [currentOrganization?.id, domainName, domainId, deferredQueue.length]);

  const [auditSteps, setAuditSteps] = useState<AuditStep[]>([
    {
      id: 1,
      title: 'Create MPSs',
      description: 'Set up Mini Performance Standards based on your uploaded document context',
      timeEstimate: '5-10 minutes',
      status: 'active',
      icon: Database
    },
    {
      id: 2,
      title: 'Create Intent',
      description: 'Define purpose and objectives for each MPS to guide implementation',
      timeEstimate: '10-15 minutes',
      status: 'locked',
      icon: Target
    },
    {
      id: 3,
      title: 'Create Criteria',
      description: 'Establish assessment criteria and maturity levels for auditing',
      timeEstimate: '15-20 minutes',
      status: 'locked',
      icon: CheckSquare
    }
  ]);

  // Update step statuses based on database state
  useEffect(() => {
    const updateStepStatuses = async () => {
      const updatedSteps = await Promise.all(
        auditSteps.map(async (step) => ({
          ...step,
          status: await fetchStepStatus(step.id)
        }))
      );
      setAuditSteps(updatedSteps);
    };

    updateStepStatuses();
  }, [isIntentCreatorOpen, isMPSModalOpen, stepStatuses]); // Re-run when modals change or step statuses update

  const completedSteps = auditSteps.filter(step => step.status === 'completed').length;
  const progressPercentage = Math.round((completedSteps / auditSteps.length) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/assessment/framework')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Audit Journey
            </Button>
            
            <Badge variant="outline">Audit Configuration Workflow</Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Title Section */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">
              {domainName} – Audit Configuration
            </h1>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-6">
              Complete these steps to configure your audit structure for the {domainName} domain
            </p>
            
            {/* Progress Section */}
            <div className="bg-background border rounded-lg p-4 mb-8">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm text-muted-foreground">{completedSteps} of {auditSteps.length} steps completed</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          </div>

                              {/* Domain MPS Runner Panel */}
          <div className="mb-8">
            <DomainMPSRunner domainName={domainName} orgId={currentOrganization?.id || ''} />
          </div>

          {/* Domain MPS Dashboard (collapsible UI) */}
          <div className="mb-8">
            <MPSDashboard domainName={domainName} orgId={currentOrganization?.id || ''} />
          </div>

                    {/* Domain Criteria Runner */}
          <div className="mb-8">
            <DomainCriteriaRunner domainName={domainName} orgId={currentOrganization?.id || ''} />
          </div>

          {/* Workflow Steps */}
          <div className="grid gap-6">
            {auditSteps.map((step, index) => {

              const stepStyles = getStepStatus(step.status);
              
              return (
                <Card 
                  key={step.id}
                  onClick={() => {
                    // Only allow clicking if the step is visually active or completed
                    if (step.status === 'active' || step.status === 'completed') {
                      handleStepClick(step.id);
                    }
                  }}
                  className={`transition-all duration-300 ${
                    step.status === 'completed'
                      ? 'border-green-200 bg-green-50/50 hover:bg-green-50/70 cursor-pointer'
                      : step.status === 'active'
                      ? 'border-blue-200 bg-blue-50/50 hover:bg-blue-50/70 cursor-pointer'
                      : 'border-muted bg-muted/20 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Step Number Circle */}
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${stepStyles.bgColor} ${stepStyles.textColor} font-bold text-lg`}>
                          {step.id}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <step.icon className={`h-5 w-5 ${stepStyles.textColor}`} />
                            <CardTitle className="text-lg">{step.title}</CardTitle>
                          </div>
                          <CardDescription className="text-sm">
                            {step.description}
                          </CardDescription>
                          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                            <span>⏱️</span>
                            <span>{step.timeEstimate}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Status Indicator */}
                      <div className="flex items-center gap-2">
                        {step.status === 'completed' && (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-xs text-green-600 font-medium">
                              ✅ Completed
                            </span>
                          </div>
                        )}
                        {step.status === 'active' && (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            <span className="text-xs text-blue-600 font-medium">
                              Active (clickable)
                            </span>
                          </div>
                        )}
                        {step.status === 'locked' && (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                            <span className="text-xs text-gray-500 font-medium">
                              Locked
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>

          {/* Workflow Status Legend */}
          <div className="mt-8 p-4 bg-muted/50 rounded-lg">
            <h3 className="font-medium mb-3">Workflow Status</h3>
            <div className="flex gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Active (clickable)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span>Locked</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* MPS Generation Loading Dialog */}
      <Dialog open={isGeneratingMPSs} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Sparkles className="h-12 w-12 text-blue-500 animate-pulse mb-4" />
            <h3 className="text-lg font-semibold mb-2">Generating Your MPSs</h3>
            <p className="text-muted-foreground mb-4">
              ✨ Creating your Mini Performance Standards for {domainName} based on LDCS principles and best practices. 
              You'll be able to review and edit each one.
            </p>
            <div className="w-full max-w-xs">
              <Progress value={66} className="h-2" />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MPS Selection Modal */}
      <MPSSelectionModal
        isOpen={isMPSModalOpen}
        onClose={() => setIsMPSModalOpen(false)}
        domainName={domainName}
        onAcceptMPSs={handleAcceptMPSs}
      />

      {/* Intent Creator */}
      <IntentCreator
        isOpen={isIntentCreatorOpen}
        onClose={() => setIsIntentCreatorOpen(false)}
        domainName={domainName}
        onIntentsFinalized={handleIntentsFinalized}
      />

      {/* Criteria Management */}
      <CriteriaManagement
        isOpen={isCriteriaManagementOpen}
        onClose={() => setIsCriteriaManagementOpen(false)}
        domainName={domainName}
        onCriteriaFinalized={handleCriteriaFinalized}
      />

      {/* Deferred Criteria Reminder Modal */}
      {showReminderModal && currentReminderData && (
        <DeferredCriteriaReminder
          isOpen={showReminderModal}
          onClose={() => setShowReminderModal(false)}
          targetDomain={currentReminderData?.targetDomain || ''}
          targetMPS={currentReminderData?.targetMPS || ''}
          deferrals={currentReminderData?.deferrals || []}
          onView={(deferral) => {
            console.log('👁️ Viewing deferred criterion:', deferral);
          }}
          onApprove={async (deferral) => {
            const result = await handleDeferredAction(deferral.id, 'approve');
            if (result.success) {
              await refreshQueue();
              setShowReminderModal(false);
            }
          }}
          onEdit={(deferral) => {
            console.log('📝 Edit deferred criterion:', deferral);
          }}
          onDiscard={async (deferral) => {
            const result = await handleDeferredAction(deferral.id, 'discard');
            if (result.success) {
              await refreshQueue();
              setShowReminderModal(false);
            }
          }}
        />
      )}

    </div>
  );
};

export default DomainAuditBuilder;