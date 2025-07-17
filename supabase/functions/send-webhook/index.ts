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
  const eventMessages: Record<string, string> = {
    milestone_signed_off: `✅ Milestone "${payload.data?.milestone_name}" has been signed off`,
    milestone_updated: `🔄 Milestone "${payload.data?.milestone_name}" has been updated`,
    team_member_added: `👋 New member added to the organization`,
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
            text: `Organization ID: ${payload.organization_id} | ${payload.timestamp}`
          }
        ]
      }
    ]
  };
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