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
      
      // Step 1: Get my memberships
      const { data: memberships, error: membershipError } = await supabase
        .from('organization_members')
        .select('organization_id, role')
        .eq('user_id', user.id)

      if (membershipError) {
        console.error('Error fetching memberships:', membershipError)
        setOrganizations([])
        return
      }

      if (!memberships || memberships.length === 0) {
        setOrganizations([])
        return
      }

      // Step 2: Get those organizations
      const orgIds = memberships.map(m => m.organization_id)
      const { data: organizations, error } = await supabase
        .from('organizations')
        .select('*')
        .in('id', orgIds)

      if (error) {
        console.error('Error fetching organizations:', error)
        setOrganizations([])
        return
      }

      // Create a map of organization_id to role for easy lookup
      const roleMap = memberships.reduce((acc, membership) => {
        acc[membership.organization_id] = membership.role
        return acc
      }, {} as Record<string, string>)

      const orgsWithRoles: OrganizationWithRole[] = organizations?.map(org => ({
        id: org.id,
        name: org.name,
        description: org.description,
        created_at: org.created_at,
        updated_at: org.updated_at,
        owner_id: org.owner_id,
        user_role: roleMap[org.id] as 'owner' | 'admin' | 'assessor' | 'viewer'
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