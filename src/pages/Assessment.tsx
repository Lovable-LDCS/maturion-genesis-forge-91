import React, { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Target, ArrowLeft } from 'lucide-react';

const Assessment = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Console debug log for assessment page entry
    console.log('Assessment Page - Entry:', {
      timestamp: new Date().toISOString(),
      route: '/assessment'
    });

    // Toast notification for page load
    toast({
      title: "Assessment Ready",
      description: "Free operational maturity assessment will be implemented in Phase 1B-A Priority 2",
    });

    return () => {
      console.log('Assessment Page - Exit:', {
        timestamp: new Date().toISOString()
      });
    };
  }, [toast]);

  const handleBackToHome = () => {
    console.log('Assessment Page - Back to Home:', {
      timestamp: new Date().toISOString(),
      action: 'Navigate back to landing page'
    });
    navigate('/');
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
        <div className="max-w-4xl mx-auto text-center">
          <Card className="p-8">
            <CardHeader>
              <CardTitle className="text-3xl mb-4">
                Free Operational Maturity Assessment
              </CardTitle>
              <CardDescription className="text-lg">
                Coming in Phase 1B-A Priority 2
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-left space-y-4">
                <h3 className="text-xl font-semibold">What to Expect:</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• 5 questions per pillar (6 LDCS domains)</li>
                  <li>• Psychometric format with indirect maturity mapping</li>
                  <li>• Instant results showing your maturity level</li>
                  <li>• Personalized recommendations for improvement</li>
                  <li>• Option to subscribe for the full ISMS journey</li>
                </ul>
              </div>
              
              <div className="pt-6">
                <Button onClick={handleBackToHome} size="lg">
                  Return to Landing Page
                  <ArrowLeft className="ml-2 h-5 w-5 rotate-180" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Assessment;