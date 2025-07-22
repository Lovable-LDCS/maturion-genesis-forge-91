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

      // Check for existing MPSs and delete them to avoid duplicates
      const { error: deleteError } = await supabase
        .from('maturity_practice_statements')
        .delete()
        .eq('domain_id', domainDbId)
        .eq('organization_id', currentOrganization.id);

      if (deleteError) console.warn('Warning deleting existing MPSs:', deleteError);

      // Prepare MPS data with validated numbers
      const mpsData = mpsList.map((mps, index) => {
        let mpsNumber = index + 1;
        if (mps.number) {
          const parsed = parseInt(mps.number.toString());
          if (!isNaN(parsed) && parsed > 0) {
            mpsNumber = parsed;
          }
        }
        
        return {
          domain_id: domainDbId,
          organization_id: currentOrganization.id,
          name: mps.name || mps.title || 'Untitled MPS',
          summary: mps.description || '',
          mps_number: mpsNumber,
          status: 'not_started' as const,
          created_by: user.id,
          updated_by: user.id
        };
      });

      const { error: mpsError } = await supabase
        .from('maturity_practice_statements')
        .insert(mpsData);

      if (mpsError) throw mpsError;

      toast({
        title: "MPSs Saved",
        description: `Successfully saved ${mpsList.length} MPSs to the database.`,
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