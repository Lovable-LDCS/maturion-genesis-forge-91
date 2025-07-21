import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ArrowLeft, FileText, Target, CheckSquare, BarChart3, ClipboardCheck, Sparkles } from 'lucide-react';
import { MPSSelectionModal } from '@/components/assessment/MPSSelectionModal';
import { IntentCreator } from '@/components/assessment/IntentCreator';

const DomainAuditBuilder = () => {
  const navigate = useNavigate();
  const { domainId } = useParams();
  const [isMPSModalOpen, setIsMPSModalOpen] = useState(false);
  const [isGeneratingMPSs, setIsGeneratingMPSs] = useState(false);
  const [isIntentCreatorOpen, setIsIntentCreatorOpen] = useState(false);
  const [acceptedMPSs, setAcceptedMPSs] = useState<any[]>([]);
  const [mpsCompleted, setMpsCompleted] = useState(false);
  const [intentCompleted, setIntentCompleted] = useState(false);

  // Mock domain data - in real app this would come from API
  const domainNames: Record<string, string> = {
    'process-integrity': 'Process Integrity',
    'people-culture': 'People & Culture',
    'protection': 'Protection',
    'proof-it-works': 'Proof it Works',
    'leadership-governance': 'Leadership & Governance'
  };

  const domainName = domainNames[domainId || ''] || 'Unknown Domain';

  const auditSteps = [
    {
      id: 1,
      title: 'List MPSs',
      description: 'Define your Minimum Performance Standards',
      timeEstimate: '30 minutes',
      status: mpsCompleted ? 'completed' as const : 'active' as const,
      icon: FileText
    },
    {
      id: 2,
      title: 'Formulate Intent',
      description: 'Create clear intent statements for each MPS',
      timeEstimate: '45 minutes',
      status: intentCompleted ? 'completed' as const : (mpsCompleted ? 'active' as const : 'locked' as const),
      icon: Target
    },
    {
      id: 3,
      title: 'Create Criteria',
      description: 'Develop detailed criteria for each MPS',
      timeEstimate: '1-2 hours',
      status: intentCompleted ? 'active' as const : 'locked' as const,
      icon: CheckSquare
    },
    {
      id: 4,
      title: 'Maturity Descriptors',
      description: 'Define what each maturity level looks like',
      timeEstimate: '1 hour',
      status: 'locked' as const,
      icon: BarChart3
    },
    {
      id: 5,
      title: 'Audit Review',
      description: 'Review and validate your audit framework',
      timeEstimate: '1-2 hours',
      status: 'locked' as const,
      icon: ClipboardCheck
    }
  ];

  const completedSteps = auditSteps.filter(step => step.status === 'completed').length;
  const progressPercentage = Math.round((completedSteps / auditSteps.length) * 100);

  const getStepStatus = (step: typeof auditSteps[0]) => {
    if (step.status === 'completed') {
      return { bgColor: 'bg-green-100', textColor: 'text-green-600', border: 'border-green-200' };
    } else if (step.status === 'active') {
      return { bgColor: 'bg-blue-100', textColor: 'text-blue-600', border: 'border-blue-200' };
    } else {
      return { bgColor: 'bg-muted', textColor: 'text-muted-foreground', border: 'border-muted' };
    }
  };

  const isStepClickable = (stepIndex: number) => {
    const step = auditSteps[stepIndex];
    return step.status === 'completed' || step.status === 'active';
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

  const handleAcceptMPSs = (selectedMPSs: any[]) => {
    console.log('🔍 DomainAuditBuilder - Received accepted MPSs:', selectedMPSs);
    console.log('🔍 DomainAuditBuilder - MPS 5 in accepted:', selectedMPSs.find(mps => mps.number === '5'));
    setAcceptedMPSs(selectedMPSs);
    setMpsCompleted(true);
    setIsMPSModalOpen(false);
  };

  const handleIntentsFinalized = (mpssWithIntents: any[]) => {
    setIntentCompleted(true);
    setIsIntentCreatorOpen(false);
  };

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
            <h1 className="text-3xl font-bold mb-4">Audit Configuration Workflow</h1>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-6">
              Complete these steps to configure your audit structure
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

          {/* Workflow Steps */}
          <div className="grid gap-6">
            {auditSteps.map((step, index) => {
              const stepStyle = getStepStatus(step);
              const isClickable = isStepClickable(index);
              
              return (
                <Card 
                  key={step.id}
                  className={`transition-all ${stepStyle.border} ${
                    step.status === 'active' ? 'shadow-lg ring-2 ring-blue-200' : ''
                  } ${step.status === 'completed' ? 'shadow-sm ring-1 ring-green-200' : ''} ${
                    isClickable ? 'cursor-pointer hover:shadow-md' : 'opacity-60'
                  } ${step.status === 'locked' ? 'opacity-40' : ''}`}
                  onClick={() => {
                    if (isClickable) {
                      handleStepClick(step.id);
                    }
                  }}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Step Number Circle */}
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${stepStyle.bgColor} ${stepStyle.textColor} font-bold text-lg`}>
                          {step.id}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <step.icon className={`h-5 w-5 ${stepStyle.textColor}`} />
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
                              ✅ Completed {step.id === 1 ? '– editable until Intent is accepted' : ''}
                            </span>
                          </div>
                        )}
                        {step.status === 'active' && (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            <span className="text-xs text-blue-600 font-medium">
                              {step.id === 2 ? 'Start Intent Creation' : 'Active (clickable)'}
                            </span>
                          </div>
                        )}
                        {step.status === 'locked' && (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                            <span className="text-xs text-gray-500 font-medium">
                              Locked {step.id === 2 ? '– Please complete MPS selection first' : ''}
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
              ✨ Creating your Mini Performance Standards based on LDCS principles and best practices. 
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
        acceptedMPSs={acceptedMPSs}
        onIntentsFinalized={handleIntentsFinalized}
      />
    </div>
  );
};

export default DomainAuditBuilder;