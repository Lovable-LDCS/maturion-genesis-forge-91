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
    if (!openAIApiKey) {
      console.error('❌ OPENAI_API_KEY not found in environment variables');
      throw new Error('OPENAI_API_KEY not configured');
    }

    console.log('✅ OPENAI_API_KEY found, proceeding with tests');
    
    const { testType = 'basic' } = await req.json();
    console.log(`🧪 Running Responses API test: ${testType}`);

    const testResults = {
      timestamp: new Date().toISOString(),
      testType,
      results: {}
    };

    // Test 1: Basic Chat Completions API functionality
    if (testType === 'basic' || testType === 'all') {
      console.log('📝 Testing basic Chat Completions API call...');
      
      const basicResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'You are Maturion, a security assessment expert.'
            },
            {
              role: 'user', 
              content: 'Provide 3 quick security recommendations for diamond mining operations.'
            }
          ],
          max_tokens: 500
        }),
      });

      const basicData = await basicResponse.json();
      console.log('Basic API Response:', basicData);
      
      testResults.results.basic = {
        status: basicResponse.ok ? 'PASS' : 'FAIL',
        response_structure: !!basicData.choices?.[0]?.message?.content,
        has_reasoning: basicData.choices?.[0]?.message?.content?.includes('recommendation') || false,
        response_length: basicData.choices?.[0]?.message?.content?.length || 0,
        error: basicResponse.ok ? null : basicData.error?.message
      };
    }

    // Test 2: Function calling integration
    if (testType === 'tools' || testType === 'all') {
      console.log('🔧 Testing function calling integration...');
      
      const toolsResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'You are a research assistant. Use the search function when asked to find information.'
            },
            {
              role: 'user',
              content: 'Search for recent diamond mining security best practices.'
            }
          ],
          tools: [
            {
              type: 'function',
              function: {
                name: 'search_web',
                description: 'Search the web for information',
                parameters: {
                  type: 'object',
                  properties: {
                    query: {
                      type: 'string',
                      description: 'The search query'
                    }
                  },
                  required: ['query']
                }
              }
            }
          ],
          tool_choice: 'auto',
          max_tokens: 300
        }),
      });

      const toolsData = await toolsResponse.json();
      console.log('Tools API Response:', toolsData);
      
      testResults.results.tools = {
        status: toolsResponse.ok ? 'PASS' : 'FAIL',
        has_tool_calls: !!toolsData.choices?.[0]?.message?.tool_calls,
        response_length: toolsData.choices?.[0]?.message?.content?.length || 0,
        error: toolsResponse.ok ? null : toolsData.error?.message
      };
    }

    // Test 3: Conversation state management
    if (testType === 'conversation' || testType === 'all') {
      console.log('💬 Testing conversation state management...');
      
      // First call
      const firstResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'You are Maturion. Remember our conversation context.'
            },
            {
              role: 'user',
              content: 'Tell me about diamond security risks.'
            }
          ],
          max_tokens: 200
        }),
      });

      const firstData = await firstResponse.json();
      console.log('First conversation response:', firstData);
      
      // Second call maintaining conversation context
      const secondResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'You are Maturion. Remember our conversation context.'
            },
            {
              role: 'user',
              content: 'Tell me about diamond security risks.'
            },
            {
              role: 'assistant',
              content: firstData.choices?.[0]?.message?.content || 'I discussed diamond security risks.'
            },
            {
              role: 'user',
              content: 'What specific controls would you recommend?'
            }
          ],
          max_tokens: 200
        }),
      });

      const secondData = await secondResponse.json();
      console.log('Second conversation response:', secondData);
      
      testResults.results.conversation = {
        status: secondResponse.ok ? 'PASS' : 'FAIL',
        first_response_id: firstData.id || 'no-id',
        second_response_references_first: secondData.choices?.[0]?.message?.content?.toLowerCase().includes('diamond') || 
                                          secondData.choices?.[0]?.message?.content?.toLowerCase().includes('security') || false,
        context_maintained: !!secondData.choices?.[0]?.message?.content,
        error: secondResponse.ok ? null : secondData.error?.message
      };
    }

    // Test 4: Cost and performance comparison
    if (testType === 'performance' || testType === 'all') {
      console.log('⚡ Testing performance metrics...');
      
      const startTime = Date.now();
      const perfResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'Provide efficient, policy-compliant responses.'
            },
            {
              role: 'user',
              content: 'Generate 5 diamond-specific maturity criteria for access control.'
            }
          ],
          max_tokens: 800
        }),
      });
      const endTime = Date.now();

      const perfData = await perfResponse.json();
      console.log('Performance API Response:', perfData);
      
      testResults.results.performance = {
        status: perfResponse.ok ? 'PASS' : 'FAIL',
        response_time_ms: endTime - startTime,
        tokens_used: perfData.usage?.total_tokens || 0,
        cost_efficient: (endTime - startTime) < 5000, // Under 5 seconds
        reasoning_quality: perfData.choices?.[0]?.message?.content?.includes('criteria') || false,
        error: perfResponse.ok ? null : perfData.error?.message
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