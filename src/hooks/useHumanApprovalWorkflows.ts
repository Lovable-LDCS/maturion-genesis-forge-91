import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from './useOrganizationContext';
import { useToast } from './use-toast';

export interface HumanApprovalWorkflow {
  id: string;
  organization_id: string;
  entity_type: string;
  entity_id: string;
  workflow_status: string;
  primary_reviewer_id?: string | null;
  secondary_reviewer_id?: string | null;
  superuser_override_by?: string | null;
  primary_review_decision?: string | null;
  secondary_review_decision?: string | null;
  primary_review_comments?: string | null;
  secondary_review_comments?: string | null;
  superuser_override_reason?: string | null;
  requires_dual_signoff: boolean;
  escalation_reason?: string | null;
  final_approved_content?: string | null;
  rejected_reason?: string | null;
  metadata?: any;
  created_at: string;
  updated_at: string;
  primary_reviewed_at?: string | null;
  secondary_reviewed_at?: string | null;
  final_decision_at?: string | null;
  created_by: string;
  updated_by: string;
}

export interface CreateWorkflowParams {
  entityType: 'criteria' | 'evidence' | 'intent' | 'mps';
  entityId: string;
  requiresDualSignoff: boolean;
  primaryReviewerId?: string;
  secondaryReviewerId?: string;
}

export interface ReviewDecisionParams {
  workflowId: string;
  decision: 'approved' | 'rejected' | 'escalated';
  comments?: string;
  finalApprovedContent?: string;
  rejectedReason?: string;
  escalationReason?: string;
}

export interface SuperuserOverrideParams {
  workflowId: string;
  overrideReason: string;
  finalApprovedContent?: string;
}

export const useHumanApprovalWorkflows = () => {
  const [workflows, setWorkflows] = useState<HumanApprovalWorkflow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { currentContext } = useOrganizationContext();
  const { toast } = useToast();
  
  const organizationId = currentContext?.organization_id;

  const loadWorkflows = async () => {
    if (!organizationId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('human_approval_workflows')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWorkflows(data || []);
    } catch (error) {
      console.error('Error loading approval workflows:', error);
      toast({
        title: "Error",
        description: "Failed to load approval workflows",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createWorkflow = async (params: CreateWorkflowParams): Promise<string | null> => {
    if (!organizationId) return null;

    setIsLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('human_approval_workflows')
        .insert({
          organization_id: organizationId,
          entity_type: params.entityType,
          entity_id: params.entityId,
          requires_dual_signoff: params.requiresDualSignoff,
          primary_reviewer_id: params.primaryReviewerId,
          secondary_reviewer_id: params.secondaryReviewerId,
          created_by: user.user.id,
          updated_by: user.user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Workflow Created",
        description: "Approval workflow has been initiated",
      });

      await loadWorkflows();
      return data.id;
    } catch (error) {
      console.error('Error creating workflow:', error);
      toast({
        title: "Error",
        description: "Failed to create approval workflow",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const submitPrimaryReview = async (params: ReviewDecisionParams): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const workflow = workflows.find(w => w.id === params.workflowId);
      if (!workflow) throw new Error('Workflow not found');

      const nextStatus = workflow.requires_dual_signoff && params.decision === 'approved'
        ? 'pending_secondary_review'
        : params.decision === 'escalated'
        ? 'escalated'
        : params.decision;

      const { error } = await supabase
        .from('human_approval_workflows')
        .update({
          workflow_status: nextStatus,
          primary_reviewer_id: user.user.id,
          primary_review_decision: params.decision,
          primary_review_comments: params.comments,
          primary_reviewed_at: new Date().toISOString(),
          escalation_reason: params.escalationReason,
          final_approved_content: params.decision === 'approved' && !workflow.requires_dual_signoff 
            ? params.finalApprovedContent 
            : undefined,
          rejected_reason: params.decision === 'rejected' ? params.rejectedReason : undefined,
          final_decision_at: params.decision !== 'approved' || !workflow.requires_dual_signoff 
            ? new Date().toISOString() 
            : undefined,
          updated_by: user.user.id,
        })
        .eq('id', params.workflowId);

      if (error) throw error;

      toast({
        title: "Review Submitted",
        description: "Primary review decision has been recorded",
      });

      await loadWorkflows();
      return true;
    } catch (error) {
      console.error('Error submitting primary review:', error);
      toast({
        title: "Error",
        description: "Failed to submit primary review",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const submitSecondaryReview = async (params: ReviewDecisionParams): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('human_approval_workflows')
        .update({
          workflow_status: params.decision === 'escalated' ? 'escalated' : params.decision,
          secondary_reviewer_id: user.user.id,
          secondary_review_decision: params.decision,
          secondary_review_comments: params.comments,
          secondary_reviewed_at: new Date().toISOString(),
          escalation_reason: params.escalationReason,
          final_approved_content: params.decision === 'approved' ? params.finalApprovedContent : undefined,
          rejected_reason: params.decision === 'rejected' ? params.rejectedReason : undefined,
          final_decision_at: new Date().toISOString(),
          updated_by: user.user.id,
        })
        .eq('id', params.workflowId);

      if (error) throw error;

      toast({
        title: "Secondary Review Submitted",
        description: "Final review decision has been recorded",
      });

      await loadWorkflows();
      return true;
    } catch (error) {
      console.error('Error submitting secondary review:', error);
      toast({
        title: "Error",
        description: "Failed to submit secondary review",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const applySuperuserOverride = async (params: SuperuserOverrideParams): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('human_approval_workflows')
        .update({
          workflow_status: 'superuser_override',
          superuser_override_by: user.user.id,
          superuser_override_reason: params.overrideReason,
          final_approved_content: params.finalApprovedContent,
          final_decision_at: new Date().toISOString(),
          updated_by: user.user.id,
        })
        .eq('id', params.workflowId);

      if (error) throw error;

      toast({
        title: "Superuser Override Applied",
        description: "Administrative override has been applied to the workflow",
      });

      await loadWorkflows();
      return true;
    } catch (error) {
      console.error('Error applying superuser override:', error);
      toast({
        title: "Error",
        description: "Failed to apply superuser override",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const getWorkflowStats = () => {
    const total = workflows.length;
    const pending = workflows.filter(w => 
      w.workflow_status === 'pending_primary_review' || 
      w.workflow_status === 'pending_secondary_review'
    ).length;
    const approved = workflows.filter(w => w.workflow_status === 'approved').length;
    const rejected = workflows.filter(w => w.workflow_status === 'rejected').length;
    const escalated = workflows.filter(w => w.workflow_status === 'escalated').length;

    return {
      total,
      pending,
      approved,
      rejected,
      escalated,
    };
  };

  const getWorkflowsForReviewer = (reviewerId: string) => {
    return workflows.filter(w => 
      w.primary_reviewer_id === reviewerId || 
      w.secondary_reviewer_id === reviewerId
    );
  };

  useEffect(() => {
    if (organizationId) {
      loadWorkflows();
    }
  }, [organizationId]);

  return {
    workflows,
    isLoading,
    createWorkflow,
    submitPrimaryReview,
    submitSecondaryReview,
    applySuperuserOverride,
    getWorkflowStats,
    getWorkflowsForReviewer,
    loadWorkflows,
  };
};