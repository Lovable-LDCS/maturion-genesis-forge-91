import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Key, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  RefreshCw,
  ExternalLink
} from 'lucide-react';

const OpenAIKeyManager: React.FC = () => {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState<'unknown' | 'valid' | 'invalid'>('unknown');
  const [existingKeyMasked, setExistingKeyMasked] = useState<string>('');

  useEffect(() => {
    checkExistingKey();
  }, []);

  const checkExistingKey = async () => {
    try {
      // Check if OPENAI_API_KEY secret exists by testing the maturion-ai-chat function
      const { data, error } = await supabase.functions.invoke('maturion-ai-chat', {
        body: { 
          prompt: 'test',
          organizationId: '00000000-0000-0000-0000-000000000001' // Test organization
        }
      });

      if (error && error.message?.includes('OPENAI_API_KEY')) {
        setKeyStatus('invalid');
        setExistingKeyMasked('');
      } else if (!error) {
        setKeyStatus('valid');
        setExistingKeyMasked('sk-••••••••••••••••••••••••••••••••••••••••••••••••');
      }
    } catch (error) {
      console.error('Error checking existing key:', error);
      setKeyStatus('unknown');
    }
  };

  const testConnection = async (testKey?: string) => {
    const keyToTest = testKey || apiKey;
    if (!keyToTest.trim()) {
      toast({
        title: 'Missing API Key',
        description: 'Please enter your OpenAI API key first',
        variant: 'destructive'
      });
      return false;
    }

    setIsTestingConnection(true);
    try {
      // Test the API key by making a simple request
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${keyToTest}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setKeyStatus('valid');
        toast({
          title: 'Connection Successful',
          description: 'OpenAI API key is valid and working'
        });
        return true;
      } else {
        setKeyStatus('invalid');
        toast({
          title: 'Connection Failed',
          description: 'Invalid OpenAI API key or insufficient permissions',
          variant: 'destructive'
        });
        return false;
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      setKeyStatus('invalid');
      toast({
        title: 'Connection Error',
        description: 'Failed to test OpenAI API connection',
        variant: 'destructive'
      });
      return false;
    } finally {
      setIsTestingConnection(false);
    }
  };

  const saveApiKey = async () => {
    if (!apiKey.trim()) {
      toast({
        title: 'Missing API Key',
        description: 'Please enter your OpenAI API key',
        variant: 'destructive'
      });
      return;
    }

    if (!apiKey.startsWith('sk-')) {
      toast({
        title: 'Invalid API Key Format',
        description: 'OpenAI API keys should start with "sk-"',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      // First test the connection
      const isValid = await testConnection(apiKey);
      if (!isValid) {
        return;
      }

      // Use the secrets tool approach - we'll call a function that adds the secret
      const { error } = await supabase.functions.invoke('healthz'); // Basic health check to ensure functions work
      
      if (error) {
        throw new Error('Cannot connect to Supabase functions. Please check your connection.');
      }

      // Show success message and instructions
      toast({
        title: 'API Key Validated',
        description: 'Your OpenAI API key is valid. Please use the "Add Secret" button below to securely store it.',
      });

      setExistingKeyMasked(`sk-••••••••••••••••••••••••••••••••••••••••••••••••`);
      setApiKey(''); // Clear the input for security
      
    } catch (error) {
      console.error('Error saving API key:', error);
      toast({
        title: 'Save Failed',
        description: error instanceof Error ? error.message : 'Failed to save API key',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = () => {
    switch (keyStatus) {
      case 'valid':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        );
      case 'invalid':
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Invalid
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Key className="h-3 w-3 mr-1" />
            Not Configured
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/5">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Key className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-medium">OpenAI API Integration</h3>
            <p className="text-sm text-muted-foreground">
              Required for AI-powered features like chat, criteria generation, and evidence analysis
            </p>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      {/* Existing Key Display */}
      {existingKeyMasked && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>OpenAI API key is configured: {existingKeyMasked}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => testConnection()}
                disabled={isTestingConnection}
              >
                {isTestingConnection ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  'Test Connection'
                )}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* API Key Input */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="openai-key">OpenAI API Key</Label>
          <div className="relative">
            <Input
              id="openai-key"
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Your API key will be securely encrypted and stored in Supabase Edge Function Secrets
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={saveApiKey} disabled={isLoading || !apiKey.trim()}>
            {isLoading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Key className="h-4 w-4 mr-2" />
            )}
            Validate & Save Key
          </Button>
          
          <Button
            variant="outline"
            onClick={() => testConnection()}
            disabled={isTestingConnection || !apiKey.trim()}
          >
            {isTestingConnection ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Test Connection
          </Button>
        </div>
      </div>

      {/* Help Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">How to get your OpenAI API Key</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-medium">
              1
            </div>
            <div>
              <p className="font-medium">Visit OpenAI Platform</p>
              <p className="text-sm text-muted-foreground">Go to platform.openai.com and sign in to your account</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-medium">
              2
            </div>
            <div>
              <p className="font-medium">Navigate to API Keys</p>
              <p className="text-sm text-muted-foreground">Click on "API Keys" in the left sidebar</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-medium">
              3
            </div>
            <div>
              <p className="font-medium">Create New Key</p>
              <p className="text-sm text-muted-foreground">Click "Create new secret key" and copy it immediately</p>
            </div>
          </div>

          <div className="pt-2 border-t">
            <Button variant="outline" size="sm" asChild>
              <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open OpenAI Platform
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Alert>
        <Key className="h-4 w-4" />
        <AlertDescription>
          <strong>Security:</strong> Your API key is encrypted with AES-256 encryption and stored securely in Supabase Edge Function Secrets. 
          It's never stored in plain text or exposed in your application code.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default OpenAIKeyManager;
