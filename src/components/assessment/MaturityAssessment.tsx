import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ArrowRight, ArrowLeft, Target, BarChart3, CheckCircle } from 'lucide-react';
import { AssessmentResultsPage } from './AssessmentResultsPage';
import { getRandomizedQuestions, type AssessmentQuestion } from '@/lib/assessmentQuestions';
import { 
  calculateDomainMaturity, 
  calculateAssessmentProgress,
  validateScoringData,
  type MaturityLevel, 
  type DomainScore,
  type CriteriaScore,
  MATURITY_LEVELS 
} from '@/lib/maturityScoring';

interface MaturityAssessmentProps {
  assessmentType?: 'free' | 'full';
  onComplete?: (results: DomainScore[]) => void;
}

export const MaturityAssessment: React.FC<MaturityAssessmentProps> = ({ 
  assessmentType = 'free',
  onComplete 
}) => {
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Map<string, MaturityLevel>>(new Map());
  const [currentAnswer, setCurrentAnswer] = useState<MaturityLevel | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [assessmentResults, setAssessmentResults] = useState<DomainScore[]>([]);
  const [overallLevel, setOverallLevel] = useState<string>('basic');
  
  useEffect(() => {
    // Load randomized questions on component mount
    const randomizedQuestions = getRandomizedQuestions();
    setQuestions(randomizedQuestions);
    setCurrentQuestionIndex(0);
    setResponses(new Map());
    setCurrentAnswer(null);
  }, []);

  const currentQuestion = questions[currentQuestionIndex];
  const progress = {
    current: currentQuestionIndex + 1,
    total: questions.length,
    percentage: questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0,
    answeredCount: responses.size,
    remainingCount: questions.length - responses.size
  };

  const handleAnswerChange = (value: MaturityLevel) => {
    setCurrentAnswer(value);
  };

  const handleNext = () => {
    if (currentAnswer && currentQuestion) {
      const newResponses = new Map(responses);
      newResponses.set(currentQuestion.id, currentAnswer);
      setResponses(newResponses);
      setCurrentAnswer(null);
      
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      // Restore previous answer if exists
      const prevQuestion = questions[currentQuestionIndex - 1];
      if (prevQuestion) {
        const prevAnswer = responses.get(prevQuestion.id);
        setCurrentAnswer(prevAnswer || null);
      }
    }
  };

  const calculateResults = (): DomainScore[] => {
    const domainMap = new Map<string, {
      domainName: string;
      criteriaScores: CriteriaScore[];
      targetLevel: MaturityLevel;
    }>();

    // Group responses by domain
    questions.forEach(question => {
      const response = responses.get(question.id);
      if (response) {
        if (!domainMap.has(question.domain)) {
          domainMap.set(question.domain, {
            domainName: question.domain,
            criteriaScores: [],
            targetLevel: 'compliant' // Default target for free assessment
          });
        }

        const domain = domainMap.get(question.domain)!;
        domain.criteriaScores.push({
          criteriaId: question.id,
          currentLevel: response,
          targetLevel: 'compliant',
          evidenceScore: MATURITY_LEVELS[response].value * 20 // Convert to 0-100 scale
        });
      }
    });

    // Calculate domain scores
    const domainScores: DomainScore[] = [];
    
    for (const [domainName, domainData] of domainMap) {
      const validation = validateScoringData(domainData.criteriaScores);
      
      if (!validation.isValid) {
        console.warn(`Invalid scoring data for domain ${domainName}:`, validation.errors);
        continue;
      }

      const result = calculateDomainMaturity(
        domainData.criteriaScores,
        domainData.targetLevel
      );

      domainScores.push({
        domainId: domainName,
        domainName: domainData.domainName,
        criteriaScores: domainData.criteriaScores,
        calculatedLevel: result.calculatedLevel,
        targetLevel: domainData.targetLevel,
        meetsThreshold: result.meetsThreshold,
        penaltyApplied: result.penaltyApplied,
        percentageAtTarget: result.percentageAtTarget
      });
    }

    return domainScores;
  };

  const handleFinishAssessment = () => {
    if (currentAnswer && currentQuestion) {
      const newResponses = new Map(responses);
      newResponses.set(currentQuestion.id, currentAnswer);
      setResponses(newResponses);
    }

    const results = calculateResults();
    const progress = calculateAssessmentProgress(results);
    
    setAssessmentResults(results);
    setOverallLevel(progress.overallMaturityLevel);
    setShowResults(true);
    onComplete?.(results);
  };

  const handleRestart = () => {
    setShowResults(false);
    setAssessmentResults([]);
    setCurrentAnswer(null);
    setCurrentQuestionIndex(0);
    setResponses(new Map());
    
    // Load new randomized questions
    const randomizedQuestions = getRandomizedQuestions();
    setQuestions(randomizedQuestions);
  };

  if (questions.length === 0) {
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
    return (
      <AssessmentResultsPage 
        domainScores={assessmentResults} 
        overallLevel={overallLevel}
        onRestart={handleRestart} 
      />
    );
  }

  if (!currentQuestion) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">Assessment Not Available</h3>
          <p className="text-muted-foreground">
            Unable to load assessment questions. Please try refreshing the page.
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
                Question {progress.current} of {progress.total} • {currentQuestion.domain}
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
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <CardTitle className="text-lg mb-2">{currentQuestion.question}</CardTitle>
              <Badge variant="outline" className="text-xs">
                {currentQuestion.domain}
              </Badge>
            </div>
          </div>
          <CardDescription>
            Select the option that best describes your organization's current approach
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={currentAnswer || ''} onValueChange={handleAnswerChange}>
            {currentQuestion.options.map((option) => (
              <div key={option.level} className="space-y-2">
                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value={option.level} id={option.level} className="mt-1" />
                  <div className="flex-1 cursor-pointer" onClick={() => handleAnswerChange(option.level)}>
                    <Label htmlFor={option.level} className="cursor-pointer">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{option.text}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {MATURITY_LEVELS[option.level].label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </Label>
                  </div>
                </div>
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
              Next Question
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      {/* Assessment Info */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <h4 className="font-medium mb-2">Assessment Information</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Questions presented in random order for assessment integrity</li>
            <li>• 25 psychometric questions across 5 operational domains</li>
            <li>• Advanced scoring algorithm with 80% threshold requirement</li>
            <li>• Two-level deficit penalty system for comprehensive evaluation</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};