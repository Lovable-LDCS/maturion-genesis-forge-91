import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/useOrganization';

interface FeedbackEntry {
  id: string;
  organization_id: string;
  domain_id?: string;
  user_id: string;
  rejected_text: string;
  replacement_text?: string;
  reason: string;
  feedback_type: 'rejection' | 'modification' | 'sector_misalignment';
  created_at: string;
}

interface LearningPattern {
  pattern_type: 'terminology' | 'evidence_type' | 'control_approach';
  rejected_phrase: string;
  preferred_phrase?: string;
  frequency: number;
  context: string;
}

export const useAILearningFeedback = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [learningPatterns, setLearningPatterns] = useState<LearningPattern[]>([]);
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();

  // Capture user rejection/modification feedback
  const captureFeedback = async (
    rejectedText: string,
    replacementText: string | null,
    reason: string,
    domainId?: string,
    feedbackType: 'rejection' | 'modification' | 'sector_misalignment' = 'modification'
  ): Promise<boolean> => {
    if (!currentOrganization?.id) {
      toast({
        title: "Error",
        description: "No organization context available",
        variant: "destructive",
      });
      return false;
    }

    setIsLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Store feedback in learning log
      const { error } = await supabase
        .from('ai_feedback_log')
        .insert({
          organization_id: currentOrganization.id,
          domain_id: domainId,
          user_id: user.id,
          rejected_text: rejectedText,
          replacement_text: replacementText,
          reason: reason,
          feedback_type: feedbackType,
          metadata: {
            timestamp: new Date().toISOString(),
            domain_context: domainId ? 'domain_specific' : 'general',
            learning_scope: 'organizational'
          }
        });

      if (error) throw error;

      // Log audit trail for learning system
      await supabase
        .from('ai_upload_audit')
        .insert({
          organization_id: currentOrganization.id,
          user_id: user.id,
          action: 'ai_learning_feedback',
          metadata: {
            feedback_type: feedbackType,
            rejected_text_length: rejectedText.length,
            has_replacement: !!replacementText,
            reason_category: reason,
            domain_scope: domainId || 'general'
          }
        });

      toast({
        title: "Feedback Captured",
        description: "Your feedback will help Maturion learn and improve future suggestions",
      });

      return true;
    } catch (error) {
      console.error('Error capturing feedback:', error);
      toast({
        title: "Feedback Failed",
        description: "Unable to capture feedback for learning",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Analyze learning patterns for organization
  const analyzeLearningPatterns = async (): Promise<LearningPattern[]> => {
    if (!currentOrganization?.id) return [];

    setIsLoading(true);

    try {
      const { data: feedbackData, error } = await supabase
        .from('ai_feedback_log')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Analyze patterns in rejected/modified content
      const patterns: Map<string, LearningPattern> = new Map();

      feedbackData?.forEach(feedback => {
        // Extract key phrases from rejected text
        const keyPhrases = extractKeyPhrases(feedback.rejected_text);
        
        keyPhrases.forEach(phrase => {
          const key = phrase.toLowerCase().trim();
          if (patterns.has(key)) {
            const existing = patterns.get(key)!;
            existing.frequency += 1;
            if (feedback.replacement_text && !existing.preferred_phrase) {
              existing.preferred_phrase = extractReplacementPhrase(feedback.replacement_text, phrase);
            }
          } else {
            patterns.set(key, {
              pattern_type: classifyPatternType(phrase),
              rejected_phrase: phrase,
              preferred_phrase: feedback.replacement_text 
                ? extractReplacementPhrase(feedback.replacement_text, phrase)
                : undefined,
              frequency: 1,
              context: feedback.reason || 'User feedback'
            });
          }
        });
      });

      const sortedPatterns = Array.from(patterns.values())
        .filter(pattern => pattern.frequency >= 2) // Only patterns with 2+ occurrences
        .sort((a, b) => b.frequency - a.frequency);

      setLearningPatterns(sortedPatterns);
      return sortedPatterns;
    } catch (error) {
      console.error('Error analyzing learning patterns:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Check if content should be suppressed based on learning
  const shouldSuppressContent = async (content: string): Promise<boolean> => {
    if (!currentOrganization?.id) return false;

    try {
      // Quick check against recent rejections
      const { data: recentRejections, error } = await supabase
        .from('ai_feedback_log')
        .select('rejected_text, reason')
        .eq('organization_id', currentOrganization.id)
        .eq('feedback_type', 'rejection')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
        .limit(20);

      if (error || !recentRejections) return false;

      // Check for similarity with rejected content
      return recentRejections.some(rejection => {
        const similarity = calculateSimilarity(content.toLowerCase(), rejection.rejected_text.toLowerCase());
        return similarity > 0.7; // 70% similarity threshold
      });
    } catch (error) {
      console.error('Error checking suppression:', error);
      return false;
    }
  };

  // Apply learning patterns to improve content
  const applyLearningPatterns = (content: string, patterns: LearningPattern[] = learningPatterns): string => {
    let improvedContent = content;

    patterns.forEach(pattern => {
      if (pattern.preferred_phrase) {
        const regex = new RegExp(pattern.rejected_phrase, 'gi');
        improvedContent = improvedContent.replace(regex, pattern.preferred_phrase);
      }
    });

    return improvedContent;
  };

  return {
    captureFeedback,
    analyzeLearningPatterns,
    shouldSuppressContent,
    applyLearningPatterns,
    learningPatterns,
    isLoading
  };
};

// Helper functions for pattern analysis
function extractKeyPhrases(text: string): string[] {
  // Extract meaningful phrases (2-5 words) that could be learning targets
  const words = text.toLowerCase().split(/\s+/);
  const phrases: string[] = [];
  
  for (let i = 0; i < words.length - 1; i++) {
    // 2-word phrases
    phrases.push(words.slice(i, i + 2).join(' '));
    
    // 3-word phrases
    if (i < words.length - 2) {
      phrases.push(words.slice(i, i + 3).join(' '));
    }
  }
  
  // Filter out common stop phrases
  return phrases.filter(phrase => 
    phrase.length > 5 && 
    !phrase.includes('the ') && 
    !phrase.includes('and ') &&
    !phrase.includes('for ')
  );
}

function extractReplacementPhrase(replacementText: string, originalPhrase: string): string | undefined {
  // Simple extraction - find the most similar phrase in replacement text
  const replacementWords = replacementText.split(/\s+/);
  const originalWords = originalPhrase.split(/\s+/);
  
  // Look for phrases of similar length
  for (let i = 0; i <= replacementWords.length - originalWords.length; i++) {
    const candidate = replacementWords.slice(i, i + originalWords.length).join(' ');
    if (candidate.length > 3) {
      return candidate;
    }
  }
  
  return undefined;
}

function classifyPatternType(phrase: string): 'terminology' | 'evidence_type' | 'control_approach' {
  const lowerPhrase = phrase.toLowerCase();
  
  if (lowerPhrase.includes('policy') || lowerPhrase.includes('procedure') || lowerPhrase.includes('document')) {
    return 'evidence_type';
  }
  
  if (lowerPhrase.includes('shall') || lowerPhrase.includes('must') || lowerPhrase.includes('control')) {
    return 'control_approach';
  }
  
  return 'terminology';
}

function calculateSimilarity(str1: string, str2: string): number {
  // Simple Jaccard similarity for quick comparison
  const words1 = new Set(str1.split(/\s+/));
  const words2 = new Set(str2.split(/\s+/));
  
  const intersection = new Set([...words1].filter(word => words2.has(word)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}