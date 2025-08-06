import { supabase } from './utils.ts';

// Enhanced function to get MPS-specific document context
export async function getDocumentContext(organizationId: string, query: string, domain?: string, mpsNumber?: number): Promise<string> {
  try {
    console.log('Fetching document context for organization:', organizationId, 'Query:', query, 'MPS Number:', mpsNumber);
    
    // First check if there are any completed documents
    const { data: completedDocs, error: docsError } = await supabase
      .from('ai_documents')
      .select('id, title, processing_status, document_type, metadata')
      .eq('organization_id', organizationId)
      .eq('processing_status', 'completed');
    
    if (docsError) {
      console.error('Error fetching completed documents:', docsError);
      return '';
    }
    
    if (!completedDocs || completedDocs.length === 0) {
      console.log('No completed documents found for organization');
      return '';
    }
    
    console.log(`Found ${completedDocs.length} completed documents`);
    
    // Build search queries with MPS-specific targeting
    const searchQueries = [
      query,
      query.toLowerCase(),
      `${query} requirements`,
      `${query} criteria`,
      `${query} audit`
    ];
    
    // If MPS number is specified, prioritize MPS-specific content
    if (mpsNumber) {
      searchQueries.push(
        `MPS ${mpsNumber}`,
        `MPS${mpsNumber}`,
        `${mpsNumber}.`,
        query + ` MPS ${mpsNumber}`,
        domain ? `${domain} MPS ${mpsNumber}` : `MPS ${mpsNumber} requirements`
      );
    }
    
    if (domain) {
      searchQueries.push(
        `${domain} ${query}`,
        `${domain} requirements`,
        `${domain} criteria`,
        `${domain} audit`
      );
    }
    
    console.log(`🔍 Executing search queries:`, searchQueries.slice(0, 3));
    
    const allResults = [];
    
    // Enhanced search using vector similarity
    for (const searchQuery of searchQueries.slice(0, 8)) {
      try {
        console.log(`🔍 Executing search query: "${searchQuery}"`);
        
        const { data, error } = await supabase.functions.invoke('search-ai-context', {
          body: {
            query: searchQuery,
            organizationId: organizationId,
            documentTypes: ['mps_document', 'mps', 'standard', 'audit', 'criteria', 'governance_reasoning_manifest', 'ai_logic_rule_global', 'system_instruction'],
            limit: mpsNumber ? 50 : 30, // Significantly more results for comprehensive context
            threshold: mpsNumber ? 0.5 : 0.6, // Lower threshold for MPS-specific searches
            mpsNumber: mpsNumber // Pass MPS number for specialized filtering
          }
        });
        
        if (error) {
          console.error(`Search error for "${searchQuery}":`, error);
          continue;
        }
        
        if (data?.results?.length > 0) {
          console.log(`✅ Found ${data.results.length} results for "${searchQuery}"`);
          allResults.push(...data.results);
        } else {
          console.log(`⚠️ No results for query: "${searchQuery}"`);
        }
      } catch (searchError) {
        console.error(`Error in search for "${searchQuery}":`, searchError);
      }
    }
    
    // Deduplicate results and sort by relevance
    const uniqueResults = Array.from(
      new Map(allResults.map(result => [result.id, result])).values()
    )
      .sort((a, b) => {
        // Prioritize MPS-specific content first
        if (mpsNumber) {
          const aMpsMatch = a.content.toLowerCase().includes(`mps ${mpsNumber}`) || 
                           a.content.toLowerCase().includes(`mps${mpsNumber}`) ||
                           a.content.includes(`${mpsNumber}.`);
          const bMpsMatch = b.content.toLowerCase().includes(`mps ${mpsNumber}`) || 
                           b.content.toLowerCase().includes(`mps${mpsNumber}`) ||
                           b.content.includes(`${mpsNumber}.`);
          
          if (aMpsMatch && !bMpsMatch) return -1;
          if (!aMpsMatch && bMpsMatch) return 1;
        }
        
        // Then sort by similarity score
        return (b.similarity_score || 0) - (a.similarity_score || 0);
      });
    
    console.log(`🔄 After deduplication: ${uniqueResults.length} unique knowledge base results${mpsNumber ? ` for MPS ${mpsNumber}` : ''}`);
    
    // If no results from vector search, try fallback direct query
    if (uniqueResults.length === 0) {
      console.log('🔄 No vector search results, trying fallback query...');
      
      let fallbackQuery = supabase
        .from('ai_document_chunks')
        .select('content, document_name, ai_documents!inner(title, document_type)')
        .eq('organization_id', organizationId);
      
      if (mpsNumber) {
        fallbackQuery = fallbackQuery.or(
          `content.ilike.%MPS ${mpsNumber}%,content.ilike.%MPS${mpsNumber}%,content.ilike.%${mpsNumber}.%`
        );
      } else {
        fallbackQuery = fallbackQuery.or(
          `content.ilike.%${query}%,content.ilike.%${domain}%`
        );
      }
      
      const { data: fallbackResults, error: fallbackError } = await fallbackQuery.limit(10);
      
      if (!fallbackError && fallbackResults?.length > 0) {
        console.log(`✅ Fallback query found ${fallbackResults.length} results`);
        uniqueResults.push(...fallbackResults.map(result => ({
          ...result,
          similarity_score: 0.5 // Default score for fallback results
        })));
      }
    }
    
    if (uniqueResults.length === 0) {
      console.log('⚠️ No relevant knowledge base content found');
      return '';
    }
    
    // Build context sections with prioritization and token limits
    const contextSections = [];
    const sourceDocuments = new Set();
    
    // Token estimation: roughly 4 characters per token
    const MAX_CONTEXT_TOKENS = 8000; // Reserve tokens for prompt instructions
    let currentTokens = 0;
    
    const truncateContent = (content: string, maxTokens: number = 2000): string => {
      const maxChars = maxTokens * 4;
      if (content.length <= maxChars) return content;
      return content.substring(0, maxChars) + '...[truncated]';
    };
    
    // Prioritize MPS-specific content if MPS number is provided
    if (mpsNumber) {
      const mpsSpecificResults = uniqueResults.filter(result => 
        result.content.toLowerCase().includes(`mps ${mpsNumber}`) ||
        result.content.toLowerCase().includes(`mps${mpsNumber}`) ||
        result.content.includes(`${mpsNumber}.`) ||
        result.document_name.toLowerCase().includes(`mps ${mpsNumber}`) ||
        result.document_name.toLowerCase().includes(`mps${mpsNumber}`)
      ).slice(0, 3); // Limit to top 3 most relevant
      
      if (mpsSpecificResults.length > 0 && currentTokens < MAX_CONTEXT_TOKENS) {
        contextSections.push(`=== MPS ${mpsNumber} SPECIFIC CONTENT ===`);
        mpsSpecificResults.forEach(result => {
          const truncatedContent = truncateContent(result.content, 800);
          const tokenEstimate = Math.ceil(truncatedContent.length / 4);
          
          if (currentTokens + tokenEstimate < MAX_CONTEXT_TOKENS) {
            contextSections.push(`[Document: ${result.document_name}] ${truncatedContent}`);
            sourceDocuments.add(result.document_name);
            currentTokens += tokenEstimate;
          }
        });
        contextSections.push('');
      }
    }
    
    // Add Annex 1 content if available and relevant
    const annex1Results = uniqueResults.filter(result => 
      (result.content.toLowerCase().includes('annex 1') ||
       result.content.toLowerCase().includes('annex i')) &&
      (!mpsNumber || !result.content.toLowerCase().includes(`mps ${mpsNumber}`))
    ).slice(0, 2); // Limit to top 2 Annex 1 results
    
    if (annex1Results.length > 0 && (!mpsNumber || mpsNumber === 1) && currentTokens < MAX_CONTEXT_TOKENS) {
      contextSections.push('=== AUTHORITATIVE MPS SOURCE (Annex 1) ===');
      annex1Results.forEach(result => {
        const truncatedContent = truncateContent(result.content, 1000);
        const tokenEstimate = Math.ceil(truncatedContent.length / 4);
        
        if (currentTokens + tokenEstimate < MAX_CONTEXT_TOKENS) {
          contextSections.push(`[Document: ${result.document_name}] ${truncatedContent}`);
          sourceDocuments.add(result.document_name);
          currentTokens += tokenEstimate;
        }
      });
      contextSections.push('');
    }
    
    // Add Annex 2 content if available and relevant (only if space permits)
    const annex2Results = uniqueResults.filter(result => 
      result.content.toLowerCase().includes('annex 2') ||
      result.content.toLowerCase().includes('annex ii')
    ).slice(0, 1); // Limit to 1 Annex 2 result
    
    if (annex2Results.length > 0 && currentTokens < MAX_CONTEXT_TOKENS * 0.8) {
      contextSections.push('=== MATURITY LEVEL FRAMEWORK (Annex 2) ===');
      annex2Results.forEach(result => {
        const truncatedContent = truncateContent(result.content, 600);
        const tokenEstimate = Math.ceil(truncatedContent.length / 4);
        
        if (currentTokens + tokenEstimate < MAX_CONTEXT_TOKENS) {
          contextSections.push(`[Document: ${result.document_name}] ${truncatedContent}`);
          sourceDocuments.add(result.document_name);
          currentTokens += tokenEstimate;
        }
      });
      contextSections.push('');
    }
    
    // Add remaining high-relevance content (only if space permits)
    const usedResults = [...(mpsNumber ? uniqueResults.filter(r => 
      r.content.toLowerCase().includes(`mps ${mpsNumber}`) ||
      r.content.toLowerCase().includes(`mps${mpsNumber}`) ||
      r.content.includes(`${mpsNumber}.`)
    ) : []), ...annex1Results];
    
    const remainingResults = uniqueResults
      .filter(result => !usedResults.includes(result))
      .filter(result => !result.content.toLowerCase().includes('annex'))
      .slice(0, 3); // Reduce from 8 to 3
    
    if (remainingResults.length > 0 && currentTokens < MAX_CONTEXT_TOKENS * 0.9) {
      contextSections.push('=== RELEVANT KNOWLEDGE BASE CONTENT ===');
      remainingResults.forEach(result => {
        const truncatedContent = truncateContent(result.content, 400);
        const tokenEstimate = Math.ceil(truncatedContent.length / 4);
        
        if (currentTokens + tokenEstimate < MAX_CONTEXT_TOKENS) {
          contextSections.push(`[Document: ${result.document_name}] ${truncatedContent}`);
          sourceDocuments.add(result.document_name);
          currentTokens += tokenEstimate;
        }
      });
    }
    
    const finalContext = contextSections.join('\n');
    const finalTokens = Math.ceil(finalContext.length / 4);
    
    console.log(`Built context from ${sourceDocuments.size} source documents (${finalTokens} tokens): ${Array.from(sourceDocuments).join(', ')}`);
    
    if (mpsNumber && sourceDocuments.size === 0) {
      console.warn(`No MPS ${mpsNumber} specific content found despite having ${completedDocs.length} completed documents`);
    }
    
    if (finalTokens > MAX_CONTEXT_TOKENS) {
      console.warn(`Context still exceeds token limit (${finalTokens} > ${MAX_CONTEXT_TOKENS}), truncating...`);
      return finalContext.substring(0, MAX_CONTEXT_TOKENS * 4) + '\n...[CONTEXT TRUNCATED DUE TO TOKEN LIMIT]';
    }
    
    return finalContext;
    
  } catch (error) {
    console.error('Error getting enhanced document context:', error);
    return '';
  }
}