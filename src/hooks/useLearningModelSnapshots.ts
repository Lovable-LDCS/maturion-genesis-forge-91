import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from './useOrganizationContext';

// Types for learning model snapshots
interface LearningModelSnapshot {
  id: string;
  organization_id: string;
  snapshot_name: string;
  snapshot_type: 'manual' | 'automated' | 'milestone' | 'pre_activation';
  snapshot_reason?: string;
  pattern_count: number;
  active_rules_count: number;
  model_state: Record<string, any>;
  performance_metrics: Record<string, any>;
  created_at: string;
  created_by: string;
  is_baseline: boolean;
  rollback_available: boolean;
}

interface CreateSnapshotParams {
  snapshot_name: string;
  snapshot_type?: 'manual' | 'automated' | 'milestone' | 'pre_activation';
  snapshot_reason?: string;
  is_baseline?: boolean;
  include_patterns?: boolean;
  include_rules?: boolean;
  include_metrics?: boolean;
}

interface RollbackParams {
  snapshotId: string;
  confirm_rollback: boolean;
  rollback_reason: string;
}

export const useLearningModelSnapshots = () => {
  const [snapshots, setSnapshots] = useState<LearningModelSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { currentContext } = useOrganizationContext();
  const organizationId = currentContext?.organization_id;

  // Load snapshots for the organization
  const loadSnapshots = async () => {
    if (!organizationId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('learning_model_snapshots')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSnapshots((data || []) as LearningModelSnapshot[]);
    } catch (error) {
      console.error('Error loading model snapshots:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new model snapshot
  const createSnapshot = async (params: CreateSnapshotParams): Promise<boolean> => {
    if (!organizationId) return false;

    try {
      const currentUser = (await supabase.auth.getUser()).data.user;
      if (!currentUser) return false;

      // Gather current model state
      const modelState: Record<string, any> = {};
      let patternCount = 0;
      let activeRulesCount = 0;
      let performanceMetrics: Record<string, any> = {};

      // Include patterns if requested
      if (params.include_patterns !== false) {
        const { data: patterns } = await supabase
          .from('ai_learning_patterns')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('is_active', true);

        modelState.patterns = patterns || [];
        patternCount = patterns?.length || 0;
      }

      // Include rules if requested
      if (params.include_rules !== false) {
        const { data: rules } = await supabase
          .from('learning_rule_configurations')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('is_enabled', true);

        modelState.rules = rules || [];
        activeRulesCount = rules?.length || 0;
      }

      // Include metrics if requested
      if (params.include_metrics !== false) {
        const { data: metrics } = await supabase
          .from('adaptive_learning_metrics')
          .select('*')
          .eq('organization_id', organizationId)
          .gte('measurement_period_start', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

        performanceMetrics = {
          recent_metrics: metrics || [],
          snapshot_timestamp: new Date().toISOString(),
          total_patterns: patternCount,
          active_rules: activeRulesCount
        };
      }

      // Create the snapshot
      const { error } = await supabase
        .from('learning_model_snapshots')
        .insert({
          organization_id: organizationId,
          snapshot_name: params.snapshot_name,
          snapshot_type: params.snapshot_type || 'manual',
          snapshot_reason: params.snapshot_reason,
          pattern_count: patternCount,
          active_rules_count: activeRulesCount,
          model_state: modelState,
          performance_metrics: performanceMetrics,
          is_baseline: params.is_baseline || false,
          rollback_available: true,
          created_by: currentUser.id
        });

      if (error) throw error;

      await loadSnapshots(); // Reload to get the updated list
      return true;
    } catch (error) {
      console.error('Error creating model snapshot:', error);
      return false;
    }
  };

  // Rollback to a specific snapshot (simulation mode - logs only)
  const rollbackToSnapshot = async (params: RollbackParams): Promise<boolean> => {
    if (!params.confirm_rollback) {
      console.warn('Rollback confirmation required');
      return false;
    }

    try {
      const snapshot = snapshots.find(s => s.id === params.snapshotId);
      if (!snapshot || !snapshot.rollback_available) {
        console.error('Snapshot not found or rollback not available');
        return false;
      }

      // In Phase 5, we only log the rollback intent - no actual changes
      console.log('SIMULATION: Rollback to snapshot:', {
        snapshot_id: params.snapshotId,
        snapshot_name: snapshot.snapshot_name,
        rollback_reason: params.rollback_reason,
        would_restore_patterns: snapshot.pattern_count,
        would_restore_rules: snapshot.active_rules_count,
        timestamp: new Date().toISOString()
      });

      // Log the rollback event in audit trail
      await supabase
        .from('audit_trail')
        .insert({
          organization_id: organizationId!,
          table_name: 'learning_model_snapshots',
          record_id: params.snapshotId,
          action: 'SIMULATION_ROLLBACK',
          change_reason: `Rollback simulation: ${params.rollback_reason}`,
          new_value: JSON.stringify({
            snapshot_name: snapshot.snapshot_name,
            pattern_count: snapshot.pattern_count,
            active_rules_count: snapshot.active_rules_count
          }),
          changed_by: (await supabase.auth.getUser()).data.user?.id || ''
        });

      return true;
    } catch (error) {
      console.error('Error simulating rollback:', error);
      return false;
    }
  };

  // Delete a snapshot
  const deleteSnapshot = async (snapshotId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('learning_model_snapshots')
        .delete()
        .eq('id', snapshotId);

      if (error) throw error;

      await loadSnapshots(); // Reload to get the updated list
      return true;
    } catch (error) {
      console.error('Error deleting snapshot:', error);
      return false;
    }
  };

  // Set snapshot as baseline
  const setAsBaseline = async (snapshotId: string): Promise<boolean> => {
    try {
      // First, remove baseline flag from all other snapshots
      await supabase
        .from('learning_model_snapshots')
        .update({ is_baseline: false })
        .eq('organization_id', organizationId!);

      // Then set the selected snapshot as baseline
      const { error } = await supabase
        .from('learning_model_snapshots')
        .update({ is_baseline: true })
        .eq('id', snapshotId);

      if (error) throw error;

      await loadSnapshots(); // Reload to get the updated list
      return true;
    } catch (error) {
      console.error('Error setting baseline snapshot:', error);
      return false;
    }
  };

  // Compare two snapshots
  const compareSnapshots = (snapshot1Id: string, snapshot2Id: string) => {
    const snap1 = snapshots.find(s => s.id === snapshot1Id);
    const snap2 = snapshots.find(s => s.id === snapshot2Id);

    if (!snap1 || !snap2) return null;

    return {
      snapshot1: {
        name: snap1.snapshot_name,
        created_at: snap1.created_at,
        pattern_count: snap1.pattern_count,
        active_rules_count: snap1.active_rules_count
      },
      snapshot2: {
        name: snap2.snapshot_name,
        created_at: snap2.created_at,
        pattern_count: snap2.pattern_count,
        active_rules_count: snap2.active_rules_count
      },
      differences: {
        pattern_change: snap2.pattern_count - snap1.pattern_count,
        rules_change: snap2.active_rules_count - snap1.active_rules_count,
        time_difference: new Date(snap2.created_at).getTime() - new Date(snap1.created_at).getTime()
      }
    };
  };

  // Get baseline snapshot
  const getBaselineSnapshot = () => {
    return snapshots.find(s => s.is_baseline);
  };

  // Get snapshots by type
  const getSnapshotsByType = (type: 'manual' | 'automated' | 'milestone' | 'pre_activation') => {
    return snapshots.filter(s => s.snapshot_type === type);
  };

  // Get snapshot statistics
  const getSnapshotStats = () => {
    return {
      total: snapshots.length,
      manual: snapshots.filter(s => s.snapshot_type === 'manual').length,
      automated: snapshots.filter(s => s.snapshot_type === 'automated').length,
      milestone: snapshots.filter(s => s.snapshot_type === 'milestone').length,
      preActivation: snapshots.filter(s => s.snapshot_type === 'pre_activation').length,
      rollbackAvailable: snapshots.filter(s => s.rollback_available).length,
      hasBaseline: snapshots.some(s => s.is_baseline),
      totalPatterns: snapshots.reduce((sum, s) => sum + s.pattern_count, 0),
      totalActiveRules: snapshots.reduce((sum, s) => sum + s.active_rules_count, 0)
    };
  };

  // Create initial baseline snapshot
  const createInitialBaseline = async (): Promise<boolean> => {
    return await createSnapshot({
      snapshot_name: 'Initial Baseline',
      snapshot_type: 'milestone',
      snapshot_reason: 'Phase 5 implementation baseline',
      is_baseline: true,
      include_patterns: true,
      include_rules: true,
      include_metrics: true
    });
  };

  // Load snapshots when organization changes
  useEffect(() => {
    if (organizationId) {
      loadSnapshots();
    }
  }, [organizationId]);

  return {
    snapshots,
    isLoading,
    createSnapshot,
    rollbackToSnapshot,
    deleteSnapshot,
    setAsBaseline,
    compareSnapshots,
    loadSnapshots,
    getBaselineSnapshot,
    getSnapshotsByType,
    getSnapshotStats,
    createInitialBaseline
  };
};