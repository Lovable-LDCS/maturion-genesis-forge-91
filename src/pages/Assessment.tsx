import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Target, ArrowLeft, Play } from 'lucide-react';
import { MaturityAssessment } from '@/components/assessment/MaturityAssessment';

import { type DomainScore } from '@/lib/maturityScoring';

const Assessment = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showAssessment, setShowAssessment] = useState(false);
  const [assessmentComplete, setAssessmentComplete] = useState(false);

  useEffect(() => {
    // Console debug log for assessment page entry
    console.log('Assessment Page - Entry:', {
      timestamp: new Date().toISOString(),
      route: '/assessment'
    });

    // Toast notification for page load
    if (!showAssessment) {
      toast({
        title: "Assessment Ready",
        description: "Take our free operational maturity assessment to understand your organization's current state",
      });
    }

    return () => {
      console.log('Assessment Page - Exit:', {
        timestamp: new Date().toISOString()
      });
    };
  }, [toast, showAssessment]);

  const handleBackToHome = () => {
    console.log('Assessment Page - Back to Home:', {
      timestamp: new Date().toISOString(),
      action: 'Navigate back to landing page'
    });
    navigate('/');
  };

  const handleStartAssessment = () => {
    console.log('Assessment Page - Start Assessment:', {
      timestamp: new Date().toISOString(),
      action: 'Start free maturity assessment'
    });
    setShowAssessment(true);
  };

  const handleAssessmentComplete = (results: DomainScore[]) => {
    console.log('Assessment Page - Assessment Complete:', {
      timestamp: new Date().toISOString(),
      results: results.map(d => ({
        domain: d.domainName,
        level: d.calculatedLevel,
        meetsThreshold: d.meetsThreshold
      }))
    });
    setAssessmentComplete(true);
    
    toast({
      title: "Assessment Complete!",
      description: "Your maturity assessment results are ready. Consider upgrading to our full platform for detailed action plans.",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                <Target className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold">Maturion</h1>
            </div>
            
            <Button variant="outline" onClick={handleBackToHome} className="flex items-center space-x-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Home</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {!showAssessment ? (
            <div className="text-center">
              <Card className="p-8">
                <CardHeader>
                  <CardTitle className="text-3xl mb-4">
                    Free Operational Maturity Assessment
                  </CardTitle>
                  <CardDescription className="text-lg">
                    Discover your organization's current maturity level across key domains
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-left space-y-4">
                    <h3 className="text-xl font-semibold">What to Expect:</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• 5 questions per domain (randomized for integrity)</li>
                      <li>• Evidence-based maturity level assessment</li>
                      <li>• Instant results with detailed scoring breakdown</li>
                      <li>• Domain-specific maturity recommendations</li>
                      <li>• Advanced scoring algorithm with penalty system</li>
                    </ul>
                  </div>
                  
                  <div className="bg-muted/30 p-4 rounded-lg text-left">
                    <h4 className="font-medium mb-2">Scoring Algorithm</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• 80% threshold: At least 80% of criteria must meet target level</li>
                      <li>• Allowable variance: Up to 20% can be one level below target</li>
                      <li>• Penalty system: Any criteria two levels below target triggers downgrade</li>
                      <li>• Domain-based calculation for comprehensive evaluation</li>
                    </ul>
                  </div>
                  
                  <div className="pt-6 space-y-4">
                    <Button onClick={handleStartAssessment} size="lg" className="w-full">
                      <Play className="mr-2 h-5 w-5" />
                      Start Free Assessment
                    </Button>
                    
                    <Button onClick={handleBackToHome} variant="outline" size="lg">
                      <ArrowLeft className="mr-2 h-5 w-5" />
                      Return to Landing Page
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <MaturityAssessment 
              assessmentType="free" 
              onComplete={handleAssessmentComplete}
            />
          )}
        </div>
      </main>

    </div>
  );
};

export default Assessment;