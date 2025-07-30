import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const organizationId = body.organizationId;
    
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }
    
    console.log(`🧪 Sending test Slack notification for organization: ${organizationId}`);
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get organization details and Slack webhook
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('name, slack_webhook_url')
      .eq('id', organizationId)
      .single();
    
    if (orgError || !org) {
      throw new Error(`Failed to fetch organization: ${orgError?.message || 'Organization not found'}`);
    }
    
    if (!org.slack_webhook_url) {
      throw new Error('No Slack webhook URL configured for this organization');
    }
    
    const testTime = new Date().toLocaleString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    const testMessage = `🧪 Test Notification: ${testTime}

🏢 Organization: ${org.name}
🔧 Maturion QA System - Test Alert

✅ This is a test notification to verify your Slack integration is working correctly.

Features being tested:
• ✉️ Webhook connectivity
• 📡 Message formatting
• 🔗 Integration setup

If you receive this message, your Slack alerts are configured correctly!

🔗 Check your QA Dashboard for more details.`;

    // Send the test notification
    const slackResponse = await fetch(org.slack_webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: testMessage,
        username: 'Maturion Test Bot',
        icon_emoji: ':test_tube:'
      })
    });
    
    if (!slackResponse.ok) {
      const errorText = await slackResponse.text();
      throw new Error(`Slack webhook failed: ${slackResponse.status} - ${errorText}`);
    }
    
    console.log('✅ Test Slack notification sent successfully');
    
    // Log the test in audit trail
    await supabase
      .from('audit_trail')
      .insert({
        organization_id: organizationId,
        table_name: 'slack_notifications',
        record_id: organizationId,
        action: 'test_notification_sent',
        changed_by: '00000000-0000-0000-0000-000000000000',
        change_reason: 'Test Slack notification triggered from QA Dashboard'
      });
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Test Slack notification sent successfully',
      webhook_url: org.slack_webhook_url.split('/').slice(-2).join('/...'), // Partial URL for security
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('❌ Test Slack notification failed:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});