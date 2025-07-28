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
    
    // Build comprehensive prompt context based on knowledge tier
    const promptContext = await buildPromptContext(request);
    
    // Construct the final prompt
    const fullPrompt = constructFinalPrompt(promptContext);
    
    // Generate AI response
    console.log('🤖 Generating AI response...');
    const aiResponse = await callOpenAI(fullPrompt);
    
    console.log('✅ AI response generated successfully');
    
    // Return the response with metadata
    return new Response(JSON.stringify({
      response: aiResponse,
      sourceType: promptContext.sourceType,
      knowledgeTier: promptContext.knowledgeTier,
      hasDocumentContext: promptContext.documentContext.length > 0,
      hasOrganizationContext: promptContext.organizationContext.length > 0,
      hasExternalContext: promptContext.externalContext.length > 0,
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