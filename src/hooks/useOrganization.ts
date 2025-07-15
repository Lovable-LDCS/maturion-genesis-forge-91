import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Tables } from '@/lib/database.types'
import { useAuth } from '@/contexts/AuthContext'

interface OrganizationWithRole extends Tables<'organizations'> {
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
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('user_organization_roles')
        .select(`
          role,
          organizations (
            id,
            name,
            description,
            created_at,
            updated_at,
            owner_id
          )
        `)
        .eq('user_id', user.id)

      if (error) throw error

      const organizationsWithRoles = data?.map(item => ({
        ...item.organizations,
        user_role: item.role
      })) as OrganizationWithRole[]

      setOrganizations(organizationsWithRoles || [])
      
      // Set current organization to the first one if none is set
      if (!currentOrganization && organizationsWithRoles.length > 0) {
        setCurrentOrganization(organizationsWithRoles[0])
      }
    } catch (error) {
      console.error('Error fetching organizations:', error)
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