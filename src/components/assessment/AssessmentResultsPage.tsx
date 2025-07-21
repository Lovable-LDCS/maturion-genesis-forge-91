import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Download, FileText, Video, Presentation, Target, TrendingUp, CheckCircle, AlertTriangle } from 'lucide-react';
import { type DomainScore, MATURITY_LEVELS } from '@/lib/maturityScoring';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface AssessmentResultsPageProps {
  domainScores: DomainScore[];
  overallLevel: string;
  onRestart: () => void;
}

export const AssessmentResultsPage: React.FC<AssessmentResultsPageProps> = ({ 
  domainScores, 
  overallLevel,
  onRestart 
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubscribeClick = () => {
    // Mark that user completed assessment for journey page detection
    localStorage.setItem('maturion_assessment_completed', 'true');
    
    toast({
      title: "Exploring Full Journey",
      description: "Discover how Maturion can guide your organization's maturity journey",
    });
    
    navigate('/journey');
  };

  const handleDownloadPDF = () => {
    toast({
      title: "Generating Report",
      description: "Your personalized maturity assessment report is being prepared...",
    });
    
    // Generate PDF report content
    generateMaturityReport(domainScores, overallLevel);
  };

  const handleDownloadPresentation = () => {
    toast({
      title: "Coming Soon",
      description: "PowerPoint presentation will be available in the next update",
    });
  };

  const handleVideoPlaceholder = () => {
    toast({
      title: "Coming Soon", 
      description: "Personalized video explanation will be available in the next update",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Results */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-3 text-2xl">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <span>Assessment Complete!</span>
          </CardTitle>
          <CardDescription className="text-lg">
            Your organizational maturity profile across 5 key domains
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center mb-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">
                {MATURITY_LEVELS[overallLevel as keyof typeof MATURITY_LEVELS]?.label || overallLevel}
              </div>
              <p className="text-lg text-muted-foreground">Overall Maturity Level</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Domain Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-6 w-6" />
            <span>Domain Maturity Breakdown</span>
          </CardTitle>
          <CardDescription>
            Detailed assessment results for each operational domain
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            {domainScores.map((domain, index) => (
              <div key={domain.domainId} className="border rounded-lg p-4 bg-muted/20">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-lg">{domain.domainName}</h4>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant={domain.meetsThreshold ? "default" : "secondary"}
                      className={`${domain.meetsThreshold ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"} text-sm px-3 py-1`}
                    >
                      {MATURITY_LEVELS[domain.calculatedLevel].label}
                    </Badge>
                    {domain.penaltyApplied && (
                      <Badge variant="destructive" className="text-xs">
                        Penalty Applied
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Criteria at Target Level</span>
                      <span className="font-medium">{domain.percentageAtTarget.toFixed(1)}%</span>
                    </div>
                    <Progress value={domain.percentageAtTarget} className="h-2" />
                  </div>
                  
                  {domain.penaltyApplied && (
                    <div className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded">
                      <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-red-700">
                        <strong>Two-Level Deficit Penalty:</strong> Some criteria scored significantly below target, 
                        resulting in an automatic maturity level downgrade.
                      </div>
                    </div>
                  )}
                  
                  {!domain.meetsThreshold && !domain.penaltyApplied && (
                    <div className="flex items-start space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <TrendingUp className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-yellow-700">
                        <strong>Improvement Opportunity:</strong> Less than 80% of criteria met the target level. 
                        Focus on strengthening this domain for higher maturity.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Next Steps & Downloads */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Next Steps */}
        <Card>
          <CardHeader>
            <CardTitle>What's Next?</CardTitle>
            <CardDescription>
              Continue your maturity journey with Maturion's guided approach
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">1</div>
                <span className="text-sm">Review your detailed maturity profile</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">2</div>
                <span className="text-sm">Download materials for stakeholder review</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">3</div>
                <span className="text-sm">Explore the full Maturion platform</span>
              </div>
            </div>
            
            <Button onClick={handleSubscribeClick} className="w-full" size="lg">
              Consider Subscribing
            </Button>
          </CardContent>
        </Card>

        {/* Downloads */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Download className="h-5 w-5" />
              <span>Assessment Materials</span>
            </CardTitle>
            <CardDescription>
              Resources to share with your team and stakeholders
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              onClick={handleDownloadPDF}
            >
              <FileText className="h-4 w-4 mr-2" />
              Download PDF Report
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              onClick={handleVideoPlaceholder}
              disabled
            >
              <Video className="h-4 w-4 mr-2" />
              Personalized Video (Coming Soon)
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              onClick={handleDownloadPresentation}
              disabled
            >
              <Presentation className="h-4 w-4 mr-2" />
              PowerPoint Deck (Coming Soon)
            </Button>
            
            <div className="pt-3 border-t">
              <Button 
                variant="ghost" 
                className="w-full text-sm" 
                onClick={onRestart}
              >
                Take Assessment Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Floating CTA - positioned fixed */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button 
          onClick={handleSubscribeClick}
          size="lg"
          className="shadow-2xl hover:shadow-3xl transition-all duration-300 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white border-0 hover:scale-105"
        >
          Consider Subscribing
        </Button>
      </div>
    </div>
  );
};

/**
 * Generate and download PDF report
 */
function generateMaturityReport(domainScores: DomainScore[], overallLevel: string) {
  const reportContent = `
MATURION OPERATIONAL MATURITY ASSESSMENT REPORT
Generated: ${new Date().toLocaleDateString()}

EXECUTIVE SUMMARY
Overall Maturity Level: ${MATURITY_LEVELS[overallLevel as keyof typeof MATURITY_LEVELS]?.label || overallLevel}

DOMAIN BREAKDOWN:
${domainScores.map(domain => `
${domain.domainName}: ${MATURITY_LEVELS[domain.calculatedLevel].label}
- Target Achievement: ${domain.percentageAtTarget.toFixed(1)}%
- Threshold Met: ${domain.meetsThreshold ? 'Yes' : 'No'}
- Penalty Applied: ${domain.penaltyApplied ? 'Yes' : 'No'}
`).join('')}

RECOMMENDATIONS:
Based on your assessment results, we recommend focusing on:
1. Domains scoring below 80% threshold
2. Areas with penalty applications
3. Strategic alignment with business objectives

NEXT STEPS:
- Review detailed findings with your leadership team
- Consider the full Maturion platform for guided improvement
- Develop action plans for priority domains

For more information, visit: https://maturion.com
`;

  // Create and download text file (PDF generation would require additional library)
  const blob = new Blob([reportContent], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `maturion-assessment-report-${new Date().toISOString().split('T')[0]}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}