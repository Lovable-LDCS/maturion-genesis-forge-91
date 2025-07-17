import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { useWebhooks } from '@/hooks/useWebhooks';

export type Milestone = Tables<'milestones'>;
export type MilestoneTask = Tables<'milestone_tasks'>;
export type MilestoneTestNote = Tables<'milestone_test_notes'>;
export type MilestoneStatusHistory = Tables<'milestone_status_history'>;

export type MilestoneInsert = TablesInsert<'milestones'>;
export type MilestoneTaskInsert = TablesInsert<'milestone_tasks'>;
export type MilestoneTestNoteInsert = TablesInsert<'milestone_test_notes'>;

export type MilestoneUpdate = TablesUpdate<'milestones'>;
export type MilestoneTaskUpdate = TablesUpdate<'milestone_tasks'>;

export interface MilestoneWithTasks extends Milestone {
  milestone_tasks: (MilestoneTask & {
    milestone_test_notes: MilestoneTestNote[];
  })[];
}

export const useMilestones = (organizationId?: string) => {
  const [milestones, setMilestones] = useState<MilestoneWithTasks[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { triggerWebhook } = useWebhooks();

  // Fetch milestones with tasks and test notes
  const fetchMilestones = async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('milestones')
        .select(`
          *,
          milestone_tasks (
            *,
            milestone_test_notes (*)
          )
        `)
        .eq('organization_id', organizationId)
        .order('display_order', { ascending: true });

      if (error) throw error;

      setMilestones(data as MilestoneWithTasks[] || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching milestones:', err);
      setError('Failed to load milestones');
      toast({
        title: 'Error',
        description: 'Failed to load milestones',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Create a new milestone
  const createMilestone = async (milestone: MilestoneInsert) => {
    try {
      const { data, error } = await supabase
        .from('milestones')
        .insert(milestone)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Milestone created successfully',
      });

      fetchMilestones(); // Refresh the list
      return data;
    } catch (err) {
      console.error('Error creating milestone:', err);
      toast({
        title: 'Error',
        description: 'Failed to create milestone',
        variant: 'destructive',
      });
      throw err;
    }
  };

  // Update a milestone
  const updateMilestone = async (id: string, updates: MilestoneUpdate) => {
    try {
      const { data, error } = await supabase
        .from('milestones')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Milestone updated successfully',
      });

      fetchMilestones(); // Refresh the list
      return data;
    } catch (err) {
      console.error('Error updating milestone:', err);
      toast({
        title: 'Error',
        description: 'Failed to update milestone',
        variant: 'destructive',
      });
      throw err;
    }
  };

  // Create a new milestone task
  const createMilestoneTask = async (task: MilestoneTaskInsert) => {
    try {
      const { data, error } = await supabase
        .from('milestone_tasks')
        .insert(task)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Task created successfully',
      });

      fetchMilestones(); // Refresh the list
      return data;
    } catch (err) {
      console.error('Error creating task:', err);
      toast({
        title: 'Error',
        description: 'Failed to create task',
        variant: 'destructive',
      });
      throw err;
    }
  };

  // Update a milestone task
  const updateMilestoneTask = async (id: string, updates: MilestoneTaskUpdate, taskName?: string, milestoneName?: string) => {
    try {
      const { data, error } = await supabase
        .from('milestone_tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Check if task was signed off and trigger webhook
      if (updates.status === 'signed_off' && organizationId) {
        await triggerWebhook(
          organizationId,
          'milestone_signed_off',
          {
            milestone_name: milestoneName || 'Unknown Milestone',
            task_name: taskName || 'Unknown Task',
            signed_off_at: new Date().toISOString(),
            task_id: id
          }
        );
      }

      toast({
        title: 'Success',
        description: 'Task updated successfully',
      });

      fetchMilestones(); // Refresh the list
      return data;
    } catch (err) {
      console.error('Error updating task:', err);
      toast({
        title: 'Error',
        description: 'Failed to update task',
        variant: 'destructive',
      });
      throw err;
    }
  };

  // Add a test note to a task
  const addTestNote = async (note: MilestoneTestNoteInsert) => {
    try {
      const { data, error } = await supabase
        .from('milestone_test_notes')
        .insert(note)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Test note added successfully',
      });

      fetchMilestones(); // Refresh the list
      return data;
    } catch (err) {
      console.error('Error adding test note:', err);
      toast({
        title: 'Error',
        description: 'Failed to add test note',
        variant: 'destructive',
      });
      throw err;
    }
  };

  // Delete a milestone
  const deleteMilestone = async (id: string) => {
    try {
      const { error } = await supabase
        .from('milestones')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Milestone deleted successfully',
      });

      fetchMilestones(); // Refresh the list
    } catch (err) {
      console.error('Error deleting milestone:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete milestone',
        variant: 'destructive',
      });
      throw err;
    }
  };

  // Delete a milestone task
  const deleteMilestoneTask = async (id: string) => {
    try {
      const { error } = await supabase
        .from('milestone_tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Task deleted successfully',
      });

      fetchMilestones(); // Refresh the list
    } catch (err) {
      console.error('Error deleting task:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete task',
        variant: 'destructive',
      });
      throw err;
    }
  };

  useEffect(() => {
    fetchMilestones();
  }, [organizationId]);

  // Set up real-time subscription
  useEffect(() => {
    if (!organizationId) return;

    const channel = supabase
      .channel('milestone-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'milestones',
          filter: `organization_id=eq.${organizationId}`,
        },
        () => {
          fetchMilestones();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'milestone_tasks',
          filter: `organization_id=eq.${organizationId}`,
        },
        () => {
          fetchMilestones();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'milestone_test_notes',
          filter: `organization_id=eq.${organizationId}`,
        },
        () => {
          fetchMilestones();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId]);

  return {
    milestones,
    loading,
    error,
    createMilestone,
    updateMilestone,
    createMilestoneTask,
    updateMilestoneTask,
    addTestNote,
    deleteMilestone,
    deleteMilestoneTask,
    refetch: fetchMilestones,
  };
};