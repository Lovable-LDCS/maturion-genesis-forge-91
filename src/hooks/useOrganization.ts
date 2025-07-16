import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Tables } from '@/integrations/supabase/types'
import { useAuth } from '@/contexts/AuthContext'

interface OrganizationWithRole {
  id: string
  name: string
  description?: string
  created_at: string
  updated_at: string
  owner_id: string
  user_role: 'owner' | 'admin' | 'assessor' | 'viewer'
}

export const useOrganization = () => {
  const { user } = useAuth()
  const [organizations, setOrganizations] = useState<OrganizationWithRole[]>([])
  const [currentOrganization, setCurrentOrganization] = useState<OrganizationWithRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchUserOrganizations()
    }
  }, [user])

  const fetchUserOrganizations = async () => {
    if (!user) {
      setOrganizations([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      
      // Query organizations where user is a member
      const { data: memberships, error } = await supabase
        .from('organization_members')
        .select(`
          role,
          organization_id,
          organizations!inner (
            id,
            name,
            description,
            created_at,
            updated_at,
            owner_id
          )
        `)
        .eq('user_id', user.id)

      if (error) {
        console.error('Error fetching organizations:', error)
        setOrganizations([])
        return
      }

      const orgsWithRoles: OrganizationWithRole[] = memberships?.map(membership => ({
        id: membership.organizations.id,
        name: membership.organizations.name,
        description: membership.organizations.description,
        created_at: membership.organizations.created_at,
        updated_at: membership.organizations.updated_at,
        owner_id: membership.organizations.owner_id,
        user_role: membership.role as 'owner' | 'admin' | 'assessor' | 'viewer'
      })) || []

      setOrganizations(orgsWithRoles)
      
      // Auto-select first organization if none selected
      if (orgsWithRoles.length > 0 && !currentOrganization) {
        setCurrentOrganization(orgsWithRoles[0])
      }
    } catch (error) {
      console.error('Error in fetchUserOrganizations:', error)
      setOrganizations([])
    } finally {
      setLoading(false)
    }
  }

  const switchOrganization = (orgId: string) => {
    const org = organizations.find(o => o.id === orgId)
    if (org) {
      setCurrentOrganization(org)
    }
  }

  const hasPermission = (permission: 'read' | 'write' | 'admin' | 'owner') => {
    if (!currentOrganization) return false
    
    const roleHierarchy = {
      viewer: ['read'],
      assessor: ['read', 'write'],
      admin: ['read', 'write', 'admin'],
      owner: ['read', 'write', 'admin', 'owner']
    }
    
    return roleHierarchy[currentOrganization.user_role]?.includes(permission) || false
  }

  return {
    organizations,
    currentOrganization,
    loading,
    switchOrganization,
    hasPermission,
    refetch: fetchUserOrganizations,
  }
}