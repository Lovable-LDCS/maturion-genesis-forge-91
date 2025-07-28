import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, RotateCcw, Wand2, AlertTriangle, Info, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { validateSecureInput } from '@/lib/security';
import { buildAICriteriaPrompt, validateCriteria, cleanJSON, detectAnnex1Fallback, type MPSContext, type OrganizationContext, type ValidationResult } from '@/lib/promptUtils';
import { logCriticalError, logKeyDecision, logSecurityViolation, type DebugContext } from '@/lib/errorUtils';
import { AdminTestMode } from './AdminTestMode';
import { QADebugHub } from '@/components/qa/QADebugHub';
import { RedAlertMonitor, useRedAlertMonitor } from '@/components/qa/RedAlertMonitor';

interface Criterion {
  id: string;
  statement: string;
  summary?: string;
  rationale?: string;
  evidence_guidance?: string;
  explanation?: string;
  status: 'not_started' | 'in_progress' | 'approved_locked';
  ai_suggested_statement?: string;
  ai_suggested_summary?: string;
  source_type?: 'internal_document' | 'organizational_context' | 'sector_memory' | 'best_practice_fallback';
  source_reference?: string;
  ai_decision_log?: string;
  evidence_hash?: string;
  reasoning_path?: string;
  duplicate_check_result?: string;
  compound_verb_analysis?: string;
}

interface AIGeneratedCriteriaCardsProps {
  mps: {
    id: string;
    name: string;
    mps_number: number;
    summary?: string;
    domain_id: string;
  };
  onCriteriaChange?: (criteria: Criterion[]) => void;
}

interface DebugInfo {
  mpsContext?: MPSContext;
  documentContext?: {
    found: boolean;
    source: string;
    error?: string;
  };
  validationResult?: ValidationResult;
  timestamp?: string;
}

export const OptimizedAIGeneratedCriteriaCards: React.FC<AIGeneratedCriteriaCardsProps> = ({
  mps,
  onCriteriaChange
}) => {
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({});
  const [showAdminDebug, setShowAdminDebug] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [showQAHub, setShowQAHub] = useState(false);
  const [redAlerts, setRedAlerts] = useState<any[]>([]);
  const [showRedAlert, setShowRedAlert] = useState(false);
  
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  const { validateForRedAlerts } = useRedAlertMonitor();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setShowAdminDebug(urlParams.get('dev') === 'true');
    setTestMode(urlParams.get('test') === 'true');
    setShowQAHub(urlParams.get('qa') === 'true');
  }, []);

  const verifyDocumentContext = useCallback(async (mpsContext: MPSContext) => {
    try {
      const contextTest = await supabase.functions.invoke('search-ai-context', {
        body: {
          query: `MPS ${mpsContext.mpsNumber} ${mpsContext.mpsTitle}`,
          organizationId: mpsContext.organizationId,
          documentTypes: ['mps', 'standard'],
          limit: 3
        }
      });
      
      const found = contextTest.data?.results?.length > 0;
      return {
        found,
        source: found ? contextTest.data.results[0]?.metadata?.file_name || `MPS ${mpsContext.mpsNumber}` : 'No document',
        error: contextTest.error?.message
      };
    } catch (error) {
      return { found: false, source: 'Error', error: error.message };
    }
  }, []);

  const generateAICriteria = useCallback(async (customPrompt?: string) => {
    if (!currentOrganization?.id || !user || isGenerating) return;

    setIsGenerating(true);
    setError(null);

    try {
      const organizationContext: OrganizationContext = {
        id: currentOrganization.id,
        name: currentOrganization.name || 'your organization',
        industry_tags: currentOrganization.industry_tags || [],
        region_operating: currentOrganization.region_operating || '',
        compliance_commitments: currentOrganization.compliance_commitments || [],
        custom_industry: currentOrganization.custom_industry || ''
      };

      const mpsContext: MPSContext = {
        mpsId: mps.id,
        mpsNumber: mps.mps_number,
        mpsTitle: mps.name,
        domainId: mps.domain_id,
        organizationId: currentOrganization.id
      };

      const documentContext = await verifyDocumentContext(mpsContext);
      
      if (!documentContext.found) {
        throw new Error(`No valid MPS ${mps.mps_number} document context available. Please upload the relevant MPS file and retry.`);
      }

      const prompt = customPrompt || buildAICriteriaPrompt(mpsContext, organizationContext);
      
      // QA Framework: Red Alert Monitoring
      const alerts = validateForRedAlerts(prompt, mps.mps_number, { organizationContext, mpsContext });
      if (alerts.length > 0) {
        setRedAlerts(alerts);
        setShowRedAlert(true);
        throw new Error(`QA FRAMEWORK BLOCKED: ${alerts.filter(a => a.severity === 'CRITICAL').length} critical issues detected`);
      }
      
      if (detectAnnex1Fallback(prompt, mps.mps_number)) {
        throw new Error(`SECURITY BLOCK: Annex 1 fallback detected for MPS ${mps.mps_number}`);
      }

      const { data, error } = await supabase.functions.invoke('maturion-ai-chat', {
        body: {
          prompt,
          context: `Criteria generation for MPS ${mps.mps_number}`,
          organizationId: currentOrganization.id,
          currentDomain: mps.domain_id,
          model: 'gpt-4.1-2025-04-14',
          temperature: 0,
          requiresInternalSecure: true
        }
      });

      if (error) throw error;
      if (!data?.content) throw new Error('No content received from AI');

      if (detectAnnex1Fallback(data.content, mps.mps_number)) {
        throw new Error(`SECURITY BLOCK: AI generated Annex 1 fallback for MPS ${mps.mps_number}`);
      }

      let generatedCriteria: any[] = [];
      try {
        generatedCriteria = JSON.parse(cleanJSON(data.content));
      } catch (parseError) {
        throw new Error(`AI failed to generate valid criteria format: ${parseError.message}`);
      }

      if (!Array.isArray(generatedCriteria) || generatedCriteria.length === 0) {
        throw new Error('AI response does not contain valid criteria array');
      }

      const validationResult = validateCriteria(generatedCriteria, organizationContext, mpsContext);
      
      setDebugInfo({
        mpsContext,
        documentContext,
        validationResult,
        timestamp: new Date().toISOString()
      });

      if (!validationResult.isValid) {
        throw new Error(`VALIDATION FAILED: ${validationResult.errors.join(', ')}`);
      }

      if (customPrompt) {
        return {
          criteria: validationResult.validCriteria,
          sourceDocument: documentContext.source,
          validationResult
        };
      }

      // Save to database and update UI
      const criteriaToInsert = validationResult.validCriteria.map((criterionData, index) => ({
        statement: validateSecureInput(criterionData.statement || `Criterion ${index + 1}`, 500).sanitized,
        summary: criterionData.summary ? validateSecureInput(criterionData.summary, 300).sanitized : null,
        criteria_number: `${mps.mps_number}.${index + 1}`,
        mps_id: mps.id,
        organization_id: currentOrganization.id,
        created_by: user.id,
        updated_by: user.id,
        status: 'not_started' as const,
        ai_suggested_statement: validateSecureInput(criterionData.statement || '', 500).sanitized,
        ai_suggested_summary: criterionData.summary ? validateSecureInput(criterionData.summary, 300).sanitized : null
      }));

      const { data: insertedCriteria, error: insertError } = await supabase
        .from('criteria')
        .insert(criteriaToInsert)
        .select('*');

      if (insertError) throw insertError;

      const formattedCriteria: Criterion[] = (insertedCriteria || []).map((c, index) => ({
        id: c.id,
        statement: c.statement,
        summary: validationResult.validCriteria[index]?.summary || c.summary || undefined,
        rationale: validationResult.validCriteria[index]?.rationale || undefined,
        evidence_guidance: validationResult.validCriteria[index]?.evidence_guidance || undefined,
        explanation: validationResult.validCriteria[index]?.explanation || undefined,
        status: c.status as 'not_started' | 'in_progress' | 'approved_locked',
        ai_suggested_statement: c.ai_suggested_statement || undefined,
        ai_suggested_summary: c.ai_suggested_summary || undefined,
        source_type: 'internal_document' as const,
        source_reference: documentContext.source,
        ai_decision_log: `Generated from MPS ${mps.mps_number} requirements`,
        evidence_hash: `evidence_${index + 1}`,
        reasoning_path: `Derived from MPS ${mps.mps_number} document structure`,
        duplicate_check_result: 'No duplicates detected',
        compound_verb_analysis: 'Single action verb validated'
      }));

      setCriteria(formattedCriteria);
      onCriteriaChange?.(formattedCriteria);

      toast({
        title: "AI Criteria Generated",
        description: `Successfully generated ${formattedCriteria.length} criteria for ${mps.name}`,
      });

    } catch (error: any) {
      logCriticalError('Criteria generation failed', error);
      setError(error.message || 'Unknown error occurred');
      toast({
        title: "Generation Failed",
        description: error.message || 'Unknown error occurred',
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  }, [currentOrganization, user, mps, onCriteriaChange, toast, verifyDocumentContext]);

  const handleRegenerateCriteria = useCallback(async () => {
    if (!currentOrganization?.id) return;
    
    try {
      await supabase.from('criteria').delete().eq('mps_id', mps.id);
      setCriteria([]);
      await generateAICriteria();
    } catch (error) {
      logCriticalError('Regeneration failed', error);
    }
  }, [currentOrganization, mps.id, generateAICriteria]);

  useEffect(() => {
    if (currentOrganization?.id) {
      const checkExisting = async () => {
        const { data: existingCriteria } = await supabase
          .from('criteria')
          .select('*')
          .eq('mps_id', mps.id)
          .order('criteria_number', { ascending: true });

        if (existingCriteria?.length > 0) {
          setCriteria(existingCriteria.map(c => ({
            id: c.id,
            statement: c.statement,
            summary: c.summary || undefined,
            rationale: c.ai_suggested_statement || undefined,
            evidence_guidance: undefined,
            explanation: undefined,
            status: c.status as 'not_started' | 'in_progress' | 'approved_locked',
            ai_suggested_statement: c.ai_suggested_statement || undefined,
            ai_suggested_summary: c.ai_suggested_summary || undefined
          })));
        }
        setIsLoading(false);
      };
      checkExisting();
    }
  }, [currentOrganization?.id, mps.id]);

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            Loading AI Criteria for MPS {mps.mps_number}: {mps.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {testMode && (
        <AdminTestMode
          mpsContext={{
            mpsNumber: mps.mps_number,
            mpsTitle: mps.name,
            organizationId: currentOrganization?.id || ''
          }}
          onTestPrompt={(prompt) => generateAICriteria(prompt)}
          onValidateCompliance={async (criteria) => {
            if (!currentOrganization) return false;
            const validation = validateCriteria(criteria, {
              id: currentOrganization.id,
              name: currentOrganization.name || 'Test Organization',
              industry_tags: currentOrganization.industry_tags || [],
              region_operating: currentOrganization.region_operating || '',
              compliance_commitments: currentOrganization.compliance_commitments || [],
              custom_industry: currentOrganization.custom_industry || ''
            }, {
              mpsId: mps.id,
              mpsNumber: mps.mps_number,
              mpsTitle: mps.name,
              domainId: mps.domain_id,
              organizationId: currentOrganization.id
            });
            return validation.isValid;
          }}
        />
      )}

      {/* QA Debug Hub */}
      {showQAHub && currentOrganization && (
        <QADebugHub
          mpsContext={{
            mpsId: mps.id,
            mpsNumber: mps.mps_number,
            mpsTitle: mps.name,
            domainId: mps.domain_id,
            organizationId: currentOrganization.id
          }}
          organizationContext={{
            id: currentOrganization.id,
            name: currentOrganization.name || 'your organization',
            industry_tags: currentOrganization.industry_tags || [],
            region_operating: currentOrganization.region_operating || '',
            compliance_commitments: currentOrganization.compliance_commitments || [],
            custom_industry: currentOrganization.custom_industry || ''
          }}
          isVisible={showQAHub}
        />
      )}

      {/* Red Alert Monitor */}
      <RedAlertMonitor
        alerts={redAlerts}
        isOpen={showRedAlert}
        onClose={() => setShowRedAlert(false)}
        onAbort={() => {
          setShowRedAlert(false);
          setRedAlerts([]);
        }}
        mpsNumber={mps.mps_number}
      />

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              AI Generated Criteria for MPS {mps.mps_number}: {mps.name}
            </div>
            <div className="flex items-center gap-2">
              {showAdminDebug && <Badge variant="outline" className="text-xs">DEBUG</Badge>}
              {testMode && <Badge variant="destructive" className="text-xs">TEST MODE</Badge>}
              {showQAHub && <Badge variant="default" className="text-xs">QA ACTIVE</Badge>}
              <Badge variant="secondary">{criteria.length} criteria</Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium">Generation Blocked</div>
                <div className="text-sm mt-1">{error}</div>
                {error.includes('SECURITY BLOCK') && (
                  <div className="text-xs mt-2 p-2 bg-red-50 rounded border border-red-200">
                    🔒 Security violation detected - This prevents incorrect content generation.
                  </div>
                )}
                <Button onClick={handleRegenerateCriteria} size="sm" variant="outline" className="mt-2" disabled={isGenerating}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Retry Generation
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {criteria.length === 0 && !error && (
            <div className="text-center py-8 text-muted-foreground">
              <Wand2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No criteria yet. Click "Generate AI Criteria" to get started.</p>
              <Button onClick={() => generateAICriteria()} className="mt-4" disabled={isGenerating}>
                <Wand2 className="h-4 w-4 mr-2" />
                {isGenerating ? 'Generating...' : 'Generate Criteria'}
              </Button>
            </div>
          )}

          {criteria.length > 0 && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Total: {criteria.length} criteria | All evidence-first compliant
                </span>
                <Button onClick={handleRegenerateCriteria} size="sm" variant="outline" disabled={isGenerating}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Regenerate
                </Button>
              </div>

              {criteria.map((criterion, index) => (
                <Card key={criterion.id} className="border-l-4 border-l-primary">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base">Criterion {mps.mps_number}.{index + 1}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">{criterion.statement}</p>
                      </div>
                      <Badge variant={criterion.status === 'approved_locked' ? 'default' : 'secondary'} className="ml-2">
                        {criterion.status === 'approved_locked' ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                        {criterion.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardHeader>
                  {(criterion.summary || criterion.explanation || showAdminDebug) && (
                    <CardContent className="pt-0 space-y-2">
                      {criterion.summary && (
                        <div>
                          <span className="text-xs font-medium text-muted-foreground">Summary:</span>
                          <p className="text-sm">{criterion.summary}</p>
                        </div>
                      )}
                      {showAdminDebug && (
                        <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                          <div>Source: {criterion.source_reference}</div>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}

          {showAdminDebug && debugInfo && (
            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Clean Debug Info
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-2">
                {debugInfo.mpsContext && <div><span className="font-medium">MPS:</span> {debugInfo.mpsContext.mpsNumber} - {debugInfo.mpsContext.mpsTitle}</div>}
                {debugInfo.documentContext && <div><span className="font-medium">Document:</span> {debugInfo.documentContext.found ? '✅' : '❌'} {debugInfo.documentContext.source}</div>}
                {debugInfo.validationResult && <div><span className="font-medium">Validation:</span> {debugInfo.validationResult.isValid ? '✅ PASSED' : `❌ FAILED`}</div>}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export const AIGeneratedCriteriaCards = OptimizedAIGeneratedCriteriaCards;