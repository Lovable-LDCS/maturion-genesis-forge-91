import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sparkles, CheckCircle2, Edit, X, Loader2, HelpCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
  const [editingCriterion, setEditingCriterion] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ statement: string; summary: string }>({ statement: '', summary: '' });
  const { toast } = useToast();

  const generateAICriteria = async () => {
    setIsGenerating(true);
    
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
          criteria_number: criterion.criteria_number || `${mps.mps_number}.${index + 1}`
        }));
        setGeneratedCriteria(processedCriteria);
        setIsGenerating(false);
        return;
      }
    } catch (error) {
      console.log('No existing criteria found, generating new ones');
    }
    
    // LOCKED SYSTEM PROMPT - Override all default generation prompts
    const systemPrompt = `You are an AI assessment criteria generator operating under strict system constraints from the AI Criteria Generation Policy and Annex 2 AI_Criteria_Evaluation_Guide documents in the AI Admin Knowledge Base.

MANDATORY SYSTEM CONSTRAINTS (NON-NEGOTIABLE):

1. PRECISION REQUIREMENT: All criteria must be precise, unambiguous, and fully measurable
2. EVIDENCE TYPE MANDATE: Include expected evidence type (policy, log, record, system, audit, interview, configuration)
3. FORMAL LANGUAGE: Use formal, directive language (e.g., "Records shall show...", "System logs must demonstrate...")
4. RATIONALE INCLUSION: Include rationale sentence explaining necessity below main statement
5. STRUCTURAL COMPLIANCE: Evidence Type + Verb + Context + Condition/Purpose
6. ANTI-VAGUENESS: Never use "appropriate," "adequate," or "effective" without specific qualification/measurement
7. MATURION LINK: End all explanations with: "Ask Maturion if you want to learn more."

HALLUCINATION FILTERS - REJECT ANY CONTENT WITH:
- Unsupported claims not grounded in MPS context
- Broad, undefined terms without measurable criteria
- More than one "A policy shall be in place..." statement per MPS
- Repetitive or template-like phrasing
- Vague qualifiers without specific thresholds

CONTROLLED CREATIVITY BOUNDARIES:
- Variety in evidence types (policies, records, logs, systems, audits, interviews, configurations)
- Context drawn from uploaded AI Admin Knowledge Base documents
- Structured creativity mode - NOT freeform generation
- Clarity prioritized over verbosity

MPS CONTEXT FOR GENERATION:
- Number: ${mps.mps_number}
- Title: ${mps.name}
- Domain: ${domainName}
- Intent: ${mps.intent_statement || 'Not specified'}

GENERATION TARGET: Generate 8-25 criteria based on MPS complexity for comprehensive coverage.

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
            
            // Log generation attempt with metadata
            const generationMetadata = parsedData.generation_metadata || {
              criteria_count: criteria.length,
              complexity_assessment: 'unknown',
              evidence_types_used: [],
              document_references: ['AI_Criteria_Generation_Policy', 'Annex_2']
            };
            
            await logGeneration(systemPrompt, data.content, generationMetadata);
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

      // Generate varied fallback criteria if AI fails
      if (!criteria || criteria.length === 0) {
        criteria = [
          {
            statement: `A policy shall be in place that establishes ${mps.name?.toLowerCase() || 'this practice'} governance framework with defined roles, responsibilities, and approval authorities`,
            summary: `Evaluate the governance framework for ${mps.name?.toLowerCase() || 'this practice'}`,
            rationale: 'Clear governance framework is fundamental to successful implementation',
            evidence_guidance: 'Formally approved policy document, version control records, role definitions, approval matrix, communication records',
            explanation: `This criterion ensures there is a documented governance structure for ${mps.name?.toLowerCase() || 'this practice'}. Evidence should include the formal policy document with clear version control, defined roles and responsibilities, approval authorities, and records showing the policy has been communicated to relevant personnel. This matters because without clear governance, implementation becomes ad-hoc and inconsistent.`
          },
          {
            statement: `Records shall demonstrate systematic implementation of ${mps.name?.toLowerCase() || 'this practice'} activities with documented outcomes and frequency of at least monthly reviews`,
            summary: `Assess documented evidence of ${mps.name?.toLowerCase() || 'this practice'} implementation`,
            rationale: 'Documentation provides evidence of systematic implementation',
            evidence_guidance: 'Activity logs, review meeting minutes, outcome reports, dated records showing monthly frequency, sign-off documentation',
            explanation: `This criterion verifies that ${mps.name?.toLowerCase() || 'this practice'} is being systematically implemented with regular reviews. Evidence should include activity logs, meeting minutes from monthly reviews, documented outcomes, and appropriate sign-offs. This is important because it demonstrates consistent execution rather than sporadic or informal implementation.`
          },
          {
            statement: `Training records shall show personnel competency in ${mps.name?.toLowerCase() || 'this practice'} with test scores ≥80% and annual refresher training`,
            summary: `Evaluate training programs and competency records for ${mps.name?.toLowerCase() || 'this practice'}`,
            rationale: 'Training ensures personnel understand and can execute requirements',
            evidence_guidance: 'Signed attendance registers, test results showing ≥80% scores, competency matrices, annual training schedules, certification records',
            explanation: `This criterion ensures personnel have the necessary knowledge and skills for ${mps.name?.toLowerCase() || 'this practice'}. Evidence should include signed training attendance records, test scores of 80% or higher, competency assessment matrices, and schedules showing annual refresher training. This matters because untrained personnel cannot effectively implement requirements, leading to compliance failures.`
          },
          {
            statement: `A monitoring system must track performance indicators for ${mps.name?.toLowerCase() || 'this practice'} with automated alerts for deviations exceeding defined thresholds`,
            summary: `Assess monitoring and measurement processes for ${mps.name?.toLowerCase() || 'this practice'}`,
            rationale: 'Monitoring ensures ongoing effectiveness and compliance',
            evidence_guidance: 'System configuration screenshots, alert logs, threshold definitions, performance dashboards, escalation procedures',
            explanation: `This criterion requires an active monitoring system that tracks key performance indicators and provides alerts when thresholds are exceeded. Evidence should include system configurations, alert logs, clearly defined thresholds, performance dashboards, and escalation procedures. This is critical because proactive monitoring enables early detection and correction of issues before they become major problems.`
          },
          {
            statement: `Independent audit results must confirm compliance with ${mps.name?.toLowerCase() || 'this practice'} requirements through annual assessments by qualified auditors`,
            summary: `Evaluate audit findings and verification activities for ${mps.name?.toLowerCase() || 'this practice'}`,
            rationale: 'Independent verification confirms operational effectiveness',
            evidence_guidance: 'Independent audit reports, auditor qualifications, finding classifications, corrective action plans, annual audit schedules',
            explanation: `This criterion ensures independent verification of ${mps.name?.toLowerCase() || 'this practice'} effectiveness. Evidence should include formal audit reports from qualified auditors, documentation of auditor credentials, classification of findings, corrective action plans, and annual audit schedules. This matters because independent verification provides objective assurance that requirements are being met effectively.`
          },
          {
            statement: `An incident log shall be maintained that captures all ${mps.name?.toLowerCase() || 'this practice'}-related incidents with root cause analysis completed within 30 days`,
            summary: `Assess incident tracking and response capabilities for ${mps.name?.toLowerCase() || 'this practice'}`,
            rationale: 'Incident tracking enables continuous improvement and risk management',
            evidence_guidance: 'Incident log database, root cause analysis reports, 30-day completion tracking, corrective action records, trend analysis',
            explanation: `This criterion requires systematic tracking of incidents related to ${mps.name?.toLowerCase() || 'this practice'} with timely analysis. Evidence should include a maintained incident log, root cause analysis reports completed within 30 days, corrective action records, and trend analysis. This is important because systematic incident tracking enables learning from failures and preventing recurrence.`
          },
          {
            statement: `Evidence must show measurable improvement in ${mps.name?.toLowerCase() || 'this practice'} performance through documented metrics and quarterly improvement initiatives`,
            summary: `Evaluate continuous improvement mechanisms for ${mps.name?.toLowerCase() || 'this practice'}`,
            rationale: 'Continuous improvement ensures ongoing enhancement and adaptation',
            evidence_guidance: 'Performance metrics trends, improvement project documentation, quarterly review records, before/after comparisons, benefits realization reports',
            explanation: `This criterion ensures continuous improvement is actively pursued with measurable results. Evidence should include trending performance metrics, documented improvement projects, quarterly review records, before/after comparisons, and benefits realization reports. This matters because continuous improvement ensures the practice evolves and becomes more effective over time rather than remaining static.`
          },
          {
            statement: `Resource allocation records must demonstrate sufficient funding and staffing for ${mps.name?.toLowerCase() || 'this practice'} with budget approval and quarterly resource reviews`,
            summary: `Assess resource allocation and management for ${mps.name?.toLowerCase() || 'this practice'}`,
            rationale: 'Adequate resources are essential for effective implementation',
            evidence_guidance: 'Budget allocation documents, staffing plans, resource utilization reports, quarterly review minutes, approval authorities',
            explanation: `This criterion ensures adequate resources are allocated and managed for ${mps.name?.toLowerCase() || 'this practice'}. Evidence should include formal budget allocations, staffing plans, resource utilization reports, quarterly review minutes, and appropriate approval authorities. This is essential because insufficient resources lead to implementation failures and compromised effectiveness.`
          }
        ];
      }

      // Note: No minimum threshold check - generate as many as needed for coverage

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
    // Re-analyze edited criterion with AI
    const prompt = `Please review and improve this edited assessment criterion:

Original Statement: ${editValues.statement}
Original Summary: ${editValues.summary}

Context:
- MPS ${mps.mps_number}: ${mps.name}
- Domain: ${domainName}

Please improve for:
1. Clarity and auditability
2. Professional language
3. Measurable outcomes
4. Compliance with assessment standards

Return as JSON:
{
  "improved_statement": "enhanced statement",
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

                       {/* Explanation button for approved criteria */}
                       {criterion.status === 'approved' && criterion.explanation && (
                         <div className="mt-3">
                           <Dialog>
                             <DialogTrigger asChild>
                               <Button 
                                 size="sm" 
                                 variant="outline"
                                 className="flex items-center gap-1"
                               >
                                 <HelpCircle className="h-3 w-3" />
                                 Explanation
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
                                 
                                 <div className="pt-4 border-t">
                                   <p className="text-xs text-muted-foreground italic">
                                     Ask Maturion if you want to know more.
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