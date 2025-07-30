import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { organizationId, testQuery = "governance reasoning architecture" } = await req.json();

    console.log('🧠 TESTING AI REASONING INTEGRATION');
    console.log(`Organization ID: ${organizationId}`);
    console.log(`Test Query: ${testQuery}`);

    const results = {
      governanceDocuments: [],
      aiLogicDocuments: [],
      searchTest: null,
      contextTest: null,
      issues: [],
      recommendations: []
    };

    // 1. Check governance documents status
    console.log('🔍 Step 1: Checking governance documents...');
    const { data: govDocs, error: govError } = await supabase
      .from('ai_documents')
      .select(`
        id, title, document_type, processing_status, total_chunks,
        chunks:ai_document_chunks(count)
      `)
      .eq('organization_id', organizationId)
      .eq('document_type', 'governance_reasoning_manifest');

    if (govError) {
      results.issues.push(`Error fetching governance documents: ${govError.message}`);
    } else {
      results.governanceDocuments = govDocs?.map(doc => ({
        ...doc,
        actual_chunks: doc.chunks?.[0]?.count || 0
      })) || [];
      
      console.log(`Found ${results.governanceDocuments.length} governance documents`);
    }

    // 2. Check AI logic rule documents
    console.log('🔍 Step 2: Checking AI logic rule documents...');
    const { data: aiLogicDocs, error: aiLogicError } = await supabase
      .from('ai_documents')
      .select(`
        id, title, document_type, processing_status, total_chunks,
        chunks:ai_document_chunks(count)
      `)
      .eq('organization_id', organizationId)
      .eq('document_type', 'ai_logic_rule_global');

    if (aiLogicError) {
      results.issues.push(`Error fetching AI logic documents: ${aiLogicError.message}`);
    } else {
      results.aiLogicDocuments = aiLogicDocs?.map(doc => ({
        ...doc,
        actual_chunks: doc.chunks?.[0]?.count || 0
      })) || [];
      
      console.log(`Found ${results.aiLogicDocuments.length} AI logic documents`);
    }

    // 3. Test search-ai-context function for governance content
    console.log('🔍 Step 3: Testing search function for governance content...');
    try {
      const { data: searchData, error: searchError } = await supabase.functions.invoke('search-ai-context', {
        body: {
          query: testQuery,
          organizationId: organizationId,
          documentTypes: ['governance_reasoning_manifest', 'ai_logic_rule_global'],
          limit: 10,
          threshold: 0.5
        }
      });

      if (searchError) {
        results.issues.push(`Search function error: ${searchError.message}`);
        results.searchTest = { success: false, error: searchError.message };
      } else {
        results.searchTest = {
          success: true,
          results_found: searchData?.results?.length || 0,
          search_type: searchData?.search_type || 'unknown',
          results: searchData?.results || []
        };
        console.log(`Search test: Found ${searchData?.results?.length || 0} results`);
      }
    } catch (searchTestError) {
      results.issues.push(`Search test failed: ${searchTestError.message}`);
      results.searchTest = { success: false, error: searchTestError.message };
    }

    // 4. Test maturion-ai-chat function to verify governance integration
    console.log('🔍 Step 4: Testing Maturion AI chat integration...');
    try {
      const { data: chatData, error: chatError } = await supabase.functions.invoke('maturion-ai-chat', {
        body: {
          prompt: "What are the key governance principles for Maturion reasoning?",
          organizationId: organizationId,
          currentDomain: "Global Platform Logic",
          knowledgeTier: "INTERNAL_SECURE"
        }
      });

      if (chatError) {
        results.issues.push(`AI chat function error: ${chatError.message}`);
        results.contextTest = { success: false, error: chatError.message };
      } else {
        results.contextTest = {
          success: true,
          has_reasoning_architecture: chatData?.response?.includes('reasoning') || chatData?.response?.includes('governance') || false,
          has_document_context: chatData?.hasDocumentContext || false,
          knowledge_tier: chatData?.knowledgeTier || 'unknown',
          response_preview: chatData?.response?.substring(0, 200) + '...' || 'No response'
        };
        console.log(`AI chat test: Success = ${results.contextTest.success}, Has governance context = ${results.contextTest.has_reasoning_architecture}`);
      }
    } catch (chatTestError) {
      results.issues.push(`AI chat test failed: ${chatTestError.message}`);
      results.contextTest = { success: false, error: chatTestError.message };
    }

    // 5. Generate analysis and recommendations
    console.log('🔍 Step 5: Generating analysis and recommendations...');
    
    // Check for documents with missing chunks
    const brokenDocs = [...results.governanceDocuments, ...results.aiLogicDocuments]
      .filter(doc => doc.total_chunks > 0 && doc.actual_chunks === 0);
    
    if (brokenDocs.length > 0) {
      results.issues.push(`Found ${brokenDocs.length} documents marked as completed but missing chunks`);
      results.recommendations.push("Run document reprocessing for documents with missing chunks");
    }

    // Check governance document availability
    const activeGovDocs = results.governanceDocuments.filter(doc => 
      doc.processing_status === 'completed' && doc.actual_chunks > 0
    );
    
    if (activeGovDocs.length === 0) {
      results.issues.push("No active governance documents found");
      results.recommendations.push("Upload and process Maturion Reasoning Architecture Manifest");
    } else {
      console.log(`✅ Found ${activeGovDocs.length} active governance documents`);
    }

    // Check search functionality
    if (!results.searchTest?.success) {
      results.issues.push("Search function is not working properly");
      results.recommendations.push("Debug search-ai-context function");
    } else if (results.searchTest.results_found === 0) {
      results.issues.push("Search function works but returns no governance results");
      results.recommendations.push("Verify governance document embeddings and search parameters");
    }

    // Check AI chat integration
    if (!results.contextTest?.success) {
      results.issues.push("AI chat function is not working properly");
      results.recommendations.push("Debug maturion-ai-chat function");
    } else if (!results.contextTest.has_reasoning_architecture) {
      results.issues.push("AI chat works but governance content is not being included");
      results.recommendations.push("Verify governance document retrieval in AI chat context building");
    }

    // Overall status
    const overallStatus = results.issues.length === 0 ? 'HEALTHY' : 
                         results.issues.length < 3 ? 'NEEDS_ATTENTION' : 'CRITICAL';

    console.log(`🔍 Test completed. Overall status: ${overallStatus}`);

    return new Response(JSON.stringify({
      success: true,
      status: overallStatus,
      timestamp: new Date().toISOString(),
      ...results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in AI reasoning integration test:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});