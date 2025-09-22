import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface OrganizationHierarchy {
  id: string;
  name: string;
  organization_level: 'backoffice' | 'parent' | 'subsidiary' | 'department';
  parent_organization_id?: string;
  depth: number;
}

export interface OrganizationContext {
  id: string;
  name: string;
  organization_level: 'backoffice' | 'parent' | 'subsidiary' | 'department';
  label: string;
  isAccessible: boolean;
}

export const useOrganizationHierarchy = () => {
  const { user } = useAuth();
  const [availableContexts, setAvailableContexts] = useState<OrganizationContext[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAvailableContexts();
    }
  }, [user]);

  const fetchAvailableContexts = async () => {
    if (!user) {
      setAvailableContexts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get user's organizations and accessible contexts
      const { data: userOrgs, error: userOrgsError } = await supabase
        .from('organization_members')
        .select(`
          organization_id,
          role,
          organizations (
            id,
            name,
            organization_level,
            parent_organization_id
          )
        `)
        .eq('user_id', user.id);

      if (userOrgsError) throw userOrgsError;

      // Check if user is superuser
      const { data: isSuperuser } = await supabase.rpc('is_superuser');

      const contexts: OrganizationContext[] = [];

      // Add Backoffice/Global context for superusers
      if (isSuperuser) {
        contexts.push({
          id: 'global',
          name: 'Backoffice/Global',
          organization_level: 'backoffice',
          label: 'Backoffice/Global (Best Practices)',
          isAccessible: true
        });
      }

      // Add user's organizations
      userOrgs?.forEach(membership => {
        const org = membership.organizations;
        if (org) {
          const level = (org.organization_level as 'backoffice' | 'parent' | 'subsidiary' | 'department') || 'parent';
          contexts.push({
            id: org.id,
            name: org.name,
            organization_level: level,
            label: `${org.name} (${level === 'parent' ? 'Main Organization' : 
              level === 'subsidiary' ? 'Subsidiary' : 
              level === 'department' ? 'Department' : 'Organization'})`,
            isAccessible: true
          });
        }
      });

      // For org owners/admins, add their subsidiaries
      const ownerAdminOrgs = userOrgs?.filter(m => ['owner', 'admin'].includes(m.role));
      if (ownerAdminOrgs && ownerAdminOrgs.length > 0) {
        const orgIds = ownerAdminOrgs.map(m => m.organization_id);
        
        const { data: subsidiaries } = await supabase
          .from('organizations')
          .select('id, name, organization_level, parent_organization_id')
          .in('parent_organization_id', orgIds);

        subsidiaries?.forEach(subsidiary => {
          if (!contexts.find(c => c.id === subsidiary.id)) {
            const level = (subsidiary.organization_level as 'backoffice' | 'parent' | 'subsidiary' | 'department') || 'subsidiary';
            contexts.push({
              id: subsidiary.id,
              name: subsidiary.name,
              organization_level: level,
              label: `${subsidiary.name} (Subsidiary)`,
              isAccessible: true
            });
          }
        });
      }

      setAvailableContexts(contexts);
    } catch (error) {
      console.error('Error fetching organization contexts:', error);
      setAvailableContexts([]);
    } finally {
      setLoading(false);
    }
  };

  const getDefaultContext = async (): Promise<string> => {
    // Check if user is superuser
    const { data: isSuperuser } = await supabase.rpc('is_superuser');
    if (isSuperuser) {
      return 'global'; // Default to Backoffice/Global for superusers
    }

    // Default to first available organization
    return availableContexts.find(c => c.id !== 'global')?.id || '';
  };

  const createSubsidiary = async (
    parentOrgId: string, 
    subsidiaryData: {
      name: string;
      description?: string;
      inviteEmail?: string;
    }
  ) => {
    try {
      const { data: subsidiary, error } = await supabase
        .from('organizations')
        .insert({
          name: subsidiaryData.name,
          description: subsidiaryData.description,
          organization_level: 'subsidiary',
          parent_organization_id: parentOrgId,
          owner_id: user?.id, // Temporarily set to current user
          organization_type: 'subsidiary'
        })
        .select()
        .single();

      if (error) throw error;

      // If invitation email provided, send invitation
      if (subsidiaryData.inviteEmail && subsidiary) {
        await supabase.functions.invoke('send-invitation', {
          body: {
            organizationId: subsidiary.id,
            email: subsidiaryData.inviteEmail,
            role: 'owner' // Subsidiary owner
          }
        });
      }

      // Refresh contexts
      await fetchAvailableContexts();

      return subsidiary;
    } catch (error) {
      console.error('Error creating subsidiary:', error);
      throw error;
    }
  };

  return {
    availableContexts,
    loading,
    getDefaultContext,
    createSubsidiary,
    refetch: fetchAvailableContexts
  };
};