import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { testType = 'basic' } = await req.json();
    console.log(`🧪 Running Responses API test: ${testType}`);

    const testResults = {
      timestamp: new Date().toISOString(),
      testType,
      results: {}
    };

    // Test 1: Basic Responses API functionality
    if (testType === 'basic' || testType === 'all') {
      console.log('📝 Testing basic Responses API call...');
      
      const basicResponse = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-5',
          instructions: 'You are Maturion, a security assessment expert.',
          input: 'Provide 3 quick security recommendations for diamond mining operations.',
          max_completion_tokens: 500,
          store: false
        }),
      });

      const basicData = await basicResponse.json();
      testResults.results.basic = {
        status: basicResponse.ok ? 'PASS' : 'FAIL',
        response_structure: !!basicData.output_text,
        has_reasoning: !!basicData.output?.find(item => item.type === 'reasoning'),
        response_length: basicData.output_text?.length || 0
      };
    }

    // Test 2: Built-in tools integration
    if (testType === 'tools' || testType === 'all') {
      console.log('🔧 Testing built-in tools integration...');
      
      const toolsResponse = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-5',
          instructions: 'You are a research assistant with access to web search.',
          input: 'Find recent news about diamond mining security best practices.',
          tools: [{ type: 'web_search' }],
          max_completion_tokens: 300,
          store: false
        }),
      });

      const toolsData = await toolsResponse.json();
      testResults.results.tools = {
        status: toolsResponse.ok ? 'PASS' : 'FAIL',
        has_tool_calls: !!toolsData.output?.find(item => item.type === 'function_call'),
        response_length: toolsData.output_text?.length || 0
      };
    }

    // Test 3: Conversation state management
    if (testType === 'conversation' || testType === 'all') {
      console.log('💬 Testing conversation state management...');
      
      // First call
      const firstResponse = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-5',
          instructions: 'You are Maturion. Remember our conversation context.',
          input: 'Tell me about diamond security risks.',
          max_completion_tokens: 200,
          store: true // Enable storage for conversation chaining
        }),
      });

      const firstData = await firstResponse.json();
      
      // Second call using previous_response_id
      const secondResponse = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-5',
          input: 'What specific controls would you recommend?',
          previous_response_id: firstData.id,
          max_completion_tokens: 200,
          store: true
        }),
      });

      const secondData = await secondResponse.json();
      testResults.results.conversation = {
        status: secondResponse.ok ? 'PASS' : 'FAIL',
        first_response_id: firstData.id,
        second_response_references_first: secondData.output_text?.toLowerCase().includes('diamond') || false,
        context_maintained: !!secondData.id
      };
    }

    // Test 4: Cost and performance comparison
    if (testType === 'performance' || testType === 'all') {
      console.log('⚡ Testing performance metrics...');
      
      const startTime = Date.now();
      const perfResponse = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-5',
          instructions: 'Provide efficient, policy-compliant responses.',
          input: 'Generate 5 diamond-specific maturity criteria for access control.',
          max_completion_tokens: 800,
          store: false
        }),
      });
      const endTime = Date.now();

      const perfData = await perfResponse.json();
      testResults.results.performance = {
        status: perfResponse.ok ? 'PASS' : 'FAIL',
        response_time_ms: endTime - startTime,
        tokens_used: perfData.usage?.total_tokens || 0,
        cost_efficient: (endTime - startTime) < 5000, // Under 5 seconds
        reasoning_quality: !!perfData.output?.find(item => item.type === 'reasoning')
      };
    }

    // Overall assessment
    const passedTests = Object.values(testResults.results).filter(result => result.status === 'PASS').length;
    const totalTests = Object.keys(testResults.results).length;
    
    testResults.summary = {
      overall_status: passedTests === totalTests ? 'ALL_PASS' : 'SOME_FAILURES',
      passed_tests: passedTests,
      total_tests: totalTests,
      migration_ready: passedTests >= totalTests * 0.8, // 80% pass rate
      recommendations: []
    };

    // Add recommendations based on test results
    if (testResults.results.tools?.status === 'FAIL') {
      testResults.summary.recommendations.push('Enable built-in tools for enhanced reasoning capabilities');
    }
    if (testResults.results.conversation?.status === 'FAIL') {
      testResults.summary.recommendations.push('Implement conversation state management for better context retention');
    }
    if (testResults.results.performance?.cost_efficient === false) {
      testResults.summary.recommendations.push('Optimize prompts and token usage for better performance');
    }

    console.log(`✅ Test completed: ${testResults.summary.overall_status}`);

    return new Response(JSON.stringify(testResults), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Test execution error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString(),
      test_status: 'ERROR'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});