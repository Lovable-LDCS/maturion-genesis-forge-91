import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DeferredCriterion {
  id: string;
  criteriaId: string;
  originalStatement: string;
  originalSummary: string;
  sourceDomain: string;
  sourceMPS: string;
  targetDomain: string;
  targetMPS: string;
  deferralReason: string;
  deferralType: 'correct_domain' | 'review';
  status: 'pending' | 'reviewed' | 'approved' | 'discarded';
  organizationId: string;
  createdAt: string;
  deferredBy: string;
}

interface DeferredCriteriaReminder {
  targetDomain: string;
  targetMPS: string;
  deferrals: DeferredCriterion[];
  reminderCount: number;
}

export const useDeferredCriteria = (organizationId: string) => {
  const { toast } = useToast();
  const [deferredQueue, setDeferredQueue] = useState<DeferredCriterion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load deferred criteria from database
  const loadDeferredCriteria = async () => {
    if (!organizationId) return;

    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('criteria_deferrals')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('approved', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading deferred criteria:', error);
        setDeferredQueue([]);
        return;
      }

      if (data && Array.isArray(data)) {
        
        const formattedData: DeferredCriterion[] = data
          .filter(item => {
            // Safety check: ensure item exists and has required fields
            if (!item || typeof item !== 'object') return false;
            if (!item.id || !item.proposed_criteria_id || !item.organization_id) return false;
            return true;
          })
          .map(item => {
            const formattedItem = {
              id: String(item.id || ''),
              criteriaId: String(item.proposed_criteria_id || ''),
              originalStatement: '', // Will be populated from criteria table
              originalSummary: '',
              sourceDomain: '', // Will be derived from original MPS
              sourceMPS: String(item.original_mps_id || ''),
              targetDomain: String(item.suggested_domain || ''),
              targetMPS: item.suggested_mps_number ? String(item.suggested_mps_number) : '',
              deferralReason: String(item.reason || 'Better domain alignment'),
              deferralType: 'correct_domain' as const,
              status: 'pending' as const,
              organizationId: String(item.organization_id || ''),
              createdAt: String(item.created_at || new Date().toISOString()),
              deferredBy: String(item.user_id || '')
            };
            return formattedItem;
          });

        setDeferredQueue(formattedData);
      } else {
        setDeferredQueue([]);
      }
    } catch (error) {
      console.error('Error in loadDeferredCriteria:', error);
      setDeferredQueue([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Add criterion to deferred queue
  const addDeferredCriterion = async (deferral: Omit<DeferredCriterion, 'id' | 'createdAt' | 'status'>) => {
    try {
      const { data, error } = await supabase
        .from('criteria_deferrals')
        .insert({
          proposed_criteria_id: deferral.criteriaId,
          organization_id: deferral.organizationId,
          user_id: deferral.deferredBy,
          suggested_domain: deferral.targetDomain,
          suggested_mps_number: parseInt(deferral.targetMPS),
          suggested_mps_title: `MPS ${deferral.targetMPS}`,
          reason: deferral.deferralReason,
          original_mps_id: deferral.sourceMPS
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding deferred criterion:', error);
        toast({
          title: "Error",
          description: "Failed to track deferred criterion",
          variant: "destructive"
        });
        return false;
      }

      console.log('✅ Deferred criterion tracked:', data);
      await loadDeferredCriteria(); // Refresh the queue
      
      toast({
        title: "✅ Criterion Deferred",
        description: `Will remind you when you reach ${deferral.targetDomain} - MPS ${deferral.targetMPS}`,
      });

      return true;
    } catch (error) {
      console.error('Error in addDeferredCriterion:', error);
      return false;
    }
  };

  // Get reminders for a specific MPS
  const getRemindersForMPS = (targetDomain: string, targetMPS: string): DeferredCriteriaReminder | null => {
    try {
      console.log('🔍 useDeferredCriteria: getRemindersForMPS called with:', { targetDomain, targetMPS });
      
      // Safety checks for inputs
      if (!targetDomain || !targetMPS) {
        console.warn('⚠️ useDeferredCriteria: Invalid inputs to getRemindersForMPS:', { targetDomain, targetMPS });
        return null;
      }
      
      // Safety check for deferredQueue
      if (!Array.isArray(deferredQueue)) {
        console.warn('⚠️ useDeferredCriteria: deferredQueue is not an array:', deferredQueue);
        return null;
      }
      
      console.log('🔍 useDeferredCriteria: Available deferrals:', deferredQueue.map(d => ({ 
        id: d?.id || 'NO_ID', 
        targetDomain: d?.targetDomain || 'NO_DOMAIN', 
        targetMPS: d?.targetMPS || 'NO_MPS', 
        status: d?.status || 'NO_STATUS'
      })));
      
      // Normalize domain names for comparison (handle different formats)
      const normalizeTarget = String(targetDomain || '').toLowerCase().replace(/[^\w]/g, '');
      
      const relevantDeferrals = deferredQueue.filter(def => {
        // Safety check for each deferral item
        if (!def || typeof def !== 'object') {
          console.warn('⚠️ useDeferredCriteria: Invalid deferral item:', def);
          return false;
        }
        
        const defTargetDomain = String(def.targetDomain || '');
        const defTargetMPS = String(def.targetMPS || '');
        const defStatus = String(def.status || '');
        
        const normalizedDefDomain = defTargetDomain.toLowerCase().replace(/[^\w]/g, '');
        const domainMatch = normalizedDefDomain === normalizeTarget;
        const mpsMatch = defTargetMPS === String(targetMPS);
        const statusMatch = defStatus === 'pending';
        
        console.log('🔍 useDeferredCriteria: Checking deferral:', {
          deferralId: def.id || 'NO_ID',
          targetDomain: defTargetDomain,
          normalizedDefDomain,
          normalizeTarget,
          domainMatch,
          targetMPS: defTargetMPS,
          inputTargetMPS: String(targetMPS),
          mpsMatch,
          status: defStatus,
          statusMatch,
          overallMatch: domainMatch && mpsMatch && statusMatch
        });
        
        return domainMatch && mpsMatch && statusMatch;
      });

      console.log('🔔 useDeferredCriteria: Found relevant deferrals:', relevantDeferrals.length);

      if (!relevantDeferrals || relevantDeferrals.length === 0) {
        return null;
      }

      return {
        targetDomain: String(targetDomain),
        targetMPS: String(targetMPS),
        deferrals: relevantDeferrals,
        reminderCount: relevantDeferrals.length
      };
    } catch (error) {
      console.error('❌ useDeferredCriteria: Exception in getRemindersForMPS:', error);
      return null;
    }
  };

  // Handle deferred criterion action
  const handleDeferredAction = async (
    deferralId: string, 
    action: 'approve' | 'edit' | 'discard',
    updatedContent?: { statement?: string; summary?: string }
  ) => {
    try {
      let newStatus: 'approved' | 'discarded' = action === 'approve' ? 'approved' : 'discarded';
      
      if (action === 'edit') {
        // Handle edit case - this would trigger the edit modal
        return { success: true, requiresEdit: true };
      }

      // Update the deferral status
      const { error } = await supabase
        .from('criteria_deferrals')
        .update({ 
          approved: action === 'approve'
        })
        .eq('id', deferralId);

      if (error) {
        console.error('Error updating deferred criterion:', error);
        return { success: false };
      }

      // If approving, update the actual criterion
      if (action === 'approve') {
        const deferral = deferredQueue.find(d => d.id === deferralId);
        if (deferral) {
          const { error: criteriaError } = await supabase
            .from('criteria')
            .update({
              deferral_status: null,
              status: 'not_started',
              ...(updatedContent && {
                statement: updatedContent.statement,
                summary: updatedContent.summary
              })
            })
            .eq('id', deferral.criteriaId);

          if (criteriaError) {
            console.error('Error updating criterion:', criteriaError);
          }
        }
      }

      // Refresh the queue
      await loadDeferredCriteria();
      
      toast({
        title: action === 'approve' ? "✅ Criterion Approved" : "🗑️ Criterion Discarded",
        description: `Deferred criterion has been ${action === 'approve' ? 'approved and added' : 'removed from queue'}`,
      });

      return { success: true };
    } catch (error) {
      console.error('Error in handleDeferredAction:', error);
      return { success: false };
    }
  };

  // Load data on mount and when organizationId changes
  useEffect(() => {
    loadDeferredCriteria();
  }, [organizationId]);

  return {
    deferredQueue,
    isLoading,
    addDeferredCriterion,
    getRemindersForMPS,
    handleDeferredAction,
    refreshQueue: loadDeferredCriteria
  };
};