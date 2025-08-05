import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from './useOrganizationContext';
import { useToast } from './use-toast';

export interface FeedbackWeight {
  id: string;
  organization_id: string;
  feedback_type: string;
  feedback_category: string;
  weight_multiplier: number;
  is_critical: boolean;
  applies_to_content_types: string[];
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

export interface WeightUpdateParams {
  feedbackType: string;
  feedbackCategory: string;
  weightMultiplier: number;
  isCritical: boolean;
  appliesToContentTypes: string[];
}

export const useFeedbackRetrainingWeights = () => {
  const [weights, setWeights] = useState<FeedbackWeight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { currentContext } = useOrganizationContext();
  const { toast } = useToast();
  
  const organizationId = currentContext?.organization_id;

  const loadWeights = async () => {
    if (!organizationId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('feedback_retraining_weights')
        .select('*')
        .eq('organization_id', organizationId)
        .order('feedback_type', { ascending: true });

      if (error) throw error;
      setWeights(data || []);
    } catch (error) {
      console.error('Error loading feedback weights:', error);
      toast({
        title: "Error",
        description: "Failed to load feedback weights",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateWeight = async (params: WeightUpdateParams): Promise<boolean> => {
    if (!organizationId) return false;

    setIsLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('feedback_retraining_weights')
        .upsert({
          organization_id: organizationId,
          feedback_type: params.feedbackType,
          feedback_category: params.feedbackCategory,
          weight_multiplier: params.weightMultiplier,
          is_critical: params.isCritical,
          applies_to_content_types: params.appliesToContentTypes,
          created_by: user.user.id,
          updated_by: user.user.id,
        }, {
          onConflict: 'organization_id,feedback_type,feedback_category'
        });

      if (error) throw error;

      toast({
        title: "Weight Updated",
        description: "Feedback weight configuration has been saved",
      });

      await loadWeights();
      return true;
    } catch (error) {
      console.error('Error updating weight:', error);
      toast({
        title: "Error",
        description: "Failed to update feedback weight",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteWeight = async (weightId: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('feedback_retraining_weights')
        .delete()
        .eq('id', weightId);

      if (error) throw error;

      toast({
        title: "Weight Deleted",
        description: "Feedback weight configuration has been removed",
      });

      await loadWeights();
      return true;
    } catch (error) {
      console.error('Error deleting weight:', error);
      toast({
        title: "Error",
        description: "Failed to delete feedback weight",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const getWeightForFeedback = (feedbackType: string, feedbackCategory: string): number => {
    const weight = weights.find(w => 
      w.feedback_type === feedbackType && 
      w.feedback_category === feedbackCategory
    );
    return weight?.weight_multiplier || 1.0;
  };

  const getCriticalWeights = () => {
    return weights.filter(w => w.is_critical);
  };

  const resetToDefaults = async (): Promise<boolean> => {
    if (!organizationId) return false;

    setIsLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      // Delete existing weights for this organization
      const { error: deleteError } = await supabase
        .from('feedback_retraining_weights')
        .delete()
        .eq('organization_id', organizationId);

      if (deleteError) throw deleteError;

      // Insert default weights
      const defaultWeights = [
        { feedback_type: 'rejected', feedback_category: 'accuracy', weight_multiplier: 3.00, is_critical: true },
        { feedback_type: 'rejected', feedback_category: 'hallucination', weight_multiplier: 5.00, is_critical: true },
        { feedback_type: 'rejected', feedback_category: 'relevance', weight_multiplier: 2.50, is_critical: true },
        { feedback_type: 'needs_correction', feedback_category: 'grammar', weight_multiplier: 1.00, is_critical: false },
        { feedback_type: 'needs_correction', feedback_category: 'clarity', weight_multiplier: 1.50, is_critical: false },
        { feedback_type: 'approved', feedback_category: 'accuracy', weight_multiplier: 0.50, is_critical: false },
      ];

      const { error: insertError } = await supabase
        .from('feedback_retraining_weights')
        .insert(defaultWeights.map(weight => ({
          ...weight,
          organization_id: organizationId,
          applies_to_content_types: [],
          created_by: user.user.id,
          updated_by: user.user.id,
        })));

      if (insertError) throw insertError;

      toast({
        title: "Weights Reset",
        description: "Feedback weights have been reset to default values",
      });

      await loadWeights();
      return true;
    } catch (error) {
      console.error('Error resetting weights:', error);
      toast({
        title: "Error",
        description: "Failed to reset feedback weights",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (organizationId) {
      loadWeights();
    }
  }, [organizationId]);

  return {
    weights,
    isLoading,
    updateWeight,
    deleteWeight,
    getWeightForFeedback,
    getCriticalWeights,
    resetToDefaults,
    loadWeights,
  };
};