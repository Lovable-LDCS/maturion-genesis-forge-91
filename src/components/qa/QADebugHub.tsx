import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Download, AlertTriangle, CheckCircle, XCircle, Zap, FileText, Shield } from 'lucide-react';
import { validateCriteria, detectAnnex1Fallback, buildAICriteriaPrompt, type MPSContext, type OrganizationContext } from '@/lib/promptUtils';
import { logKeyDecision, logCriticalError } from '@/lib/errorUtils';
import { useToast } from '@/hooks/use-toast';

interface QADebugHubProps {
  mpsContext: MPSContext;
  organizationContext: OrganizationContext;
  isVisible?: boolean;
}

interface QAValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  prompt?: string;
  promptTokenCount?: number;
  criteria?: any[];
  timestamp: string;
}

export const QADebugHub: React.FC<QADebugHubProps> = ({
  mpsContext,
  organizationContext,
  isVisible = false
}) => {
  const [testPrompt, setTestPrompt] = useState('');
  const [validationResult, setValidationResult] = useState<QAValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const { toast } = useToast();

  const runQAValidation = useCallback(async (customPrompt?: string) => {
    setIsValidating(true);
    const timestamp = new Date().toISOString();
    
    try {
      // Build or use custom prompt
      const prompt = customPrompt || buildAICriteriaPrompt(mpsContext, organizationContext);
      const promptTokenCount = Math.ceil(prompt.length / 4); // Rough token estimation
      
      const errors: string[] = [];
      const warnings: string[] = [];
      
      // QA Rule 1: Prompt Token Limit Check
      if (promptTokenCount > 12000) {
        errors.push(`CRITICAL: Prompt exceeds 12,000 tokens (${promptTokenCount} tokens)`);
      }
      
      // QA Rule 2: Annex 1 Fallback Detection
      if (detectAnnex1Fallback(prompt, mpsContext.mpsNumber)) {
        if (mpsContext.mpsNumber === 1) {
          warnings.push('Annex 1 detected for MPS 1 (allowed)');
        } else {
          errors.push(`CRITICAL: Annex 1 fallback detected for MPS ${mpsContext.mpsNumber} (forbidden)`);
        }
      }
      
      // QA Rule 3: Placeholder Text Detection
      const placeholderPatterns = [
        /Assessment Criterion [0-9]/i,
        /Criterion [A-Z]/i,
        /\[PLACEHOLDER\]/i,
        /TBD/i,
        /TODO/i
      ];
      
      for (const pattern of placeholderPatterns) {
        if (pattern.test(prompt)) {
          errors.push(`CRITICAL: Placeholder text detected: ${pattern.source}`);
        }
      }
      
      // QA Rule 4: Evidence-First Structure Check
      if (!prompt.includes('evidence-first') && !prompt.includes('Evidence must be')) {
        warnings.push('Evidence-first enforcement may be missing from prompt');
      }
      
      // QA Rule 5: Organization Context Validation
      if (!prompt.includes(organizationContext.name) && organizationContext.name !== 'your organization') {
        warnings.push('Organization name may not be properly integrated in prompt');
      }
      
      // QA Rule 6: MPS Context Binding Check
      if (!prompt.includes(`MPS ${mpsContext.mpsNumber}`) || !prompt.includes(mpsContext.mpsTitle)) {
        errors.push(`CRITICAL: MPS ${mpsContext.mpsNumber} context not properly bound in prompt`);
      }
      
      // QA Rule 7: Domain Context Check
      if (!prompt.includes(mpsContext.domainId) && !prompt.toLowerCase().includes('leadership') && !prompt.toLowerCase().includes('governance')) {
        warnings.push('Domain context may be missing from prompt');
      }
      
      const result: QAValidationResult = {
        passed: errors.length === 0,
        errors,
        warnings,
        prompt,
        promptTokenCount,
        timestamp
      };
      
      setValidationResult(result);
      
      // Log the validation result
      logKeyDecision('QA Validation', {
        mpsNumber: mpsContext.mpsNumber,
        mpsTitle: mpsContext.mpsTitle,
        organizationId: organizationContext.id,
        documentFound: true, // Assuming validation means document context exists
        aiDecisionPath: ['QA_VALIDATION', result.passed ? 'PASSED' : 'FAILED'],
        fallbackTriggered: errors.some(e => e.includes('Annex 1')) ? {
          reason: 'Annex 1 fallback detected',
          source: 'QA Validation'
        } : undefined
      }, true);
      
      toast({
        title: result.passed ? "QA Validation Passed" : "QA Validation Failed",
        description: result.passed 
          ? `✅ All ${7} QA rules passed${warnings.length > 0 ? ` with ${warnings.length} warnings` : ''}`
          : `❌ ${errors.length} critical errors found`,
        variant: result.passed ? "default" : "destructive"
      });
      
    } catch (error) {
      logCriticalError('QA Validation Error', error);
      setValidationResult({
        passed: false,
        errors: [`System error during validation: ${error.message}`],
        warnings: [],
        timestamp
      });
    } finally {
      setIsValidating(false);
    }
  }, [mpsContext, organizationContext, toast]);

  const downloadQAReport = useCallback(() => {
    if (!validationResult) return;
    
    const report = {
      title: 'Maturion QA Validation Report',
      timestamp: validationResult.timestamp,
      mpsContext,
      organizationContext,
      validation: {
        passed: validationResult.passed,
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        promptTokenCount: validationResult.promptTokenCount
      },
      rules: [
        'Token Limit Check (12,000 max)',
        'Annex 1 Fallback Detection',
        'Placeholder Text Detection',
        'Evidence-First Structure',
        'Organization Context Validation',
        'MPS Context Binding',
        'Domain Context Check'
      ]
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qa-report-mps-${mpsContext.mpsNumber}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "QA Report Downloaded",
      description: "Validation report saved successfully"
    });
  }, [validationResult, mpsContext, toast]);

  if (!isVisible) return null;

  return (
    <Card className="w-full border-2 border-primary/20">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          QA Debug Hub - MPS {mpsContext.mpsNumber}
          <Badge variant="outline" className="ml-2">SUPERUSER</Badge>
        </CardTitle>
        <CardDescription>
          Continuous validation system enforcing 7 core QA rules before criteria generation
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Test Prompt Section */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Test Custom Prompt (Optional)</label>
          <Textarea
            placeholder="Enter custom prompt to validate, or leave empty to validate generated prompt..."
            value={testPrompt}
            onChange={(e) => setTestPrompt(e.target.value)}
            rows={4}
            className="font-mono text-xs"
          />
        </div>
        
        {/* Validation Controls */}
        <div className="flex gap-2">
          <Button 
            onClick={() => runQAValidation(testPrompt || undefined)}
            disabled={isValidating}
            className="flex items-center gap-2"
          >
            <Zap className="h-4 w-4" />
            {isValidating ? 'Validating...' : 'Run QA Validation'}
          </Button>
          
          {validationResult && (
            <Button
              onClick={downloadQAReport}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download Report
            </Button>
          )}
        </div>
        
        {/* Validation Results */}
        {validationResult && (
          <div className="space-y-3">
            <Alert variant={validationResult.passed ? "default" : "destructive"}>
              <div className="flex items-center gap-2">
                {validationResult.passed ? 
                  <CheckCircle className="h-4 w-4 text-green-600" /> : 
                  <XCircle className="h-4 w-4 text-red-600" />
                }
                <span className="font-medium">
                  QA Validation {validationResult.passed ? 'PASSED' : 'FAILED'}
                </span>
              </div>
              <AlertDescription className="mt-2">
                <div className="space-y-1 text-sm">
                  <div>Prompt Tokens: {validationResult.promptTokenCount?.toLocaleString()}</div>
                  <div>Timestamp: {new Date(validationResult.timestamp).toLocaleString()}</div>
                </div>
              </AlertDescription>
            </Alert>
            
            {/* Errors */}
            {validationResult.errors.length > 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-red-700">
                    <AlertTriangle className="h-4 w-4" />
                    Critical Errors ({validationResult.errors.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {validationResult.errors.map((error, index) => (
                    <div key={index} className="text-sm text-red-700 font-mono bg-red-100 p-2 rounded">
                      {error}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            
            {/* Warnings */}
            {validationResult.warnings.length > 0 && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-yellow-700">
                    <AlertTriangle className="h-4 w-4" />
                    Warnings ({validationResult.warnings.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {validationResult.warnings.map((warning, index) => (
                    <div key={index} className="text-sm text-yellow-700 font-mono bg-yellow-100 p-2 rounded">
                      {warning}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            
            {/* Prompt Preview */}
            {validationResult.prompt && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Validated Prompt (First 500 chars)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xs font-mono bg-muted p-3 rounded border max-h-32 overflow-y-auto">
                    {validationResult.prompt.substring(0, 500)}
                    {validationResult.prompt.length > 500 && '...'}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
        
        {/* QA Rules Reference */}
        <Card className="bg-muted/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Active QA Rules (7)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-1 text-xs">
              <div>✅ Token Limit Check (12,000 max)</div>
              <div>🚫 Annex 1 Fallback Detection</div>
              <div>🔍 Placeholder Text Detection</div>
              <div>📋 Evidence-First Structure</div>
              <div>🏢 Organization Context Validation</div>
              <div>🎯 MPS Context Binding</div>
              <div>📚 Domain Context Check</div>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};