import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationConfig {
  slack_webhook_url?: string;
  email_recipients?: string[];
  notification_levels: string[];
  digest_mode: boolean;
  batch_interval_minutes: number;
}

interface WatchdogAlert {
  id: string;
  alert_type: string;
  severity_level: string;
  title: string;
  message: string;
  actionable_guidance: string;
  organization_id: string;
  created_at: string;
  metadata: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { organizationId, forceNotification = false } = await req.json();
    console.log(`📢 Processing watchdog notifications for org: ${organizationId}`);

    // Get organization notification settings
    const { data: orgData } = await supabase
      .from('organizations')
      .select('notification_config')
      .eq('organization_id', organizationId)
      .single();

    const notificationConfig: NotificationConfig = orgData?.notification_config || {
      notification_levels: ['critical', 'error'],
      digest_mode: true,
      batch_interval_minutes: 60
    };

    // Get pending alerts for notification
    const cutoffTime = new Date(Date.now() - (notificationConfig.batch_interval_minutes * 60 * 1000));
    const timeFilter = forceNotification ? '1970-01-01' : cutoffTime.toISOString();

    const { data: pendingAlerts } = await supabase
      .from('watchdog_alerts')
      .select('*')
      .eq('organization_id', organizationId)
      .in('severity_level', notificationConfig.notification_levels)
      .eq('notification_sent', false)
      .gte('created_at', timeFilter)
      .order('severity_level', { ascending: false })
      .order('created_at', { ascending: false });

    if (!pendingAlerts?.length) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No pending notifications',
        alertCount: 0
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    console.log(`📬 Found ${pendingAlerts.length} alerts to notify`);

    const notifications: any[] = [];

    // Group alerts by severity
    const alertsBySeverity = {
      critical: pendingAlerts.filter(a => a.severity_level === 'critical'),
      error: pendingAlerts.filter(a => a.severity_level === 'error'),
      warning: pendingAlerts.filter(a => a.severity_level === 'warning'),
      info: pendingAlerts.filter(a => a.severity_level === 'info')
    };

    // Send Slack notification if configured
    if (notificationConfig.slack_webhook_url) {
      const slackResult = await sendSlackNotification(
        notificationConfig.slack_webhook_url,
        alertsBySeverity,
        organizationId
      );
      notifications.push({ type: 'slack', ...slackResult });
    }

    // Send email notifications if configured
    if (notificationConfig.email_recipients?.length) {
      const emailResult = await sendEmailNotifications(
        supabase,
        notificationConfig.email_recipients,
        alertsBySeverity,
        organizationId
      );
      notifications.push({ type: 'email', ...emailResult });
    }

    // Mark alerts as notified
    const alertIds = pendingAlerts.map(a => a.id);
    await supabase
      .from('watchdog_alerts')
      .update({ 
        notification_sent: true,
        notification_sent_at: new Date().toISOString()
      })
      .in('id', alertIds);

    // Log notification metrics
    await supabase.from('notification_logs').insert({
      organization_id: organizationId,
      notification_type: 'watchdog_alerts',
      recipient_count: (notificationConfig.email_recipients?.length || 0) + (notificationConfig.slack_webhook_url ? 1 : 0),
      alert_count: pendingAlerts.length,
      severity_breakdown: {
        critical: alertsBySeverity.critical.length,
        error: alertsBySeverity.error.length,
        warning: alertsBySeverity.warning.length,
        info: alertsBySeverity.info.length
      },
      delivery_status: notifications,
      sent_at: new Date().toISOString()
    });

    return new Response(JSON.stringify({
      success: true,
      message: `Sent notifications for ${pendingAlerts.length} alerts`,
      alertCount: pendingAlerts.length,
      notifications
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error) {
    console.error('Error in send-watchdog-notifications:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});

async function sendSlackNotification(webhookUrl: string, alertsBySeverity: any, organizationId: string) {
  try {
    const totalAlerts = Object.values(alertsBySeverity).flat().length;
    
    const message = {
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "🚨 Maturion Watchdog Alert",
            emoji: true
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Organization:* ${organizationId}\n*Alert Summary:* ${totalAlerts} new alerts detected`
          }
        },
        {
          type: "divider"
        }
      ]
    };

    // Add severity sections
    for (const [severity, alerts] of Object.entries(alertsBySeverity)) {
      if ((alerts as any[]).length > 0) {
        const severityEmoji = {
          critical: '🔴',
          error: '🟠', 
          warning: '🟡',
          info: '🔵'
        }[severity] || '⚪';

        message.blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${severityEmoji} ${severity.toUpperCase()} (${(alerts as any[]).length})*`
          }
        });

        // Add top 3 alerts for this severity
        (alerts as any[]).slice(0, 3).forEach((alert: WatchdogAlert) => {
          message.blocks.push({
            type: "section",
            text: {
              type: "mrkdwn",
              text: `• *${alert.title}*\n  ${alert.message}\n  _${alert.actionable_guidance}_`
            }
          });
        });

        if ((alerts as any[]).length > 3) {
          message.blocks.push({
            type: "section",
            text: {
              type: "mrkdwn",
              text: `_... and ${(alerts as any[]).length - 3} more ${severity} alerts_`
            }
          });
        }
      }
    }

    message.blocks.push({
      type: "divider"
    });

    message.blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `📊 View full details in the Watchdog Control Panel • ${new Date().toLocaleString()}`
        }
      ]
    });

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });

    return {
      success: response.ok,
      status: response.status,
      message: response.ok ? 'Slack notification sent' : 'Failed to send Slack notification'
    };

  } catch (error) {
    console.error('Error sending Slack notification:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function sendEmailNotifications(
  supabase: any,
  recipients: string[],
  alertsBySeverity: any,
  organizationId: string
) {
  try {
    const totalAlerts = Object.values(alertsBySeverity).flat().length;
    
    // Get organization name
    const { data: orgData } = await supabase
      .from('organizations')
      .select('organization_name')
      .eq('organization_id', organizationId)
      .single();

    const orgName = orgData?.organization_name || organizationId;

    const emailSubject = `🚨 Maturion Watchdog Alert - ${totalAlerts} new alerts for ${orgName}`;
    
    let emailBody = `
      <h2>🚨 Maturion Watchdog Alert</h2>
      <p><strong>Organization:</strong> ${orgName}</p>
      <p><strong>Alert Summary:</strong> ${totalAlerts} new alerts detected</p>
      <hr>
    `;

    // Add severity sections
    for (const [severity, alerts] of Object.entries(alertsBySeverity)) {
      if ((alerts as any[]).length > 0) {
        const severityColor = {
          critical: '#dc2626',
          error: '#ea580c',
          warning: '#d97706',
          info: '#2563eb'
        }[severity] || '#6b7280';

        emailBody += `
          <h3 style="color: ${severityColor}; margin-top: 20px;">
            ${severity.toUpperCase()} (${(alerts as any[]).length})
          </h3>
        `;

        (alerts as any[]).forEach((alert: WatchdogAlert) => {
          emailBody += `
            <div style="margin: 10px 0; padding: 10px; border-left: 4px solid ${severityColor}; background-color: #f9fafb;">
              <strong>${alert.title}</strong><br>
              ${alert.message}<br>
              <em style="color: #4b5563;">${alert.actionable_guidance}</em><br>
              <small style="color: #6b7280;">${new Date(alert.created_at).toLocaleString()}</small>
            </div>
          `;
        });
      }
    }

    emailBody += `
      <hr>
      <p style="color: #6b7280; font-size: 14px;">
        📊 View full details in the Maturion Watchdog Control Panel<br>
        Generated at ${new Date().toLocaleString()}
      </p>
    `;

    // Send emails using Supabase Edge Function (if available)
    const emailResults = [];
    for (const recipient of recipients) {
      try {
        const { data, error } = await supabase.functions.invoke('send-email', {
          body: {
            to: recipient,
            subject: emailSubject,
            html: emailBody
          }
        });

        emailResults.push({
          recipient,
          success: !error,
          error: error?.message
        });
      } catch (error) {
        emailResults.push({
          recipient,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = emailResults.filter(r => r.success).length;
    return {
      success: successCount > 0,
      message: `Sent ${successCount}/${recipients.length} email notifications`,
      results: emailResults
    };

  } catch (error) {
    console.error('Error sending email notifications:', error);
    return {
      success: false,
      error: error.message
    };
  }
}