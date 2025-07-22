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

      // Get uploaded document IDs for this organization
      const { data: docs, error: docsError } = await supabase
        .from('ai_documents')
        .select('id, title, processing_status')
        .eq('organization_id', orgData?.id)
        .eq('processing_status', 'completed');

      console.log('📄 Found uploaded documents:', docs?.map(d => ({ id: d.id, title: d.title })));

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

      if (data.success) {
        console.log('✅ Intent generation successful');
        console.log('📝 Response preview:', data.content?.substring(0, 200) + '...');
        
        // Log debug information about sources used
        if (data.hasDocumentContext) {
          console.log('✅ Knowledge source used: Profile Upload + Org Setup + Website');
        } else {
          console.log('⚠️ Limited knowledge sources - using external insights');
        }
        
        return data.content || '';
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