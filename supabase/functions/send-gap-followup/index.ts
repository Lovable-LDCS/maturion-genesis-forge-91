import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GapFollowupRequest {
  ticketId: string;
  organizationId: string;
  missingSpecifics: string[];
  followUpDate: string;
  templateKey: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: GapFollowupRequest = await req.json();
    console.log('📧 Processing gap follow-up email request:', request.ticketId);

    // Get organization details
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('name, industry_tags, region_operating')
      .eq('id', request.organizationId)
      .single();

    if (orgError) {
      console.error('Error fetching organization:', orgError);
      throw new Error('Organization not found');
    }

    // Get gap ticket details
    const { data: ticket, error: ticketError } = await supabase
      .from('gap_tickets')
      .select('*')
      .eq('id', request.ticketId)
      .single();

    if (ticketError) {
      console.error('Error fetching gap ticket:', ticketError);
      throw new Error('Gap ticket not found');
    }

    // Generate email content based on template
    const emailContent = generateDiamondFollowupEmail(
      org.name,
      ticket.prompt,
      request.missingSpecifics,
      new Date(request.followUpDate)
    );

    // Send email to johan.ras@apginc.ca (primary recipient)
    const emailResponse = await resend.emails.send({
      from: 'Maturion AI <noreply@maturion.com>',
      to: ['johan.ras@apginc.ca'],
      subject: `🔹 Diamond Context Gap - ${org.name}`,
      html: emailContent.html,
      text: emailContent.text
    });

    if (emailResponse.error) {
      console.error('Resend email error:', emailResponse.error);
      throw new Error(`Email send failed: ${emailResponse.error.message}`);
    }

    console.log('✅ Gap follow-up email sent successfully:', emailResponse.data?.id);

    // Update gap ticket status
    await supabase
      .from('gap_tickets')
      .update({
        email_sent: true,
        status: 'scheduled',
        updated_at: new Date().toISOString()
      })
      .eq('id', request.ticketId);

    return new Response(JSON.stringify({
      success: true,
      emailId: emailResponse.data?.id,
      message: 'Gap follow-up email sent successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in send-gap-followup function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Diamond-specific follow-up email template (diamond-followup-v1)
function generateDiamondFollowupEmail(
  orgName: string,
  originalPrompt: string,
  missingSpecifics: string[],
  followUpDate: Date
): { html: string; text: string } {
  
  const dateString = followUpDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #2BB673, #1a8c54); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">🔹 Diamond Context Gap Follow-up</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">${orgName}</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
        <h2 style="color: #2BB673; margin: 0 0 20px 0; font-size: 20px;">Missing Diamond-Specific Details</h2>
        
        <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #2BB673;">
          <h3 style="margin: 0 0 10px 0; color: #333; font-size: 16px;">Original Query:</h3>
          <p style="color: #666; font-style: italic; margin: 0;">"${originalPrompt}"</p>
        </div>

        <div style="background: #fff3cd; padding: 20px; border-radius: 6px; margin: 20px 0; border: 1px solid #ffeaa7;">
          <h3 style="margin: 0 0 15px 0; color: #856404; font-size: 16px;">📋 Required Diamond Context:</h3>
          <ul style="margin: 0; padding-left: 20px; color: #856404;">
            ${missingSpecifics.map(spec => `<li style="margin-bottom: 8px;"><strong>${spec}</strong></li>`).join('')}
          </ul>
        </div>

        <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #333; font-size: 16px;">🔹 Needed Diamond Documents:</h3>
          <ul style="margin: 0; padding-left: 20px; color: #555;">
            <li>Site-specific diamond control procedures</li>
            <li>KPC thresholds and variance limits</li>
            <li>Role assignment matrices with diamond responsibilities</li>
            <li>System configurations for diamond tracking/monitoring</li>
            <li>Local regulatory compliance requirements</li>
            <li>Diamond facility operational cadences</li>
          </ul>
        </div>

        <div style="background: #e8f4fd; padding: 20px; border-radius: 6px; margin: 20px 0; border: 1px solid #74b9ff;">
          <h3 style="margin: 0 0 10px 0; color: #0984e3; font-size: 16px;">⏰ Commitment Due:</h3>
          <p style="margin: 0; color: #0984e3; font-weight: bold; font-size: 18px;">${dateString}</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <p style="color: #666; margin: 0; font-size: 14px;">
            Reply with the requested documents or confirm if additional time is needed.<br>
            This follow-up ensures diamond-specific accuracy in Maturion's AI responses.
          </p>
        </div>

        <div style="border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px; text-align: center;">
          <p style="color: #888; font-size: 12px; margin: 0;">
            Maturion AI • Diamond Industry Security Intelligence<br>
            Automated from Diamond-Ready Demo Configuration
          </p>
        </div>
      </div>
    </div>
  `;

  const text = `
    🔹 DIAMOND CONTEXT GAP FOLLOW-UP
    Organization: ${orgName}
    
    Missing Diamond-Specific Details for:
    "${originalPrompt}"
    
    Required Context:
    ${missingSpecifics.map(spec => `• ${spec}`).join('\n')}
    
    Needed Diamond Documents:
    • Site-specific diamond control procedures  
    • KPC thresholds and variance limits
    • Role assignment matrices with diamond responsibilities
    • System configurations for diamond tracking/monitoring
    • Local regulatory compliance requirements
    • Diamond facility operational cadences
    
    Commitment Due: ${dateString}
    
    Reply with the requested documents or confirm if additional time is needed.
    This follow-up ensures diamond-specific accuracy in Maturion's AI responses.
    
    ---
    Maturion AI • Diamond Industry Security Intelligence
    Automated from Diamond-Ready Demo Configuration
  `;

  return { html, text };
}