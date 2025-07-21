import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  calculateDomainMaturity, 
  calculateAssessmentProgress,
  validateScoringData,
  shuffleArray,
  type MaturityLevel,
  type CriteriaScore,
  type DomainScore,
  MATURITY_LEVELS
} from '@/lib/maturityScoring';

interface AssessmentQuestion {
  id: string;
  criteriaId: string;
  domainId: string;
  domainName: string;
  statement: string;
  currentLevel?: MaturityLevel;
  targetLevel: MaturityLevel;
}

export const useMaturityScoring = (organizationId: string) => {
  const [loading, setLoading] = useState(false);
  const [assessmentQuestions, setAssessmentQuestions] = useState<AssessmentQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Map<string, MaturityLevel>>(new Map());
  const { toast } = useToast();

  /**
   * Load assessment questions for free assessment (5 per domain, randomized)
   */
  const loadFreeAssessmentQuestions = useCallback(async () => {
    if (!organizationId) return;

    setLoading(true);
    try {
      // Fetch domains and their criteria
      const { data: domains, error: domainError } = await supabase
        .from('domains')
        .select(`
          id,
          name,
          criteria (
            id,
            statement
          )
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'approved_locked');

      if (domainError) throw domainError;

      const questions: AssessmentQuestion[] = [];

      // Select 5 random criteria per domain
      domains?.forEach((domain: any) => {
        if (domain.criteria && domain.criteria.length > 0) {
          const shuffledCriteria = shuffleArray(domain.criteria);
          const selectedCriteria = shuffledCriteria.slice(0, 5);

          selectedCriteria.forEach((criteria: any) => {
            questions.push({
              id: `${domain.id}-${criteria.id}`,
              criteriaId: criteria.id,
              domainId: domain.id,
              domainName: domain.name,
              statement: criteria.statement,
              targetLevel: 'compliant' // Default target for free assessment
            });
          });
        }
      });

      // Randomize all questions
      const randomizedQuestions = shuffleArray(questions);
      setAssessmentQuestions(randomizedQuestions);
      setCurrentQuestionIndex(0);
      setResponses(new Map());

    } catch (error) {
      console.error('Error loading assessment questions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load assessment questions',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [organizationId, toast]);

  /**
   * Answer a question
   */
  const answerQuestion = useCallback((questionId: string, level: MaturityLevel) => {
    setResponses(prev => new Map(prev.set(questionId, level)));
  }, []);

  /**
   * Go to next question
   */
  const nextQuestion = useCallback(() => {
    if (currentQuestionIndex < assessmentQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  }, [currentQuestionIndex, assessmentQuestions.length]);

  /**
   * Go to previous question
   */
  const previousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  }, [currentQuestionIndex]);

  /**
   * Calculate assessment results
   */
  const calculateResults = useCallback(async (): Promise<DomainScore[]> => {
    const domainMap = new Map<string, {
      domainId: string;
      domainName: string;
      criteriaScores: CriteriaScore[];
      targetLevel: MaturityLevel;
    }>();

    // Group responses by domain
    assessmentQuestions.forEach(question => {
      const response = responses.get(question.id);
      if (response) {
        if (!domainMap.has(question.domainId)) {
          domainMap.set(question.domainId, {
            domainId: question.domainId,
            domainName: question.domainName,
            criteriaScores: [],
            targetLevel: question.targetLevel
          });
        }

        const domain = domainMap.get(question.domainId)!;
        domain.criteriaScores.push({
          criteriaId: question.criteriaId,
          currentLevel: response,
          targetLevel: question.targetLevel,
          evidenceScore: MATURITY_LEVELS[response].value * 20 // Convert to 0-100 scale
        });
      }
    });

    // Calculate domain scores
    const domainScores: DomainScore[] = [];
    
    for (const [domainId, domainData] of domainMap) {
      const validation = validateScoringData(domainData.criteriaScores);
      
      if (!validation.isValid) {
        console.warn(`Invalid scoring data for domain ${domainId}:`, validation.errors);
        continue;
      }

      const result = calculateDomainMaturity(
        domainData.criteriaScores,
        domainData.targetLevel
      );

      domainScores.push({
        domainId,
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
  }, [assessmentQuestions, responses]);

  /**
   * Save assessment results to database
   */
  const saveAssessmentResults = useCallback(async (
    assessmentId: string,
    domainScores: DomainScore[]
  ) => {
    if (!organizationId) return;

    setLoading(true);
    try {
      // Save individual criteria scores
      const scoreInserts = [];
      
      for (const domain of domainScores) {
        for (const criteria of domain.criteriaScores) {
          scoreInserts.push({
            assessment_id: assessmentId,
            criteria_id: criteria.criteriaId,
            organization_id: organizationId,
            current_maturity_level: criteria.currentLevel,
            target_maturity_level: criteria.targetLevel,
            evidence_completeness_score: criteria.evidenceScore,
            overall_score: MATURITY_LEVELS[criteria.currentLevel].value * 20,
            status: 'approved_locked',
            created_by: (await supabase.auth.getUser()).data.user?.id,
            updated_by: (await supabase.auth.getUser()).data.user?.id
          });
        }
      }

      const { error: scoresError } = await supabase
        .from('assessment_scores')
        .insert(scoreInserts);

      if (scoresError) throw scoresError;

      // Calculate overall progress
      const progress = calculateAssessmentProgress(domainScores);

      // Update assessment with results
      const { error: assessmentError } = await supabase
        .from('assessments')
        .update({
          overall_completion_percentage: progress.completionPercentage,
          status: 'approved_locked',
          ai_evaluation_result: {
            domainScores: domainScores.map(d => ({
              domainId: d.domainId,
              domainName: d.domainName,
              calculatedLevel: d.calculatedLevel,
              meetsThreshold: d.meetsThreshold,
              penaltyApplied: d.penaltyApplied,
              percentageAtTarget: d.percentageAtTarget
            })),
            overallLevel: progress.overallMaturityLevel,
            calculatedAt: new Date().toISOString()
          },
          updated_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', assessmentId);

      if (assessmentError) throw assessmentError;

      toast({
        title: 'Success',
        description: 'Assessment results saved successfully'
      });

    } catch (error) {
      console.error('Error saving assessment results:', error);
      toast({
        title: 'Error',
        description: 'Failed to save assessment results',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [organizationId, toast]);

  /**
   * Get current question
   */
  const getCurrentQuestion = useCallback(() => {
    return assessmentQuestions[currentQuestionIndex] || null;
  }, [assessmentQuestions, currentQuestionIndex]);

  /**
   * Get progress information
   */
  const getProgress = useCallback(() => {
    return {
      current: currentQuestionIndex + 1,
      total: assessmentQuestions.length,
      percentage: assessmentQuestions.length > 0 ? 
        ((currentQuestionIndex + 1) / assessmentQuestions.length) * 100 : 0,
      answeredCount: responses.size,
      remainingCount: assessmentQuestions.length - responses.size
    };
  }, [currentQuestionIndex, assessmentQuestions.length, responses.size]);

  /**
   * Check if assessment is complete
   */
  const isComplete = useCallback(() => {
    return responses.size === assessmentQuestions.length && assessmentQuestions.length > 0;
  }, [responses.size, assessmentQuestions.length]);

  return {
    loading,
    assessmentQuestions,
    currentQuestionIndex,
    responses,
    loadFreeAssessmentQuestions,
    answerQuestion,
    nextQuestion,
    previousQuestion,
    calculateResults,
    saveAssessmentResults,
    getCurrentQuestion,
    getProgress,
    isComplete
  };
};