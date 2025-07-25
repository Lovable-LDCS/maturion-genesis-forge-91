import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sparkles, CheckCircle2, Edit, X, Loader2, HelpCircle, RefreshCw, Info, Bug } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMPSDocumentAnalysis } from '@/hooks/useMPSDocumentAnalysis';

interface GeneratedCriterion {
  id: string;
  statement: string;
  summary: string;
  rationale: string;
  status: 'pending' | 'approved' | 'rejected' | 'editing';
  criteria_number: string;
  evidence_guidance?: string;
  explanation?: string;
}

interface MPS {
  id: string;
  name: string;
  mps_number: number;
  intent_statement?: string;
  summary?: string;
}

interface AIGeneratedCriteriaCardsProps {
  mps: MPS;
  organizationId: string;
  domainName: string;
  onComplete: (approvedCriteria: GeneratedCriterion[]) => void;
}

export const AIGeneratedCriteriaCards: React.FC<AIGeneratedCriteriaCardsProps> = ({
  mps,
  organizationId,
  domainName,
  onComplete
}) => {
  const [generatedCriteria, setGeneratedCriteria] = useState<GeneratedCriterion[]>([]);
  const [isGenerating, setIsGenerating] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [editingCriterion, setEditingCriterion] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ statement: string; summary: string }>({ statement: '', summary: '' });
  const [organizationContext, setOrganizationContext] = useState({
    name: 'the organization',
    industry_tags: [] as string[],
    region_operating: null as string | null,
    risk_concerns: [] as string[],
    compliance_commitments: [] as string[]
  });
  const [debugInfo, setDebugInfo] = useState({
    criteriaRequested: 0,
    criteriaReceived: 0,
    sourcePromptUsed: '',
    fallbackTriggered: false,
    truncationWarning: false,
    generationError: null as string | null,
    sourceMPSDocument: null as string | null,
    expectedCriteriaCount: null as number | null,
    gap: null as number | null
  });
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const { toast } = useToast();
  const { analyzeMPSDocument, isAnalyzing } = useMPSDocumentAnalysis();

  const generateAICriteria = async () => {
    setIsGenerating(true);
    
    // Fetch organization context for name injection policy compliance
    try {
      const { data: orgData } = await supabase
        .from('organizations')
        .select('name, industry_tags, region_operating, risk_concerns, compliance_commitments')
        .eq('id', organizationId)
        .single();
      
      if (orgData) {
        const updatedContext = {
          name: orgData.name || 'the organization',
          industry_tags: orgData.industry_tags || [],
          region_operating: orgData.region_operating,
          risk_concerns: orgData.risk_concerns || [],
          compliance_commitments: orgData.compliance_commitments || []
        };
        setOrganizationContext(updatedContext);
        console.log(`✅ AI Criteria Tailoring Policy: Organization "${updatedContext.name}" context loaded for injection`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to fetch organization context for AI Criteria Tailoring Policy:', error);
    }
    
    // Check if criteria already exist for this MPS
    try {
      const { data: existingCriteria } = await supabase
        .from('criteria')
        .select('*')
        .eq('mps_id', mps.id)
        .eq('organization_id', organizationId);

      if (existingCriteria && existingCriteria.length > 0) {
        console.log(`Found ${existingCriteria.length} existing criteria for MPS ${mps.mps_number}`);
        const processedCriteria: GeneratedCriterion[] = existingCriteria.map((criterion, index) => ({
          id: criterion.id,
          statement: criterion.statement || '',
          summary: criterion.summary || '',
          rationale: 'Existing criterion from database',
          status: criterion.status === 'not_started' ? 'pending' as const : 'approved' as const,
          criteria_number: criterion.criteria_number || `${mps.mps_number}.${index + 1}`,
          evidence_guidance: 'Evidence requirements established during prior assessment',
          explanation: `This criterion was previously defined for ${organizationContext.name}. Ask Maturion if you want to learn more.`
        }));
        setGeneratedCriteria(processedCriteria);
        setIsGenerating(false);
        return;
      }
    } catch (error) {
      console.log('No existing criteria found, generating new ones with AI Criteria Generation Policy');
    }
    
    // Analyze MPS document to get expected criteria count
    let expectedCriteriaCount = 10; // Default Annex 2 minimum
    let sourceMPSDocument = 'Annex 2 Default (8-10 criteria)';
    
    try {
      const mpsAnalysis = await analyzeMPSDocument(organizationId, mps.mps_number);
      if (mpsAnalysis.foundDocument && mpsAnalysis.documentInfo) {
        expectedCriteriaCount = mpsAnalysis.documentInfo.expectedCriteriaCount;
        sourceMPSDocument = mpsAnalysis.documentInfo.documentName;
        console.log(`📘 MPS Document Analysis: Found ${sourceMPSDocument} with ${expectedCriteriaCount} expected criteria`);
      } else {
        console.log(`📘 MPS Document Analysis: No specific document found, using Annex 2 fallback (${expectedCriteriaCount} criteria)`);
      }
    } catch (error) {
      console.warn('⚠️ MPS Document Analysis failed:', error);
    }
    
    // LOCKED SYSTEM PROMPT - Override all default generation prompts
    // Organization Name Injection Policy Applied
    const systemPrompt = `You are an AI assessment criteria generator operating under strict system constraints from the AI Criteria Generation Policy, Annex 2 AI_Criteria_Evaluation_Guide, and AI Criteria Tailoring Policy – Organization Name Injection documents in the AI Admin Knowledge Base.

MANDATORY SYSTEM CONSTRAINTS (NON-NEGOTIABLE):

1. PRECISION REQUIREMENT: All criteria must be precise, unambiguous, and fully measurable
2. EVIDENCE TYPE MANDATE: Include expected evidence type (policy, log, record, system, audit, interview, configuration)
3. FORMAL LANGUAGE: Use formal, directive language (e.g., "Records shall show...", "System logs must demonstrate...")
4. RATIONALE INCLUSION: Include rationale sentence explaining necessity below main statement
5. STRUCTURAL COMPLIANCE: Evidence Type + Verb + Context + Condition/Purpose
6. ANTI-VAGUENESS: Never use "appropriate," "adequate," or "effective" without specific qualification/measurement
7. MATURION LINK: End all explanations with: "Ask Maturion if you want to learn more."
8. ORGANIZATION NAME INJECTION: Dynamically incorporate "${organizationContext.name}" into criteria, intents, and suggestions where contextually appropriate

HALLUCINATION FILTERS - REJECT ANY CONTENT WITH:
- Unsupported claims not grounded in MPS context
- Broad, undefined terms without measurable criteria
- More than one "A policy shall be in place..." statement per MPS
- Repetitive or template-like phrasing
- Vague qualifiers without specific thresholds
- Missing organization name context where relevant

CONTROLLED CREATIVITY BOUNDARIES:
- Variety in evidence types (policies, records, logs, systems, audits, interviews, configurations)
- Context drawn from uploaded AI Admin Knowledge Base documents
- Structured creativity mode - NOT freeform generation
- Clarity prioritized over verbosity
- Organization-specific language using "${organizationContext.name}" where contextually relevant

ORGANIZATION CONTEXT FOR INJECTION:
- Organization Name: ${organizationContext.name}
- Industry Context: ${organizationContext.industry_tags?.join(', ') || 'Not specified'}
- Region: ${organizationContext.region_operating || 'Not specified'}
- Risk Concerns: ${organizationContext.risk_concerns?.join(', ') || 'Not specified'}
- Use this name naturally in criteria statements where it makes sense (e.g., "${organizationContext.name}'s policy framework", "within ${organizationContext.name}", "by ${organizationContext.name} personnel")
- Maintain professional tone while personalizing content to this specific organization

MPS CONTEXT FOR GENERATION:
- Number: ${mps.mps_number}
- Title: ${mps.name}
- Domain: ${domainName}
- Intent: ${mps.intent_statement || 'Not specified'}
- Target Organization: ${organizationContext.name}

GENERATION TARGET: Generate ${expectedCriteriaCount} criteria based on uploaded MPS document analysis. Target derived from ${sourceMPSDocument}. MINIMUM 8 criteria required per Annex 2 if no document signal available.

RESPONSE FORMAT - STRICT JSON:
{
  "criteria": [
    {
      "statement": "[Evidence Type] [Directive Verb] [Specific Context] [Measurable Condition]",
      "summary": "Brief, specific measurement description",
      "rationale": "Clear explanation of necessity for this MPS",
      "evidence_guidance": "Specific evidence with measurable thresholds (e.g., '90% test scores, quarterly reviews, signed registers')",
      "explanation": "What it means + expected evidence + importance. Ask Maturion if you want to learn more."
    }
  ],
  "generation_metadata": {
    "criteria_count": "number_generated",
    "complexity_assessment": "simple|moderate|complex",
    "evidence_types_used": ["policy", "record", "system", "etc"],
    "document_references": ["AI_Criteria_Generation_Policy", "Annex_2"]
  }
}`;

    // Log AI generation attempt for audit trail
    const logGeneration = async (prompt: string, response: any, metadata: any) => {
      try {
        await supabase.from('ai_upload_audit').insert({
          organization_id: organizationId,
          user_id: organizationId, // Fallback to org ID
          action: 'ai_criteria_generation',
          document_id: null,
          metadata: {
            mps_number: mps.mps_number,
            domain: domainName,
            prompt_used: prompt.substring(0, 500), // First 500 chars
            criteria_count: metadata?.criteria_count || 0,
            complexity_assessment: metadata?.complexity_assessment || 'unknown',
            evidence_types_used: metadata?.evidence_types_used || [],
            document_references: metadata?.document_references || ['AI_Criteria_Generation_Policy', 'Annex_2'],
            timestamp: new Date().toISOString()
          }
        });
      } catch (error) {
        console.log('Failed to log generation attempt:', error);
      }
    };

    // Hallucination Filter - validate AI response quality
    const validateCriteriaQuality = (criteria: any[]): any[] => {
      return criteria.filter(criterion => {
        // Filter out vague or problematic content
        const statement = criterion.statement?.toLowerCase() || '';
        const hasVagueTerms = /\b(appropriate|adequate|effective|sufficient)\b/.test(statement) && 
                              !/\b(80%|quarterly|monthly|annually|within \d+|≥|>\s*\d+)\b/.test(statement);
        
        if (hasVagueTerms) {
          console.warn('Filtered out vague criterion:', criterion.statement);
          return false;
        }
        
        // Check for unsupported claims or overly broad terms
        const hasBroadTerms = /\b(all|every|always|never|completely|fully)\b/.test(statement) && 
                              !/\b(documented|recorded|maintained|tracked)\b/.test(statement);
        
        if (hasBroadTerms) {
          console.warn('Filtered out broad criterion:', criterion.statement);
          return false;
        }
        
        return true;
      });
    };


    // Update debug info with MPS document analysis
    setDebugInfo({
      criteriaRequested: expectedCriteriaCount,
      criteriaReceived: 0,
      sourcePromptUsed: 'AI_Criteria_Generation_Policy_Locked_System_Prompt',
      fallbackTriggered: false,
      truncationWarning: false,
      generationError: null,
      sourceMPSDocument: sourceMPSDocument,
      expectedCriteriaCount: expectedCriteriaCount,
      gap: null
    });

    try {
      const { data, error } = await supabase.functions.invoke('maturion-ai-chat', {
        body: {
          prompt: systemPrompt,
          context: 'AI Criteria Generation - Locked System Prompt',
          currentDomain: domainName,
          organizationId: organizationId,
          allowExternalContext: true,
          knowledgeBaseUsed: true,
          temperature: 0 // Enforce consistency
        }
      });

      if (error) {
        console.error('AI generation error:', error);
        setDebugInfo(prev => ({ ...prev, generationError: error.message || 'Unknown AI generation error' }));
        throw error;
      }

      // Parse AI response
      let criteria: any[] = [];
      let systemMessage = '';
      
      if (data?.content) {
        try {
          const responseContent = data.content;
          const jsonStart = responseContent.indexOf('{');
          const jsonEnd = responseContent.lastIndexOf('}');
          
          if (jsonStart !== -1 && jsonEnd !== -1) {
            const jsonString = responseContent.substring(jsonStart, jsonEnd + 1);
            const parsedData = JSON.parse(jsonString);
            
            criteria = parsedData.criteria || [];
            systemMessage = parsedData.system_message || '';
            
            // Ensure all criteria have evidence_guidance and explanation with Maturion link
            criteria = criteria.map(criterion => ({
              ...criterion,
              evidence_guidance: criterion.evidence_guidance || 'Evidence requirements to be specified during assessment',
              explanation: criterion.explanation ? 
                (criterion.explanation.includes('Ask Maturion') ? criterion.explanation : `${criterion.explanation} Ask Maturion if you want to learn more.`) :
                `This criterion measures ${criterion.summary}. Evidence requirements and specific implementation details should be documented during the assessment process. Ask Maturion if you want to learn more.`
            }));
            
            // Apply hallucination filters before processing
            criteria = validateCriteriaQuality(criteria);
            
            // Check for excessive "policy shall be in place" repetition
            const policyStatements = criteria.filter(c => 
              c.statement?.toLowerCase().includes('policy shall be in place')
            );
            if (policyStatements.length > 1) {
              console.warn(`Filtered out ${policyStatements.length - 1} excessive policy statements`);
              criteria = criteria.filter((c, index) => {
                if (c.statement?.toLowerCase().includes('policy shall be in place')) {
                  return index === criteria.findIndex(cr => cr.statement?.toLowerCase().includes('policy shall be in place'));
                }
                return true;
              });
            }
            
            // Log generation attempt with metadata including organization name injection tracking
            const generationMetadata = parsedData.generation_metadata || {
              criteria_count: criteria.length,
              complexity_assessment: 'unknown',
              evidence_types_used: [],
              document_references: ['AI_Criteria_Generation_Policy', 'Annex_2', 'AI_Criteria_Tailoring_Policy_Organization_Name_Injection']
            };
            
            // QA Validation: Track organization name injection compliance
            const orgNameMissing = criteria.filter(c => 
              !c.statement?.includes(organizationContext.name) && 
              !c.explanation?.includes(organizationContext.name) && 
              organizationContext.name !== 'the organization'
            );
            
            if (orgNameMissing.length > 0) {
              console.warn(`QA Alert: ${orgNameMissing.length} criteria missing organization name injection for "${organizationContext.name}"`);
              // Log compliance issue
              await supabase.from('ai_upload_audit').insert({
                organization_id: organizationId,
                user_id: organizationId,
                action: 'qa_organization_name_missing',
                metadata: {
                  organization_name: organizationContext.name,
                  criteria_missing_name: orgNameMissing.length,
                  total_criteria: criteria.length,
                  compliance_percentage: ((criteria.length - orgNameMissing.length) / criteria.length * 100).toFixed(2)
                }
              });
            } else {
              console.log(`✅ QA Passed: All criteria include organization name "${organizationContext.name}"`);
            }
            
            await logGeneration(systemPrompt, data.content, { 
              ...generationMetadata, 
              organization_name_injection_compliance: orgNameMissing.length === 0,
              organization_name_used: organizationContext.name
            });
          } else {
            // Fallback: try to parse as array
            const arrayStart = responseContent.indexOf('[');
            const arrayEnd = responseContent.lastIndexOf(']');
            if (arrayStart !== -1 && arrayEnd !== -1) {
              const arrayString = responseContent.substring(arrayStart, arrayEnd + 1);
              criteria = JSON.parse(arrayString);
            }
          }
        } catch (parseError) {
          console.error('Failed to parse AI response:', parseError);
        }
      }

      // Policy-aligned fallback criteria if AI fails - no legacy templates
      if (!criteria || criteria.length === 0) {
        console.warn('AI generation failed, providing policy-aligned minimal fallback criteria');
        
        // Update debug info to show fallback was triggered
        setDebugInfo(prev => ({ ...prev, fallbackTriggered: true }));
        
        criteria = [
          {
            statement: `${organizationContext.name}'s governance framework shall document roles and responsibilities for ${mps.name?.toLowerCase() || 'this practice'} with evidence of formal approval and annual review cycles`,
            summary: `Assess governance documentation specific to ${organizationContext.name}`,
            rationale: 'Formal governance provides accountability and clarity for implementation',
            evidence_guidance: 'Approved governance framework document, role definitions, annual review records, approval signatures',
            explanation: `This criterion ensures ${organizationContext.name} has established clear governance for ${mps.name?.toLowerCase() || 'this practice'}. Evidence should include the formal governance framework document with defined roles, responsibilities, approval records, and evidence of annual reviews. This is fundamental because clear governance prevents confusion and ensures accountability. Ask Maturion if you want to learn more.`
          },
          {
            statement: `System logs must demonstrate ${organizationContext.name} personnel actively implementing ${mps.name?.toLowerCase() || 'this practice'} with monthly performance metrics exceeding 85% compliance thresholds`,
            summary: `Evaluate system-recorded implementation evidence within ${organizationContext.name}`,
            rationale: 'System-generated evidence provides objective verification of active implementation',
            evidence_guidance: 'System activity logs, automated compliance reports, monthly performance dashboards showing ≥85% compliance',
            explanation: `This criterion requires objective system evidence that ${organizationContext.name} is actively implementing ${mps.name?.toLowerCase() || 'this practice'}. Evidence includes system logs, automated compliance reporting, and performance dashboards showing consistent achievement of 85% or higher compliance rates. This matters because system evidence is less susceptible to manipulation than manual documentation. Ask Maturion if you want to learn more.`
          }
        ];
        
        // Add organization context to fallback criteria
        criteria = criteria.map(criterion => ({
          ...criterion,
          evidence_guidance: criterion.evidence_guidance || `Organization-specific evidence requirements for ${organizationContext.name}`,
          explanation: criterion.explanation || `This criterion is tailored for ${organizationContext.name} and their implementation of ${mps.name?.toLowerCase() || 'this practice'}. Ask Maturion if you want to learn more.`
        }));
      }

      // Update debug info with actual results (preserve fallback status if it was triggered)
      setDebugInfo(prev => ({ 
        ...prev, 
        criteriaReceived: criteria.length,
        truncationWarning: criteria.length > 25,
        gap: Math.max(0, expectedCriteriaCount - criteria.length)
      }));

      // MPS Document-Informed Compliance Check
      const minRequired = Math.max(8, Math.floor(expectedCriteriaCount * 0.8)); // At least 80% of expected or minimum 8
      if (criteria.length < minRequired) {
        console.warn(`⚠️ Coverage Alert: Only ${criteria.length} criteria generated for MPS ${mps.mps_number}. Expected: ${expectedCriteriaCount}, Minimum: ${minRequired}`);
        
        const errorExplanation = criteria.length === 0 
          ? `AI returned no results due to insufficient signal from ${sourceMPSDocument}. Consider enhancing domain input or checking uploaded MPS documents.`
          : `AI returned only ${criteria.length} results while ${sourceMPSDocument} suggests ${expectedCriteriaCount} criteria. This may indicate insufficient MPS detail or knowledge base content.`;

        toast({
          title: "Insufficient Criteria Coverage",
          description: `Only ${criteria.length} criteria generated. ${sourceMPSDocument} expects ${expectedCriteriaCount} criteria for proper MPS coverage.`,
          variant: "destructive"
        });

        // Show explanation toast with MPS context
        setTimeout(() => {
          toast({
            title: "Generation Analysis",
            description: errorExplanation,
            variant: "default"
          });
        }, 2000);
        
        // Log compliance issue with MPS document context
        await supabase.from('ai_upload_audit').insert({
          organization_id: organizationId,
          user_id: organizationId,
          action: 'mps_document_compliance_warning',
          metadata: {
            mps_number: mps.mps_number,
            criteria_generated: criteria.length,
            expected_from_document: expectedCriteriaCount,
            minimum_required: minRequired,
            source_document: sourceMPSDocument,
            compliance_status: 'below_threshold',
            explanation: errorExplanation
          }
        });
      } else {
        console.log(`✅ MPS Document Compliance: ${criteria.length} criteria generated for MPS ${mps.mps_number} (Expected: ${expectedCriteriaCount})`);
      }

      // Save criteria to database and add unique IDs, status, and numbering
      const processedCriteria: GeneratedCriterion[] = [];
      
      for (let index = 0; index < criteria.length; index++) {
        const criterion = criteria[index];
        
        try {
          // Insert criterion into database
          const { data: insertedCriterion, error: insertError } = await supabase
            .from('criteria')
            .insert({
              mps_id: mps.id,
              organization_id: organizationId,
              statement: criterion.statement || '',
              summary: criterion.summary || '',
              criteria_number: `${mps.mps_number}.${index + 1}`,
              status: 'not_started',
              created_by: organizationId, // Using org ID as fallback for user ID
              updated_by: organizationId
            })
            .select()
            .single();

          if (insertError) {
            console.error('Error inserting criterion:', insertError);
            // Fallback to local state if database insert fails
            processedCriteria.push({
              id: `ai-${mps.id}-${index}`,
              statement: criterion.statement || '',
              summary: criterion.summary || '',
              rationale: criterion.rationale || 'AI-generated criterion',
              evidence_guidance: criterion.evidence_guidance || 'Evidence requirements to be specified',
              explanation: criterion.explanation || 'Detailed explanation to be provided',
              status: 'pending' as const,
              criteria_number: `${mps.mps_number}.${index + 1}`
            });
          } else {
            // Use database record
            processedCriteria.push({
              id: insertedCriterion.id,
              statement: insertedCriterion.statement || '',
              summary: insertedCriterion.summary || '',
              rationale: criterion.rationale || 'AI-generated criterion',
              evidence_guidance: criterion.evidence_guidance || 'Evidence requirements to be specified',
              explanation: criterion.explanation || 'Detailed explanation to be provided',
              status: 'pending' as const,
              criteria_number: insertedCriterion.criteria_number || `${mps.mps_number}.${index + 1}`
            });
          }
        } catch (error) {
          console.error('Database insert failed:', error);
          // Fallback to local state
          processedCriteria.push({
            id: `ai-${mps.id}-${index}`,
            statement: criterion.statement || '',
            summary: criterion.summary || '',
            rationale: criterion.rationale || 'AI-generated criterion',
            evidence_guidance: criterion.evidence_guidance || 'Evidence requirements to be specified',
            explanation: criterion.explanation || 'Detailed explanation to be provided',
            status: 'pending' as const,
            criteria_number: `${mps.mps_number}.${index + 1}`
          });
        }
      }

      setGeneratedCriteria(processedCriteria);
      
      // Show system message if provided
      if (systemMessage) {
        toast({
          title: "AI Generation Note",
          description: systemMessage,
          variant: "default"
        });
      }
      
    } catch (error) {
      console.error('Error generating AI criteria:', error);
      toast({
        title: "AI Generation Failed",
        description: "Using fallback criteria. Please review and edit as needed.",
        variant: "destructive"
      });
      
      // Provide fallback criteria with numbering
      const fallbackCriteria: GeneratedCriterion[] = [
        {
          id: 'fallback-1',
          statement: `Establish and maintain ${mps.name.toLowerCase()} framework`,
          summary: `Comprehensive framework for ${mps.name.toLowerCase()} implementation`,
          rationale: 'Foundation requirement for systematic approach',
          status: 'pending',
          criteria_number: `${mps.mps_number}.1`
        }
      ];
      setGeneratedCriteria(fallbackCriteria);
    } finally {
      setIsGenerating(false);
    }
  };

  // Regenerate functionality - clear existing and start fresh
  const handleRegenerate = async () => {
    setIsRegenerating(true);
    
    // Delete any existing unapproved criteria from database
    try {
      await supabase
        .from('criteria')
        .delete()
        .eq('mps_id', mps.id)
        .eq('organization_id', organizationId)
        .neq('status', 'approved_locked');
    } catch (error) {
      console.log('No existing criteria to delete or error occurred:', error);
    }
    
    // Clear local state
    setGeneratedCriteria([]);
    
    // Force regeneration with fresh prompt
    await generateAICriteria();
    
    setIsRegenerating(false);
    
    toast({
      title: "Criteria Regenerated",
      description: "Fresh criteria have been generated using updated AI policies.",
      variant: "default"
    });
  };

  useEffect(() => {
    generateAICriteria();
  }, [mps.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApprove = async (criterionId: string) => {
    // Update database if criterion exists in DB
    try {
      await supabase
        .from('criteria')
        .update({ status: 'approved_locked' })
        .eq('id', criterionId);
    } catch (error) {
      console.log('Criterion not in database, updating local state only');
    }
    
    setGeneratedCriteria(prev => 
      prev.map(c => c.id === criterionId ? { ...c, status: 'approved' } : c)
    );
  };

  const handleReject = async (criterionId: string) => {
    // Remove from database if criterion exists in DB
    try {
      await supabase
        .from('criteria')
        .delete()
        .eq('id', criterionId);
    } catch (error) {
      console.log('Criterion not in database, updating local state only');
    }
    
    setGeneratedCriteria(prev => 
      prev.map(c => c.id === criterionId ? { ...c, status: 'rejected' } : c)
    );
  };

  const handleEdit = (criterion: GeneratedCriterion) => {
    setEditingCriterion(criterion.id);
    setEditValues({
      statement: criterion.statement,
      summary: criterion.summary
    });
  };

  const handleSaveEdit = async (criterionId: string) => {
    // Re-analyze edited criterion with AI using policy-aligned enhancement
    const prompt = `You are operating under the AI Criteria Generation Policy and AI Criteria Tailoring Policy – Organization Name Injection. Please review and improve this edited assessment criterion:

Original Statement: ${editValues.statement}
Original Summary: ${editValues.summary}

Context:
- MPS ${mps.mps_number}: ${mps.name}
- Domain: ${domainName}
- Organization: ${organizationContext?.name || 'Not specified'}

Apply the following improvement criteria from Annex 2:
1. Clarity and auditability - eliminate ambiguous language
2. Professional directive language (e.g., "Records shall show...", "System logs must demonstrate...")
3. Measurable outcomes with specific thresholds
4. Organization name injection where contextually appropriate
5. Compliance with assessment standards

Return as JSON:
{
  "improved_statement": "enhanced statement with organization context",
  "improved_summary": "enhanced summary",
  "belongs_here": true/false,
  "suggestion": "improvement rationale"
}`;

    try {
      const { data } = await supabase.functions.invoke('maturion-ai-chat', {
        body: {
          prompt: prompt,
          context: 'Criterion Enhancement',
          currentDomain: domainName,
          organizationId: organizationId
        }
      });

      let improvedStatement = editValues.statement;
      let improvedSummary = editValues.summary;

      if (data?.content) {
        try {
          const responseContent = data.content;
          const jsonStart = responseContent.indexOf('{');
          const jsonEnd = responseContent.lastIndexOf('}');
          
          if (jsonStart !== -1 && jsonEnd !== -1) {
            const jsonString = responseContent.substring(jsonStart, jsonEnd + 1);
            const parsedData = JSON.parse(jsonString);
            
            improvedStatement = parsedData.improved_statement || editValues.statement;
            improvedSummary = parsedData.improved_summary || editValues.summary;
          }
        } catch (parseError) {
          console.log('Using original values due to parse error');
        }
      }

      setGeneratedCriteria(prev => 
        prev.map(c => 
          c.id === criterionId 
            ? { 
                ...c, 
                statement: improvedStatement,
                summary: improvedSummary,
                status: 'approved' 
              } 
            : c
        )
      );
      
      setEditingCriterion(null);
      
      toast({
        title: "Criterion Updated",
        description: "AI has enhanced your criterion for better compliance.",
      });
      
    } catch (error) {
      console.error('Error enhancing criterion:', error);
      
      // Still save the user's edits
      setGeneratedCriteria(prev => 
        prev.map(c => 
          c.id === criterionId 
            ? { 
                ...c, 
                statement: editValues.statement,
                summary: editValues.summary,
                status: 'approved' 
              } 
            : c
        )
      );
      
      setEditingCriterion(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingCriterion(null);
    setEditValues({ statement: '', summary: '' });
  };

  const handleBulkApprove = () => {
    setGeneratedCriteria(prev => 
      prev.map(c => c.status === 'pending' ? { ...c, status: 'approved' } : c)
    );
  };

  const handleContinue = () => {
    const approvedCriteria = generatedCriteria.filter(c => c.status === 'approved');
    onComplete(approvedCriteria);
  };

  const approvedCount = generatedCriteria.filter(c => c.status === 'approved').length;
  const pendingCount = generatedCriteria.filter(c => c.status === 'pending').length;
  const canContinue = generatedCriteria.length > 0 && generatedCriteria.every(c => c.status !== 'pending');

  if (isGenerating) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 animate-pulse text-primary" />
            Generating AI Criteria for MPS {mps.mps_number}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-2">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground">
                Maturion is analyzing your MPS and generating tailored criteria...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI-Generated Criteria for MPS {mps.mps_number}: {mps.name}
            </div>
            <Badge variant={approvedCount > 0 ? "default" : "secondary"}>
              {approvedCount} Approved
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">
              Review each AI-generated criterion. You can approve, edit, or reject them.
            </p>
            <div className="flex gap-2">
              {/* Regenerate Button */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRegenerate}
                disabled={isRegenerating}
                className="flex items-center gap-1"
              >
                {isRegenerating ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                Regenerate Criteria
              </Button>
              
              {/* Debug Panel Toggle (Dev Mode) */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowDebugPanel(!showDebugPanel)}
                className="flex items-center gap-1"
                title="Show debug information"
              >
                <Bug className="h-3 w-3" />
                Debug
              </Button>
              
              {pendingCount > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleBulkApprove}
                  className="flex items-center gap-1"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Approve All ({pendingCount})
                </Button>
              )}
            </div>
          </div>

          {/* Debug Panel */}
          {showDebugPanel && (
            <Card className="mb-4 border-orange-200 bg-orange-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1">
                  <Bug className="h-4 w-4" />
                  Developer Debug Panel
                </CardTitle>
              </CardHeader>
               <CardContent className="pt-0">
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                   <div>
                     <span className="font-medium">Source MPS Document:</span>
                     <div className="text-muted-foreground">{debugInfo.sourceMPSDocument || 'Not found'}</div>
                   </div>
                   <div>
                     <span className="font-medium">Expected Criteria Count:</span>
                     <div className="text-muted-foreground">{debugInfo.expectedCriteriaCount || 'Unknown'}</div>
                   </div>
                   <div>
                     <span className="font-medium">Generated:</span>
                     <div className="text-muted-foreground">{debugInfo.criteriaReceived}</div>
                   </div>
                   <div>
                     <span className="font-medium">Gap:</span>
                     <div className={debugInfo.gap && debugInfo.gap > 0 ? "text-orange-600" : "text-green-600"}>
                       {debugInfo.gap !== null ? debugInfo.gap : 'Unknown'}
                     </div>
                   </div>
                   <div>
                     <span className="font-medium">Source Prompt:</span>
                     <div className="text-muted-foreground">{debugInfo.sourcePromptUsed}</div>
                   </div>
                   <div>
                     <span className="font-medium">Fallback Triggered:</span>
                     <div className={debugInfo.fallbackTriggered ? "text-orange-600" : "text-green-600"}>
                       {debugInfo.fallbackTriggered ? "Yes" : "No"}
                     </div>
                   </div>
                 </div>
                {debugInfo.generationError && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
                    <span className="font-medium text-red-700">Error Details:</span>
                    <div className="text-red-600 mt-1">{debugInfo.generationError}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          
          <div className="space-y-3">
            {generatedCriteria.map((criterion) => (
              <Card key={criterion.id} className="border-l-4 border-l-primary/20">
                <CardContent className="pt-4">
                  {editingCriterion === criterion.id ? (
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor={`edit-statement-${criterion.id}`}>
                          Criterion Statement
                        </Label>
                        <Textarea
                          id={`edit-statement-${criterion.id}`}
                          value={editValues.statement}
                          onChange={(e) => setEditValues(prev => ({ ...prev, statement: e.target.value }))}
                          className="mt-1"
                          rows={3}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor={`edit-summary-${criterion.id}`}>
                          Summary
                        </Label>
                        <Input
                          id={`edit-summary-${criterion.id}`}
                          value={editValues.summary}
                          onChange={(e) => setEditValues(prev => ({ ...prev, summary: e.target.value }))}
                          className="mt-1"
                        />
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => handleSaveEdit(criterion.id)}
                          disabled={!editValues.statement.trim() || !editValues.summary.trim()}
                        >
                          Save & Approve
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                       <div className="flex items-start justify-between mb-2">
                         <div className="flex-1">
                           <div className="flex items-center gap-2 mb-1">
                             <Badge variant="outline" className="text-xs">
                               {criterion.criteria_number}
                             </Badge>
                             <span className="font-medium text-sm">{criterion.statement}</span>
                           </div>
                           <p className="text-xs text-muted-foreground mb-2">{criterion.summary}</p>
                           <p className="text-xs text-blue-600 italic">
                             Rationale: {criterion.rationale}
                           </p>
                         </div>
                         <Badge 
                           variant={
                             criterion.status === 'approved' ? 'default' :
                             criterion.status === 'rejected' ? 'destructive' : 'secondary'
                           }
                           className={`ml-2 ${
                             criterion.status === 'approved' ? 'bg-green-500 hover:bg-green-600' : ''
                           }`}
                         >
                           {criterion.status === 'approved' ? 'approved_locked' : criterion.status}
                         </Badge>
                        </div>

                        {/* Evidence Guidance for all criteria */}
                        {criterion.evidence_guidance && (
                          <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                            <span className="font-medium text-muted-foreground">Evidence Required: </span>
                            <span className="text-muted-foreground">{criterion.evidence_guidance}</span>
                          </div>
                        )}
                       
                       {criterion.status === 'pending' && (
                         <div className="flex gap-2 mt-3">
                           <Button 
                             size="sm" 
                             variant="default"
                             onClick={() => handleApprove(criterion.id)}
                             className="flex items-center gap-1"
                           >
                             <CheckCircle2 className="h-3 w-3" />
                             Approve
                           </Button>
                           <Button 
                             size="sm" 
                             variant="outline"
                             onClick={() => handleEdit(criterion)}
                             className="flex items-center gap-1"
                           >
                             <Edit className="h-3 w-3" />
                             Edit
                           </Button>
                           <Button 
                             size="sm" 
                             variant="destructive"
                             onClick={() => handleReject(criterion.id)}
                             className="flex items-center gap-1"
                           >
                             <X className="h-3 w-3" />
                             Reject
                           </Button>
                         </div>
                        )}

                        {/* Help/Info button for all criteria */}
                        {criterion.explanation && (
                         <div className="mt-3">
                           <Dialog>
                             <DialogTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="flex items-center gap-1"
                                  title="Get plain-language explanation and evidence guidance"
                                >
                                  <HelpCircle className="h-3 w-3" />
                                  Help/Info
                                </Button>
                             </DialogTrigger>
                             <DialogContent className="max-w-2xl">
                               <DialogHeader>
                                 <DialogTitle>
                                   Criterion {criterion.criteria_number} Explanation
                                 </DialogTitle>
                               </DialogHeader>
                               <div className="space-y-4">
                                 <div>
                                   <h4 className="font-medium mb-2">What this criterion means:</h4>
                                   <p className="text-sm text-muted-foreground border-l-2 border-primary/20 pl-3">
                                     {criterion.statement}
                                   </p>
                                 </div>
                                 
                                 <div>
                                   <h4 className="font-medium mb-2">Evidence Required:</h4>
                                   <p className="text-sm text-muted-foreground">
                                     {criterion.evidence_guidance || 'Evidence requirements to be specified during assessment'}
                                   </p>
                                 </div>
                                 
                                 <div>
                                   <h4 className="font-medium mb-2">Detailed Explanation:</h4>
                                   <p className="text-sm text-muted-foreground leading-relaxed">
                                     {criterion.explanation}
                                   </p>
                                 </div>
                                 
                                  <div className="pt-4 border-t bg-muted/30 p-3 rounded">
                                    <p className="text-sm font-medium text-primary mb-1">
                                      Need more help?
                                    </p>
                                    <p className="text-xs text-muted-foreground italic">
                                      Ask Maturion if you want to learn more.
                                    </p>
                                  </div>
                               </div>
                             </DialogContent>
                           </Dialog>
                         </div>
                       )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          
          {canContinue && (
            <div className="mt-6 pt-4 border-t">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {approvedCount} criteria approved and ready to use
                </p>
                <Button onClick={handleContinue}>
                  Continue with {approvedCount} Criteria
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};