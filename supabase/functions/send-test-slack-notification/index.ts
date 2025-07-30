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
    
    // Get organization details and Slack webhook - check linked orgs too
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, slack_webhook_url, organization_type')
      .or(`id.eq.${organizationId},owner_id.eq.(SELECT owner_id FROM organizations WHERE id = '${organizationId}')`);
    
    if (orgError || !orgs || orgs.length === 0) {
      throw new Error(`Failed to fetch organization: ${orgError?.message || 'Organization not found'}`);
    }
    
    // Find an organization with a Slack webhook URL
    const orgWithSlack = orgs.find(org => org.slack_webhook_url);
    
    if (!orgWithSlack) {
      const availableOrgs = orgs.map(o => `${o.name} (${o.organization_type})`).join(', ');
      throw new Error(`No Slack webhook URL configured for any related organizations. Available organizations: ${availableOrgs}. Please configure a Slack webhook URL in Organization Settings.`);
    }
    
    const testTime = new Date().toLocaleString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    const testMessage = `🧪 Test Notification: ${testTime}

🏢 Organization: ${orgWithSlack.name} (${orgWithSlack.organization_type})
🔧 Maturion QA System - Test Alert

✅ This is a test notification to verify your Slack integration is working correctly.

Features being tested:
• ✉️ Webhook connectivity  
• 📡 Message formatting
• 🔗 Integration setup

If you receive this message, your Slack alerts are configured correctly!

🔗 Check your QA Dashboard for more details.`;

    console.log(`📤 Using organization: ${orgWithSlack.name} (${orgWithSlack.organization_type}) - ID: ${orgWithSlack.id}`);
    console.log(`📤 Slack webhook URL: ${orgWithSlack.slack_webhook_url}`);
    
    // Create simple, Slack-compatible payload
    const slackPayload = {
      text: "🚨 Test alert from Maturion QA system"
    };
    
    console.log(`📝 Payload being sent:`, JSON.stringify(slackPayload, null, 2));
    
    // Send the test notification with comprehensive debugging
    try {
      const slackResponse = await fetch(orgWithSlack.slack_webhook_url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(slackPayload)
      });
      
      console.log(`📊 Slack Response Status: ${slackResponse.status}`);
      console.log(`📊 Slack Response Headers:`, JSON.stringify(Object.fromEntries(slackResponse.headers.entries())));
      
      // Get response body regardless of status
      const responseText = await slackResponse.text();
      console.log(`📊 Slack Response Body: "${responseText}"`);
      
      if (!slackResponse.ok) {
        console.error(`❌ Slack webhook failed with status ${slackResponse.status}`);
        throw new Error(`Slack webhook failed (HTTP ${slackResponse.status}): ${responseText || 'No response body'} | URL: ${orgWithSlack.slack_webhook_url.split('/').slice(-2).join('/...')} | Org: ${orgWithSlack.name}`);
      }
      
      console.log(`✅ Slack notification sent successfully to ${orgWithSlack.name}`);
      
    } catch (fetchError) {
      console.error(`💥 Fetch error:`, fetchError);
      throw new Error(`Network error when calling Slack webhook: ${fetchError.message} | Org: ${orgWithSlack.name} (${orgWithSlack.organization_type})`);
    }
    
    console.log('✅ Test Slack notification completed successfully');
    
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
      message: `Test Slack notification sent successfully to ${orgWithSlack.name}`,
      organization_used: {
        name: orgWithSlack.name,
        type: orgWithSlack.organization_type,
        id: orgWithSlack.id
      },
      webhook_url: orgWithSlack.slack_webhook_url.split('/').slice(-2).join('/...'), // Partial URL for security
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('❌ Test Slack notification failed with error:', error);
    console.error('❌ Error stack:', error.stack);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      error_type: error.name || 'UnknownError',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});