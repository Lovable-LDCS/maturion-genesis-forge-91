-- Add webhook URL columns to organizations table
ALTER TABLE organizations ADD COLUMN slack_webhook_url TEXT;
ALTER TABLE organizations ADD COLUMN email_webhook_url TEXT;
ALTER TABLE organizations ADD COLUMN zapier_webhook_url TEXT;