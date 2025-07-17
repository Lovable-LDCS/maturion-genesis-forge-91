import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WebhookPayload {
  event_type: string;
  organization_id: string;
  user_id?: string;
  timestamp: string;
  data?: any;
}

interface WebhookConfig {
  slack_webhook_url?: string;
  email_webhook_url?: string;
  zapier_webhook_url?: string;
}

const formatSlackMessage = (payload: WebhookPayload): any => {
  const formatDate = (dateString?: string) => {
    return new Date(dateString || payload.timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const baseUrl = 'https://your-app.com'; // Replace with actual app URL

  switch (payload.event_type) {
    case 'milestone_signed_off': {
      const { milestone_name, task_name, signed_off_at, task_id } = payload.data || {};
      return {
        text: `✅ *Milestone Signed Off*\n• *Milestone:* ${milestone_name || 'Unknown'}\n• *Task:* ${task_name || 'Unknown'}\n• *Date:* ${formatDate(signed_off_at)}\n• View: <${baseUrl}/milestones/${task_id}|Click here>`
      };
    }

    case 'evidence_uploaded': {
      const { mps_name, user_name, evidence_id } = payload.data || {};
      return {
        text: `📂 *Evidence Uploaded*\n• *MPS:* ${mps_name || 'Unknown'}\n• *Submitted by:* ${user_name || 'Unknown'}\n• *Date:* ${formatDate()}\n• View: <${baseUrl}/evidence/${evidence_id}|Review evidence>`
      };
    }

    case 'audit_finding_raised': {
      const { mps_name, finding_summary, auditor_name, finding_id } = payload.data || {};
      return {
        text: `🛑 *Audit Alert Raised*\n• *Domain:* ${mps_name || 'Unknown'}\n• *Finding:* ${finding_summary || 'Unknown'}\n• *Raised by:* ${auditor_name || 'Unknown'}\n• *Date:* ${formatDate()}\n• View: <${baseUrl}/findings/${finding_id}|View finding>`
      };
    }

    case 'risk_level_increased': {
      const { mps_name, risk_score, trigger_source, assessment_id } = payload.data || {};
      return {
        text: `⚠️ *Risk Score Increased*\n• *Area:* ${mps_name || 'Unknown'}\n• *New Risk Level:* ${risk_score || 'Unknown'}\n• *Triggered by:* ${trigger_source || 'System'}\n• View: <${baseUrl}/assessments/${assessment_id}|See dashboard>`
      };
    }

    case 'team_member_added': {
      const { user_name, role, user_id } = payload.data || {};
      return {
        text: `👤 *New Team Member Added*\n• *Name:* ${user_name || 'Unknown'}\n• *Role:* ${role || 'Member'}\n• *Joined:* ${formatDate()}\n• View: <${baseUrl}/team/${user_id}|Manage team>`
      };
    }

    case 'maturity_score_updated': {
      const { mps_name, maturity_level, user_name, assessment_id } = payload.data || {};
      return {
        text: `📈 *Maturity Level Updated*\n• *Domain:* ${mps_name || 'Unknown'}\n• *New Level:* ${maturity_level || 'Unknown'}\n• *Evaluator:* ${user_name || 'Unknown'}\n• *Date:* ${formatDate()}\n• View: <${baseUrl}/assessments/${assessment_id}|Open dashboard>`
      };
    }

    case 'qa_signoff_completed': {
      const { section_name, user_name, record_id } = payload.data || {};
      return {
        text: `🧾 *QA Sign-Off Completed*\n• *Section:* ${section_name || 'Unknown'}\n• *Approved by:* ${user_name || 'Unknown'}\n• *Date:* ${formatDate()}\n• View: <${baseUrl}/qa/${record_id}|View record>`
      };
    }

    case 'organization_registered': {
      const { org_name, user_name, org_id } = payload.data || {};
      return {
        text: `🏢 *New Organization Registered*\n• *Name:* ${org_name || 'Unknown'}\n• *Created by:* ${user_name || 'Unknown'}\n• *Date:* ${formatDate()}\n• View: <${baseUrl}/admin/organizations/${org_id}|Admin panel>`
      };
    }

    // Fallback for other event types
    default: {
      const eventMessages: Record<string, string> = {
        milestone_updated: `🔄 Milestone "${payload.data?.milestone_name}" has been updated`,
        team_member_removed: `👋 Member removed from the organization`,
        team_invite_accepted: `✅ Team invitation accepted`,
        team_invite_declined: `❌ Team invitation declined`,
        organization_edited: `⚙️ Organization details have been updated`,
        organization_deleted: `🗑️ Organization has been deleted`,
      };

      return {
        text: eventMessages[payload.event_type] || `Event: ${payload.event_type}`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: eventMessages[payload.event_type] || `Event: ${payload.event_type}`
            }
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `Organization ID: ${payload.organization_id} | ${formatDate()}`
              }
            ]
          }
        ]
      };
    }
  }
};

const sendWebhook = async (url: string, payload: any, type: 'slack' | 'email' | 'zapier'): Promise<boolean> => {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`${type} webhook failed with status: ${response.status}`);
      return false;
    }

    console.log(`${type} webhook sent successfully`);
    return true;
  } catch (error) {
    console.error(`Error sending ${type} webhook:`, error);
    return false;
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { payload, config }: { payload: WebhookPayload; config: WebhookConfig } = await req.json();

    const results = {
      slack: false,
      email: false,
      zapier: false,
    };

    // Send Slack webhook
    if (config.slack_webhook_url) {
      const slackPayload = formatSlackMessage(payload);
      results.slack = await sendWebhook(config.slack_webhook_url, slackPayload, 'slack');
    }

    // Send Email webhook
    if (config.email_webhook_url) {
      results.email = await sendWebhook(config.email_webhook_url, payload, 'email');
    }

    // Send Zapier webhook
    if (config.zapier_webhook_url) {
      results.zapier = await sendWebhook(config.zapier_webhook_url, payload, 'zapier');
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-webhook function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);