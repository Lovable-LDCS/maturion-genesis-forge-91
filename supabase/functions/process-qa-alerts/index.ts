import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QAAlert {
  id: string;
  organization_id: string;
  alert_type: string;
  severity_level: string;
  title: string;
  message: string;
  alert_data: any;
  created_at: string;
}

interface SlackMessage {
  text: string;
  blocks?: any[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🚨 QA Alert Engine - Starting alert processing');

    // Fetch pending alerts (not yet sent to Slack)
    const { data: pendingAlerts, error: alertsError } = await supabase
      .from('qa_alerts')
      .select(`
        *,
        organizations (
          name,
          slack_webhook_url
        )
      `)
      .eq('slack_sent', false)
      .order('created_at', { ascending: true })
      .limit(50);

    if (alertsError) {
      console.error('❌ Error fetching alerts:', alertsError);
      throw alertsError;
    }

    if (!pendingAlerts || pendingAlerts.length === 0) {
      console.log('✅ No pending alerts to process');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No pending alerts',
        processed: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📋 Processing ${pendingAlerts.length} pending alerts`);

    let processedCount = 0;
    let errorCount = 0;

    // Group alerts by organization for batch processing
    const alertsByOrg = new Map<string, any[]>();
    pendingAlerts.forEach(alert => {
      const orgId = alert.organization_id;
      if (!alertsByOrg.has(orgId)) {
        alertsByOrg.set(orgId, []);
      }
      alertsByOrg.get(orgId)!.push(alert);
    });

    // Process alerts by organization
    for (const [orgId, alerts] of alertsByOrg) {
      try {
        const organization = alerts[0]?.organizations;
        if (!organization?.slack_webhook_url) {
          console.log(`⚠️ No Slack webhook configured for organization: ${organization?.name || orgId}`);
          continue;
        }

        // Group alerts by severity for better formatting
        const criticalAlerts = alerts.filter(a => a.severity_level === 'critical');
        const warningAlerts = alerts.filter(a => a.severity_level === 'warning');
        const infoAlerts = alerts.filter(a => a.severity_level === 'info');

        // Create Slack message with tiered formatting
        const slackMessage = createSlackMessage(
          organization.name,
          criticalAlerts,
          warningAlerts,
          infoAlerts
        );

        // Send to Slack
        const slackResponse = await fetch(organization.slack_webhook_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(slackMessage),
        });

        if (!slackResponse.ok) {
          console.error(`❌ Failed to send Slack message to ${organization.name}:`, await slackResponse.text());
          errorCount += alerts.length;
          continue;
        }

        console.log(`✅ Slack alerts sent to ${organization.name} (${alerts.length} alerts)`);

        // Mark alerts as sent
        const alertIds = alerts.map(a => a.id);
        const { error: updateError } = await supabase
          .from('qa_alerts')
          .update({ 
            slack_sent: true,
            slack_sent_at: new Date().toISOString()
          })
          .in('id', alertIds);

        if (updateError) {
          console.error('❌ Error marking alerts as sent:', updateError);
          errorCount += alerts.length;
        } else {
          processedCount += alerts.length;
        }

        // Add throttling to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ Error processing alerts for org ${orgId}:`, error);
        errorCount += alerts.length;
      }
    }

    // Log summary metrics
    await supabase.from('qa_metrics').insert([
      {
        organization_id: 'system',
        metric_type: 'slack_alerts_processed',
        metric_value: processedCount,
        metric_data: {
          total_alerts: pendingAlerts.length,
          processed_alerts: processedCount,
          error_count: errorCount,
          organizations_notified: alertsByOrg.size,
          timestamp: new Date().toISOString()
        }
      }
    ]);

    console.log(`🎉 Alert processing completed: ${processedCount} sent, ${errorCount} errors`);

    return new Response(JSON.stringify({
      success: true,
      processed: processedCount,
      errors: errorCount,
      total: pendingAlerts.length,
      organizations: alertsByOrg.size
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('💥 Fatal error in QA alerts processing:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function createSlackMessage(
  orgName: string,
  criticalAlerts: QAAlert[],
  warningAlerts: QAAlert[],
  infoAlerts: QAAlert[]
): SlackMessage {
  const totalAlerts = criticalAlerts.length + warningAlerts.length + infoAlerts.length;
  
  let message = `🚨 *Maturion QA Alert Summary for ${orgName}*\n`;
  message += `📊 Total Alerts: ${totalAlerts}\n\n`;

  // Critical alerts section
  if (criticalAlerts.length > 0) {
    message += `🔴 *CRITICAL ALERTS (${criticalAlerts.length})*\n`;
    criticalAlerts.forEach(alert => {
      message += `• ${alert.title}: ${alert.message}\n`;
    });
    message += '\n';
  }

  // Warning alerts section
  if (warningAlerts.length > 0) {
    message += `🟡 *WARNING ALERTS (${warningAlerts.length})*\n`;
    warningAlerts.forEach(alert => {
      message += `• ${alert.title}: ${alert.message}\n`;
    });
    message += '\n';
  }

  // Info alerts section (condensed if many)
  if (infoAlerts.length > 0) {
    message += `🔵 *INFO ALERTS (${infoAlerts.length})*\n`;
    if (infoAlerts.length <= 3) {
      infoAlerts.forEach(alert => {
        message += `• ${alert.title}: ${alert.message}\n`;
      });
    } else {
      infoAlerts.slice(0, 2).forEach(alert => {
        message += `• ${alert.title}: ${alert.message}\n`;
      });
      message += `• ... and ${infoAlerts.length - 2} more info alerts\n`;
    }
    message += '\n';
  }

  message += `⏰ Generated: ${new Date().toLocaleString()}\n`;
  message += `🔗 View details in your Maturion QA Dashboard`;

  return {
    text: message,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: message
        }
      }
    ]
  };
}