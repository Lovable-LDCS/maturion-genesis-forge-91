import React, { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Target, ArrowRight, CheckCircle2, Clock } from 'lucide-react';

/**
 * Free Assessment Landing Page (Pre-Subscription)
 * This page is accessible before users subscribe to the full platform
 * After completing the free assessment, users are directed to subscribe
 */
const FreeAssessment = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('Free Assessment Page - Entry:', {
      timestamp: new Date().toISOString(),
      route: '/free-assessment'
    });

    toast({
      title: "Welcome to Your Free Assessment",
      description: "Discover your organization's current maturity level across all six domains in just 15 minutes",
    });
  }, [toast]);

  const handleStartAssessment = () => {
    console.log('Free Assessment - Starting:', {
      timestamp: new Date().toISOString(),
      action: 'Navigate to assessment'
    });

    // Navigate to the full assessment page
    navigate('/assessment');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
          <Target className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-4xl font-bold mb-4">Free Operational Maturity Assessment</h1>
        <p className="text-lg text-muted-foreground">
          Take our comprehensive 15-minute assessment to understand your organization's current state 
          across six critical domains of operational excellence
        </p>
      </div>

      {/* Benefits Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>What You'll Get</CardTitle>
          <CardDescription>Your free assessment includes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start space-x-3">
            <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-semibold">Comprehensive Maturity Scoring</h3>
              <p className="text-sm text-muted-foreground">
                Evaluate your organization across all six domains: Leadership & Governance, Process Integrity, 
                People & Culture, Protection, Proof it Works, and Enablement
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-semibold">Instant Results</h3>
              <p className="text-sm text-muted-foreground">
                Receive your maturity scores immediately upon completion, with visual dashboards 
                showing strengths and areas for improvement
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-semibold">Gap Analysis</h3>
              <p className="text-sm text-muted-foreground">
                Understand the specific gaps between your current state and industry best practices
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Clock className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-semibold">Quick & Easy</h3>
              <p className="text-sm text-muted-foreground">
                Complete the entire assessment in approximately 15 minutes - no preparation needed
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Six Domains Overview */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Six Domains of Operational Excellence</CardTitle>
          <CardDescription>Your assessment will cover these critical areas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { name: "Leadership & Governance", color: "text-emerald-600" },
              { name: "Process Integrity", color: "text-orange-600" },
              { name: "People & Culture", color: "text-red-600" },
              { name: "Protection", color: "text-blue-600" },
              { name: "Proof it Works", color: "text-purple-600" },
              { name: "Enablement", color: "text-violet-600" },
            ].map((domain, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${domain.color.replace('text-', 'bg-')}`} />
                <span className={`font-medium ${domain.color}`}>{domain.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Call to Action */}
      <div className="text-center space-y-4">
        <Button 
          size="lg" 
          onClick={handleStartAssessment}
          className="text-lg px-8 py-6"
        >
          Start Your Free Assessment
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
        
        <p className="text-sm text-muted-foreground">
          After completing your assessment, you can subscribe to access the full Maturity Roadmap 
          and implementation tools
        </p>
      </div>
    </div>
  );
};

export default FreeAssessment;
