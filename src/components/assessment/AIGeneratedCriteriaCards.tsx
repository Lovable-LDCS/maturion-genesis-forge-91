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
    
    const prompt = `Generate 3-5 specific, actionable assessment criteria for this MPS:

MPS ${mps.mps_number}: ${mps.name}
Intent: ${mps.intent_statement || 'Not specified'}
Domain: ${domainName}

Requirements:
- Each criterion must be specific to this MPS and auditable
- Focus on measurable outcomes and evidence requirements
- Use professional audit language
- Ensure criteria are distinct from each other
- Base on organizational best practices for ${domainName}

Return as JSON array:
[
  {
    "statement": "specific criterion statement",
    "summary": "brief explanation of what this measures", 
    "rationale": "why this criterion is important for this MPS"
  }
]`;

    try {
      const { data, error } = await supabase.functions.invoke('maturion-ai-chat', {
        body: {
          prompt: prompt,
          context: 'AI Criteria Generation',
          currentDomain: domainName,
          organizationId: organizationId,
          allowExternalContext: true,
          knowledgeBaseUsed: true
        }
      });

      if (error) {
        console.error('AI generation error:', error);
        throw error;
      }

      // Parse AI response
      let criteria: GeneratedCriterion[] = [];
      
      if (data?.content) {
        try {
          const responseContent = data.content;
          const jsonStart = responseContent.indexOf('[');
          const jsonEnd = responseContent.lastIndexOf(']');
          
          if (jsonStart !== -1 && jsonEnd !== -1) {
            const jsonString = responseContent.substring(jsonStart, jsonEnd + 1);
            const parsedCriteria = JSON.parse(jsonString);
            
            criteria = parsedCriteria.map((criterion: any, index: number) => ({
              id: `ai-generated-${index}`,
              statement: criterion.statement || '',
              summary: criterion.summary || '',
              rationale: criterion.rationale || 'AI-generated criterion',
              status: 'pending' as const
            }));
          }
        } catch (parseError) {
          console.error('Failed to parse AI response:', parseError);
        }
      }

      // Fallback if parsing failed
      if (criteria.length === 0) {
        criteria = [
          {
            id: 'fallback-1',
            statement: `Establish clear ${mps.name.toLowerCase()} procedures and documentation`,
            summary: `Ensure comprehensive procedures exist for ${mps.name.toLowerCase()}`,
            rationale: 'Standard requirement for systematic approach',
            status: 'pending'
          },
          {
            id: 'fallback-2', 
            statement: `Implement monitoring and review processes for ${mps.name.toLowerCase()}`,
            summary: `Regular monitoring and review of ${mps.name.toLowerCase()} effectiveness`,
            rationale: 'Essential for continuous improvement',
            status: 'pending'
          }
        ];
      }

      setGeneratedCriteria(criteria);
      
    } catch (error) {
      console.error('Error generating AI criteria:', error);
      toast({
        title: "AI Generation Failed",
        description: "Using fallback criteria. Please review and edit as needed.",
        variant: "destructive"
      });
      
      // Provide fallback criteria
      setGeneratedCriteria([
        {
          id: 'fallback-1',
          statement: `Establish and maintain ${mps.name.toLowerCase()} framework`,
          summary: `Comprehensive framework for ${mps.name.toLowerCase()} implementation`,
          rationale: 'Foundation requirement for systematic approach',
          status: 'pending'
        }
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    generateAICriteria();
  }, [mps.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApprove = (criterionId: string) => {
    setGeneratedCriteria(prev => 
      prev.map(c => c.id === criterionId ? { ...c, status: 'approved' } : c)
    );
  };

  const handleReject = (criterionId: string) => {
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

  const handleContinue = () => {
    const approvedCriteria = generatedCriteria.filter(c => c.status === 'approved');
    onComplete(approvedCriteria);
  };

  const approvedCount = generatedCriteria.filter(c => c.status === 'approved').length;
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
          <p className="text-sm text-muted-foreground mb-4">
            Review each AI-generated criterion. You can approve, edit, or reject them.
          </p>
          
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
                          <p className="font-medium text-sm mb-1">{criterion.statement}</p>
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
                          className="ml-2"
                        >
                          {criterion.status}
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