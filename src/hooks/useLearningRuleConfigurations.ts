import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from './useOrganizationContext';

// Types for learning rule configurations
interface LearningRuleConfiguration {
  id: string;
  organization_id: string;
  rule_name: string;
  rule_type: string;
  rule_category: string;
  rule_parameters: Record<string, any>;
  threshold_values: Record<string, any>;
  is_enabled: boolean;
  applies_to_content_types: string[];
  applies_to_domains: string[];
  priority_level: number;
  auto_activation_enabled: boolean;
  last_triggered_at?: string;
  trigger_count: number;
  effectiveness_score?: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

interface CreateRuleParams {
  rule_name: string;
  rule_type: string;
  rule_category: string;
  rule_parameters?: Record<string, any>;
  threshold_values?: Record<string, any>;
  is_enabled?: boolean;
  applies_to_content_types?: string[];
  applies_to_domains?: string[];
  priority_level?: number;
  auto_activation_enabled?: boolean;
}

interface UpdateRuleParams {
  ruleId: string;
  rule_parameters?: Record<string, any>;
  threshold_values?: Record<string, any>;
  is_enabled?: boolean;
  applies_to_content_types?: string[];
  applies_to_domains?: string[];
  priority_level?: number;
  auto_activation_enabled?: boolean;
  effectiveness_score?: number;
}

export const useLearningRuleConfigurations = () => {
  const [rules, setRules] = useState<LearningRuleConfiguration[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { currentContext } = useOrganizationContext();
  const organizationId = currentContext?.organization_id;

  // Load learning rules for the organization
  const loadRules = async () => {
    if (!organizationId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('learning_rule_configurations')
        .select('*')
        .eq('organization_id', organizationId)
        .order('priority_level', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRules((data || []) as LearningRuleConfiguration[]);
    } catch (error) {
      console.error('Error loading learning rules:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new learning rule
  const createRule = async (params: CreateRuleParams): Promise<boolean> => {
    if (!organizationId) return false;

    try {
      const currentUser = (await supabase.auth.getUser()).data.user;
      if (!currentUser) return false;

      const { error } = await supabase
        .from('learning_rule_configurations')
        .insert({
          organization_id: organizationId,
          rule_name: params.rule_name,
          rule_type: params.rule_type,
          rule_category: params.rule_category,
          rule_parameters: params.rule_parameters || {},
          threshold_values: params.threshold_values || {},
          is_enabled: params.is_enabled !== false,
          applies_to_content_types: params.applies_to_content_types || [],
          applies_to_domains: params.applies_to_domains || [],
          priority_level: params.priority_level || 5,
          auto_activation_enabled: params.auto_activation_enabled || false,
          trigger_count: 0,
          created_by: currentUser.id,
          updated_by: currentUser.id
        });

      if (error) throw error;

      await loadRules(); // Reload to get the updated list
      return true;
    } catch (error) {
      console.error('Error creating learning rule:', error);
      return false;
    }
  };

  // Update an existing learning rule
  const updateRule = async (params: UpdateRuleParams): Promise<boolean> => {
    try {
      const currentUser = (await supabase.auth.getUser()).data.user;
      if (!currentUser) return false;

      const updateData: any = {
        updated_by: currentUser.id,
        updated_at: new Date().toISOString()
      };

      // Only include fields that are provided
      if (params.rule_parameters !== undefined) updateData.rule_parameters = params.rule_parameters;
      if (params.threshold_values !== undefined) updateData.threshold_values = params.threshold_values;
      if (params.is_enabled !== undefined) updateData.is_enabled = params.is_enabled;
      if (params.applies_to_content_types !== undefined) updateData.applies_to_content_types = params.applies_to_content_types;
      if (params.applies_to_domains !== undefined) updateData.applies_to_domains = params.applies_to_domains;
      if (params.priority_level !== undefined) updateData.priority_level = params.priority_level;
      if (params.auto_activation_enabled !== undefined) updateData.auto_activation_enabled = params.auto_activation_enabled;
      if (params.effectiveness_score !== undefined) updateData.effectiveness_score = params.effectiveness_score;

      const { error } = await supabase
        .from('learning_rule_configurations')
        .update(updateData)
        .eq('id', params.ruleId);

      if (error) throw error;

      await loadRules(); // Reload to get the updated list
      return true;
    } catch (error) {
      console.error('Error updating learning rule:', error);
      return false;
    }
  };

  // Delete a learning rule
  const deleteRule = async (ruleId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('learning_rule_configurations')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;

      await loadRules(); // Reload to get the updated list
      return true;
    } catch (error) {
      console.error('Error deleting learning rule:', error);
      return false;
    }
  };

  // Toggle rule enabled status
  const toggleRuleEnabled = async (ruleId: string, isEnabled: boolean): Promise<boolean> => {
    try {
      const currentUser = (await supabase.auth.getUser()).data.user;
      if (!currentUser) return false;

      const { error } = await supabase
        .from('learning_rule_configurations')
        .update({
          is_enabled: isEnabled,
          updated_by: currentUser.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', ruleId);

      if (error) throw error;

      await loadRules(); // Reload to get the updated list
      return true;
    } catch (error) {
      console.error('Error toggling rule enabled status:', error);
      return false;
    }
  };

  // Record rule trigger (simulation of rule activation)
  const recordRuleTrigger = async (ruleId: string): Promise<boolean> => {
    try {
      const rule = rules.find(r => r.id === ruleId);
      if (!rule) return false;

      const { error } = await supabase
        .from('learning_rule_configurations')
        .update({
          last_triggered_at: new Date().toISOString(),
          trigger_count: rule.trigger_count + 1,
          updated_by: (await supabase.auth.getUser()).data.user?.id || '',
          updated_at: new Date().toISOString()
        })
        .eq('id', ruleId);

      if (error) throw error;

      await loadRules(); // Reload to get the updated list
      return true;
    } catch (error) {
      console.error('Error recording rule trigger:', error);
      return false;
    }
  };

  // Get rules by type
  const getRulesByType = (ruleType: string) => {
    return rules.filter(r => r.rule_type === ruleType);
  };

  // Get rules by category
  const getRulesByCategory = (category: string) => {
    return rules.filter(r => r.rule_category === category);
  };

  // Get enabled rules
  const getEnabledRules = () => {
    return rules.filter(r => r.is_enabled);
  };

  // Get rules ready for auto-activation
  const getAutoActivationReadyRules = () => {
    return rules.filter(r => r.is_enabled && r.auto_activation_enabled);
  };

  // Get rule statistics
  const getRuleStats = () => {
    return {
      total: rules.length,
      enabled: rules.filter(r => r.is_enabled).length,
      disabled: rules.filter(r => !r.is_enabled).length,
      autoActivationReady: rules.filter(r => r.is_enabled && r.auto_activation_enabled).length,
      highPriority: rules.filter(r => r.priority_level >= 8).length,
      mediumPriority: rules.filter(r => r.priority_level >= 5 && r.priority_level < 8).length,
      lowPriority: rules.filter(r => r.priority_level < 5).length,
      patternDetection: rules.filter(r => r.rule_type === 'pattern_detection').length,
      confidenceThreshold: rules.filter(r => r.rule_type === 'confidence_threshold').length,
      autoValidation: rules.filter(r => r.rule_type === 'auto_validation').length,
      suppressionTrigger: rules.filter(r => r.rule_type === 'suppression_trigger').length
    };
  };

  // Load default rules for organization (simulation setup)
  const loadDefaultRules = async (): Promise<boolean> => {
    if (!organizationId) return false;

    const defaultRules: CreateRuleParams[] = [
      {
        rule_name: 'High Confidence Pattern Detection',
        rule_type: 'pattern_detection',
        rule_category: 'content_quality',
        threshold_values: {
          min_frequency: 3,
          min_confidence: 75,
          validation_threshold: 80
        },
        priority_level: 8,
        applies_to_content_types: ['criteria', 'evidence', 'mps_statement'],
        auto_activation_enabled: false
      },
      {
        rule_name: 'Sector Alignment Validation',
        rule_type: 'auto_validation',
        rule_category: 'sector_alignment',
        threshold_values: {
          sector_match_threshold: 85,
          cross_validation_required: true
        },
        priority_level: 7,
        applies_to_content_types: ['criteria', 'intent'],
        auto_activation_enabled: false
      },
      {
        rule_name: 'Compliance Accuracy Threshold',
        rule_type: 'confidence_threshold',
        rule_category: 'compliance_accuracy',
        threshold_values: {
          min_accuracy: 90,
          require_human_review: true
        },
        priority_level: 9,
        applies_to_content_types: ['criteria', 'evidence'],
        auto_activation_enabled: false
      },
      {
        rule_name: 'Content Suppression Trigger',
        rule_type: 'suppression_trigger',
        rule_category: 'content_quality',
        threshold_values: {
          rejection_frequency: 5,
          confidence_decline_threshold: -20
        },
        priority_level: 6,
        applies_to_content_types: ['criteria', 'mps_statement', 'intent'],
        auto_activation_enabled: false
      }
    ];

    try {
      for (const rule of defaultRules) {
        await createRule(rule);
      }
      return true;
    } catch (error) {
      console.error('Error loading default rules:', error);
      return false;
    }
  };

  // Load rules when organization changes
  useEffect(() => {
    if (organizationId) {
      loadRules();
    }
  }, [organizationId]);

  return {
    rules,
    isLoading,
    createRule,
    updateRule,
    deleteRule,
    toggleRuleEnabled,
    recordRuleTrigger,
    loadRules,
    getRulesByType,
    getRulesByCategory,
    getEnabledRules,
    getAutoActivationReadyRules,
    getRuleStats,
    loadDefaultRules
  };
};