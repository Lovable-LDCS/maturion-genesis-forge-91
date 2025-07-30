import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from './lib/constants.ts';
import { buildPromptContext, callOpenAI, constructFinalPrompt, type PromptRequest } from './lib/prompt.ts';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: PromptRequest = await req.json();
    
    console.log('🔍 Starting AI chat request processing...');
    
    // Build comprehensive prompt context based on knowledge tier
    const promptContext = await buildPromptContext(request);
    
    // CRITICAL: Construct final prompt with token limiting and cleanup
    const finalPrompt = constructFinalPrompt(promptContext);
    
    // Log detailed prompt metrics for debugging
    const finalTokens = Math.ceil(finalPrompt.length / 4);
    console.log(`🔍 FINAL PROMPT METRICS:`);
    console.log(`   Total length: ${finalPrompt.length} characters`);
    console.log(`   Estimated tokens: ${finalTokens}`);
    console.log(`   Within 12K limit: ${finalTokens <= 12000 ? '✅' : '❌'}`);
    
    // Check for remaining placeholder patterns as final safety check
    const placeholderCheck = [
      /\[document_type\]/gi,
      /\[action_verb\]/gi,
      /\[requirement\]/gi,
      /\bCriterion\s+[A-Z](?=\s*$|\s*\.|\s*,)/gi,
      /\bAssessment criterion\b/gi
    ];
    
    let hasPlaceholders = false;
    placeholderCheck.forEach((pattern, index) => {
      const matches = finalPrompt.match(pattern);
      if (matches) {
        console.error(`🚨 PLACEHOLDER STILL PRESENT [${index + 1}]: ${pattern.source} (${matches.length} matches)`);
        console.error(`   Examples: ${matches.slice(0, 3).join(', ')}`);
        hasPlaceholders = true;
      }
    });
    
    if (hasPlaceholders) {
      console.error('❌ Placeholders detected in final prompt - aborting generation');
      throw new Error('PLACEHOLDER_VALIDATION_FAILED: Placeholder patterns detected in final prompt');
    }
    
    if (finalTokens > 12000) {
      console.error(`❌ Token limit exceeded: ${finalTokens} > 12000`);
      throw new Error(`TOKEN_LIMIT_EXCEEDED: Prompt has ${finalTokens} tokens (limit: 12,000)`);
    }
    
    console.log('✅ Final prompt passed all safety checks - proceeding with AI generation');
    
    // Generate AI response
    console.log('🤖 Generating AI response...');
    const aiResponse = await callOpenAI(finalPrompt);
    
    console.log('✅ AI response generated successfully');
    
    // Return the response with metadata
    return new Response(JSON.stringify({
      content: aiResponse, // Use 'content' to match expected response format
      response: aiResponse,
      sourceType: promptContext.sourceType,
      knowledgeTier: promptContext.knowledgeTier,
      hasDocumentContext: promptContext.documentContext.length > 0,
      hasOrganizationContext: promptContext.organizationContext.length > 0,
      hasExternalContext: promptContext.externalContext.length > 0,
      promptMetrics: {
        totalLength: finalPrompt.length,
        estimatedTokens: finalTokens,
        withinLimit: finalTokens <= 12000
      },
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error in maturion-ai-chat function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});