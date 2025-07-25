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
      console.log('🔍 useDeferredCriteria: Adding deferred criterion:', {
        targetDomain: deferral.targetDomain,
        targetMPS: deferral.targetMPS,
        organizationId: deferral.organizationId,
        deferredBy: deferral.deferredBy
      });

      // Validate required fields to prevent UUID errors
      if (!deferral.criteriaId || !deferral.organizationId || !deferral.deferredBy) {
        console.error('❌ Missing required fields for deferred criterion:', deferral);
        toast({
          title: "Error",
          description: "Missing required information to defer criterion",
          variant: "destructive"
        });
        return false;
      }

      const { data, error } = await supabase
        .from('criteria_deferrals')
        .insert({
          proposed_criteria_id: deferral.criteriaId,
          organization_id: deferral.organizationId,
          user_id: deferral.deferredBy,
          suggested_domain: deferral.targetDomain,
          suggested_mps_number: parseInt(deferral.targetMPS) || 1,
          suggested_mps_title: `MPS ${deferral.targetMPS}`,
          reason: deferral.deferralReason,
          original_mps_id: deferral.sourceMPS || null
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error adding deferred criterion:', error);
        toast({
          title: "Error",
          description: "Failed to track deferred criterion",
          variant: "destructive"
        });
        return false;
      }

      console.log('✅ Deferred criterion tracked successfully:', data);
      await loadDeferredCriteria(); // Refresh the queue
      
      toast({
        title: "✅ Criterion Deferred",
        description: `Will remind you when you reach ${deferral.targetDomain} - MPS ${deferral.targetMPS}`,
      });

      return true;
    } catch (error) {
      console.error('❌ Exception in addDeferredCriterion:', error);
      return false;
    }
  };

  // Get reminders for a specific MPS
  const getRemindersForMPS = (targetDomain: string, targetMPS: string): DeferredCriteriaReminder | null => {
    try {
      console.log('🔍 useDeferredCriteria: getRemindersForMPS called');
      console.log('  📥 Input - targetDomain:', `"${targetDomain}"`);
      console.log('  📥 Input - targetMPS:', `"${targetMPS}"`);
      console.log('  📋 Queue length:', deferredQueue.length);
      
      // Safety checks for inputs
      if (!targetDomain || !targetMPS) {
        console.warn('⚠️ useDeferredCriteria: Invalid inputs - targetDomain or targetMPS is empty');
        return null;
      }
      
      // Safety check for deferredQueue
      if (!Array.isArray(deferredQueue)) {
        console.warn('⚠️ useDeferredCriteria: deferredQueue is not an array:', deferredQueue);
        return null;
      }
      
      // Normalize domain names for comparison (comprehensive normalization)
      const normalizeTarget = String(targetDomain || '')
        .toLowerCase()
        .trim()
        .replace(/[^\w\s]/g, '') // Remove special characters
        .replace(/\s+/g, ''); // Remove all whitespace
      
      console.log('  🔧 Normalized target domain:', `"${normalizeTarget}"`);
      
      const relevantDeferrals = deferredQueue.filter(def => {
        // Safety check for each deferral item
        if (!def || typeof def !== 'object') {
          console.warn('⚠️ Invalid deferral item:', def);
          return false;
        }
        
        const defTargetDomain = String(def.targetDomain || '');
        const defTargetMPS = String(def.targetMPS || '');
        const defStatus = String(def.status || '');
        
        // Normalize the deferral domain the same way
        const normalizedDefDomain = defTargetDomain
          .toLowerCase()
          .trim()
          .replace(/[^\w\s]/g, '')
          .replace(/\s+/g, '');
        
        const domainMatch = normalizedDefDomain === normalizeTarget;
        const mpsMatch = defTargetMPS === String(targetMPS);
        const statusMatch = defStatus === 'pending';
        
        console.log('  🔍 Checking deferral:', {
          deferralId: def.id || 'NO_ID',
          originalTargetDomain: `"${defTargetDomain}"`,
          normalizedDefDomain: `"${normalizedDefDomain}"`,
          normalizeTarget: `"${normalizeTarget}"`,
          domainMatch,
          defTargetMPS: `"${defTargetMPS}"`,
          inputTargetMPS: `"${String(targetMPS)}"`,
          mpsMatch,
          status: `"${defStatus}"`,
          statusMatch,
          overallMatch: domainMatch && mpsMatch && statusMatch
        });
        
        return domainMatch && mpsMatch && statusMatch;
      });

      console.log('🔔 useDeferredCriteria: Found relevant deferrals:', relevantDeferrals.length);
      
      if (relevantDeferrals.length > 0) {
        console.log('✅ Returning reminder with deferrals:', relevantDeferrals.map(d => ({
          id: d.id,
          statement: d.originalStatement.substring(0, 50) + '...'
        })));
      }

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

      // If approving, create new criterion in suggested MPS and remove from original
      if (action === 'approve') {
        const deferral = deferredQueue.find(d => d.id === deferralId);
        console.log('🔍 Processing approval for deferral:', deferral);
        
        if (deferral) {
          // First, fetch the original criterion content
          console.log(`🔍 Fetching original criterion content for ID: ${deferral.criteriaId}`);
          const { data: originalCriterion, error: criterionError } = await supabase
            .from('criteria')
            .select('statement, summary')
            .eq('id', deferral.criteriaId)
            .single();

          console.log('🔍 Original criterion query result:', { originalCriterion, criterionError });

          if (!originalCriterion || criterionError) {
            console.error('❌ Could not fetch original criterion:', criterionError);
            return { success: false };
          }

          // Now find the target domain
          console.log(`🎯 Looking for target domain: "${deferral.targetDomain}"`);
          const { data: targetDomainData, error: domainError } = await supabase
            .from('domains')
            .select('id, name')
            .eq('organization_id', organizationId)
            .eq('name', deferral.targetDomain)
            .single();

          console.log('🔍 Domain query result:', { targetDomainData, domainError });

          if (targetDomainData && !domainError) {
            // Find the suggested MPS ID
            console.log(`🎯 Looking for MPS ${deferral.targetMPS} in domain ${targetDomainData.id}`);
            const { data: suggestedMPS, error: mpsError } = await supabase
              .from('maturity_practice_statements')
              .select('id, mps_number, name')
              .eq('organization_id', organizationId)
              .eq('mps_number', parseInt(deferral.targetMPS))
              .eq('domain_id', targetDomainData.id)
              .single();

            console.log('🔍 MPS query result:', { suggestedMPS, mpsError });

            if (suggestedMPS && !mpsError) {
              console.log(`✅ Found target MPS: ${suggestedMPS.name} (ID: ${suggestedMPS.id})`);

              // Create new criterion in suggested MPS using original content
              const { data: newCriterion, error: insertError } = await supabase
                .from('criteria')
                .insert({
                  mps_id: suggestedMPS.id,
                  organization_id: organizationId,
                  statement: updatedContent?.statement || originalCriterion.statement,
                  summary: updatedContent?.summary || originalCriterion.summary,
                  status: 'not_started',
                  created_by: deferral.deferredBy,
                  updated_by: deferral.deferredBy,
                  criteria_number: '0.0' // Will be auto-generated by trigger
                })
                .select()
                .single();

              console.log('📋 Inserting criterion with data:', {
                mps_id: suggestedMPS.id,
                statement: updatedContent?.statement || originalCriterion.statement,
                summary: updatedContent?.summary || originalCriterion.summary
              });

              if (insertError) {
                console.error('❌ Error creating criterion in suggested MPS:', insertError);
                return { success: false };
              }

              console.log('✅ Created new criterion in target MPS:', newCriterion);

              // Remove original criterion
              console.log(`🗑️ Removing original criterion with ID: ${deferral.criteriaId}`);
              const { error: deleteError } = await supabase
                .from('criteria')
                .delete()
                .eq('id', deferral.criteriaId);

              if (deleteError) {
                console.error('❌ Error removing original criterion:', deleteError);
                return { success: false };
              } else {
                console.log('✅ Successfully removed original criterion');
              }

              console.log(`✅ Successfully moved criterion from original location to ${deferral.targetDomain} MPS ${deferral.targetMPS}`);
            } else {
              console.error('❌ Could not find suggested MPS:', mpsError);
              return { success: false };
            }
          } else {
            console.error('❌ Could not find target domain:', domainError);
            return { success: false };
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