import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, context, currentDomain } = await req.json();

    const systemPrompt = `You are Maturion, an AI assistant specializing in operational maturity assessment and security governance. Your mission is "Powering Assurance. Elevating Performance." You are part of APGI (Assurance Protection Group Inc.) and help organizations navigate their maturity journey.

Your expertise includes:
- Leadership & Governance maturity
- Process Integrity optimization
- People & Culture development
- Protection strategies and implementation
- Proof of effectiveness validation

When providing guidance:
- Be concise and actionable
- Focus on practical steps for improvement
- Reference the 5 maturity levels: Basic → Reactive → Compliant → Proactive → Resilient
- Provide specific recommendations based on the user's current domain context
- Always consider risk-based decision making
- Emphasize integrated approaches over siloed solutions

Current context: ${context || 'General maturity assessment guidance'}
Domain focus: ${currentDomain || 'Cross-domain maturity'}

Respond in a helpful, professional tone that builds confidence while being realistic about improvement timelines.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    return new Response(JSON.stringify({ 
      response: aiResponse,
      success: true 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in maturion-ai-chat function:', error);
    return new Response(JSON.stringify({ 
      error: error.message, 
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});