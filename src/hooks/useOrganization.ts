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
    // TODO: Implement once database tables are created
    setOrganizations([])
    setLoading(false)
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