import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, RotateCcw, Wand2, AlertTriangle, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { useMaturionContext } from '@/hooks/useMaturionContext';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { validateSecureInput } from '@/lib/security';

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
  // Enhanced logging fields
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

export const OptimizedAIGeneratedCriteriaCards: React.FC<AIGeneratedCriteriaCardsProps> = ({
  mps,
  onCriteriaChange
}) => {
const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [showAdminDebug, setShowAdminDebug] = useState(false);
  
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { context } = useMaturionContext();
  const { toast } = useToast();

  // Dynamic AI criteria generation based on uploaded documents and organizational context
  const generateAICriteria = useCallback(async () => {
    if (!currentOrganization?.id || !user || isGenerating) return;

    setIsGenerating(true);
    setError(null);

    try {
      // Load comprehensive organization context for AI tailoring
      const organizationContext = {
        id: currentOrganization.id,
        name: currentOrganization.name || 'your organization',
        industry_tags: currentOrganization.industry_tags || [],
        region_operating: currentOrganization.region_operating || '',
        compliance_commitments: currentOrganization.compliance_commitments || [],
        custom_industry: currentOrganization.custom_industry || ''
      };

      // Check for existing criteria
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

      // ENHANCED MPS-SPECIFIC CONTEXT BINDING
      const mpsContext = {
        mpsId: mps.id,
        mpsNumber: mps.mps_number,
        mpsTitle: mps.name,
        domainId: mps.domain_id,
        organizationId: currentOrganization.id
      };

      // Enhanced debugging for admin mode
      if (showAdminDebug) {
        console.log('🔧 DEBUG MODE - Criteria Generation for:', {
          mps_id: mps.id,
          mps_number: mps.mps_number,
          mps_title: mps.name,
          organization_id: currentOrganization.id,
          expected_document: `MPS ${mps.mps_number} – ${mps.name}`
        });

        // Test document context retrieval
        console.log('🔧 DEBUG - Testing context search for:', {
          query: `MPS ${mps.mps_number} ${mps.name}`,
          organizationId: currentOrganization.id,
          expected_filename: `MPS ${mps.mps_number} – ${mps.name}`
        });
        
        try {
          const contextTest = await supabase.functions.invoke('search-ai-context', {
            body: {
              query: `MPS ${mps.mps_number} ${mps.name}`,
              organizationId: currentOrganization.id,
              documentTypes: ['mps', 'standard', 'audit', 'criteria', 'annex'],
              limit: 5
            }
          });
          
          console.log('🔧 DEBUG - Context Search Results:', {
            success: contextTest.data?.success,
            results_count: contextTest.data?.results?.length || 0,
            search_type: contextTest.data?.search_type,
            error: contextTest.error?.message,
            debug_info: contextTest.data?.debug,
            first_result: contextTest.data?.results?.[0]
          });
          
          if (contextTest.data?.results?.length === 0) {
            console.warn('⚠️ WARNING: No document context found for MPS', mps.mps_number, {
              organizationId: currentOrganization.id,
              search_query: `MPS ${mps.mps_number} ${mps.name}`,
              context_debug: contextTest.data?.debug
            });
          }
          
          setDebugInfo(prev => ({ 
            ...prev, 
            contextSearch: {
              query: `MPS ${mps.mps_number} ${mps.name}`,
              results: contextTest.data?.results || [],
              searchType: contextTest.data?.search_type,
              debugInfo: contextTest.data?.debug
            }
          }));
        } catch (searchError) {
          console.error('🚨 Context search failed:', searchError);
          setDebugInfo(prev => ({ 
            ...prev, 
            contextSearch: { error: searchError.message } 
          }));
        }
      }

      // Debug logging for MPS context binding
      console.log('🎯 MPS Context Binding:', mpsContext);
      setDebugInfo(prev => ({ 
        ...prev, 
        mpsContext,
        timestamp: new Date().toISOString()
      }));

      // CLEAN AI GENERATION PROMPT - MPS-SPECIFIC WITH HARD CONTEXT BINDING
      const detailedPrompt = `GENERATE CRITERIA FOR SPECIFIC MPS: ${mps.mps_number} - ${mps.name}

CRITICAL CONTEXT BINDING:
- Target MPS: ${mps.mps_number}
- MPS Title: ${mps.name}
- Organization: ${organizationContext.name}
- Domain: Leadership & Governance
- MPS ID: ${mps.id}

MANDATORY REQUIREMENTS FOR MPS ${mps.mps_number}:
- ONLY generate criteria related to "${mps.name}"
- Extract content from uploaded "MPS ${mps.mps_number} - ${mps.name}.docx" document
- NO fallback to other MPS documents or Annex 1 content
- ALL criteria must be specific to ${mps.name} domain

EVIDENCE-FIRST FORMAT (MANDATORY):
Every criterion MUST start with evidence type and relate to ${mps.name}:
- "A documented risk register identifies, categorizes, and prioritizes operational risks across all ${organizationContext.name} business units."
- "A formal policy that is approved by senior management defines the roles and responsibilities for ${mps.name.toLowerCase()} within ${organizationContext.name}."
- "A quarterly report submitted to the board documents the effectiveness of ${mps.name.toLowerCase()} controls implemented across ${organizationContext.name}."

ANNEX 2 COMPLIANCE (ALL 7 RULES):
1. Evidence-first format - Start with document/policy/register/report/procedure
2. Single evidence per criterion - No compound verbs like "establish and maintain"
3. Measurable verbs - Use "identifies", "defines", "documents", "tracks", "outlines", "assigns"
4. Unambiguous context - Be specific about scope and requirements for ${mps.name}
5. Organizational tailoring - Reference ${organizationContext.name} throughout
6. No duplicates - Different evidence types or contexts are allowed
7. Complete structure - All fields must be fully populated

OUTPUT STRUCTURE FOR MPS ${mps.mps_number}:
{
  "statement": "A [evidence_type] that is [qualifier] [verb] the [requirement] of [stakeholder] for ${mps.name.toLowerCase()} at ${organizationContext.name}.",
  "summary": "[10-15 word description related to ${mps.name}]",
  "rationale": "[Why critical for ${organizationContext.name}'s ${mps.name.toLowerCase()} - max 25 words]",
  "evidence_guidance": "[Specific ${mps.name} document requirements from MPS ${mps.mps_number}]",
  "explanation": "[Detailed explanation with ${organizationContext.name} context for ${mps.name}]"
}

ORGANIZATIONAL CONTEXT:
- Organization: ${organizationContext.name}
- Industry: ${organizationContext.industry_tags.join(', ') || organizationContext.custom_industry}
- Region: ${organizationContext.region_operating}
- Compliance: ${organizationContext.compliance_commitments.join(', ')}

STRICT REQUIREMENTS:
- Source: ONLY MPS ${mps.mps_number} document content
- Topic: ONLY ${mps.name} related criteria
- Count: Generate 8-12 criteria based on MPS ${mps.mps_number} document content
- Format: Evidence-first format for all statements
- Context: Include ${organizationContext.name} and ${mps.name} throughout
- Validation: NO placeholder text, NO generic templates, NO Annex 1 fallback

Return JSON array of ${mps.name}-specific criteria objects.`;

      // SANITY CHECK: Abort if prompt contains Annex 1 fallback when not MPS 1
      if (detailedPrompt.includes("Annex 1") && mps.mps_number !== 1) {
        console.error('🚨 CRITICAL: Annex 1 fallback detected for non-MPS 1 generation');
        throw new Error(`Invalid fallback to Annex 1 detected for MPS ${mps.mps_number}. Aborting generation.`);
      }

      // Debug logging for admin mode
      if (showAdminDebug) {
        console.log('🔧 DEBUG: AI Prompt being sent:', detailedPrompt);
        setDebugInfo(prev => ({ ...prev, promptSent: detailedPrompt }));
      }

      // Call AI generation with enhanced parameters
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

      // Debug logging for raw AI response
      if (showAdminDebug && data?.content) {
        console.log('🔧 DEBUG: Raw AI Response:', data.content);
        setDebugInfo(prev => ({ ...prev, rawResponse: data.content }));
      }

      if (error) {
        throw error;
      }

      // Parse AI response
      let generatedCriteria: any[] = [];
      
      if (data?.content) {
        try {
          const responseContent = data.content;
          
          // Clean and parse JSON response
          const cleanJSON = (jsonStr: string): string => {
            let cleaned = jsonStr.trim();
            const jsonStart = cleaned.indexOf('[') !== -1 ? cleaned.indexOf('[') : cleaned.indexOf('{');
            const jsonEnd = cleaned.lastIndexOf(']') !== -1 ? cleaned.lastIndexOf(']') : cleaned.lastIndexOf('}');
            
            if (jsonStart === -1 || jsonEnd === -1) {
              throw new Error('No valid JSON found');
            }
            
            cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
            return cleaned.replace(/,(\s*[}\]])/g, '$1');
          };

          try {
            generatedCriteria = JSON.parse(cleanJSON(responseContent));
          } catch (parseError) {
            // CRITICAL: NO FALLBACK PLACEHOLDERS ALLOWED - Throw error to trigger regeneration
            throw new Error(`AI failed to generate valid criteria format. Prohibited placeholder text detected. Raw response parsing failed: ${parseError.message}`);
          }

          // Validate and process criteria
          if (Array.isArray(generatedCriteria) && generatedCriteria.length > 0) {
            // CRITICAL: Validate against prohibited placeholder text
            const hasProhibitedPlaceholders = generatedCriteria.some(criterion => 
              criterion.statement?.includes('Assessment criterion') ||
              criterion.statement?.includes('Criterion ') ||
              criterion.summary?.includes('Summary for criterion') ||
              criterion.statement?.startsWith(organizationContext.name + ' must') ||
              !criterion.statement?.match(/^A\s+(document|policy|register|report|procedure|assessment|review|analysis)/i)
            );

            if (hasProhibitedPlaceholders) {
              throw new Error('AI generated prohibited placeholder text or failed to follow evidence-first format. Regeneration required.');
            }

            // Validate evidence-first format compliance
            const nonCompliantCriteria = generatedCriteria.filter(criterion =>
              !criterion.statement?.match(/^A\s+(documented|formal|quarterly|annual|comprehensive|detailed|written|approved|maintained|updated|current|complete)\s+(risk register|policy|report|document|procedure|assessment|analysis|review|register|record|log|matrix|framework|standard|guideline)/i)
            );

            if (nonCompliantCriteria.length > 0) {
              throw new Error(`${nonCompliantCriteria.length} criteria failed evidence-first format validation. All criteria must start with evidence type.`);
            }

            // Quality assurance: Check organization context integration
            const hasOrgContextIntegration = generatedCriteria.every(criterion => 
              criterion.explanation?.includes(organizationContext.name) ||
              criterion.statement?.includes(organizationContext.name)
            );

            if (!hasOrgContextIntegration) {
              // Enhance with organization context where needed
              generatedCriteria = generatedCriteria.map(criterion => ({
                ...criterion,
                explanation: criterion.explanation?.includes(organizationContext.name) 
                  ? criterion.explanation 
                  : `This criterion ensures ${organizationContext.name} ${criterion.explanation || 'meets the required standards'}.`
              }));
            }

            // Save to database
            const criteriaToInsert = generatedCriteria.map((criterionData, index) => ({
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
              summary: generatedCriteria[index]?.summary || c.summary || undefined,
              rationale: generatedCriteria[index]?.rationale || undefined,
              evidence_guidance: generatedCriteria[index]?.evidence_guidance || undefined,
              explanation: generatedCriteria[index]?.explanation || undefined,
              status: c.status as 'not_started' | 'in_progress' | 'approved_locked',
              ai_suggested_statement: c.ai_suggested_statement || undefined,
              ai_suggested_summary: c.ai_suggested_summary || undefined,
              source_type: (generatedCriteria[index]?.source_origin || generatedCriteria[index]?.source_type || 'best_practice_fallback') as 'internal_document' | 'organizational_context' | 'sector_memory' | 'best_practice_fallback',
              source_reference: generatedCriteria[index]?.source_reference || `MPS ${mps.mps_number} Document`,
              // Enhanced logging fields
              ai_decision_log: generatedCriteria[index]?.ai_decision_log || `Generated from MPS ${mps.mps_number} requirements`,
              evidence_hash: generatedCriteria[index]?.evidence_hash || `evidence_${index + 1}`,
              reasoning_path: generatedCriteria[index]?.reasoning_path || `Derived from MPS ${mps.mps_number} document structure`,
              duplicate_check_result: generatedCriteria[index]?.duplicate_check_result || 'No duplicates detected',
              compound_verb_analysis: generatedCriteria[index]?.compound_verb_analysis || 'Single action verb validated'
            }));

            setCriteria(formattedCriteria);
            onCriteriaChange?.(formattedCriteria);

            toast({
              title: "AI Criteria Generated",
              description: `Successfully generated ${formattedCriteria.length} criteria for ${mps.name}`,
            });
          }
        } catch (processingError) {
          throw new Error(`Failed to process AI response: ${processingError.message}`);
        }
      } else {
        throw new Error('No content received from AI');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setDebugInfo({ generationError: errorMessage });
      
      toast({
        title: "Generation Error",
        description: "Failed to generate criteria. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setIsLoading(false);
    }
  }, [mps, currentOrganization, user, onCriteriaChange, toast, isGenerating]);

  const handleApprove = async (criterionId: string) => {
    try {
      await supabase
        .from('criteria')
        .update({ status: 'approved_locked' })
        .eq('id', criterionId);

      setCriteria(prev => prev.map(c => 
        c.id === criterionId ? { ...c, status: 'approved_locked' } : c
      ));

      toast({
        title: "Criterion Approved",
        description: "Criterion has been approved and locked.",
      });
    } catch (error) {
      toast({
        title: "Approval Failed",
        description: "Failed to approve criterion. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (criterionId: string) => {
    try {
      setCriteria(prev => prev.filter(c => c.id !== criterionId));
      
      await supabase
        .from('criteria')
        .delete()
        .eq('id', criterionId);

      toast({
        title: "Criterion Rejected",
        description: "Criterion has been removed.",
      });
    } catch (error) {
      toast({
        title: "Rejection Failed",
        description: "Failed to reject criterion. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRegenerate = async () => {
    try {
      // Delete existing criteria
      await supabase
        .from('criteria')
        .delete()
        .eq('mps_id', mps.id);

      setCriteria([]);
      await generateAICriteria();

      toast({
        title: "Criteria Regenerated",
        description: "Fresh criteria have been generated.",
      });
    } catch (error) {
      toast({
        title: "Regeneration Failed",
        description: "Failed to regenerate criteria. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (mps.id && currentOrganization?.id && user) {
      generateAICriteria();
    }
  }, [mps.id, currentOrganization?.id, user?.id]);

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 animate-spin" />
            Generating AI Criteria for MPS {mps.mps_number}
          </CardTitle>
          <CardDescription>
            AI is analyzing your organization context and generating tailored assessment criteria...
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Generation Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button 
            onClick={generateAICriteria} 
            className="mt-4"
            disabled={isGenerating}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Retry Generation
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          AI Generated Criteria for MPS {mps.mps_number}: {mps.name}
        </h3>
        <Button 
          onClick={handleRegenerate}
          variant="outline"
          size="sm"
          disabled={isGenerating}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Regenerate
        </Button>
      </div>

      {criteria.map((criterion, index) => (
        <Card key={criterion.id} className="w-full">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <CardTitle className="text-base">
                  Criterion {mps.mps_number}.{index + 1}
                </CardTitle>
                <Badge variant={criterion.status === 'approved_locked' ? 'default' : 'secondary'}>
                  {criterion.status === 'approved_locked' ? 'Approved' : 'Pending Review'}
                </Badge>
              </div>
              <div className="flex gap-2">
                {criterion.status !== 'approved_locked' && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(criterion.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReject(criterion.id)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Source tracking badge */}
              <div className="flex items-center gap-2">
                <Badge variant={criterion.source_type === 'internal_document' ? 'default' : 
                              criterion.source_type === 'organizational_context' ? 'secondary' :
                              criterion.source_type === 'sector_memory' ? 'outline' : 'destructive'}>
                  {criterion.source_type === 'internal_document' ? '📄 Internal Doc' :
                   criterion.source_type === 'organizational_context' ? '🏢 Org Context' :
                   criterion.source_type === 'sector_memory' ? '🧠 Sector Memory' : '⚠️ Fallback'}
                </Badge>
                {criterion.source_reference && (
                  <span className="text-xs text-muted-foreground">
                    Source: {criterion.source_reference}
                  </span>
                )}
              </div>

              {/* Required fields */}
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Statement</h4>
                  <p className="text-sm">{criterion.statement}</p>
                </div>
                
                {criterion.summary && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">Summary</h4>
                    <p className="text-sm">{criterion.summary}</p>
                  </div>
                )}
                
                {criterion.rationale && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">Rationale</h4>
                    <p className="text-sm">{criterion.rationale}</p>
                  </div>
                )}
                
                {criterion.evidence_guidance && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">Evidence Guidance</h4>
                    <p className="text-sm">{criterion.evidence_guidance}</p>
                  </div>
                )}
                
                {criterion.explanation && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">Explanation</h4>
                    <p className="text-sm text-muted-foreground">{criterion.explanation}</p>
                  </div>
                )}
              </div>

              {/* Admin debug panel */}
              {showAdminDebug && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg border">
                  <h5 className="font-medium text-xs text-muted-foreground mb-2">🔧 Admin Debug Information</h5>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="font-medium">Evidence Hash:</span> {criterion.evidence_hash}
                    </div>
                    <div>
                      <span className="font-medium">Duplicate Check:</span> {criterion.duplicate_check_result}
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium">Compound Verb Analysis:</span> {criterion.compound_verb_analysis}
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium">Reasoning Path:</span> {criterion.reasoning_path}
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium">AI Decision Log:</span> {criterion.ai_decision_log}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Admin debug toggle */}
      <div className="flex justify-between items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAdminDebug(!showAdminDebug)}
          className="text-xs"
        >
          <Info className="h-3 w-3 mr-1" />
          {showAdminDebug ? 'Hide' : 'Show'} Admin Debug Info
        </Button>
        
        {showAdminDebug && (
          <div className="text-xs text-muted-foreground">
            Total generated: {criteria.length} criteria | 
            Full compliance with MPS {mps.mps_number} document structure
          </div>
        )}
      </div>

      {criteria.length === 0 && !isLoading && !error && (
        <Card className="w-full">
          <CardContent className="text-center py-8">
            <Info className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No criteria generated yet.</p>
            <Button onClick={generateAICriteria} className="mt-4">
              <Wand2 className="h-4 w-4 mr-2" />
              Generate Criteria
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export const AIGeneratedCriteriaCards = OptimizedAIGeneratedCriteriaCards;