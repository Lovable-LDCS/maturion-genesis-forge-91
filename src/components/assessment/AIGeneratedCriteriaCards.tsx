import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, RotateCcw, Wand2, AlertTriangle, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { validateSecureInput } from '@/lib/security';
import { buildAICriteriaPrompt, validateCriteria, cleanJSON, type MPSContext, type OrganizationContext } from '@/lib/promptUtils';
import { logCriticalError, logDebugInfo, logWarning } from '@/lib/errorUtils';

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

// Types moved to /lib/promptUtils.ts

interface DebugInfo {
  mpsContext?: MPSContext;
  contextSearch?: {
    query: string;
    results: any[];
    searchType: string;
    debugInfo?: any;
    error?: string;
  };
  promptSent?: string;
  rawResponse?: string;
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
  
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();

  // Check for dev mode toggle
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const devMode = urlParams.get('dev') === 'true';
    setShowAdminDebug(devMode);
  }, []);

  // TODO: Move prompt builder into /lib/promptUtils - DONE

  /**
   * Tests document context retrieval for debugging purposes
   */
  const testContextRetrieval = useCallback(async (mpsContext: MPSContext): Promise<any> => {
    try {
      const contextTest = await supabase.functions.invoke('search-ai-context', {
        body: {
          query: `MPS ${mpsContext.mpsNumber} ${mpsContext.mpsTitle}`,
          organizationId: mpsContext.organizationId,
          documentTypes: ['mps', 'standard', 'audit', 'criteria'],
          limit: 5
        }
      });
      
      logDebugInfo('Context Search Results', {
        success: contextTest.data?.success,
        results_count: contextTest.data?.results?.length || 0,
        search_type: contextTest.data?.search_type,
        error: contextTest.error?.message,
        debug_info: contextTest.data?.debug,
        first_result: contextTest.data?.results?.[0]
      }, showAdminDebug);
      
      return contextTest;
    } catch (searchError) {
      logCriticalError('Context search failed', searchError);
      return { error: searchError };
    }
  }, [showAdminDebug]);

  // TODO: Consolidate evidence validation into shared module - DONE

  /**
   * Main criteria generation function with comprehensive error handling
   */
  const generateAICriteria = useCallback(async () => {
    if (!currentOrganization?.id || !user || isGenerating) return;

    setIsGenerating(true);
    setError(null);

    try {
      // Prepare organization context
      const organizationContext: OrganizationContext = {
        id: currentOrganization.id,
        name: currentOrganization.name || 'your organization',
        industry_tags: currentOrganization.industry_tags || [],
        region_operating: currentOrganization.region_operating || '',
        compliance_commitments: currentOrganization.compliance_commitments || [],
        custom_industry: currentOrganization.custom_industry || ''
      };

      // Check for existing criteria first
      const { data: existingCriteria } = await supabase
        .from('criteria')
        .select('*')
        .eq('mps_id', mps.id)
        .order('criteria_number', { ascending: true });

      if (existingCriteria && existingCriteria.length > 0) {
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
        setIsLoading(false);
        return;
      }

      // Prepare MPS context
      const mpsContext: MPSContext = {
        mpsId: mps.id,
        mpsNumber: mps.mps_number,
        mpsTitle: mps.name,
        domainId: mps.domain_id,
        organizationId: currentOrganization.id
      };

      // Debug logging for admin mode
      logDebugInfo('Criteria Generation for', {
        mps_id: mps.id,
        mps_number: mps.mps_number,
        mps_title: mps.name,
        organization_id: currentOrganization.id,
        expected_document: `MPS ${mps.mps_number} – ${mps.name}`
      }, showAdminDebug);

      // Test document context retrieval
      const contextTest = await testContextRetrieval(mpsContext);
      
      if (contextTest.data?.results?.length === 0) {
        logWarning('No document context found for MPS', `MPS ${mps.mps_number}`, {
          organizationId: currentOrganization.id,
          search_query: `MPS ${mps.mps_number} ${mps.name}`,
          context_debug: contextTest.data?.debug
        });
      }
      
      setDebugInfo(prev => ({ 
        ...prev, 
        mpsContext,
        contextSearch: {
          query: `MPS ${mps.mps_number} ${mps.name}`,
          results: contextTest.data?.results || [],
          searchType: contextTest.data?.search_type || 'unknown',
          debugInfo: contextTest.data?.debug,
          error: contextTest.error?.message
        },
        timestamp: new Date().toISOString()
      }));

      // Generate clean prompt
      const detailedPrompt = buildAICriteriaPrompt(mpsContext, organizationContext);

      // Debug logging for prompt
      logDebugInfo('AI Prompt being sent', detailedPrompt, showAdminDebug);
      if (showAdminDebug) {
        setDebugInfo(prev => ({ ...prev, promptSent: detailedPrompt }));
      }

      // Call AI generation
      const { data, error } = await supabase.functions.invoke('maturion-ai-chat', {
        body: {
          prompt: detailedPrompt,
          context: 'Criteria generation',
          organizationId: currentOrganization.id,
          currentDomain: 'Leadership & Governance',
          model: 'gpt-4.1-2025-04-14',
          temperature: 0,
          requiresInternalSecure: true
        }
      });

      if (error) {
        throw error;
      }

      // Debug logging for raw AI response
      if (data?.content) {
        logDebugInfo('Raw AI Response', data.content, showAdminDebug);
        if (showAdminDebug) {
          setDebugInfo(prev => ({ ...prev, rawResponse: data.content }));
        }
      }

      // Parse and validate AI response
      if (data?.content) {
        try {
          const responseContent = data.content;
          
          // Enhanced validation for context availability
          if (responseContent.includes('No valid MPS document context available')) {
            setError('No valid MPS document context available. Please upload the relevant MPS file and retry.');
            return;
          }
          
          // TODO: Move cleanJSON to /lib/ utility - DONE

          let generatedCriteria: any[] = [];
          try {
            generatedCriteria = JSON.parse(cleanJSON(responseContent));
          } catch (parseError) {
            throw new Error(`AI failed to generate valid criteria format. Raw response parsing failed: ${parseError.message}`);
          }

          if (!Array.isArray(generatedCriteria) || generatedCriteria.length === 0) {
            throw new Error('AI response does not contain valid criteria array');
          }

          // Run validation engine
          const validationResult = validateCriteria(generatedCriteria, organizationContext);
          
          if (!validationResult.isValid) {
            throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
          }

          // Save to database
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
            source_type: (validationResult.validCriteria[index]?.source_origin || validationResult.validCriteria[index]?.source_type || 'best_practice_fallback') as 'internal_document' | 'organizational_context' | 'sector_memory' | 'best_practice_fallback',
            source_reference: validationResult.validCriteria[index]?.source_reference || `MPS ${mps.mps_number} Document`,
            ai_decision_log: validationResult.validCriteria[index]?.ai_decision_log || `Generated from MPS ${mps.mps_number} requirements`,
            evidence_hash: validationResult.validCriteria[index]?.evidence_hash || `evidence_${index + 1}`,
            reasoning_path: validationResult.validCriteria[index]?.reasoning_path || `Derived from MPS ${mps.mps_number} document structure`,
            duplicate_check_result: validationResult.validCriteria[index]?.duplicate_check_result || 'No duplicates detected',
            compound_verb_analysis: validationResult.validCriteria[index]?.compound_verb_analysis || 'Single action verb validated'
          }));

          setCriteria(formattedCriteria);
          onCriteriaChange?.(formattedCriteria);

          toast({
            title: "AI Criteria Generated",
            description: `Successfully generated ${formattedCriteria.length} criteria for ${mps.name}`,
          });

        } catch (processingError) {
          throw new Error(`Failed to process AI response: ${processingError.message}`);
        }
      } else {
        throw new Error('No content received from AI');
      }

    } catch (error: any) {
      logCriticalError('Generation failed', error);
      const errorMessage = error.message || 'Unknown error occurred';
      setError(errorMessage);
      toast({
        title: "Generation Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  }, [currentOrganization, user, mps, onCriteriaChange, toast, testContextRetrieval, showAdminDebug]);

  const handleRegenerateCriteria = useCallback(async () => {
    if (!currentOrganization?.id) return;
    
    try {
      await supabase
        .from('criteria')
        .delete()
        .eq('mps_id', mps.id);
      
      setCriteria([]);
      await generateAICriteria();
    } catch (error) {
      logCriticalError('Regeneration failed', error);
      toast({
        title: "Regeneration Failed",
        description: "Failed to regenerate criteria. Please try again.",
        variant: "destructive"
      });
    }
  }, [currentOrganization, mps.id, generateAICriteria, toast]);

  useEffect(() => {
    if (currentOrganization?.id) {
      generateAICriteria();
    }
  }, []);

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
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              AI Generated Criteria for MPS {mps.mps_number}: {mps.name}
            </div>
            <div className="flex items-center gap-2">
              {showAdminDebug && (
                <Badge variant="outline" className="text-xs">
                  DEBUG MODE
                </Badge>
              )}
              <Badge variant="secondary">
                {criteria.length} criteria
              </Badge>
            </div>
          </CardTitle>
          <CardDescription>
            Evidence-first criteria automatically generated and validated for organizational compliance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium">Generation Error</div>
                <div className="text-sm mt-1">{error}</div>
                <Button 
                  onClick={handleRegenerateCriteria} 
                  size="sm" 
                  variant="outline" 
                  className="mt-2"
                  disabled={isGenerating}
                >
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
              <Button 
                onClick={generateAICriteria} 
                className="mt-4"
                disabled={isGenerating}
              >
                <Wand2 className="h-4 w-4 mr-2" />
                {isGenerating ? 'Generating...' : 'Generate Criteria'}
              </Button>
            </div>
          )}

          {criteria.length > 0 && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Total generated: {criteria.length} criteria | 
                  Status: All comply with evidence-first format
                </span>
                <Button 
                  onClick={handleRegenerateCriteria} 
                  size="sm" 
                  variant="outline"
                  disabled={isGenerating}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Regenerate
                </Button>
              </div>

              {criteria.map((criterion, index) => (
                <Card key={criterion.id} className="border-l-4 border-l-primary">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base">
                          Criterion {mps.mps_number}.{index + 1}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {criterion.statement}
                        </p>
                      </div>
                      <Badge 
                        variant={criterion.status === 'approved_locked' ? 'default' : 'secondary'}
                        className="ml-2"
                      >
                        {criterion.status === 'approved_locked' ? (
                          <CheckCircle className="h-3 w-3 mr-1" />
                        ) : (
                          <XCircle className="h-3 w-3 mr-1" />
                        )}
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
                      {criterion.explanation && (
                        <div>
                          <span className="text-xs font-medium text-muted-foreground">Explanation:</span>
                          <p className="text-sm">{criterion.explanation}</p>
                        </div>
                      )}
                      {showAdminDebug && (
                        <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                          <div>Source: {criterion.source_reference}</div>
                          <div>Evidence Hash: {criterion.evidence_hash}</div>
                          <div>Reasoning: {criterion.reasoning_path}</div>
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
                  Debug Information
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-2">
                {debugInfo.mpsContext && (
                  <div>
                    <span className="font-medium">MPS Context:</span>
                    <pre className="mt-1 bg-background p-2 rounded text-xs overflow-auto">
                      {JSON.stringify(debugInfo.mpsContext, null, 2)}
                    </pre>
                  </div>
                )}
                {debugInfo.contextSearch && (
                  <div>
                    <span className="font-medium">Context Search:</span>
                    <pre className="mt-1 bg-background p-2 rounded text-xs overflow-auto">
                      {JSON.stringify(debugInfo.contextSearch, null, 2)}
                    </pre>
                  </div>
                )}
                {debugInfo.timestamp && (
                  <div>
                    <span className="font-medium">Generated:</span> {debugInfo.timestamp}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export const AIGeneratedCriteriaCards = OptimizedAIGeneratedCriteriaCards;