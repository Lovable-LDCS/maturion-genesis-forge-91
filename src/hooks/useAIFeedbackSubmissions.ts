import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from './useOrganizationContext';
import { useToast } from './use-toast';

export interface AIFeedbackSubmission {
  id: string;
  organization_id: string;
  user_id: string;
  document_id?: string | null;
  criteria_id?: string | null;
  ai_generated_content: string;
  feedback_type: string;
  feedback_category?: string | null;
  user_comments?: string | null;
  revision_instructions?: string | null;
  human_override_content?: string | null;
  justification?: string | null;
  confidence_rating?: number | null;
  metadata?: any;
  created_at: string;
  updated_at: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
}

export interface SubmitFeedbackParams {
  documentId?: string;
  criteriaId?: string;
  aiGeneratedContent: string;
  feedbackType: 'approved' | 'needs_correction' | 'rejected';
  feedbackCategory?: string;
  userComments?: string;
  revisionInstructions?: string;
  humanOverrideContent?: string;
  justification?: string;
  confidenceRating?: number;
}

export const useAIFeedbackSubmissions = () => {
  const [submissions, setSubmissions] = useState<AIFeedbackSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { currentContext } = useOrganizationContext();
  const { toast } = useToast();
  
  const organizationId = currentContext?.organization_id;

  const loadSubmissions = async () => {
    if (!organizationId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_feedback_submissions')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error('Error loading feedback submissions:', error);
      toast({
        title: "Error",
        description: "Failed to load feedback submissions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const submitFeedback = async (params: SubmitFeedbackParams): Promise<boolean> => {
    if (!organizationId) return false;

    setIsLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('ai_feedback_submissions')
        .insert({
          organization_id: organizationId,
          user_id: user.user.id,
          document_id: params.documentId,
          criteria_id: params.criteriaId,
          ai_generated_content: params.aiGeneratedContent,
          feedback_type: params.feedbackType,
          feedback_category: params.feedbackCategory,
          user_comments: params.userComments,
          revision_instructions: params.revisionInstructions,
          human_override_content: params.humanOverrideContent,
          justification: params.justification,
          confidence_rating: params.confidenceRating,
        });

      if (error) throw error;

      toast({
        title: "Feedback Submitted",
        description: "Your feedback has been recorded for AI learning",
      });

      // Reload submissions to show the new one
      await loadSubmissions();
      return true;
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Error",
        description: "Failed to submit feedback",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const markAsReviewed = async (submissionId: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('ai_feedback_submissions')
        .update({
          reviewed_by: user.user.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', submissionId);

      if (error) throw error;

      await loadSubmissions();
      return true;
    } catch (error) {
      console.error('Error marking as reviewed:', error);
      toast({
        title: "Error",
        description: "Failed to mark feedback as reviewed",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const getFeedbackStats = () => {
    const total = submissions.length;
    const approved = submissions.filter(s => s.feedback_type === 'approved').length;
    const needsCorrection = submissions.filter(s => s.feedback_type === 'needs_correction').length;
    const rejected = submissions.filter(s => s.feedback_type === 'rejected').length;
    const reviewed = submissions.filter(s => s.reviewed_by).length;

    return {
      total,
      approved,
      needsCorrection,
      rejected,
      reviewed,
      pendingReview: total - reviewed,
    };
  };

  useEffect(() => {
    if (organizationId) {
      loadSubmissions();
    }
  }, [organizationId]);

  return {
    submissions,
    isLoading,
    submitFeedback,
    markAsReviewed,
    loadSubmissions,
    getFeedbackStats,
  };
};