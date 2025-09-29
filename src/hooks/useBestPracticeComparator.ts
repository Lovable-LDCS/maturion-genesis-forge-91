import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/useOrganization';

interface BestPracticeMatch {
  source: 'ISO 31000' | 'ISO 27001' | 'NIST SP 800-53' | 'COBIT' | 'COSO' | 'Custom';
  section: string;
  topic: string;
  phrase: string;
  evidence_examples: string[];
  similarity_score: number;
  rationale: string;
}

interface FallbackContext {
  organizationProfile: any;
  websiteMetadata?: string;
  documentContext: string;
  fallbackTriggered: boolean;
  sourceHierarchy: ('uploaded_documents' | 'organization_profile' | 'website' | 'global_standards')[];
}

export const useBestPracticeComparator = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [fallbackSource, setFallbackSource] = useState<string | null>(null);
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();

  // Compare proposed criterion against best practices
  const compareAgainstBestPractices = async (
    proposedCriterion: string,
    domainContext: string,
    mpsNumber?: number
  ): Promise<{
    matches: BestPracticeMatch[];
    recommendation: string;
    fallbackUsed: boolean;
    sourceType: string;
  }> => {
    if (!currentOrganization?.id) {
      throw new Error('No organization context available');
    }

    setIsAnalyzing(true);
    
    try {
      console.log('🔍 Analyzing criterion against best practices:', proposedCriterion);
      
      // Step 1: Check internal documents first
      let documentContext = await getInternalDocumentContext(proposedCriterion, domainContext);
      let fallbackTriggered = false;
      let sourceType = 'internal_documents';
      
      // Step 2: If no internal match, proceed with fallback hierarchy
      if (!documentContext || documentContext.length < 100) {
        console.log('📋 Insufficient internal context, initiating fallback logic');
        fallbackTriggered = true;
        
        const fallbackContext = await executeFallbackHierarchy(proposedCriterion, domainContext);
        documentContext = fallbackContext.documentContext;
        sourceType = fallbackContext.sourceHierarchy[0] || 'global_standards';
        setFallbackSource(sourceType);
      }

      // Create the prompt with proper escaping
      const fallbackIndicatorText = fallbackTriggered 
        ? 'Best Practice Source Used - This criterion is based on international best practices. Confirm alignment with your organization context.'
        : 'Internal Source Used';

      const analysisPrompt = `BEST PRACTICE COMPARATOR ANALYSIS - ${fallbackTriggered ? 'FALLBACK MODE' : 'INTERNAL MODE'}

Analyze the proposed criterion against international best practices and provide standardized recommendations.

PROPOSED CRITERION: "${proposedCriterion}"
DOMAIN CONTEXT: ${domainContext}
MPS NUMBER: ${mpsNumber || 'Not specified'}
ORGANIZATION: ${currentOrganization.name}

${documentContext ? `AVAILABLE CONTEXT:\n${documentContext}\n\n` : ''}

ANALYSIS REQUIREMENTS:
1. Compare against ISO 31000, ISO 27001, NIST SP 800-53, COBIT frameworks
2. Identify best practice matches with similarity scoring
3. Recommend complete, well-formulated criterion if needed
4. Suggest appropriate evidence types aligned with standards
5. Flag if fallback logic was used: ${fallbackTriggered ? 'YES - Best Practice Source Used' : 'NO - Internal Source Used'}

RESPONSE FORMAT (JSON):
{
  "matches": [
    {
      "source": "ISO 31000|ISO 27001|NIST SP 800-53|COBIT",
      "section": "specific clause/control",
      "topic": "risk management|governance|security",
      "phrase": "standardized phrasing",
      "evidence_examples": ["specific evidence type 1", "specific evidence type 2"],
      "similarity_score": 0.85,
      "rationale": "why this matches and aligns with the organization context"
    }
  ],
  "recommendation": "Complete, standardized criterion following best practices",
  "fallback_indicator": "${fallbackIndicatorText}",
  "confidence_level": "high|medium|low",
  "evidence_alignment": "specific evidence recommendations based on standards"
}`;

      // Step 3: Generate best practice matches using AI analysis
      const { data: aiResponse, error } = await supabase.functions.invoke('maturion-ai-chat', {
        body: {
          prompt: analysisPrompt,
          context: 'Best Practice Comparison',
          currentDomain: domainContext,
          organizationId: currentOrganization.id,
          allowExternalContext: fallbackTriggered,
          knowledgeBaseUsed: !fallbackTriggered
        }
      });

      if (error) throw error;

      let analysisResult;
      try {
        const cleanResponse = aiResponse.content?.replace(/```json\n?|\n?```/g, '').trim();
        analysisResult = JSON.parse(cleanResponse || '{}');
      } catch (parseError) {
        console.warn('Failed to parse best practice analysis, using fallback');
        analysisResult = generateFallbackAnalysis(proposedCriterion, domainContext);
      }

      // Log the comparison for audit trail
      await logBestPracticeComparison(proposedCriterion, analysisResult, fallbackTriggered, sourceType);

      // Display fallback indicator if used
      if (fallbackTriggered) {
        toast({
          title: "Best Practice Source Used",
          description: "This criterion is based on international best practices. Confirm alignment with your organization's context.",
          variant: "default"
        });
      }

      return {
        matches: analysisResult.matches || [],
        recommendation: analysisResult.recommendation || proposedCriterion,
        fallbackUsed: fallbackTriggered,
        sourceType: sourceType
      };

    } catch (error) {
      console.error('Error in best practice comparison:', error);
      throw error;
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Execute the fallback hierarchy: uploaded documents → org profile → website → global standards
  const executeFallbackHierarchy = async (
    criterion: string, 
    domain: string
  ): Promise<FallbackContext> => {
    console.log('🔄 Executing fallback hierarchy for best practice comparison');
    
    let documentContext = '';
    const sourceHierarchy: ('uploaded_documents' | 'organization_profile' | 'website' | 'global_standards')[] = [];
    
    // Level 1: Organization Profile
    const organizationProfile = await getOrganizationProfile();
    if (organizationProfile) {
      documentContext += `ORGANIZATION PROFILE:\n${organizationProfile}\n\n`;
      sourceHierarchy.push('organization_profile');
    }

    // Level 2: Website Metadata (if available)
    if (currentOrganization?.primary_website_url) {
      const websiteMetadata = await getWebsiteMetadata(currentOrganization.primary_website_url);
      if (websiteMetadata) {
        documentContext += `WEBSITE CONTEXT:\n${websiteMetadata}\n\n`;
        sourceHierarchy.push('website');
      }
    }

    // Level 3: Global Standards (always available as final fallback)
    const globalStandards = getGlobalStandardsContext(criterion, domain);
    documentContext += `GLOBAL STANDARDS CONTEXT:\n${globalStandards}\n\n`;
    sourceHierarchy.push('global_standards');

    return {
      organizationProfile,
      documentContext,
      fallbackTriggered: true,
      sourceHierarchy
    };
  };

  // Get internal document context
  const getInternalDocumentContext = async (criterion: string, domain: string): Promise<string> => {
    try {
      const { data: searchResults } = await supabase.functions.invoke('search-ai-context', {
        body: {
          query: criterion,
          organizationId: currentOrganization?.id,
          domain: domain,
          limit: 10,
          threshold: 0.6
        }
      });

      if (searchResults?.results?.length > 0) {
        return searchResults.results
          .map((result: any) => `[${result.document_name}] ${result.content}`)
          .join('\n\n');
      }

      return '';
    } catch (error) {
      console.error('Error getting internal document context:', error);
      return '';
    }
  };

  // Get organization profile for fallback
  const getOrganizationProfile = async (): Promise<string> => {
    if (!currentOrganization) return '';

    const profile = [
      `Organization: ${currentOrganization.name}`,
      currentOrganization.description ? `Description: ${currentOrganization.description}` : '',
      currentOrganization.industry_tags?.length ? `Industry: ${currentOrganization.industry_tags.join(', ')}` : '',
      currentOrganization.region_operating ? `Region: ${currentOrganization.region_operating}` : '',
      currentOrganization.risk_concerns?.length ? `Risk Concerns: ${currentOrganization.risk_concerns.join(', ')}` : '',
      currentOrganization.compliance_commitments?.length ? `Compliance: ${currentOrganization.compliance_commitments.join(', ')}` : ''
    ].filter(Boolean).join('\n');

    return profile;
  };

  // Get website metadata for fallback
  const getWebsiteMetadata = async (websiteUrl: string): Promise<string> => {
    // Placeholder for website metadata extraction
    return `Website: ${websiteUrl}\nNote: Website analysis would extract About Us, Services, and Strategic Goals information`;
  };

  // Get global standards context for fallback
  const getGlobalStandardsContext = (criterion: string, domain: string): string => {
    const standardsContext = `GLOBAL STANDARDS REFERENCE:

ISO 31000 Risk Management:
- Risk identification, assessment, and treatment processes
- Risk monitoring and review procedures
- Risk communication and consultation frameworks

ISO 27001 Information Security:
- Information security management systems
- Security controls implementation
- Continuous improvement processes

NIST SP 800-53 Security Controls:
- Access control mechanisms
- Audit and accountability measures
- System integrity protection

COBIT Governance Framework:
- IT governance structures
- Performance management
- Risk and compliance oversight

Criterion Context: ${criterion}
Domain: ${domain}
Application: These standards provide baseline requirements for organizational governance, risk management, and compliance frameworks.`;

    return standardsContext;
  };

  // Generate fallback analysis when AI parsing fails
  const generateFallbackAnalysis = (criterion: string, domain: string) => {
    return {
      matches: [
        {
          source: 'ISO 31000' as const,
          section: 'General Framework',
          topic: 'Risk Management',
          phrase: 'Systematic risk management approach',
          evidence_examples: ['Risk register', 'Assessment procedures', 'Treatment plans'],
          similarity_score: 0.7,
          rationale: `General alignment with risk management principles for ${currentOrganization?.name || 'the organization'}`
        }
      ],
      recommendation: `Standardized criterion based on international best practices: ${criterion}`,
      fallback_indicator: 'Best Practice Source Used - This criterion is based on international best practices. Confirm alignment with your organization context.',
      confidence_level: 'medium',
      evidence_alignment: 'Standard evidence types recommended based on framework alignment'
    };
  };

  // Log best practice comparison for audit
  const logBestPracticeComparison = async (
    criterion: string,
    analysis: any,
    fallbackUsed: boolean,
    sourceType: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase
        .from('ai_upload_audit')
        .insert({
          organization_id: currentOrganization?.id || '',
          user_id: user?.id || '',
          action: 'best_practice_comparison',
          metadata: {
            original_criterion: criterion,
            fallback_used: fallbackUsed,
            source_type: sourceType,
            matches_found: analysis.matches?.length || 0,
            confidence_level: analysis.confidence_level || 'unknown',
            timestamp: new Date().toISOString()
          }
        });
    } catch (error) {
      console.warn('Failed to log best practice comparison:', error);
    }
  };

  return {
    compareAgainstBestPractices,
    isAnalyzing,
    fallbackSource
  };
};