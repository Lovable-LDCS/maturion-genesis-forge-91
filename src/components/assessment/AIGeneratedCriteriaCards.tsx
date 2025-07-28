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

      // Enhanced AI generation prompt following backoffice specification
      const detailedPrompt = `CRITICAL: Generate comprehensive assessment criteria for MPS ${mps.mps_number}: ${mps.name}

MANDATORY REQUIREMENTS:
1. MUST use uploaded MPS documents as PRIMARY source
2. MUST tailor to ${organizationContext.name} organizational context
3. MUST consider industry: ${organizationContext.industry_tags.join(', ') || organizationContext.custom_industry || 'General'}
4. MUST include ALL required fields for each criterion

REQUIRED STRUCTURE for each criterion:
{
  "statement": "Clear, measurable requirement statement",
  "summary": "Brief overview of what this criterion addresses", 
  "rationale": "Why this criterion is important for ${organizationContext.name}",
  "evidence_guidance": "Specific evidence types and documentation needed",
  "explanation": "Detailed explanation with ${organizationContext.name} context",
  "source_type": "internal_document|organizational_context|sector_memory|best_practice_fallback",
  "source_reference": "Specific document or knowledge source used"
}

DYNAMIC CRITERIA COUNT:
- Generate the optimal number of criteria based on MPS complexity and organizational needs
- Typical range: 8-14 criteria depending on content depth
- Quality and coverage over fixed quantity
- Each criterion must add unique value

ORGANIZATIONAL CONTEXT:
- Organization: ${organizationContext.name}
- Industry/Sector: ${organizationContext.industry_tags.join(', ') || organizationContext.custom_industry}
- Region: ${organizationContext.region_operating}
- Compliance frameworks: ${organizationContext.compliance_commitments.join(', ')}

KNOWLEDGE SOURCE PRIORITY:
1. Internal uploaded documents (highest priority)
2. Organizational profile and context
3. Sector-specific requirements
4. Best practice fallbacks (only when above insufficient)

Return a JSON array of criteria objects with all required fields. Include source tracking for audit trail.`;

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
            // Fallback: Extract criteria manually
            const statements = responseContent.match(/"statement":\s*"([^"]+)"/g) || [];
            generatedCriteria = statements.map((_, index) => ({
              statement: `Assessment criterion ${index + 1} for ${organizationContext.name}`,
              summary: `Summary for criterion ${index + 1}`,
              rationale: `Rationale for ${mps.name} implementation`,
              evidence_guidance: `Evidence requirements for ${organizationContext.name}`,
              explanation: `This criterion ensures ${organizationContext.name} maintains effective ${mps.name?.toLowerCase()}. Ask Maturion for more details.`
            }));
          }

          // Validate and process criteria
          if (Array.isArray(generatedCriteria) && generatedCriteria.length > 0) {
            // Quality assurance: Check organization name injection
            const hasOrgNameInjection = generatedCriteria.every(criterion => 
              criterion.statement?.includes(organizationContext.name) || 
              criterion.explanation?.includes(organizationContext.name)
            );

            if (!hasOrgNameInjection) {
              // Inject organization name into statements
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
              summary: c.summary || undefined,
              rationale: generatedCriteria[index]?.rationale || undefined,
              evidence_guidance: generatedCriteria[index]?.evidence_guidance || undefined,
              explanation: generatedCriteria[index]?.explanation || undefined,
              status: c.status as 'not_started' | 'in_progress' | 'approved_locked',
              ai_suggested_statement: c.ai_suggested_statement || undefined,
              ai_suggested_summary: c.ai_suggested_summary || undefined,
              source_type: generatedCriteria[index]?.source_type || 'best_practice_fallback',
              source_reference: generatedCriteria[index]?.source_reference || 'AI Generated'
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
            </div>
          </CardContent>
        </Card>
      ))}

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