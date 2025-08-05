import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from './useOrganizationContext';

// Types for AI learning patterns
interface AILearningPattern {
  id: string;
  organization_id: string;
  pattern_type: string;
  pattern_category: string;
  pattern_text: string;
  confidence_score: number;
  frequency_count: number;
  first_detected_at: string;
  last_detected_at: string;
  source_feedback_ids: string[];
  affected_domains: string[];
  affected_sectors: string[];
  pattern_strength: 'weak' | 'moderate' | 'strong' | 'critical';
  validation_status: 'unvalidated' | 'human_approved' | 'human_rejected' | 'auto_validated';
  validated_by?: string;
  validated_at?: string;
  suppression_rule?: string;
  replacement_suggestion?: string;
  learning_weight: number;
  is_active: boolean;
  cross_org_applicable: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

interface CreatePatternParams {
  pattern_type: string;
  pattern_category: string;
  pattern_text: string;
  confidence_score?: number;
  frequency_count?: number;
  source_feedback_ids?: string[];
  affected_domains?: string[];
  affected_sectors?: string[];
  pattern_strength?: 'weak' | 'moderate' | 'strong' | 'critical';
  suppression_rule?: string;
  replacement_suggestion?: string;
  learning_weight?: number;
  cross_org_applicable?: boolean;
  metadata?: Record<string, any>;
}

interface ValidatePatternParams {
  patternId: string;
  validation_status: 'human_approved' | 'human_rejected';
  suppression_rule?: string;
  replacement_suggestion?: string;
}

export const useAILearningPatterns = () => {
  const [patterns, setPatterns] = useState<AILearningPattern[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { currentContext } = useOrganizationContext();
  const organizationId = currentContext?.organization_id;

  // Load learning patterns for the organization
  const loadPatterns = async () => {
    if (!organizationId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_learning_patterns')
        .select('*')
        .eq('organization_id', organizationId)
        .order('confidence_score', { ascending: false })
        .order('frequency_count', { ascending: false });

      if (error) throw error;

      setPatterns((data || []) as AILearningPattern[]);
    } catch (error) {
      console.error('Error loading learning patterns:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new learning pattern (simulation mode - no auto-activation)
  const createPattern = async (params: CreatePatternParams): Promise<boolean> => {
    if (!organizationId) return false;

    try {
      const { error } = await supabase
        .from('ai_learning_patterns')
        .insert({
          organization_id: organizationId,
          pattern_type: params.pattern_type,
          pattern_category: params.pattern_category,
          pattern_text: params.pattern_text,
          confidence_score: params.confidence_score || 0.5,
          frequency_count: params.frequency_count || 1,
          source_feedback_ids: params.source_feedback_ids || [],
          affected_domains: params.affected_domains || [],
          affected_sectors: params.affected_sectors || [],
          pattern_strength: params.pattern_strength || 'weak',
          suppression_rule: params.suppression_rule,
          replacement_suggestion: params.replacement_suggestion,
          learning_weight: params.learning_weight || 1.0,
          cross_org_applicable: params.cross_org_applicable || false,
          metadata: params.metadata || {},
          created_by: (await supabase.auth.getUser()).data.user?.id || '',
          updated_by: (await supabase.auth.getUser()).data.user?.id || ''
        });

      if (error) throw error;

      await loadPatterns(); // Reload to get the updated list
      return true;
    } catch (error) {
      console.error('Error creating learning pattern:', error);
      return false;
    }
  };

  // Validate a pattern (human approval/rejection)
  const validatePattern = async (params: ValidatePatternParams): Promise<boolean> => {
    try {
      const currentUser = (await supabase.auth.getUser()).data.user;
      if (!currentUser) return false;

      const { error } = await supabase
        .from('ai_learning_patterns')
        .update({
          validation_status: params.validation_status,
          validated_by: currentUser.id,
          validated_at: new Date().toISOString(),
          suppression_rule: params.suppression_rule,
          replacement_suggestion: params.replacement_suggestion,
          updated_by: currentUser.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', params.patternId);

      if (error) throw error;

      await loadPatterns(); // Reload to get the updated list
      return true;
    } catch (error) {
      console.error('Error validating pattern:', error);
      return false;
    }
  };

  // Update pattern confidence and frequency (simulation of learning)
  const updatePatternMetrics = async (
    patternId: string, 
    confidenceChange: number, 
    frequencyChange: number
  ): Promise<boolean> => {
    try {
      const pattern = patterns.find(p => p.id === patternId);
      if (!pattern) return false;

      const newConfidence = Math.max(0, Math.min(100, pattern.confidence_score + confidenceChange));
      const newFrequency = Math.max(1, pattern.frequency_count + frequencyChange);
      
      // Determine new pattern strength based on confidence and frequency
      let newStrength: 'weak' | 'moderate' | 'strong' | 'critical' = 'weak';
      if (newConfidence >= 90 && newFrequency >= 10) newStrength = 'critical';
      else if (newConfidence >= 75 && newFrequency >= 5) newStrength = 'strong';
      else if (newConfidence >= 60 && newFrequency >= 3) newStrength = 'moderate';

      const { error } = await supabase
        .from('ai_learning_patterns')
        .update({
          confidence_score: newConfidence,
          frequency_count: newFrequency,
          pattern_strength: newStrength,
          last_detected_at: new Date().toISOString(),
          updated_by: (await supabase.auth.getUser()).data.user?.id || '',
          updated_at: new Date().toISOString()
        })
        .eq('id', patternId);

      if (error) throw error;

      await loadPatterns(); // Reload to get the updated list
      return true;
    } catch (error) {
      console.error('Error updating pattern metrics:', error);
      return false;
    }
  };

  // Deactivate/reactivate a pattern
  const togglePatternActive = async (patternId: string, isActive: boolean): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('ai_learning_patterns')
        .update({
          is_active: isActive,
          updated_by: (await supabase.auth.getUser()).data.user?.id || '',
          updated_at: new Date().toISOString()
        })
        .eq('id', patternId);

      if (error) throw error;

      await loadPatterns(); // Reload to get the updated list
      return true;
    } catch (error) {
      console.error('Error toggling pattern active status:', error);
      return false;
    }
  };

  // Get patterns by category
  const getPatternsByCategory = (category: string) => {
    return patterns.filter(p => p.pattern_category === category);
  };

  // Get patterns by strength
  const getPatternsByStrength = (strength: 'weak' | 'moderate' | 'strong' | 'critical') => {
    return patterns.filter(p => p.pattern_strength === strength);
  };

  // Get validated patterns
  const getValidatedPatterns = () => {
    return patterns.filter(p => p.validation_status === 'human_approved');
  };

  // Get patterns needing validation
  const getPatternsNeedingValidation = () => {
    return patterns.filter(p => p.validation_status === 'unvalidated');
  };

  // Get pattern statistics
  const getPatternStats = () => {
    return {
      total: patterns.length,
      active: patterns.filter(p => p.is_active).length,
      validated: patterns.filter(p => p.validation_status === 'human_approved').length,
      rejected: patterns.filter(p => p.validation_status === 'human_rejected').length,
      needingValidation: patterns.filter(p => p.validation_status === 'unvalidated').length,
      critical: patterns.filter(p => p.pattern_strength === 'critical').length,
      strong: patterns.filter(p => p.pattern_strength === 'strong').length,
      moderate: patterns.filter(p => p.pattern_strength === 'moderate').length,
      weak: patterns.filter(p => p.pattern_strength === 'weak').length
    };
  };

  // Load patterns when organization changes
  useEffect(() => {
    if (organizationId) {
      loadPatterns();
    }
  }, [organizationId]);

  return {
    patterns,
    isLoading,
    createPattern,
    validatePattern,
    updatePatternMetrics,
    togglePatternActive,
    loadPatterns,
    getPatternsByCategory,
    getPatternsByStrength,
    getValidatedPatterns,
    getPatternsNeedingValidation,
    getPatternStats
  };
};