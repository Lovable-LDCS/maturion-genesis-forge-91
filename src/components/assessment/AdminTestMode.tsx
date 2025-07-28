/**
 * Admin Test Mode for Controlled Criteria Generation Testing
 * ADMIN ONLY: Allows injection of controlled prompts and source verification
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TestTube, FileText, Shield, CheckCircle, XCircle } from 'lucide-react';

interface AdminTestModeProps {
  mpsContext: {
    mpsNumber: number;
    mpsTitle: string;
    organizationId: string;
  };
  onTestPrompt: (prompt: string) => Promise<any>;
  onValidateCompliance: (criteria: any[]) => Promise<boolean>;
}

export const AdminTestMode: React.FC<AdminTestModeProps> = ({
  mpsContext,
  onTestPrompt,
  onValidateCompliance
}) => {
  const [testPrompt, setTestPrompt] = useState('');
  const [testResults, setTestResults] = useState<any>(null);
  const [sourceDocument, setSourceDocument] = useState<string | null>(null);
  const [complianceStatus, setComplianceStatus] = useState<boolean | null>(null);
  const [isTestMode, setIsTestMode] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const runControlledTest = async () => {
    if (!testPrompt.trim()) return;
    
    setIsTesting(true);
    try {
      // Step 1: Test prompt injection
      const results = await onTestPrompt(testPrompt);
      setTestResults(results);
      
      // Step 2: Log exact source document
      setSourceDocument(results.sourceDocument || 'Unknown');
      
      // Step 3: Validate Annex 2 compliance
      if (results.criteria) {
        const isCompliant = await onValidateCompliance(results.criteria);
        setComplianceStatus(isCompliant);
      }
      
    } catch (error) {
      console.error('Test failed:', error);
      setTestResults({ error: error.message });
    } finally {
      setIsTesting(false);
    }
  };

  const generateTestPrompt = () => {
    const samplePrompt = `TEST PROMPT for MPS ${mpsContext.mpsNumber} - ${mpsContext.mpsTitle}

CONTROLLED TEST CONDITIONS:
- Source Document: "MPS ${mpsContext.mpsNumber} - ${mpsContext.mpsTitle}.docx"
- Expected Output: Evidence-first criteria
- Forbidden: Any Annex 1 fallback, placeholder text
- Organization: Test Organization

Generate 3 test criteria that demonstrate proper evidence-first format for ${mpsContext.mpsTitle}.`;
    
    setTestPrompt(samplePrompt);
  };

  if (!isTestMode) {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Admin Test Mode
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Enable controlled prompt testing and source verification
            </span>
            <Switch
              checked={isTestMode}
              onCheckedChange={setIsTestMode}
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Admin Test Mode Active
            <Badge variant="destructive">TESTING</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>Admin Only:</strong> This mode allows controlled testing of AI criteria generation with custom prompts and source verification.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Target MPS</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-medium">
                  MPS {mpsContext.mpsNumber}
                </div>
                <div className="text-sm text-muted-foreground">
                  {mpsContext.mpsTitle}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  Source Document
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  {sourceDocument || 'Not detected'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Compliance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {complianceStatus === null ? (
                    <span className="text-sm text-muted-foreground">Pending</span>
                  ) : complianceStatus ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-600">Compliant</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm text-red-600">Non-compliant</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <label className="text-sm font-medium">Test Prompt:</label>
            <Textarea
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              placeholder="Enter custom test prompt..."
              className="mt-1"
              rows={6}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={generateTestPrompt}
              variant="outline"
              size="sm"
            >
              Generate Sample
            </Button>
            <Button
              onClick={runControlledTest}
              disabled={isTesting || !testPrompt.trim()}
              className="flex items-center gap-2"
            >
              {isTesting && <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />}
              Run Test
            </Button>
          </div>

          {testResults && (
            <Card className="bg-muted">
              <CardHeader>
                <CardTitle className="text-sm">Test Results</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs overflow-auto max-h-40">
                  {JSON.stringify(testResults, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}

          <div className="pt-2 border-t">
            <Button
              onClick={() => setIsTestMode(false)}
              variant="outline"
              size="sm"
            >
              Exit Test Mode
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};