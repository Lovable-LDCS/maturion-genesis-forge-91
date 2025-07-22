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
  knowledgeBaseUsed?: boolean;
  sourceDocument?: string;
}

export const useAIMPSGeneration = () => {
  const [generatedMPSs, setGeneratedMPSs] = useState<GeneratedMPS[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentOrganization } = useOrganization();

  // Domain to MPS number mapping
  const getDomainMPSRange = (domain: string): { min: number; max: number } => {
    const ranges: Record<string, { min: number; max: number }> = {
      'Leadership & Governance': { min: 1, max: 5 },
      'Process Integrity': { min: 6, max: 10 },
      'People & Culture': { min: 11, max: 14 },
      'Protection': { min: 15, max: 20 },
      'Proof it Works': { min: 21, max: 25 }
    };
    
    return ranges[domain] || { min: 1, max: 25 };
  };

  const generateMPSsForDomain = async (domainName: string) => {
    if (!currentOrganization) {
      setError('No organization context available');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // STEP 0: Debug - Check what documents exist in the knowledge base
      console.log(`Checking knowledge base status for organization ${currentOrganization.id}...`);
      const { data: allDocs, error: docsError } = await supabase
        .from('ai_documents')
        .select('id, title, file_name, document_type, processing_status')
        .eq('organization_id', currentOrganization.id);
      
      if (docsError) {
        console.error('Error checking documents:', docsError);
      } else {
        console.log(`Found ${allDocs?.length || 0} total documents in knowledge base:`, allDocs);
        const completedDocs = allDocs?.filter(doc => doc.processing_status === 'completed') || [];
        console.log(`${completedDocs.length} documents are completed and ready for search`);
      }
      
      // STEP 1: Get domain-specific MPS range
      const mpsRange = getDomainMPSRange(domainName);
      console.log(`${domainName} should contain MPS ${mpsRange.min}-${mpsRange.max}`);
      
      // STEP 2: Search for specific MPS numbers within the domain range - ENHANCED for MPS 3
      const searchQueries = [
        `${domainName} MPS Mini Performance Standards`,
        `MPS ${mpsRange.min} MPS ${mpsRange.min + 1} MPS ${mpsRange.min + 2} MPS ${mpsRange.min + 3} MPS ${mpsRange.min + 4}`,
        `"MPS ${mpsRange.min}" "MPS ${mpsRange.min + 1}" "MPS ${mpsRange.min + 2}" "MPS ${mpsRange.min + 3}" "MPS ${mpsRange.min + 4}"`,
        `${domainName} domain`,
        `Leadership Governance MPS 1 MPS 2 MPS 3 MPS 4 MPS 5`, // Specific for Leadership & Governance
        `MPS 1 Leadership MPS 2 Chain Custody MPS 3 Separation Duties MPS 4 Risk Management MPS 5 Legal Regulatory`, // Very specific
        // CRITICAL: Add specific MPS 3 searches
        `MPS 3 Separation of Duties`,
        `"MPS 3" Separation Duties`,
        `Separation of Duties governance`,
        `Chain of Custody MPS 3`,
        // Individual MPS searches for comprehensive coverage
        `MPS 1 Leadership`,
        `MPS 2 Chain of Custody`,
        `MPS 3 Separation`,
        `MPS 4 Risk Management`, 
        `MPS 5 Legal Regulatory`
      ];

      let knowledgeBaseResults: any[] = [];
      
      // Search with multiple queries to find relevant documents
      for (const searchQuery of searchQueries) {
        try {
          console.log(`Executing search query: "${searchQuery}"`);
          const { data: searchData, error: searchError } = await supabase.functions.invoke('search-ai-context', {
            body: {
              query: searchQuery,
              organizationId: currentOrganization.id,
              documentTypes: [], // Remove document type filter initially
              limit: 15,
              threshold: 0.2 // Even lower threshold to catch MPS 3
            }
          });

          if (searchError) {
            console.error(`Search error for "${searchQuery}":`, searchError);
          } else if (searchData?.success) {
            console.log(`Search results for "${searchQuery}":`, searchData.results?.length || 0, 'results');
            if (searchData.results?.length > 0) {
              knowledgeBaseResults = [...knowledgeBaseResults, ...searchData.results];
              console.log(`Added ${searchData.results.length} results from query: ${searchQuery}`);
            }
          } else {
            console.log(`No success flag for "${searchQuery}":`, searchData);
          }
        } catch (searchErr) {
          console.error(`Search failed for query "${searchQuery}":`, searchErr);
        }
      }

      // Remove duplicates and sort by similarity
      const uniqueResults = knowledgeBaseResults
        .filter((result, index, self) => 
          index === self.findIndex(r => r.chunk_id === result.chunk_id)
        )
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 20); // Top 20 most relevant chunks

      console.log(`After deduplication: ${uniqueResults.length} unique knowledge base results for ${domainName}`);
      
      // Debug: Let's also try a simple text search if semantic search fails
      if (uniqueResults.length === 0) {
        console.log('No semantic search results, trying simple text search as backup...');
        try {
          const { data: docs, error: docsError } = await supabase
            .from('ai_document_chunks')
            .select('content, ai_documents!inner(file_name)')
            .eq('organization_id', currentOrganization.id)
            .ilike('content', `%${domainName}%`)
            .limit(10);
          
          if (!docsError && docs?.length > 0) {
            console.log(`Found ${docs.length} chunks via simple text search for "${domainName}"`);
            // Convert to search result format
            docs.forEach((doc, index) => {
              uniqueResults.push({
                chunk_id: `text-search-${index}`,
                document_name: doc.ai_documents.file_name,
                content: doc.content,
                similarity: 0.5 // Default similarity for text search
              });
            });
          }
        } catch (textSearchErr) {
          console.error('Text search backup failed:', textSearchErr);
        }
      }

      // STEP 2: Build context from knowledge base
      let knowledgeContext = '';
      let sourceDocuments: string[] = [];
      
      if (uniqueResults.length > 0) {
        knowledgeContext = `KNOWLEDGE BASE CONTEXT for ${domainName}:\n\n`;
        uniqueResults.forEach((result, index) => {
          knowledgeContext += `[Document: ${result.document_name}] ${result.content}\n\n`;
          if (!sourceDocuments.includes(result.document_name)) {
            sourceDocuments.push(result.document_name);
          }
        });
        knowledgeContext += '\n---\n\n';
      }

      // STEP 3: Create AI prompt with knowledge base priority and strict domain filtering
      const hasKnowledgeBase = uniqueResults.length > 0;
      
      const prompt = hasKnowledgeBase 
        ? `${knowledgeContext}

CRITICAL: Extract ONLY the Mini Performance Standards (MPSs) for "${domainName}" domain from the KNOWLEDGE BASE CONTEXT above.

STRICT DOMAIN FILTERING RULES:
- "${domainName}" domain should ONLY contain MPS numbers ${mpsRange.min} through ${mpsRange.max}
- Do NOT include MPSs outside this range (e.g., if MPS 13 or 14 appear, they belong to People & Culture, not Leadership & Governance)
- Leadership & Governance = MPS 1-5 ONLY (must include ALL: MPS 1, MPS 2, MPS 3, MPS 4, MPS 5)
- Process Integrity = MPS 6-10 ONLY  
- People & Culture = MPS 11-14 ONLY
- Protection = MPS 15-20 ONLY
- Proof it Works = MPS 21-25 ONLY

PRIORITY INSTRUCTIONS:
1. SCAN ALL DOCUMENTS: Look through every document in the knowledge base context for ALL MPS numbers ${mpsRange.min}-${mpsRange.max}
2. MANDATORY INCLUSION: You MUST include ALL MPSs found within the number range, including MPS 3 and MPS 5 if they exist in documents
3. COMPREHENSIVE SEARCH: Look for patterns like "MPS 1", "MPS 2", "MPS 3", "MPS 4", "MPS 5" - include every single one found
4. Use ONLY the exact MPS titles, numbers, and content from the knowledge base - DO NOT create new ones
5. Maintain exact wording and numbering from source documents
6. If an MPS number is outside the range ${mpsRange.min}-${mpsRange.max}, EXCLUDE it (it belongs to a different domain)
7. Reference the source document name for each MPS

INTENT STATEMENT REQUIREMENTS:
- Create SPECIFIC intents for each MPS based on document content, NOT generic templates
- AVOID: "ensure compliance with legal and regulatory requirements" unless MPS is specifically about legal/regulatory
- USE: Actual document focus (e.g., "Leadership" = governance structures, "Risk Management" = risk processes, "Legal" = regulatory compliance)
- Format: "Establish [specific purpose based on MPS focus] to [specific outcome] through [specific method from document]"

For EVERY valid MPS numbered ${mpsRange.min}-${mpsRange.max} found in the knowledge base for "${domainName}", provide:
- Exact MPS number (as stated in documents, must be ${mpsRange.min}-${mpsRange.max})
- Exact title (as stated in documents) 
- Intent statement (synthesized from document content - be specific to each MPS focus area)
- Source document name
- Rationale explaining why this MPS appears in the uploaded documentation

Organization: ${currentOrganization.name}
Domain: ${domainName} (MPS ${mpsRange.min}-${mpsRange.max} ONLY)
Source Documents: ${sourceDocuments.join(', ')}

Return JSON format:
[
  {
    "number": "exact number from documents (must be MPS ${mpsRange.min}-${mpsRange.max})",
    "title": "exact title from documents", 
    "intent": "from documents or derived from context",
    "source_document": "document name",
    "rationale": "why this MPS is specified in the uploaded documents",
    "knowledge_base_used": true
  }
]`
        : `No specific MPS documents found in knowledge base for "${domainName}" domain.

FALLBACK MODE - Generate minimal placeholder MPSs:
- Mark clearly as fallback suggestions (not from uploaded documents)
- Include warning that no source documents were found
- Recommend uploading domain-specific MPS documentation

Organization: ${currentOrganization.name}
Domain: ${domainName}

Return JSON format:
[
  {
    "number": "MPS 1",
    "title": "Generic ${domainName} Standard",
    "intent": "Placeholder - requires domain-specific documentation",
    "source_document": "none - fallback suggestion",
    "rationale": "No source document found in knowledge base - this is a generic suggestion",
    "knowledge_base_used": false
  }
]`;

      const { data, error: functionError } = await supabase.functions.invoke('maturion-ai-chat', {
        body: {
          prompt,
          context: `Knowledge-base enforced MPS generation for ${domainName}`,
          currentDomain: domainName,
          organizationId: currentOrganization.id,
          knowledgeBaseUsed: hasKnowledgeBase,
          sourceDocuments: sourceDocuments
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

          // Transform the parsed data into our format with knowledge base metadata
          const formattedMPSs: GeneratedMPS[] = parsedMPSs.map((mps: any, index: number) => ({
            id: `mps-${index + 1}`,
            number: mps.number || `MPS ${index + 1}`,
            title: mps.title,
            intent: mps.intent,
            criteriaCount: Math.floor(Math.random() * 3) + 1, // Random between 1-3 criteria
            selected: false, // Default to unselected
            rationale: mps.knowledge_base_used 
              ? `📚 From Knowledge Base: ${mps.rationale} (Source: ${mps.source_document})` 
              : `⚠️ Fallback Suggestion: ${mps.rationale} - No specific documents found in knowledge base`,
            knowledgeBaseUsed: mps.knowledge_base_used,
            sourceDocument: mps.source_document
          }));

          // CRITICAL: Add MPS completeness validation for Leadership & Governance
          if (domainName === 'Leadership & Governance') {
            const foundMPSNumbers = formattedMPSs.map(mps => {
              const numberMatch = mps.number.match(/(\d+)/);
              return numberMatch ? parseInt(numberMatch[1]) : 0;
            });
            
            console.log(`Leadership & Governance MPS validation - Found MPS numbers: [${foundMPSNumbers.join(', ')}]`);
            
            // Check for missing critical MPSs and auto-add them
            const expectedMPSs = [1, 2, 3, 4, 5];
            const missingMPSs = expectedMPSs.filter(num => !foundMPSNumbers.includes(num));
            
            if (missingMPSs.length > 0) {
              console.warn(`Missing critical MPSs for Leadership & Governance: [${missingMPSs.join(', ')}] - Adding fallback entries`);
              
              // Add missing MPSs with fallback data
              missingMPSs.forEach(mpsNum => {
                const fallbackMPS = createFallbackMPSForNumber(mpsNum, domainName);
                formattedMPSs.push(fallbackMPS);
              });
              
              // Sort by MPS number
              formattedMPSs.sort((a, b) => {
                const aNum = parseInt(a.number.match(/(\d+)/)?.[1] || '0');
                const bNum = parseInt(b.number.match(/(\d+)/)?.[1] || '0');
                return aNum - bNum;
              });
            }
          }

          // Log knowledge base usage
          const kbUsedCount = formattedMPSs.filter(mps => mps.knowledgeBaseUsed).length;
          console.log(`Generated ${formattedMPSs.length} MPSs for ${domainName}: ${kbUsedCount} from knowledge base, ${formattedMPSs.length - kbUsedCount} fallback`);

          setGeneratedMPSs(formattedMPSs);
        } catch (parseError) {
          console.error('Error parsing AI response:', parseError);
          // Fallback to creating MPSs from text response
          const fallbackMPSs = createFallbackMPSs(data.response, domainName);
          setGeneratedMPSs(fallbackMPSs);
          console.warn(`Using fallback MPS parsing for ${domainName} - knowledge base may not have been properly accessed`);
        }
      } else {
        throw new Error(data.error || 'Failed to generate MPSs');
      }
    } catch (err) {
      console.error('Error generating MPSs:', err);
      setError(`Knowledge base search failed: ${err instanceof Error ? err.message : 'Failed to generate MPSs'}`);
      
      // Provide clearly marked fallback MPSs
      const fallbackMPSs = getDomainFallbackMPSs(domainName);
      // Mark all fallback MPSs with warning
      const markedFallbackMPSs = fallbackMPSs.map(mps => ({
        ...mps,
        rationale: `⚠️ FALLBACK: ${mps.rationale} - No knowledge base access available`
      }));
      setGeneratedMPSs(markedFallbackMPSs);
      console.warn(`Using complete fallback MPSs for ${domainName} due to error`);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to create fallback MPS for specific missing numbers
  const createFallbackMPSForNumber = (mpsNumber: number, domainName: string): GeneratedMPS => {
    const fallbackTemplates: Record<number, { title: string; intent: string }> = {
      1: {
        title: 'Leadership',
        intent: 'Establish and maintain a governance structure that clearly defines leadership roles, responsibilities, and strategic oversight to drive security and operational objectives throughout the organization.'
      },
      2: {
        title: 'Chain of Custody and Security Control Committee',
        intent: 'Form a Security Control Committee responsible for overseeing chain of custody processes, ensuring segregation of duties, and implementing controls to prevent unauthorized access or conflicts of interest.'
      },
      3: {
        title: 'Separation of Duties',
        intent: 'Implement a comprehensive separation of duties framework to systematically identify, assess, and mitigate security and operational risks, ensuring that controls are reviewed and updated regularly.'
      },
      4: {
        title: 'Risk Management',
        intent: 'Implement a comprehensive risk management process to systematically identify, assess, and mitigate security and operational risks, ensuring that controls are reviewed and updated regularly.'
      },
      5: {
        title: 'Legal and Regulatory Requirements',
        intent: 'Develop and maintain processes to identify, interpret, and comply with all applicable legal, regulatory, and audit requirements, including relevant compliance frameworks and industry standards.'
      }
    };

    const template = fallbackTemplates[mpsNumber] || fallbackTemplates[1];

    return {
      id: `fallback-mps-${mpsNumber}`,
      number: `MPS ${mpsNumber}`,
      title: template.title,
      intent: template.intent,
      criteriaCount: Math.floor(Math.random() * 3) + 1,
      selected: false,
      rationale: `⚠️ AUTO-ADDED: ${template.title} was missing from AI generation but is required for ${domainName}. This fallback ensures complete domain coverage.`,
      knowledgeBaseUsed: false,
      sourceDocument: 'none - auto-added for completeness'
    };
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
      rationale: `⚠️ PARSING FALLBACK: ${domainName} MPS derived from AI response - Knowledge base access may have failed`,
      knowledgeBaseUsed: false,
      sourceDocument: 'none - parsing fallback'
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
          rationale: '⚠️ TEMPLATE FALLBACK: Process documentation is fundamental - No specific knowledge base documents found',
          knowledgeBaseUsed: false,
          sourceDocument: 'none - template fallback'
        },
        {
          id: 'pi-2',
          number: 'MPS 2',
          title: 'Quality Assurance & Control Systems',
          intent: 'Establish systematic quality controls and assurance mechanisms to ensure consistent output quality.',
          criteriaCount: 3,
          selected: false,
          rationale: '⚠️ TEMPLATE FALLBACK: Quality systems prevent defects - No specific knowledge base documents found',
          knowledgeBaseUsed: false,
          sourceDocument: 'none - template fallback'
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
          rationale: '⚠️ TEMPLATE FALLBACK: Strong governance provides strategic direction - No specific knowledge base documents found',
          knowledgeBaseUsed: false,
          sourceDocument: 'none - template fallback'
        },
        {
          id: 'lg-2',
          number: 'MPS 2',
          title: 'Policy Framework and Compliance Integration',
          intent: 'Develop comprehensive policy frameworks that integrate compliance requirements with business objectives.',
          criteriaCount: 3,
          selected: false,
          rationale: '⚠️ TEMPLATE FALLBACK: Integrated policies ensure consistency - No specific knowledge base documents found',
          knowledgeBaseUsed: false,
          sourceDocument: 'none - template fallback'
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