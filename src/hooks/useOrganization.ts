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
  slack_webhook_url?: string | null
  email_webhook_url?: string | null
  zapier_webhook_url?: string | null
  primary_website_url?: string | null
  linked_domains?: string[] | null
  industry_tags?: string[] | null
  custom_industry?: string | null
  region_operating?: string | null
  risk_concerns?: string[] | null
  compliance_commitments?: string[] | null
  threat_sensitivity_level?: string | null
}

export const useOrganization = () => {
    const { user } = useAuth()
  const [organizations, setOrganizations] = useState<OrganizationWithRole[]>([])
  const [currentOrganization, setCurrentOrganization] = useState<OrganizationWithRole | null>(null)
  const [loading, setLoading] = useState(true)
  const ACTIVE_ORG_KEY = 'active_org_id'


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

      // Determine if this is a Main Admin (APGI) — temporary heuristic + table check
      const isMainAdminByEmail = Boolean(user.email && user.email.endsWith('@apginc.ca'))
      let isMainAdminByTable = false
      try {
        const { data: adminRow } = await supabase
          .from('backoffice_admins')
          .select('id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle()
        isMainAdminByTable = !!adminRow
      } catch { /* ignore */ }
      const isMainAdmin = isMainAdminByEmail || isMainAdminByTable

      if (isMainAdmin) {
        // Main Admin: see all organizations
        const { data: allOrgs, error: allErr } = await supabase
          .from('organizations')
          .select('*')
          .order('created_at', { ascending: false })
        if (allErr) throw allErr

        const orgsWithRoles: OrganizationWithRole[] = (allOrgs || []).map((org: any) => ({
          id: org.id,
          name: org.name,
          description: org.description,
          created_at: org.created_at,
          updated_at: org.updated_at,
          owner_id: org.owner_id,
          user_role: 'owner', // elevate in UI context for Main Admin
          slack_webhook_url: org.slack_webhook_url,
          email_webhook_url: org.email_webhook_url,
          zapier_webhook_url: org.zapier_webhook_url,
          primary_website_url: org.primary_website_url,
          linked_domains: org.linked_domains,
          industry_tags: org.industry_tags,
          custom_industry: org.custom_industry,
          region_operating: org.region_operating,
          risk_concerns: org.risk_concerns,
          compliance_commitments: org.compliance_commitments,
          threat_sensitivity_level: org.threat_sensitivity_level,
        }))
                setOrganizations(orgsWithRoles)
        // Try restore persisted selection
        const saved = localStorage.getItem(ACTIVE_ORG_KEY)
        const found = orgsWithRoles.find(o => o.id === saved)
        if (found) setCurrentOrganization(found)
        else if (orgsWithRoles.length > 0 && !currentOrganization) setCurrentOrganization(orgsWithRoles[0])
        return
      }

      // Otherwise: list orgs from memberships
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
        user_role: roleMap[org.id] as 'owner' | 'admin' | 'assessor' | 'viewer',
        slack_webhook_url: org.slack_webhook_url,
        email_webhook_url: org.email_webhook_url,
        zapier_webhook_url: org.zapier_webhook_url,
        primary_website_url: org.primary_website_url,
        linked_domains: org.linked_domains,
        industry_tags: org.industry_tags,
        custom_industry: org.custom_industry,
        region_operating: org.region_operating,
        risk_concerns: org.risk_concerns,
        compliance_commitments: org.compliance_commitments,
        threat_sensitivity_level: org.threat_sensitivity_level,
      })) || []

            setOrganizations(orgsWithRoles)
      const saved = localStorage.getItem(ACTIVE_ORG_KEY)
      const found = orgsWithRoles.find(o => o.id === saved)
      if (found) setCurrentOrganization(found)
      else if (orgsWithRoles.length > 0 && !currentOrganization) setCurrentOrganization(orgsWithRoles[0])
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
      try {
        localStorage.setItem(ACTIVE_ORG_KEY, org.id)
        window.dispatchEvent(new CustomEvent('org-switched', { detail: { orgId: org.id } }))
      } catch {}
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