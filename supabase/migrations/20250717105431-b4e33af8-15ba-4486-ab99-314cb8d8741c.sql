-- This is a one-time update to save the user's Slack webhook URL
-- Since this is an organization-specific update, we'll need to handle this in the application

-- Instead, let's verify the webhook URL column exists and is accessible
SELECT slack_webhook_url FROM organizations LIMIT 1;