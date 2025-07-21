import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ArrowRight, ArrowLeft, CheckCircle, BarChart3, Target } from 'lucide-react';
import { useMaturityScoring } from '@/hooks/useMaturityScoring';
import { useOrganization } from '@/hooks/useOrganization';
import { useToast } from '@/hooks/use-toast';
import { 
  type MaturityLevel, 
  type DomainScore,
  MATURITY_LEVELS 
} from '@/lib/maturityScoring';

interface AssessmentResultsProps {
  domainScores: DomainScore[];
  onRestart: () => void;
}

const AssessmentResults: React.FC<AssessmentResultsProps> = ({ domainScores, onRestart }) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <span>Assessment Complete</span>
          </CardTitle>
          <CardDescription>
            Your organizational maturity assessment results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {domainScores.map((domain) => (
              <div key={domain.domainId} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">{domain.domainName}</h4>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant={domain.meetsThreshold ? "default" : "secondary"}
                      className={domain.meetsThreshold ? "bg-green-100 text-green-800" : ""}
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
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Target Level:</span>
                    <p className="font-medium">{MATURITY_LEVELS[domain.targetLevel].label}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Criteria at Target:</span>
                    <p className="font-medium">{domain.percentageAtTarget.toFixed(1)}%</p>
                  </div>
                </div>
                
                {domain.penaltyApplied && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                    <p className="text-sm text-red-700">
                      <strong>Two-Level Deficit Penalty:</strong> One or more criteria scored 
                      two levels below the target, resulting in an automatic downgrade.
                    </p>
                  </div>
                )}
                
                {!domain.meetsThreshold && !domain.penaltyApplied && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-sm text-yellow-700">
                      <strong>Threshold Not Met:</strong> Less than 80% of criteria scored 
                      at or above the target level.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="mt-6 flex justify-center">
            <Button onClick={onRestart} variant="outline">
              Take Assessment Again
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

interface MaturityAssessmentProps {
  assessmentType?: 'free' | 'full';
  onComplete?: (results: DomainScore[]) => void;
}

export const MaturityAssessment: React.FC<MaturityAssessmentProps> = ({ 
  assessmentType = 'free',
  onComplete 
}) => {
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  const [currentAnswer, setCurrentAnswer] = useState<MaturityLevel | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [assessmentResults, setAssessmentResults] = useState<DomainScore[]>([]);
  
  const {
    loading,
    loadFreeAssessmentQuestions,
    answerQuestion,
    nextQuestion,
    previousQuestion,
    calculateResults,
    getCurrentQuestion,
    getProgress,
    isComplete,
    responses
  } = useMaturityScoring(currentOrganization?.id || '');

  useEffect(() => {
    if (currentOrganization?.id && assessmentType === 'free') {
      loadFreeAssessmentQuestions();
    }
  }, [currentOrganization?.id, assessmentType, loadFreeAssessmentQuestions]);

  const currentQuestion = getCurrentQuestion();
  const progress = getProgress();

  const handleAnswerChange = (value: MaturityLevel) => {
    setCurrentAnswer(value);
  };

  const handleNext = () => {
    if (currentAnswer && currentQuestion) {
      answerQuestion(currentQuestion.id, currentAnswer);
      setCurrentAnswer(null);
      nextQuestion();
    }
  };

  const handlePrevious = () => {
    previousQuestion();
    // Restore previous answer if exists
    const prevQuestion = getCurrentQuestion();
    if (prevQuestion) {
      const prevAnswer = responses.get(prevQuestion.id);
      setCurrentAnswer(prevAnswer || null);
    }
  };

  const handleFinishAssessment = async () => {
    if (currentAnswer && currentQuestion) {
      answerQuestion(currentQuestion.id, currentAnswer);
    }

    try {
      const results = await calculateResults();
      setAssessmentResults(results);
      setShowResults(true);
      onComplete?.(results);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to calculate assessment results',
        variant: 'destructive'
      });
    }
  };

  const handleRestart = () => {
    setShowResults(false);
    setAssessmentResults([]);
    setCurrentAnswer(null);
    loadFreeAssessmentQuestions();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading assessment questions...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (showResults) {
    return <AssessmentResults domainScores={assessmentResults} onRestart={handleRestart} />;
  }

  if (!currentQuestion) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">Assessment Not Available</h3>
          <p className="text-muted-foreground">
            No assessment questions are available. Please check your domain configuration.
          </p>
        </CardContent>
      </Card>
    );
  }

  const isLastQuestion = progress.current === progress.total;
  const canProceed = currentAnswer !== null;

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-6 w-6" />
                <span>Maturity Assessment</span>
              </CardTitle>
              <CardDescription>
                Question {progress.current} of {progress.total} • {currentQuestion.domainName}
              </CardDescription>
            </div>
            <Badge variant="outline">
              {Math.round(progress.percentage)}% Complete
            </Badge>
          </div>
          <Progress value={progress.percentage} className="mt-4" />
        </CardHeader>
      </Card>

      {/* Question Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{currentQuestion.statement}</CardTitle>
          <CardDescription>
            Select the option that best describes your organization's current maturity level
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={currentAnswer || ''} onValueChange={handleAnswerChange}>
            {Object.entries(MATURITY_LEVELS).map(([level, config]) => (
              <div key={level} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
                <RadioGroupItem value={level} id={level} />
                <Label htmlFor={level} className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{config.label}</span>
                    <Badge variant="outline" className="ml-2">
                      Level {config.value}
                    </Badge>
                  </div>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={handlePrevious} 
          disabled={progress.current === 1}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        <div className="flex space-x-2">
          {isLastQuestion ? (
            <Button 
              onClick={handleFinishAssessment} 
              disabled={!canProceed}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Finish Assessment
            </Button>
          ) : (
            <Button 
              onClick={handleNext} 
              disabled={!canProceed}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      {/* Assessment Rules Info */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <h4 className="font-medium mb-2">Scoring Rules</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• 80% of criteria must score at or above target level</li>
            <li>• Up to 20% may score one level below target</li>
            <li>• Any criteria two levels below target triggers automatic downgrade</li>
            <li>• Questions appear in random order for assessment integrity</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};