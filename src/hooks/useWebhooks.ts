import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type WebhookEventType = 
  | 'milestone_signed_off'
  | 'evidence_uploaded'
  | 'audit_finding_raised'
  | 'risk_level_increased'
  | 'team_member_added'
  | 'maturity_score_updated'
  | 'qa_signoff_completed'
  | 'organization_registered'
  | 'milestone_updated'
  | 'team_member_removed'
  | 'team_invite_accepted'
  | 'team_invite_declined'
  | 'organization_edited'
  | 'organization_deleted';

interface WebhookPayload {
  event_type: WebhookEventType;
  organization_id: string;
  user_id?: string;
  timestamp: string;
  data?: any;
}

export const useWebhooks = () => {
  const { user } = useAuth();

  const triggerWebhook = async (
    organizationId: string,
    eventType: WebhookEventType,
    data?: any
  ) => {
    try {
      // Get organization settings to check webhook URLs
      const { data: orgData, error } = await supabase
        .from('organizations')
        .select('slack_webhook_url, email_webhook_url, zapier_webhook_url')
        .eq('id', organizationId)
        .single();

      if (error || !orgData) {
        console.error('Failed to get organization webhook settings:', error);
        return;
      }

      // Check if any webhooks are configured
      const hasWebhooks = orgData.slack_webhook_url || 
                         orgData.email_webhook_url || 
                         orgData.zapier_webhook_url;

      if (!hasWebhooks) {
        return; // No webhooks configured, skip silently
      }

      const payload: WebhookPayload = {
        event_type: eventType,
        organization_id: organizationId,
        user_id: user?.id,
        timestamp: new Date().toISOString(),
        data
      };

      const config = {
        slack_webhook_url: orgData.slack_webhook_url,
        email_webhook_url: orgData.email_webhook_url,
        zapier_webhook_url: orgData.zapier_webhook_url,
      };

      // Call edge function to send webhooks
      const { error: webhookError } = await supabase.functions.invoke('send-webhook', {
        body: { payload, config }
      });

      if (webhookError) {
        console.error('Webhook error:', webhookError);
      }
    } catch (error) {
      console.error('Error triggering webhook:', error);
      // Fail silently to not block the main operation
    }
  };

  const testWebhook = async (
    organizationId: string,
    webhookType: 'slack' | 'email' | 'zapier',
    webhookUrl: string
  ) => {
    try {
      const payload: WebhookPayload = {
        event_type: 'organization_edited',
        organization_id: organizationId,
        user_id: user?.id,
        timestamp: new Date().toISOString(),
        data: { message: 'This is a test webhook' }
      };

      const config = {
        [`${webhookType}_webhook_url`]: webhookUrl
      };

      const { error } = await supabase.functions.invoke('send-webhook', {
        body: { payload, config }
      });

      return !error;
    } catch (error) {
      console.error('Test webhook error:', error);
      return false;
    }
  };

  return {
    triggerWebhook,
    testWebhook
  };
};