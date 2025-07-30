import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, RotateCcw, Wand2, AlertTriangle, Info, Shield, Settings } from 'lucide-react';
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
import { MPSTargetedReprocessor } from '@/components/qa/MPSTargetedReprocessor';
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
  organizationContext?: OrganizationContext;
  documentContext?: any;
  promptPreview?: string;
  promptLength?: number;
  timestamp?: string;
}

export function AIGeneratedCriteriaCards({ mps, onCriteriaChange }: AIGeneratedCriteriaCardsProps) {
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  const [showAdminDebug, setShowAdminDebug] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [showQAHub, setShowQAHub] = useState(false);
  
  // QA Framework Integration
  const [redAlerts, setRedAlerts] = useState<any[]>([]);
  const [showRedAlert, setShowRedAlert] = useState(false);
  const { validateForRedAlerts } = useRedAlertMonitor();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setShowAdminDebug(urlParams.get('dev') === 'true');
    setTestMode(urlParams.get('test') === 'true');
    setShowQAHub(urlParams.get('qa') === 'true');
  }, []);

  const verifyDocumentContext = useCallback(async (mpsContext: MPSContext) => {
    try {
      console.log(`🔍 Verifying document context for MPS ${mpsContext.mpsNumber}`);
      
      const contextTest = await supabase.functions.invoke('search-ai-context', {
        body: {
          query: `MPS ${mpsContext.mpsNumber} ${mpsContext.mpsTitle}`,
          organizationId: mpsContext.organizationId,
          documentTypes: ['mps_document', 'mps', 'standard'],
          limit: 3,
          threshold: 0.4,
          mpsNumber: mpsContext.mpsNumber
        }
      });

      const hasValidContext = contextTest.data?.results?.length > 0;
      const contextSources = contextTest.data?.results?.map((r: any) => r.metadata?.source || 'Unknown source').join(', ') || 'No sources';
      
      console.log(`📋 Document context check result:`, {
        found: hasValidContext,
        sources: contextSources,
        resultCount: contextTest.data?.results?.length || 0
      });

      if (hasValidContext) {
        return {
          found: true,
          source: contextSources,
          resultCount: contextTest.data.results.length
        };
      } else {
        return {
          found: false,
          source: 'No Document Context',
          error: 'No matching document content found for this MPS'
        };
      }
    } catch (error) {
      console.error('Document verification error:', error);
      return { found: false, source: 'Verification Error', error: error.message };
    }
  }, []);

  // 🚨 CRITICAL FUNCTION: Clean placeholder patterns that trigger QA violations
  const cleanPlaceholderPatterns = useCallback((inputPrompt: string): string => {
    console.log('🧹 CLEANING PLACEHOLDER PATTERNS from prompt...');
    let cleaned = inputPrompt;
    
    // Remove all forms of "Criterion [A-Z]" that trigger QA violations
    cleaned = cleaned.replace(/Criterion\s*\[A-Z\]/gi, '');
    cleaned = cleaned.replace(/Criterion\s+[A-Z]/gi, '');
    cleaned = cleaned.replace(/Assessment criterion\s*\[?\d+\]?/gi, '');
    cleaned = cleaned.replace(/\[INSERT.*?\]/gi, '');
    cleaned = cleaned.replace(/\[PLACEHOLDER.*?\]/gi, '');
    cleaned = cleaned.replace(/\[TODO.*?\]/gi, '');
    cleaned = cleaned.replace(/\[EXAMPLE.*?\]/gi, '');
    
    // Clean up formatting
    cleaned = cleaned.replace(/\s{2,}/g, ' ').replace(/\n\s*\n\s*\n/g, '\n\n').trim();
    
    console.log(`✅ PLACEHOLDER CLEANUP: Removed patterns, length change: ${inputPrompt.length} -> ${cleaned.length}`);
    return cleaned;
  }, []);

  const generateAICriteria = useCallback(async (customPrompt?: string) => {
    if (!currentOrganization?.id || !user || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    setRedAlerts([]);
    setShowRedAlert(false);

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
        console.warn(`⚠️ Limited context for MPS ${mps.mps_number} - AI will use enhanced reasoning`);
      }

      // Build the prompt with evidence-first enforcement
      const finalPrompt = customPrompt || `
Generate professional assessment criteria for **${mps.name}** (MPS ${mps.mps_number}) at ${organizationContext.name}.

**CONTEXT:**
- Target organization: ${organizationContext.name}
- ABSOLUTE PROHIBITION: Never use placeholder patterns like "Assessment criterion" or generic templates

**MANDATORY EVIDENCE-FIRST FORMAT - CRITICAL VALIDATION RULES:**

🔴 ABSOLUTE REQUIREMENT: Every single criterion MUST start with "A [qualifier] [document_type]"
🔴 ZERO TOLERANCE: Any criterion not starting with "A " followed by a qualifier and document type will be REJECTED

✅ EXACT SENTENCE STRUCTURE (NO EXCEPTIONS):
"A [QUALIFIER] [DOCUMENT_TYPE] that [ACTION_VERB] [REQUIREMENT] for ${mpsContext.mpsTitle.toLowerCase()} at ${organizationContext.name}."

✅ APPROVED QUALIFIERS (use EXACTLY as written):
documented, formal, quarterly, annual, comprehensive, detailed, written, approved, maintained, updated, current, complete

✅ APPROVED DOCUMENT TYPES (use EXACTLY as written):
risk register, policy, report, document, procedure, assessment, analysis, review, register, record, log, matrix, framework, standard, guideline, charter, plan

🔴 FORBIDDEN SENTENCE STARTERS (WILL CAUSE IMMEDIATE REJECTION):
- ANY organization name including "${organizationContext.name}"
- "The organization", "Management", "Leadership", "Executive", "Board", "Company", "Team"
- "Personnel", "Staff", "Employees", "Users", "Stakeholders"
- "Systems", "Processes", "Controls", "Measures"
- ANY pronoun: "They", "It", "We", "You"
- ANY verb: "Must", "Should", "Will", "Can", "Ensure", "Maintain", "Establish"

✅ MANDATORY EXAMPLES (follow this EXACT pattern):
- "A documented policy that establishes governance oversight for ${mpsContext.mpsTitle.toLowerCase()} at ${organizationContext.name}."
- "A formal procedure that defines risk assessment processes for ${mpsContext.mpsTitle.toLowerCase()} at ${organizationContext.name}."
- "A comprehensive framework that outlines security controls for ${mpsContext.mpsTitle.toLowerCase()} at ${organizationContext.name}."

🔴 VALIDATION CHECK: Before generating, verify EVERY criterion starts with "A " + [approved qualifier] + [approved document type]

🔴 CRITICAL ENFORCEMENT: Every criterion statement MUST start with "A " followed by an approved qualifier and document type.

MANDATORY FORMAT VALIDATION:
- First word: "A" (article)
- Second word: MUST be one of: documented, formal, quarterly, annual, comprehensive, detailed, written, approved, maintained, updated, current, complete
- Third word: MUST be one of: risk register, policy, report, document, procedure, assessment, analysis, review, register, record, log, matrix, framework, standard, guideline, charter, plan
- NO OTHER STARTING PATTERNS ARE ACCEPTABLE

PRE-GENERATION SELF-CHECK:
Before generating each criterion, verify it starts with "A [qualifier] [document_type]"
If it doesn't, IMMEDIATELY rewrite to start with "A documented policy" or "A formal procedure"

EXAMPLES OF REQUIRED FORMAT:
✅ "A documented policy that establishes..."
✅ "A formal procedure that defines..."
✅ "A comprehensive framework that outlines..."

ABSOLUTELY FORBIDDEN STARTS:
❌ "${organizationContext.name} must..."
❌ "The organization shall..."
❌ "Management ensures..."
❌ "Leadership maintains..."
❌ "Staff should..."
❌ "Personnel must..."

VALIDATION RULE: If any criterion doesn't start with "A [qualifier] [document_type]", it will be automatically REJECTED.

Generate 8-12 specific criteria in JSON format based ONLY on the document content above:
[{"statement": "A [qualifier] [document_type] that [action] [requirement] for [context]", "summary": "brief explanation"}]`;

      // 🚨 CRITICAL: Clean placeholder patterns before sending to AI
      const cleanedPrompt = cleanPlaceholderPatterns(finalPrompt);
      
      console.log("🧠 Cleaned prompt being sent to AI:", cleanedPrompt.substring(0, 500) + '...');

      // QA Framework: Red Alert Monitoring
      const alerts = validateForRedAlerts(cleanedPrompt, mps.mps_number, { organizationContext, mpsContext });
      if (alerts.length > 0) {
        console.error('🚨 QA FRAMEWORK BLOCKED GENERATION:');
        alerts.forEach(alert => {
          console.error(`   ${alert.severity}: ${alert.message}`);
          if (alert.details) console.error(`   Details: ${alert.details}`);
        });
        setRedAlerts(alerts);
        setShowRedAlert(true);
        throw new Error(`QA FRAMEWORK BLOCKED: ${alerts.filter(a => a.severity === 'CRITICAL').length} critical issues detected`);
      }

      console.log("✅ Calling OpenAI with CLEANED prompt (placeholders removed), total tokens:", cleanedPrompt.length);
      const { data, error } = await supabase.functions.invoke('maturion-ai-chat', {
        body: {
          prompt: cleanedPrompt,
          context: `Criteria generation for MPS ${mps.mps_number} - ${mps.name}`,
          organizationId: currentOrganization.id,
          currentDomain: mps.domain_id,
          model: 'gpt-4.1-2025-04-14',
          temperature: 0.1,
          requiresInternalSecure: true,
          mpsNumber: mps.mps_number
        }
      });

      if (error) {
        console.error('AI Generation Error:', error);
        throw new Error(`AI generation failed: ${error.message}`);
      }

      console.log('✅ Raw AI Response received:', data?.response?.substring(0, 200) + '...');

      if (!data?.response) {
        throw new Error('No response received from AI service');
      }

      const cleanedResponse = cleanJSON(data.response);
      let parsedCriteria;

      try {
        parsedCriteria = JSON.parse(cleanedResponse);
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        console.log('Raw response that failed to parse:', data.response);
        throw new Error('Failed to parse AI response as JSON');
      }

      if (!Array.isArray(parsedCriteria)) {
        throw new Error('AI response is not an array of criteria');
      }

      const validationResult = validateCriteria(parsedCriteria, organizationContext, mpsContext);
      
      if (!validationResult.isValid) {
        console.error('Criteria validation failed:', validationResult.errors);
        setError(`Generated criteria failed validation: ${validationResult.errors.join(', ')}`);
        return;
      }

      const formattedCriteria: Criterion[] = parsedCriteria.map((criterion, index) => ({
        id: `temp-${index}`,
        statement: criterion.statement || '',
        summary: criterion.summary || '',
        explanation: criterion.explanation || criterion.rationale || '',
        status: 'not_started' as const,
        ai_suggested_statement: criterion.statement || '',
        ai_suggested_summary: criterion.summary || '',
        source_type: documentContext.found ? 'internal_document' : 'best_practice_fallback',
        source_reference: documentContext.source || 'AI Enhanced Generation',
        ai_decision_log: `Generated via AI for MPS ${mps.mps_number} with ${documentContext.found ? 'verified' : 'fallback'} context`,
        reasoning_path: `Evidence-first format validated, organization-specific content for ${organizationContext.name}`
      }));

      if (formattedCriteria.length === 0) {
        throw new Error('No valid criteria were generated');
      }

      console.log(`✅ Successfully generated ${formattedCriteria.length} criteria for MPS ${mps.mps_number}`);
      setCriteria(formattedCriteria);
      onCriteriaChange?.(formattedCriteria);

      toast({
        title: "Criteria Generated Successfully",
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
  }, [currentOrganization, user, mps, onCriteriaChange, toast, verifyDocumentContext, cleanPlaceholderPatterns, validateForRedAlerts]);

  const handleRegenerateCriteria = useCallback(async () => {
    if (!currentOrganization?.id) return;
    
    try {
      await supabase.from('criteria').delete().eq('mps_id', mps.id);
      setCriteria([]);
      await generateAICriteria();
    } catch (error) {
      logCriticalError('Regeneration failed', error);
    }
  }, [generateAICriteria, currentOrganization?.id, mps.id]);

  return (
    <div className="space-y-6">
      {/* QA Framework Alerts */}
      {showRedAlert && (
        <RedAlertMonitor 
          isOpen={showRedAlert}
          alerts={redAlerts}
          onClose={() => setShowRedAlert(false)}
          onAbort={() => setShowRedAlert(false)}
        />
      )}

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            AI-Generated Assessment Criteria
            <Badge variant="outline">MPS {mps.mps_number}</Badge>
          </CardTitle>
          <CardDescription>
            Generate evidence-based assessment criteria for {mps.name}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => generateAICriteria()}
              disabled={isGenerating || !currentOrganization?.id}
              className="flex items-center gap-2"
            >
              <Wand2 className="h-4 w-4" />
              {isGenerating ? 'Generating...' : 'Generate Criteria'}
            </Button>
            
            {criteria.length > 0 && (
              <Button
                onClick={handleRegenerateCriteria}
                variant="outline"
                disabled={isGenerating}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Retry Generation
              </Button>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Generated Criteria Display */}
      {criteria.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Generated Criteria ({criteria.length})</h3>
          {criteria.map((criterion, index) => (
            <Card key={criterion.id} className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">
                    Criterion {index + 1}
                  </CardTitle>
                  <Badge variant="secondary">{criterion.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Statement</h4>
                  <p className="text-sm">{criterion.statement}</p>
                </div>
                {criterion.summary && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">Summary</h4>
                    <p className="text-sm text-muted-foreground">{criterion.summary}</p>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Info className="h-3 w-3" />
                  Source: {criterion.source_reference}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Debug Components - Temporarily disabled for core functionality */}
      {showAdminDebug && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-700">Debug mode enabled (components temporarily disabled)</p>
        </div>
      )}
      
      {showQAHub && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">QA Hub enabled (component temporarily disabled)</p>
        </div>
      )}
    </div>
  );
}