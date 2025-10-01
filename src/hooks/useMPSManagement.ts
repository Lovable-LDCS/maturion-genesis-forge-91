import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface MPS {
  id: string;
  name?: string;
  title?: string;
  number?: string;
  intent?: string;
  description?: string;
  rationale?: string;
  selected?: boolean;
  accepted?: boolean;
  aiSourceType?: 'internal' | 'external';
  hasDocumentContext?: boolean;
}

export const useMPSManagement = (domainId: string) => {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const { toast } = useToast();

  const getDomainNameFromId = (id: string): string => {
    const nameMap: Record<string, string> = {
      'leadership-governance': 'Leadership & Governance',
      'process-integrity': 'Process Integrity',
      'people-culture': 'People & Culture',
      'protection': 'Protection',
      'proof-it-works': 'Proof it Works'
    };
    return nameMap[id] || id;
  };

  const getDomainOrder = (id: string): number => {
    const orderMap: Record<string, number> = {
      'leadership-governance': 1,
      'process-integrity': 2,
      'people-culture': 3,
      'protection': 4,
      'proof-it-works': 5
    };
    return orderMap[id] || 99;
  };

  const saveMPSsToDatabase = async (mpsList: MPS[]) => {
    if (!currentOrganization?.id || !user?.id) {
      throw new Error('Missing organization or user context');
    }

    try {
      // Ensure domain exists
      const { data: existingDomain } = await supabase
        .from('domains')
        .select('id')
        .eq('organization_id', currentOrganization.id)
        .eq('name', getDomainNameFromId(domainId))
        .maybeSingle();

      let domainDbId = existingDomain?.id;

      if (!domainDbId) {
        const { data: newDomain, error: domainError } = await supabase
          .from('domains')
          .insert({
            name: getDomainNameFromId(domainId),
            organization_id: currentOrganization.id,
            status: 'not_started' as const,
            display_order: getDomainOrder(domainId),
            created_by: user.id,
            updated_by: user.id
          })
          .select('id')
          .single();

        if (domainError) throw domainError;
        domainDbId = newDomain.id;
      }

            // Prepare items for server-side save function (service role, RLS-safe)
      const items = mpsList.map((mps, index) => {
        let mpsNumber = index + 1;
        if (mps.number) {
          const parsed = parseInt(mps.number.toString());
          if (!isNaN(parsed) && parsed > 0) mpsNumber = parsed;
        }
        return {
          number: mpsNumber,
          title: mps.title || mps.name || 'Untitled MPS',
          intent: mps.intent || '',
          summary: mps.rationale || mps.description || ''
        };
      });

      const { data: saveData, error: saveError } = await supabase.functions.invoke('save-mps-list', {
        body: {
          organizationId: currentOrganization.id,
          domainId: domainDbId,
          userId: user.id,
          items,
          upsert: true
        }
      });

      if (saveError || saveData?.success === false) {
        throw saveError || new Error(saveData?.error || 'Failed to save MPSs');
      }

      toast({
        title: "MPSs Saved",
        description: `Successfully saved ${items.length} MPSs to the database.`,
      });

      return true;
    } catch (error) {
      console.error('Error persisting MPSs:', error);
      toast({
        title: "Error Saving MPSs",
        description: "There was an error saving the MPSs to the database.",
        variant: "destructive"
      });
      throw error;
    }
  };

  return {
    saveMPSsToDatabase,
    getDomainNameFromId,
    getDomainOrder
  };
};