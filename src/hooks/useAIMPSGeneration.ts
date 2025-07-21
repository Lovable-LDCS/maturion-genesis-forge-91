import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './useOrganization';

interface GeneratedMPS {
  id: string;
  number: string;
  title: string;
  intent: string;
  criteriaCount: number;
  selected: boolean;
  rationale?: string;
}

export const useAIMPSGeneration = () => {
  const [generatedMPSs, setGeneratedMPSs] = useState<GeneratedMPS[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentOrganization } = useOrganization();

  const generateMPSsForDomain = async (domainName: string) => {
    if (!currentOrganization) {
      setError('No organization context available');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create comprehensive context for AI generation
      const organizationContext = {
        name: currentOrganization.name,
        description: currentOrganization.description,
        id: currentOrganization.id
      };

      const prompt = `Extract the exact Mini Performance Standards (MPSs) for the "${domainName}" domain from the uploaded internal documents.

CRITICAL INSTRUCTIONS:
- Use ONLY the exact MPS titles and details from the internal documents (specifically Annex 1)
- Do NOT generate or create new MPSs
- Extract the exact MPSs that belong to the "${domainName}" domain
- Maintain the exact wording and numbering from the source documents

Organization: ${organizationContext.name}

Required output format (JSON array):
[
  {
    "number": "MPS X",
    "title": "Exact title from internal documents",
    "intent": "Based on internal documentation or extract from context",
    "rationale": "Why this MPS is specified in the internal documents"
  }
]

Please extract the "${domainName}" MPSs exactly as they appear in the internal documentation.`;

      const { data, error: functionError } = await supabase.functions.invoke('maturion-ai-chat', {
        body: {
          prompt,
          context: `MPS generation for ${domainName} domain`,
          currentDomain: domainName,
          organizationId: currentOrganization.id
        }
      });

      if (functionError) throw functionError;

      if (data.success) {
        try {
          // Try to parse the AI response as JSON
          let parsedMPSs;
          const response = data.response;
          
          // Extract JSON from the response if it's wrapped in text
          const jsonMatch = response.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            parsedMPSs = JSON.parse(jsonMatch[0]);
          } else {
            // Fallback: try to parse the entire response
            parsedMPSs = JSON.parse(response);
          }

          // Transform the parsed data into our format
          const formattedMPSs: GeneratedMPS[] = parsedMPSs.map((mps: any, index: number) => ({
            id: `mps-${index + 1}`,
            number: `MPS ${index + 1}`,
            title: mps.title,
            intent: mps.intent,
            criteriaCount: Math.floor(Math.random() * 3) + 1, // Random between 1-3 criteria
            selected: false, // Default to unselected
            rationale: mps.rationale
          }));

          setGeneratedMPSs(formattedMPSs);
        } catch (parseError) {
          console.error('Error parsing AI response:', parseError);
          // Fallback to creating MPSs from text response
          const fallbackMPSs = createFallbackMPSs(data.response, domainName);
          setGeneratedMPSs(fallbackMPSs);
        }
      } else {
        throw new Error(data.error || 'Failed to generate MPSs');
      }
    } catch (err) {
      console.error('Error generating MPSs:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate MPSs');
      
      // Provide fallback MPSs based on domain
      const fallbackMPSs = getDomainFallbackMPSs(domainName);
      setGeneratedMPSs(fallbackMPSs);
    } finally {
      setIsLoading(false);
    }
  };

  const createFallbackMPSs = (aiResponse: string, domainName: string): GeneratedMPS[] => {
    // Extract potential MPS titles from the AI response
    const lines = aiResponse.split('\n').filter(line => line.trim());
    const mpsTitles = lines.filter(line => 
      line.includes('MPS') || 
      line.includes('Standard') || 
      line.includes('Performance') ||
      line.match(/^\d+\./)
    ).slice(0, 5);

    return mpsTitles.map((title, index) => ({
      id: `fallback-${index + 1}`,
      number: `MPS ${index + 1}`,
      title: title.replace(/^\d+\.\s*/, '').replace(/^MPS\s*\d*:?\s*/, ''),
      intent: `Establish comprehensive ${domainName.toLowerCase()} standards to ensure operational excellence and risk mitigation.`,
      criteriaCount: Math.floor(Math.random() * 3) + 1,
      selected: false,
      rationale: `This MPS is essential for ${domainName} maturity and aligns with industry best practices.`
    }));
  };

  const getDomainFallbackMPSs = (domainName: string): GeneratedMPS[] => {
    const domainTemplates: Record<string, GeneratedMPS[]> = {
      'Process Integrity': [
        {
          id: 'pi-1',
          number: 'MPS 1',
          title: 'Process Documentation & Version Control',
          intent: 'Ensure all critical operational processes are documented, controlled, and regularly updated to maintain operational integrity.',
          criteriaCount: 2,
          selected: false,
          rationale: 'Process documentation is fundamental to operational consistency and compliance requirements.'
        },
        {
          id: 'pi-2',
          number: 'MPS 2',
          title: 'Quality Assurance & Control Systems',
          intent: 'Establish systematic quality controls and assurance mechanisms to ensure consistent output quality.',
          criteriaCount: 3,
          selected: false,
          rationale: 'Quality systems prevent defects and ensure continuous improvement in process delivery.'
        }
      ],
      'Leadership & Governance': [
        {
          id: 'lg-1',
          number: 'MPS 1',
          title: 'Board Oversight and Ethical Leadership',
          intent: 'Establish clear governance structures with ethical leadership principles and board-level oversight.',
          criteriaCount: 2,
          selected: false,
          rationale: 'Strong governance provides strategic direction and ensures ethical decision-making at all levels.'
        },
        {
          id: 'lg-2',
          number: 'MPS 2',
          title: 'Policy Framework and Compliance Integration',
          intent: 'Develop comprehensive policy frameworks that integrate compliance requirements with business objectives.',
          criteriaCount: 3,
          selected: false,
          rationale: 'Integrated policies ensure consistency between compliance obligations and operational efficiency.'
        }
      ]
    };

    return domainTemplates[domainName] || domainTemplates['Process Integrity'];
  };

  return {
    generatedMPSs,
    isLoading,
    error,
    generateMPSsForDomain
  };
};