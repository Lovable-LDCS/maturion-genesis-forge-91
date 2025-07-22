import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ArrowLeft, Database, Target, CheckSquare, Sparkles, Shield } from 'lucide-react';
import { MPSSelectionModal } from '@/components/assessment/MPSSelectionModal';
import { IntentCreator } from '@/components/assessment/IntentCreator';
import { useDomainAuditBuilder, type AuditStep } from '@/hooks/useDomainAuditBuilder';

const ProtectionAuditBuilder = () => {
  const navigate = useNavigate();
  const domainId = 'protection';
  const domainName = 'Protection';
  
  const {
    isMPSModalOpen,
    setIsMPSModalOpen,
    isGeneratingMPSs,
    setIsGeneratingMPSs,
    isIntentCreatorOpen,
    setIsIntentCreatorOpen,
    handleAcceptMPSs,
    handleIntentsFinalized,
    handleStepClick,
    getStepStatus,
    getDatabaseStepStatus
  } = useDomainAuditBuilder(domainId);

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
          status: await getDatabaseStepStatus(step.id)
        }))
      );
      setAuditSteps(updatedSteps);
    };

    updateStepStatuses();
  }, [isIntentCreatorOpen, isMPSModalOpen]);

  const completedSteps = auditSteps.filter(step => step.status === 'completed').length;
  const progressPercentage = Math.round((completedSteps / auditSteps.length) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
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
            <Badge variant="outline" className="flex items-center gap-1">
              <Shield className="h-4 w-4" />
              Protection Domain (MPS 15-20)
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4 flex items-center justify-center gap-2">
              <Shield className="h-8 w-8 text-blue-600" />
              {domainName} – Audit Configuration
            </h1>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-6">
              Configure audit structure for security controls, access management, and data protection standards
            </p>
            
            <div className="bg-background border rounded-lg p-4 mb-8">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm text-muted-foreground">{completedSteps} of {auditSteps.length} steps completed</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          </div>

          <div className="grid gap-6">
            {auditSteps.map((step) => {
              const stepStyles = getStepStatus(step.status);
              
              return (
                <Card 
                  key={step.id}
                  onClick={async () => {
                    const stepStatus = await getDatabaseStepStatus(step.id);
                    const canClick = stepStatus === 'active' || stepStatus === 'completed';
                    if (canClick) {
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
                      
                      <div className="flex items-center gap-2">
                        {step.status === 'completed' && (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-xs text-green-600 font-medium">✅ Completed</span>
                          </div>
                        )}
                        {step.status === 'active' && (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            <span className="text-xs text-blue-600 font-medium">Active</span>
                          </div>
                        )}
                        {step.status === 'locked' && (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                            <span className="text-xs text-gray-500 font-medium">Locked</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </main>

      <Dialog open={isGeneratingMPSs} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Shield className="h-12 w-12 text-blue-500 animate-pulse mb-4" />
            <h3 className="text-lg font-semibold mb-2">Generating Protection MPSs</h3>
            <p className="text-muted-foreground mb-4">
              Creating MPS 15-20 for security controls, access management, and data protection standards
            </p>
            <div className="w-full max-w-xs">
              <Progress value={66} className="h-2" />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <MPSSelectionModal
        isOpen={isMPSModalOpen}
        onClose={() => setIsMPSModalOpen(false)}
        domainName={domainName}
        onAcceptMPSs={handleAcceptMPSs}
      />

      <IntentCreator
        isOpen={isIntentCreatorOpen}
        onClose={() => setIsIntentCreatorOpen(false)}
        domainName={domainName}
        onIntentsFinalized={handleIntentsFinalized}
      />
    </div>
  );
};

export default ProtectionAuditBuilder;