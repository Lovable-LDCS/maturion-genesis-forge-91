import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, 
  Brain, 
  Building,
  CheckCircle,
  FileText,
  Users,
  Lock,
  Unlock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const MaturityBuild = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isModelApproved, setIsModelApproved] = useState(false);
  const [buildProgress, setBuildProgress] = useState(65); // Simulated progress
  const [setupData, setSetupData] = useState<any>(null);

  // Check if user has completed setup and load setup data
  useEffect(() => {
    const setupCompleted = localStorage.getItem('maturion_setup_completed');
    if (!setupCompleted) {
      navigate('/maturity/setup');
    } else {
      const storedSetupData = localStorage.getItem('maturion_setup_data');
      if (storedSetupData) {
        setSetupData(JSON.parse(storedSetupData));
      }
    }
  }, [navigate]);

  const handleApproveModel = () => {
    setIsModelApproved(true);
    localStorage.setItem('maturion_model_approved', 'true');
    
    toast({
      title: "Maturity Model Approved!",
      description: "Your SCS model is now official. Team and organization features have been unlocked.",
    });
  };

  const phases = [
    {
      id: 'domains',
      title: 'Define Domains',
      description: 'AI-assisted domain structure based on your organization',
      status: 'completed' as const,
      progress: 100
    },
    {
      id: 'mps',
      title: 'Maturity Practice Statements',
      description: 'Editable MPS structure tailored to your needs',
      status: 'completed' as const,
      progress: 100
    },
    {
      id: 'criteria',
      title: 'Assessment Criteria',
      description: 'Detailed criteria for maturity evaluation',
      status: 'in_progress' as const,
      progress: 75
    },
    {
      id: 'review',
      title: 'Model Review & Sign-Off',
      description: 'Final review and approval of your maturity model',
      status: 'pending' as const,
      progress: 0
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/maturity/setup')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Setup
            </Button>
            
            <div className="flex items-center space-x-2">
              <Badge variant="outline">Maturity Development</Badge>
              <Badge>Building Phase</Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            {setupData && (
              <div className="flex items-center justify-center gap-4 mb-4">
                {setupData.companyLogo && (
                  <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                    <Building className="h-6 w-6" style={{ color: setupData.primaryColor }} />
                  </div>
                )}
                <div>
                  <h1 className="text-4xl font-bold" style={{ color: setupData.primaryColor }}>
                    {setupData.modelName || 'Building Your Maturity Model'}
                  </h1>
                  <p className="text-lg text-muted-foreground">
                    {setupData.companyName} Security Control Standard
                  </p>
                </div>
              </div>
            )}
            {!setupData && (
              <h1 className="text-4xl font-bold mb-4">
                Building Your Maturity Model
              </h1>
            )}
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-6">
              Work with our AI assistant to create a comprehensive Security Control Standard 
              tailored specifically for your organization.
            </p>
            
            <div className="max-w-md mx-auto">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm text-muted-foreground">{buildProgress}%</span>
              </div>
              <Progress value={buildProgress} className="h-2" />
            </div>
          </div>

          {/* Build Phases */}
          <div className="space-y-6 mb-12">
            {phases.map((phase, index) => (
              <Card key={phase.id} className={`${
                phase.status === 'completed' ? 'border-green-200 bg-green-50/50' :
                phase.status === 'in_progress' ? 'border-blue-200 bg-blue-50/50' :
                'border-muted'
              }`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        phase.status === 'completed' ? 'bg-green-100 text-green-600' :
                        phase.status === 'in_progress' ? 'bg-blue-100 text-blue-600' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {phase.status === 'completed' ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : (
                          <Brain className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{phase.title}</CardTitle>
                        <CardDescription>{phase.description}</CardDescription>
                      </div>
                    </div>
                    
                    <Badge variant={
                      phase.status === 'completed' ? 'default' :
                      phase.status === 'in_progress' ? 'secondary' :
                      'outline'
                    }>
                      {phase.status === 'completed' ? 'Complete' :
                       phase.status === 'in_progress' ? 'In Progress' :
                       'Pending'}
                    </Badge>
                  </div>
                </CardHeader>
                
                {(phase.status === 'in_progress' || phase.status === 'completed') && (
                  <CardContent>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm">Progress</span>
                      <span className="text-sm text-muted-foreground">{phase.progress}%</span>
                    </div>
                    <Progress value={phase.progress} className="h-1" />
                  </CardContent>
                )}
              </Card>
            ))}
          </div>

          {/* Model Approval Section */}
          <Card className="mb-12">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Model Approval & Sign-Off
              </CardTitle>
              <CardDescription>
                Once your maturity model is complete, approve it to unlock team and organization features.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!isModelApproved ? (
                <div className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-3">
                      Your maturity model is {buildProgress === 100 ? 'ready' : 'almost ready'} for approval. 
                      {buildProgress < 100 && ' Complete all phases above to proceed with sign-off.'}
                    </p>
                    <Button 
                      onClick={handleApproveModel}
                      disabled={buildProgress < 100}
                      className="w-full sm:w-auto"
                    >
                      {buildProgress < 100 ? 'Complete Model First' : 'Approve & Sign Off Model'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800">Model Approved</p>
                      <p className="text-sm text-green-600">
                        Your Security Control Standard is now official and ready for implementation.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Unlocked Features */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className={!isModelApproved ? 'opacity-60' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {isModelApproved ? (
                    <Unlock className="h-5 w-5 text-green-600" />
                  ) : (
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  )}
                  Invite Internal Team Members
                </CardTitle>
                <CardDescription>
                  Add team members within your organization to help with evidence collection and audit management.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant={isModelApproved ? 'default' : 'secondary'}
                  disabled={!isModelApproved}
                  onClick={() => navigate('/team')}
                  className="w-full"
                >
                  {isModelApproved ? 'Manage Team' : 'Locked - Approve Model First'}
                </Button>
              </CardContent>
            </Card>

            <Card className={!isModelApproved ? 'opacity-60' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {isModelApproved ? (
                    <Unlock className="h-5 w-5 text-green-600" />
                  ) : (
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  )}
                  Invite Sub-Organizations
                </CardTitle>
                <CardDescription>
                  Add branches, regions, or departments that will inherit your maturity model.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant={isModelApproved ? 'default' : 'secondary'}
                  disabled={!isModelApproved}
                  onClick={() => navigate('/organization/settings')}
                  className="w-full"
                >
                  {isModelApproved ? 'Manage Organizations' : 'Locked - Approve Model First'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MaturityBuild;