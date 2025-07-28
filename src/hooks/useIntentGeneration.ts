import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './useOrganization';

export const useIntentGeneration = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentOrganization, refetch: refetchOrganization } = useOrganization();

  const generateIntent = async (prompt: string): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      // Force refresh organization data to get latest profile
      await refetchOrganization();
      
      // Wait a moment for the state to update, then fetch fresh org data directly
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Get fresh organization data directly from database
      const { data: freshOrgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', currentOrganization?.id)
        .single();
      
      if (orgError) {
        console.error('Error fetching fresh org data:', orgError);
      }
      
      const orgData = freshOrgData || currentOrganization;
      
      console.log('🤖 Generating intent with full organizational context');
      console.log('Organization ID:', orgData?.id);
      console.log('Organization Profile:', {
        name: orgData?.name,
        industry_tags: orgData?.industry_tags,
        region_operating: orgData?.region_operating,
        primary_website_url: orgData?.primary_website_url,
        custom_industry: orgData?.custom_industry,
        risk_concerns: orgData?.risk_concerns
      });

      // Get uploaded document IDs for this organization - first try current org, then all user orgs
      let docs = null;
      let docsError = null;
      
      // First try the current organization
      const { data: currentOrgDocs, error: currentOrgError } = await supabase
        .from('ai_documents')
        .select('id, title, processing_status, organization_id')
        .eq('organization_id', orgData?.id)
        .eq('processing_status', 'completed');

      if (currentOrgDocs && currentOrgDocs.length > 0) {
        docs = currentOrgDocs;
        console.log('📄 Found documents in current organization:', orgData?.id);
      } else {
        console.log('📄 No documents found in current org, checking all user organizations...');
        
        // Get current user ID from auth
        const { data: { user } } = await supabase.auth.getUser();
        
        // Get all organizations this user has access to
        const { data: userOrgs, error: userOrgsError } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user?.id || '');
          
        if (!userOrgsError && userOrgs && userOrgs.length > 0) {
          const orgIds = userOrgs.map(org => org.organization_id);
          console.log('📄 User has access to organizations:', orgIds);
          
          // Search across all user organizations
          const { data: allUserDocs, error: allUserError } = await supabase
            .from('ai_documents')
            .select('id, title, processing_status, organization_id')
            .in('organization_id', orgIds)
            .eq('processing_status', 'completed');
            
          docs = allUserDocs;
          docsError = allUserError;
          
          if (docs && docs.length > 0) {
            console.log(`📄 Found ${docs.length} documents across user organizations`);
            console.log('📄 Document organizations:', [...new Set(docs.map(d => d.organization_id))]);
          }
        }
      }

      console.log('📄 Final document list:', docs?.map(d => ({ 
        id: d.id, 
        title: d.title, 
        org: d.organization_id 
      })));

      const { data, error: functionError } = await supabase.functions.invoke('maturion-ai-chat', {
        body: {
          prompt,
          context: 'Intent statement generation',
          organizationId: orgData?.id,
          currentDomain: 'Leadership & Governance',
          allowExternalContext: false,
          knowledgeBaseUsed: true,
          sourceDocuments: docs?.map(d => d.id) || [],
          organizationProfile: {
            name: orgData?.name,
            description: orgData?.description,
            industry_tags: orgData?.industry_tags,
            custom_industry: orgData?.custom_industry,
            region_operating: orgData?.region_operating,
            risk_concerns: orgData?.risk_concerns,
            compliance_commitments: orgData?.compliance_commitments,
            primary_website_url: orgData?.primary_website_url,
            linked_domains: orgData?.linked_domains
          }
        }
      });

      if (functionError) {
        console.error('🚨 Edge function error:', functionError);
        throw functionError;
      }

      console.log('📊 AI Response metadata:', {
        sourceType: data.sourceType,
        knowledgeTier: data.knowledgeTier,
        hasDocumentContext: data.hasDocumentContext,
        documentContextLength: data.documentContextLength,
        knowledgeBaseEnforced: data.knowledgeBaseEnforced
      });

      if (data.response) {
        console.log('✅ Intent generation successful');
        console.log('📝 Response preview:', data.response?.substring(0, 200) + '...');
        
        // Log debug information about sources used
        if (data.hasDocumentContext) {
          console.log('✅ Knowledge source used: Profile Upload + Org Setup + Website');
        } else {
          console.log('⚠️ Limited knowledge sources - using external insights');
        }
        
        return data.response || '';
      } else {
        throw new Error(data.error || 'Failed to generate intent');
      }
    } catch (err) {
      console.error('💥 Error generating intent:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate intent';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    generateIntent,
    isLoading,
    error
  };
};