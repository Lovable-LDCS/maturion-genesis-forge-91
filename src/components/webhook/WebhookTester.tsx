import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useWebhooks } from '@/hooks/useWebhooks';
import { useOrganization } from '@/hooks/useOrganization';
import { 
  Send, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Clock,
  Webhook,
  AlertCircle,
  Zap
} from 'lucide-react';

interface WebhookTestResult {
  success: boolean;
  status?: number;
  message: string;
  timestamp: string;
  responseTime?: number;
}

const WebhookTester: React.FC = () => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookType, setWebhookType] = useState<'slack' | 'email' | 'zapier'>('slack');
  const [eventType, setEventType] = useState('test');
  const [customPayload, setCustomPayload] = useState('{"event": "custom", "data": {"message": "Custom test for Slack", "channel": "#general"}}');
  const [useCustomPayload, setUseCustomPayload] = useState(false);
  
  // Debug logging
  console.log('WebhookTester state:', { useCustomPayload, customPayload: customPayload.length });
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<WebhookTestResult[]>([]);
  
  const { toast } = useToast();
  const { testWebhook } = useWebhooks();
  const { currentOrganization } = useOrganization();

  const predefinedEventTypes = [
    { value: 'test', label: 'Test Event' },
    { value: 'milestone_signed_off', label: 'Milestone Signed Off' },
    { value: 'milestone_updated', label: 'Milestone Updated' },
    { value: 'team_member_added', label: 'Team Member Added' },
    { value: 'team_member_removed', label: 'Team Member Removed' },
    { value: 'team_invite_accepted', label: 'Team Invite Accepted' },
    { value: 'organization_edited', label: 'Organization Edited' },
  ];

  const generateTestPayload = () => {
    const basePayload = {
      event_type: eventType,
      organization_id: currentOrganization?.id || 'test-org-id',
      timestamp: new Date().toISOString(),
      data: {
        message: `Test webhook from QA interface - ${eventType}`,
        test_mode: true,
      }
    };

    switch (eventType) {
      case 'milestone_signed_off':
        return {
          ...basePayload,
          data: {
            ...basePayload.data,
            milestone_id: 'test-milestone-123',
            milestone_name: 'Foundation Setup',
            completion_percentage: 100,
          }
        };
      case 'team_member_added':
        return {
          ...basePayload,
          data: {
            ...basePayload.data,
            member_email: 'test@example.com',
            member_role: 'member',
          }
        };
      default:
        return basePayload;
    }
  };

  const handleSendTest = async () => {
    if (!webhookUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a webhook URL",
        variant: "destructive",
      });
      return;
    }

    if (!currentOrganization) {
      toast({
        title: "Error",
        description: "No organization selected",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const startTime = Date.now();

    try {
      let success = false;
      
      if (useCustomPayload && customPayload.trim()) {
        // Direct fetch for custom payloads
        try {
          JSON.parse(customPayload); // Validate JSON
          const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            mode: 'no-cors',
            body: customPayload,
          });
          success = true;
        } catch (error) {
          console.error('Custom payload test error:', error);
          success = false;
        }
      } else {
        // Use the existing testWebhook function
        success = await testWebhook(currentOrganization.id, webhookType, webhookUrl);
      }

      const responseTime = Date.now() - startTime;
      const result: WebhookTestResult = {
        success,
        message: success 
          ? "Webhook test sent successfully. Check your webhook handler for the payload." 
          : "Failed to send webhook test. Check the URL and try again.",
        timestamp: new Date().toISOString(),
        responseTime,
      };

      setTestResults(prev => [result, ...prev.slice(0, 9)]); // Keep last 10 results

      toast({
        title: success ? "Test Sent" : "Test Failed",
        description: result.message,
        variant: success ? "default" : "destructive",
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const result: WebhookTestResult = {
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        responseTime,
      };

      setTestResults(prev => [result, ...prev.slice(0, 9)]);

      toast({
        title: "Test Failed",
        description: result.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadOrganizationWebhook = (type: 'slack' | 'email' | 'zapier') => {
    if (!currentOrganization) return;
    
    const webhookUrls = {
      slack: currentOrganization.slack_webhook_url,
      email: currentOrganization.email_webhook_url,
      zapier: currentOrganization.zapier_webhook_url,
    };
    
    const url = webhookUrls[type];
    if (url) {
      setWebhookUrl(url);
      setWebhookType(type);
      toast({
        title: "Loaded",
        description: `Loaded ${type} webhook URL from organization settings`,
      });
    } else {
      toast({
        title: "Not Found",
        description: `No ${type} webhook URL configured for this organization`,
        variant: "destructive",
      });
    }
  };

  const getResultIcon = (result: WebhookTestResult) => {
    if (result.success) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            <CardTitle>Webhook Testing Utility</CardTitle>
          </div>
          <CardDescription>
            Test webhook endpoints with predefined or custom payloads to validate integrations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Load Organization Webhooks */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Quick Load Organization Webhooks</Label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadOrganizationWebhook('slack')}
                className="flex items-center gap-1"
              >
                <Zap className="h-3 w-3" />
                Load Slack
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadOrganizationWebhook('email')}
                className="flex items-center gap-1"
              >
                <Zap className="h-3 w-3" />
                Load Email
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadOrganizationWebhook('zapier')}
                className="flex items-center gap-1"
              >
                <Zap className="h-3 w-3" />
                Load Zapier
              </Button>
            </div>
          </div>

          {/* Webhook Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="webhook-url">Webhook URL</Label>
              <Input
                id="webhook-url"
                type="url"
                placeholder="https://hooks.slack.com/services/..."
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="webhook-type">Webhook Type</Label>
              <Select value={webhookType} onValueChange={(value: 'slack' | 'email' | 'zapier') => setWebhookType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="slack">Slack</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="zapier">Zapier</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Event Type Selection */}
          <div>
            <Label htmlFor="event-type">Event Type</Label>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {predefinedEventTypes.map((event) => (
                  <SelectItem key={event.value} value={event.value}>
                    {event.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Payload Option */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="custom-payload"
                checked={useCustomPayload}
                onChange={(e) => {
                  console.log('Checkbox changed:', e.target.checked);
                  setUseCustomPayload(e.target.checked);
                }}
                className="rounded"
              />
              <Label htmlFor="custom-payload">Use Custom Payload</Label>
            </div>
            
            {useCustomPayload && (
              <div>
                <Label htmlFor="custom-payload-text">Custom JSON Payload</Label>
                <textarea
                  id="custom-payload-text"
                  placeholder='{"event": "custom", "data": {"message": "Custom test for Slack", "channel": "#general"}}'
                  value={customPayload}
                  onChange={(e) => {
                    console.log('Textarea onChange:', e.target.value);
                    setCustomPayload(e.target.value);
                  }}
                  onFocus={() => console.log('Textarea focused')}
                  onBlur={() => console.log('Textarea blurred')}
                  onClick={() => console.log('Textarea clicked')}
                  rows={6}
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-mono resize-y"
                  style={{ 
                    backgroundColor: 'white',
                    border: '2px solid #e2e8f0',
                    color: 'black'
                  }}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter valid JSON. For Slack: use "text" field for messages or "blocks" for rich formatting.
                </p>
              </div>
            )}
            
            {!useCustomPayload && (
              <div className="bg-muted/50 p-3 rounded-md">
                <Label className="text-sm font-medium">Preview Payload:</Label>
                <pre className="text-xs mt-1 text-muted-foreground">
                  {JSON.stringify(generateTestPayload(), null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Send Test Button */}
          <Button 
            onClick={handleSendTest} 
            disabled={isLoading || !webhookUrl.trim()}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending Test...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Test Webhook
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Test Results
            </CardTitle>
            <CardDescription>
              Recent webhook test attempts and their outcomes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {testResults.map((result, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg border">
                  {getResultIcon(result)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={result.success ? "default" : "destructive"}>
                        {result.success ? "Success" : "Failed"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(result.timestamp).toLocaleTimeString()}
                      </span>
                      {result.responseTime && (
                        <span className="text-xs text-muted-foreground">
                          ({result.responseTime}ms)
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{result.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Testing Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>• <strong>Slack:</strong> Use incoming webhook URLs from your Slack app</p>
            <p>• <strong>Zapier:</strong> Use webhook URLs from Zapier triggers</p>
            <p>• <strong>Email:</strong> Test email webhook endpoints (if configured)</p>
            <p>• <strong>CORS:</strong> Some webhooks may show as failed due to CORS restrictions, but the request is still sent</p>
            <p>• <strong>Custom Payloads:</strong> Must be valid JSON format</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WebhookTester;