import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, CheckCircle2, Edit, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface GeneratedCriterion {
  id: string;
  statement: string;
  summary: string;
  rationale: string;
  status: 'pending' | 'approved' | 'rejected' | 'editing';
  criteria_number: string;
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
    
    const prompt = `Generate comprehensive assessment criteria for this MPS to achieve complete coverage of its intent. The number of criteria should be based on the complexity and scope of the MPS, not a fixed number.

MPS ${mps.mps_number}: ${mps.name}
Intent: ${mps.intent_statement || 'Not specified'}
Domain: ${domainName}

CRITICAL REQUIREMENTS:
1. EVIDENCE TYPE VARIATION: Use different evidence types based on what's most appropriate:
   - "A policy shall be in place that..." (for governance/procedural requirements)
   - "Records shall demonstrate that..." (for documentation/tracking requirements)
   - "Training records shall show that..." (for competency requirements)
   - "An automated system must..." (for technology/tool requirements)
   - "Audit results must confirm that..." (for verification requirements)
   - "A log shall be maintained that..." (for monitoring requirements)
   - "Evidence must show that..." (for outcome-based requirements)

2. COMPREHENSIVE COVERAGE: Generate as many criteria as needed to fully cover:
   - All aspects of the MPS intent statement
   - Different operational contexts and scenarios
   - Various evidence types and verification methods
   - Implementation, monitoring, and verification requirements

3. QUALITY OVER QUANTITY: Focus on:
   - Specific, auditable requirements
   - Measurable outcomes
   - Clear evidence expectations
   - Professional audit language
   - Distinct, non-overlapping criteria

4. DYNAMIC SCOPE: The number of criteria should vary based on MPS complexity:
   - Simple MPS: 8-12 criteria
   - Complex MPS: 15-25 criteria
   - Generate as many as needed for complete coverage

Return as JSON:
{
  "criteria": [
    {
      "statement": "[appropriate evidence type] [specific requirement]",
      "summary": "brief explanation of what this measures", 
      "rationale": "why this criterion is important for this MPS"
    }
  ],
  "system_message": "explanation of criteria count and coverage approach"
}`;

    try {
      const { data, error } = await supabase.functions.invoke('maturion-ai-chat', {
        body: {
          prompt: prompt,
          context: 'AI Criteria Generation',
          currentDomain: domainName,
          organizationId: organizationId,
          allowExternalContext: true,
          knowledgeBaseUsed: true,
          temperature: 0
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
            statement: `A policy shall be in place that establishes ${mps.name?.toLowerCase() || 'this practice'} governance framework`,
            summary: `Evaluate the governance framework for ${mps.name?.toLowerCase() || 'this practice'}`,
            rationale: 'Clear governance framework is fundamental to successful implementation'
          },
          {
            statement: `Records shall demonstrate implementation of ${mps.name?.toLowerCase() || 'this practice'} activities`,
            summary: `Assess documented evidence of ${mps.name?.toLowerCase() || 'this practice'} implementation`,
            rationale: 'Documentation provides evidence of systematic implementation'
          },
          {
            statement: `Training records shall show personnel competency in ${mps.name?.toLowerCase() || 'this practice'}`,
            summary: `Evaluate training programs and competency records for ${mps.name?.toLowerCase() || 'this practice'}`,
            rationale: 'Training ensures personnel understand and can execute requirements'
          },
          {
            statement: `A monitoring system must track performance of ${mps.name?.toLowerCase() || 'this practice'}`,
            summary: `Assess monitoring and measurement processes for ${mps.name?.toLowerCase() || 'this practice'}`,
            rationale: 'Monitoring ensures ongoing effectiveness and compliance'
          },
          {
            statement: `Audit results must confirm effectiveness of ${mps.name?.toLowerCase() || 'this practice'}`,
            summary: `Evaluate audit findings and verification activities for ${mps.name?.toLowerCase() || 'this practice'}`,
            rationale: 'Independent verification confirms operational effectiveness'
          },
          {
            statement: `A log shall be maintained that tracks incidents related to ${mps.name?.toLowerCase() || 'this practice'}`,
            summary: `Assess incident tracking and response capabilities for ${mps.name?.toLowerCase() || 'this practice'}`,
            rationale: 'Incident tracking enables continuous improvement and risk management'
          },
          {
            statement: `Evidence must show continuous improvement in ${mps.name?.toLowerCase() || 'this practice'}`,
            summary: `Evaluate continuous improvement mechanisms for ${mps.name?.toLowerCase() || 'this practice'}`,
            rationale: 'Continuous improvement ensures ongoing enhancement and adaptation'
          },
          {
            statement: `Resource allocation records must demonstrate adequate support for ${mps.name?.toLowerCase() || 'this practice'}`,
            summary: `Assess resource allocation and management for ${mps.name?.toLowerCase() || 'this practice'}`,
            rationale: 'Adequate resources are essential for effective implementation'
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