import { supabase } from './utils.ts';

// Enhanced function to get DIAMOND-FIRST + ORG-WEB document context
export async function getDocumentContext(params: { 
  organizationId: string; 
  query: string; 
  domain?: string; 
  mpsNumber?: number; 
  searchStrategy?: string; 
}): Promise<string> {
  try {
    const { organizationId, query, domain, mpsNumber, searchStrategy = 'balanced' } = params;
    
    // Framework queries should use built-in knowledge only
    if (searchStrategy === 'framework_builtin') {
      console.log('🏗️ Framework query detected - skipping document retrieval, using built-in knowledge');
      return '';
    }
    
    // Ensure organizationId is a string, not an object
    const orgId = typeof organizationId === 'string' ? organizationId : String(organizationId);
    console.log('Fetching document context for organization:', orgId, 'Query:', query, 'MPS Number:', mpsNumber);
    
    // Check for organization-overview intent
    const isOrgQuery = /company|organization|who is|JVs?|joint ventures?|brands?|footprint|sales channels?|about .+/i.test(query);
    console.log('🏢 Organization query detected:', isOrgQuery);
    
    // First check if there are any completed documents
    const { data: completedDocs, error: docsError } = await supabase
      .from('ai_documents')
      .select('id, title, processing_status, document_type, metadata')
      .eq('organization_id', orgId)
      .eq('processing_status', 'completed');
    
    if (docsError) {
      console.error('Error fetching completed documents:', docsError);
      return '';
    }
    
    // Get organization web content for org-specific queries
    let orgWebContext = '';
    if (isOrgQuery) {
      console.log('🌐 Fetching organization web content...');
      
      try {
        const { data: orgChunks, error: webError } = await supabase
          .from('org_page_chunks')
          .select(`
            text,
            tokens,
            org_pages!inner(url, title, domain)
          `)
          .eq('org_id', orgId)
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (!webError && orgChunks && orgChunks.length > 0) {
          console.log(`🌐 Found ${orgChunks.length} organization web chunks`);
          
          orgWebContext = orgChunks
            .map(chunk => `[${chunk.org_pages.domain}] ${chunk.text}`)
            .join('\n\n')
            .substring(0, 4000); // Limit size
          
          console.log('✅ Organization web context built');
        }
      } catch (webError) {
        console.log('⚠️ Could not fetch web content:', webError);
      }
    }
    
    if (!completedDocs || completedDocs.length === 0) {
      // Return org web content if available, even without documents
      if (orgWebContext) {
        console.log('📄 Returning organization web content only');
        return `=== ORGANIZATION WEB CONTENT ===\n${orgWebContext}`;
      }
      
      console.log('No completed documents found for organization');
      return '';
    }
    
    console.log(`Found ${completedDocs.length} completed documents`);
    
    // ORGANIZATION-FIRST RANKING for org queries:
    // 1) organization-profile (current docs)
    // 2) organization-web (web content) 
    // 3) diamond docs (minimal)
    // 4) generic MPS (gap-fill only)
    
    // Build context with proper ranking
    let finalContext = '';
    
    // 1) Organization profile content (existing documents)
    if (completedDocs.length > 0) {
    
    // DIAMOND-FIRST: Build search queries prioritizing diamond content
    const diamondQueries = [
      `Diamond ${query}`,
      `diamond ${query.toLowerCase()}`,
      `${query} diamond-specific`,
      `${query} industry-priority`
    ];
    
    const generalQueries = [
      query,
      query.toLowerCase(),
      `${query} requirements`
    ];
    
    // DIAMOND-FIRST RETRIEVAL: Combine all queries for comprehensive search
    const allQueries = [...diamondQueries, ...generalQueries];
    
    // If MPS number is specified, add MPS-specific variants
    if (mpsNumber) {
      allQueries.push(
        `MPS ${mpsNumber}`,
        `MPS${mpsNumber}`,
        `${mpsNumber}.`,
        query + ` MPS ${mpsNumber}`,
        domain ? `${domain} MPS ${mpsNumber}` : `MPS ${mpsNumber} requirements`
      );
    }
    
    if (domain) {
      allQueries.push(
        `${domain} ${query}`,
        `${domain} requirements`
      );
    }
    
    console.log(`🎯 Document search targeting: ${mpsNumber ? `MPS ${mpsNumber}-specific content` : 'Diamond-priority content'}`);
    console.log(`🔍 Executing search queries:`, allQueries.slice(0, 3));
    
    const allResults = [];
    
    // Enhanced search using vector similarity with DIAMOND-FIRST ranking
    for (const searchQuery of allQueries.slice(0, 10)) {
      try {
        console.log(`🔍 Executing search query: "${searchQuery}"`);
        
        const { data, error } = await supabase.functions.invoke('search-ai-context', {
          body: {
            query: searchQuery,
            organizationId: orgId,
            documentTypes: ['mps_document', 'mps', 'standard', 'audit', 'criteria', 'governance_reasoning_manifest', 'ai_logic_rule_global', 'system_instruction'],
            limit: 50,
            threshold: 0.2,
            mpsNumber: mpsNumber,
            // DIAMOND-FIRST PRIORITY: Boost diamond-specific documents 
            prioritizeTags: ['diamond-specific', 'industry-priority'],
            boostDocumentTitles: ['Diamond', 'Chain of Custody', 'Reconciliation', 'Sorting', 'Valuation', 'Recovery', 'Insider Threat', 'Access Control', 'Technology', 'Scanning', 'Perimeter', 'Vault', 'Transport', 'Export', 'Resilience', 'Records'],
            // DE-PRIORITIZE generic MPS unless it's the only source
            deprioritizeGeneric: true
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
    
    // DIAMOND-FIRST DEDUPLICATION: Prioritize diamond over generic content
    const uniqueResults = Array.from(
      new Map(allResults.map(result => [result.id, result])).values()
    )
      .sort((a, b) => {
        // PRIORITY 1: Diamond Knowledge Pack documents (highest priority for security/process questions)
        const aDKP = a.document_type === 'diamond_knowledge_pack';
        const bDKP = b.document_type === 'diamond_knowledge_pack';
        
        if (aDKP && !bDKP) return -1;
        if (!aDKP && bDKP) return 1;
        
        // PRIORITY 2: Diamond-specific content (tagged or titled with "Diamond")
        const aDiamondSpecific = (a.tags && (a.tags.includes('diamond-specific') || a.tags.includes('industry-priority'))) ||
                                (a.document_title && a.document_title.toLowerCase().includes('diamond'));
        const bDiamondSpecific = (b.tags && (b.tags.includes('diamond-specific') || b.tags.includes('industry-priority'))) ||
                                (b.document_title && b.document_title.toLowerCase().includes('diamond'));
        
        if (aDiamondSpecific && !bDiamondSpecific) return -1;
        if (!aDiamondSpecific && bDiamondSpecific) return 1;
        
        // PRIORITY 2: MPS-specific content if requested
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
        
        // PRIORITY 4: Similarity score
        return (b.similarity_score || 0) - (a.similarity_score || 0);
      });
    
    console.log(`🔄 After DIAMOND-FIRST deduplication: ${uniqueResults.length} unique results`);
    
    // SEPARATE: Diamond Knowledge Pack + Diamond content vs Generic MPS content for gap-fill
    const diamondContent = uniqueResults.filter(result => 
      result.document_type === 'diamond_knowledge_pack' ||
      (result.tags && (result.tags.includes('diamond-specific') || result.tags.includes('industry-priority'))) ||
      (result.document_title && result.document_title.toLowerCase().includes('diamond'))
    );
    
    const genericContent = uniqueResults.filter(result => 
      result.document_type !== 'diamond_knowledge_pack' &&
      !(result.tags && (result.tags.includes('diamond-specific') || result.tags.includes('industry-priority'))) &&
      !(result.document_title && result.document_title.toLowerCase().includes('diamond'))
    );
    
    console.log(`💎 Diamond-specific content: ${diamondContent.length} chunks`);
    console.log(`📋 Generic MPS content: ${genericContent.length} chunks`);
    
    // BUILD CONTEXT: Diamond-first, then generic as gap-fill only
    let context = '';
    let totalTokens = 0;
    const maxTokens = 8000; // Reserve space for response
    let diamondTokensUsed = 0;
    let genericTokensUsed = 0;
    
    // PHASE 1: Add diamond-specific content (up to 6000 tokens)
    const diamondTokenLimit = 6000;
    for (const result of diamondContent) {
      const tokens = Math.ceil(result.content.length / 4);
      if (diamondTokensUsed + tokens <= diamondTokenLimit) {
        context += `\n\n## ${result.document_title || 'Diamond Control Document'}\n${result.content}`;
        diamondTokensUsed += tokens;
      }
    }
    
    // PHASE 2: Add generic MPS content as gap-fill (remaining token budget)
    const remainingTokens = maxTokens - diamondTokensUsed;
    for (const result of genericContent) {
      const tokens = Math.ceil(result.content.length / 4);
      if (genericTokensUsed + tokens <= remainingTokens) {
        // Only add if it provides new information not covered by diamond content
        const hasUniqueContent = !diamondContent.some(d => 
          d.content.toLowerCase().includes(result.content.toLowerCase().substring(0, 100))
        );
        
        if (hasUniqueContent) {
          context += `\n\n## ${result.document_title || 'Generic MPS Reference'}\n${result.content}`;
          genericTokensUsed += tokens;
        }
      }
    }
    
    totalTokens = diamondTokensUsed + genericTokensUsed;
    
    console.log(`📊 Context composition: ${diamondTokensUsed} diamond tokens + ${genericTokensUsed} generic tokens = ${totalTokens} total`);
    console.log(`💎 Diamond-priority approach: ${diamondContent.length > 0 ? 'SUCCESS' : 'FALLBACK_TO_GENERIC'}`);
    
    if (context.trim()) {
      console.log(`Built context from ${diamondContent.length + (genericContent.length > 0 ? 1 : 0)} source documents (${totalTokens} tokens): ${uniqueResults.slice(0, 3).map(r => r.document_title).join(', ')}`);
      return context;
    }

    // Fallback: Direct query on document chunks if no results
    console.log('⚠️ No vector search results, attempting direct chunk query...');
    
    const { data: fallbackChunks, error: chunkError } = await supabase
      .from('ai_document_chunks')
      .select(`
        content,
        chunk_index,
        ai_documents!inner(title, organization_id, document_type)
      `)
      .eq('ai_documents.organization_id', orgId)
      .ilike('content', `%${query}%`)
      .limit(5);

    if (chunkError) {
      console.error('Error in fallback chunk query:', chunkError);
      return '';
    }

    if (fallbackChunks && fallbackChunks.length > 0) {
      console.log(`Found ${fallbackChunks.length} chunks via fallback query`);
      let fallbackContext = '';
      for (const chunk of fallbackChunks) {
        fallbackContext += `\n\n## ${chunk.ai_documents.title}\n${chunk.content}`;
      }
      return fallbackContext;
    }

    console.log('No relevant context found');
    return '';
    
    } // Close the if (completedDocs.length > 0) block

  } catch (error) {
    console.error('Error in getDocumentContext:', error);
    return '';
  }
}