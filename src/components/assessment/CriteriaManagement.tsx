import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Edit3, Check, X, ChevronDown, ChevronUp, Sparkles, AlertTriangle, FileText, CheckCircle, Lock } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AISourceIndicator } from '@/components/ai/AISourceIndicator';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MPS {
  id: string;
  name: string;
  mps_number: number;
  intent_statement?: string;
  summary?: string;
  status: string;
}

interface Criteria {
  id: string;
  mps_id: string;
  criteria_number: string;
  statement: string;
  summary?: string;
  status: string;
  ai_suggested_statement?: string;
  ai_suggested_summary?: string;
  statement_approved_by?: string;
  statement_approved_at?: string;
}

interface MaturityLevel {
  id: string;
  criteria_id: string;
  level: 'basic' | 'reactive' | 'compliant' | 'proactive' | 'resilient';
  descriptor: string;
  ai_suggested_descriptor?: string;
  descriptor_approved_by?: string;
  descriptor_approved_at?: string;
}

interface CriteriaManagementProps {
  isOpen: boolean;
  onClose: () => void;
  domainName: string;
  onCriteriaFinalized: (criteria: Criteria[]) => Promise<void>;
}

export const CriteriaManagement: React.FC<CriteriaManagementProps> = ({
  isOpen,
  onClose,
  domainName,
  onCriteriaFinalized
}) => {
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  
  const [mpsList, setMpsList] = useState<MPS[]>([]);
  const [criteriaList, setCriteriaList] = useState<Criteria[]>([]);
  const [maturityLevels, setMaturityLevels] = useState<MaturityLevel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedMPS, setExpandedMPS] = useState<string[]>([]);
  const [expandedCriteria, setExpandedCriteria] = useState<string[]>([]);
  const [editingCriteria, setEditingCriteria] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ statement: string; summary: string }>({
    statement: '',
    summary: ''
  });

  // Load existing MPSs and criteria when modal opens
  useEffect(() => {
    if (isOpen && currentOrganization?.id) {
      fetchMPSsAndCriteria();
    }
  }, [isOpen, currentOrganization?.id]);

  const fetchMPSsAndCriteria = async () => {
    if (!currentOrganization?.id) return;

    setIsLoading(true);
    try {
      // Fetch MPSs for this domain
      const { data: mpsData, error: mpsError } = await supabase
        .from('maturity_practice_statements')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('mps_number');

      if (mpsError) throw mpsError;

      setMpsList(mpsData || []);

      // Fetch existing criteria
      const { data: criteriaData, error: criteriaError } = await supabase
        .from('criteria')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('criteria_number');

      if (criteriaError) throw criteriaError;

      setCriteriaList(criteriaData || []);

      // Fetch maturity levels
      const { data: maturityData, error: maturityError } = await supabase
        .from('maturity_levels')
        .select('*')
        .eq('organization_id', currentOrganization.id);

      if (maturityError) throw maturityError;

      setMaturityLevels(maturityData || []);

    } catch (error) {
      console.error('Error fetching MPSs and criteria:', error);
      toast({
        title: "Error Loading Data",
        description: "Failed to load MPSs and criteria.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateCriteriaForMPS = async (mps: MPS) => {
    if (!currentOrganization?.id) return;

    setIsGenerating(true);
    try {
      const prompt = `Generate comprehensive assessment criteria for the following MPS (Mini Performance Standard):

MPS ${mps.mps_number}: ${mps.name}
Summary: ${mps.summary || 'No summary provided'}
Intent: ${mps.intent_statement || 'No intent provided'}
Domain: ${domainName}

Please generate criteria that:
1. Are specific, measurable, and auditable requirement statements
2. Follow international standards (ISO 27001, NIST, etc.)
3. Are appropriate for ${domainName} domain
4. Each criterion must have a clear, actionable descriptor (not placeholder text)
5. Are numbered as ${mps.mps_number}.1, ${mps.mps_number}.2, etc.
6. Generate as many criteria as needed to comprehensively assess this MPS (no artificial limits)
7. Each criterion should assess a distinct aspect of the MPS
8. Each criterion should have ONE specific evidence expectation (not a bundle)
9. Ensure criteria align with Annex 2 structure and audit requirements

IMPORTANT: Each "statement" must be a full, clear requirement description, not placeholder text like "Evaluation requirements for X - criterion Y".

Examples of good criterion statements:
- "A documented information security policy must be established, approved by management, and communicated to all employees"
- "Security roles and responsibilities must be formally assigned and documented with clear accountability chains"
- "Regular security risk assessments must be conducted and documented with findings tracked to resolution"

Return a JSON array with this structure:
[
  {
    "criteria_number": "${mps.mps_number}.1",
    "statement": "Full, clear requirement statement describing what must be evaluated",
    "summary": "Brief explanation of what this criterion assesses",
    "evidence_suggestions": "One specific evidence item that demonstrates compliance"
  }
]`;

      const { data, error } = await supabase.functions.invoke('maturion-ai-chat', {
        body: {
          prompt: prompt,
          context: 'Criteria generation',
          currentDomain: domainName,
          organizationId: currentOrganization.id
        }
      });

      if (error) throw error;

      let generatedCriteria: Array<{
        criteria_number: string;
        statement: string;
        summary: string;
        evidence_suggestions: string;
      }> = [];

      try {
        // Parse AI response
        let cleanResponse = data.response.replace(/```json\n?|\n?```/g, '').trim();
        
        // Look for JSON array in the response
        const jsonArrayMatch = cleanResponse.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (jsonArrayMatch) {
          cleanResponse = jsonArrayMatch[0];
        }
        
        generatedCriteria = JSON.parse(cleanResponse);
        console.log(`✅ Generated ${generatedCriteria.length} criteria for MPS ${mps.mps_number}`);
      } catch (parseError) {
        console.warn('Failed to parse criteria response, using fallback');
        // Fallback: create default criteria
        generatedCriteria = Array.from({ length: 5 }, (_, index) => ({
          criteria_number: `${mps.mps_number}.${index + 1}`,
          statement: `Assessment criterion ${index + 1} for ${mps.name}`,
          summary: `Evaluation requirements for ${mps.name} - criterion ${index + 1}`,
          evidence_suggestions: "Documentation, policies, procedures, implementation evidence"
        }));
      }

      // Save generated criteria to database
      for (const criterion of generatedCriteria) {
        const { error: insertError } = await supabase
          .from('criteria')
          .insert({
            mps_id: mps.id,
            organization_id: currentOrganization.id,
            criteria_number: criterion.criteria_number,
            statement: criterion.statement,
            summary: criterion.summary,
            ai_suggested_statement: criterion.statement,
            ai_suggested_summary: criterion.summary,
            status: 'not_started',
            created_by: currentOrganization.owner_id,
            updated_by: currentOrganization.owner_id
          });

        if (insertError) {
          console.error('Error saving criterion:', insertError);
        }
      }

      // Refresh criteria list
      await fetchMPSsAndCriteria();

      toast({
        title: "Criteria Generated",
        description: `Successfully generated ${generatedCriteria.length} criteria for MPS ${mps.mps_number}`,
      });

    } catch (error) {
      console.error('Error generating criteria:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate criteria. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const approveCriteria = async (criteriaId: string) => {
    if (!currentOrganization?.id) return;

    try {
      const { error } = await supabase
        .from('criteria')
        .update({
          status: 'approved_locked',
          statement_approved_by: currentOrganization.owner_id,
          statement_approved_at: new Date().toISOString(),
          updated_by: currentOrganization.owner_id
        })
        .eq('id', criteriaId);

      if (error) throw error;

      // Refresh data
      await fetchMPSsAndCriteria();

      toast({
        title: "Criteria Approved",
        description: "Criteria statement has been approved and locked.",
      });

    } catch (error) {
      console.error('Error approving criteria:', error);
      toast({
        title: "Approval Failed",
        description: "Failed to approve criteria.",
        variant: "destructive"
      });
    }
  };

  const updateCriteria = async (criteriaId: string, updates: { statement: string; summary: string }) => {
    if (!currentOrganization?.id) return;

    try {
      const { error } = await supabase
        .from('criteria')
        .update({
          statement: updates.statement,
          summary: updates.summary,
          updated_by: currentOrganization.owner_id
        })
        .eq('id', criteriaId);

      if (error) throw error;

      // Refresh data
      await fetchMPSsAndCriteria();
      setEditingCriteria(null);

      toast({
        title: "Criteria Updated",
        description: "Criteria has been successfully updated.",
      });

    } catch (error) {
      console.error('Error updating criteria:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update criteria.",
        variant: "destructive"
      });
    }
  };

  const toggleMPSExpansion = (mpsId: string) => {
    setExpandedMPS(prev => 
      prev.includes(mpsId) 
        ? prev.filter(id => id !== mpsId)
        : [...prev, mpsId]
    );
  };

  const toggleCriteriaExpansion = (criteriaId: string) => {
    setExpandedCriteria(prev => 
      prev.includes(criteriaId) 
        ? prev.filter(id => id !== criteriaId)
        : [...prev, criteriaId]
    );
  };

  const startEditing = (criteria: Criteria) => {
    setEditingCriteria(criteria.id);
    setEditForm({
      statement: criteria.statement,
      summary: criteria.summary || ''
    });
  };

  const cancelEditing = () => {
    setEditingCriteria(null);
    setEditForm({ statement: '', summary: '' });
  };

  const saveEditing = () => {
    if (editingCriteria) {
      updateCriteria(editingCriteria, editForm);
    }
  };

  const getCriteriaForMPS = (mpsId: string) => {
    return criteriaList.filter(criteria => criteria.mps_id === mpsId);
  };

  const getMaturityLevelsForCriteria = (criteriaId: string) => {
    return maturityLevels.filter(level => level.criteria_id === criteriaId);
  };

  const hasApprovedCriteria = () => {
    return criteriaList.some(criteria => criteria.status === 'approved_locked');
  };

  const allMPSHaveApprovedCriteria = () => {
    return mpsList.every(mps => {
      const mpssCriteria = getCriteriaForMPS(mps.id);
      return mpssCriteria.some(criteria => criteria.status === 'approved_locked');
    });
  };

  const completeCriteriaSetup = async () => {
    const approvedCriteria = criteriaList.filter(criteria => criteria.status === 'approved_locked');
    await onCriteriaFinalized(approvedCriteria);
    onClose();
  };

  const maturityLevelColors = {
    basic: 'bg-orange-500 text-white',
    reactive: 'bg-yellow-500 text-white',
    compliant: 'bg-blue-500 text-white',
    proactive: 'bg-green-500 text-white',
    resilient: 'bg-purple-500 text-white'
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-blue-500" />
            Step 3: Criteria Management - {domainName}
          </DialogTitle>
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground">
              Generate and manage assessment criteria for each MPS
            </p>
            <AISourceIndicator sourceType="internal" />
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Indicator */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Criteria Setup Progress</span>
              <span className="text-sm text-muted-foreground">
                {criteriaList.filter(c => c.status === 'approved_locked').length} criteria approved
              </span>
            </div>
            <Progress 
              value={criteriaList.length > 0 ? (criteriaList.filter(c => c.status === 'approved_locked').length / criteriaList.length) * 100 : 0} 
              className="h-2" 
            />
          </div>

          {/* Instructions */}
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-500" />
                Criteria Development Guidelines
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">What Maturion Will Generate:</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Comprehensive criteria per MPS (8-15+ as needed)</li>
                    <li>• Numbered references (e.g., MPS1.1, MPS1.2)</li>
                    <li>• Evidence expectations</li>
                    <li>• International alignment (ISO, NIST)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Your Review Process:</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Review each generated criterion</li>
                    <li>• Edit statements as needed</li>
                    <li>• Approve criteria to lock them</li>
                    <li>• Generate maturity descriptors (Step 4)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* MPS List with Collapsible Criteria */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">
                <Progress value={50} className="w-1/2 mx-auto mb-4" />
                <p className="text-muted-foreground">Loading MPSs and criteria...</p>
              </div>
            ) : mpsList.length === 0 ? (
              <Card className="border-yellow-200 bg-yellow-50/50">
                <CardContent className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">No MPSs Found</h3>
                  <p className="text-muted-foreground">
                    Please complete Steps 1 and 2 first to create MPSs and intent statements.
                  </p>
                </CardContent>
              </Card>
            ) : (
              mpsList.map((mps) => {
                const mpssCriteria = getCriteriaForMPS(mps.id);
                const isExpanded = expandedMPS.includes(mps.id);
                
                return (
                  <Card key={mps.id} className="border-2">
                    <Collapsible 
                      open={isExpanded} 
                      onOpenChange={() => toggleMPSExpansion(mps.id)}
                    >
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <Badge variant="secondary">MPS {mps.mps_number}</Badge>
                                <CardTitle className="text-lg">{mps.name}</CardTitle>
                                {mpssCriteria.some(c => c.status === 'approved_locked') && (
                                  <Badge variant="default" className="bg-green-500">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Approved Criteria
                                  </Badge>
                                )}
                              </div>
                              {mps.intent_statement && (
                                <CardDescription className="text-sm italic">
                                  Intent: {mps.intent_statement}
                                </CardDescription>
                              )}
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span>{mpssCriteria.length} criteria</span>
                                <span>{mpssCriteria.filter(c => c.status === 'approved_locked').length} approved</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {mpssCriteria.length === 0 && (
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    generateCriteriaForMPS(mps);
                                  }}
                                  disabled={isGenerating}
                                  className="mr-2"
                                >
                                  {isGenerating ? (
                                    <>
                                      <Sparkles className="h-4 w-4 mr-1 animate-pulse" />
                                      Generating...
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles className="h-4 w-4 mr-1" />
                                      Generate Criteria
                                    </>
                                  )}
                                </Button>
                              )}
                              {isExpanded ? (
                                <ChevronUp className="h-5 w-5" />
                              ) : (
                                <ChevronDown className="h-5 w-5" />
                              )}
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          {mpssCriteria.length === 0 ? (
                            <div className="text-center py-6 border-2 border-dashed border-muted rounded-lg">
                              <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                              <p className="text-muted-foreground mb-3">No criteria generated yet</p>
                              <Button
                                onClick={() => generateCriteriaForMPS(mps)}
                                disabled={isGenerating}
                                size="sm"
                              >
                                {isGenerating ? (
                                  <>
                                    <Sparkles className="h-4 w-4 mr-1 animate-pulse" />
                                    Generating...
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="h-4 w-4 mr-1" />
                                    Generate Criteria
                                  </>
                                )}
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {mpssCriteria.map((criteria) => {
                                const criteriaMaturityLevels = getMaturityLevelsForCriteria(criteria.id);
                                const isCriteriaExpanded = expandedCriteria.includes(criteria.id);
                                const isEditing = editingCriteria === criteria.id;
                                const isApproved = criteria.status === 'approved_locked';
                                
                                return (
                                  <Card key={criteria.id} className={`ml-4 ${isApproved ? 'border-green-200 bg-green-50/30' : ''}`}>
                                    <Collapsible 
                                      open={isCriteriaExpanded} 
                                      onOpenChange={() => toggleCriteriaExpansion(criteria.id)}
                                    >
                                      <CollapsibleTrigger asChild>
                                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                                          <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                              <div className="flex items-center gap-2 mb-1">
                                                <Badge variant="outline" className="text-xs">
                                                  {criteria.criteria_number}
                                                </Badge>
                                                {isApproved && (
                                                  <Badge className="bg-green-500 text-xs">
                                                    <CheckCircle className="h-3 w-3 mr-1" />
                                                    Approved
                                                  </Badge>
                                                )}
                                              </div>
                                              <h4 className="font-medium text-sm">{criteria.statement}</h4>
                                              {criteria.summary && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                  {criteria.summary}
                                                </p>
                                              )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                              {!isApproved && (
                                                <>
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      startEditing(criteria);
                                                    }}
                                                  >
                                                    <Edit3 className="h-3 w-3" />
                                                  </Button>
                                                  <Button
                                                    size="sm"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      approveCriteria(criteria.id);
                                                    }}
                                                  >
                                                    <Check className="h-3 w-3 mr-1" />
                                                    Approve
                                                  </Button>
                                                </>
                                              )}
                                              {isCriteriaExpanded ? (
                                                <ChevronUp className="h-4 w-4" />
                                              ) : (
                                                <ChevronDown className="h-4 w-4" />
                                              )}
                                            </div>
                                          </div>
                                        </CardHeader>
                                      </CollapsibleTrigger>

                                      <CollapsibleContent>
                                        <CardContent className="pt-0 pb-3">
                                          {isEditing ? (
                                            <div className="space-y-3">
                                              <div>
                                                <Label htmlFor="statement">Criteria Statement</Label>
                                                <Textarea
                                                  id="statement"
                                                  value={editForm.statement}
                                                  onChange={(e) => setEditForm({ ...editForm, statement: e.target.value })}
                                                  className="mt-1"
                                                  rows={3}
                                                />
                                              </div>
                                              <div>
                                                <Label htmlFor="summary">Summary</Label>
                                                <Textarea
                                                  id="summary"
                                                  value={editForm.summary}
                                                  onChange={(e) => setEditForm({ ...editForm, summary: e.target.value })}
                                                  className="mt-1"
                                                  rows={2}
                                                />
                                              </div>
                                              <div className="flex gap-2">
                                                <Button size="sm" onClick={saveEditing}>
                                                  <Check className="h-3 w-3 mr-1" />
                                                  Save
                                                </Button>
                                                <Button size="sm" variant="outline" onClick={cancelEditing}>
                                                  <X className="h-3 w-3 mr-1" />
                                                  Cancel
                                                </Button>
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="space-y-4">
                                              {/* Maturity Level Descriptors (Locked until approved) */}
                                              <div className="border rounded-lg p-3 bg-muted/20">
                                                <div className="flex items-center justify-between mb-3">
                                                  <h5 className="font-medium flex items-center gap-2">
                                                    <span>Maturity Level Descriptors</span>
                                                    {!isApproved && (
                                                      <Lock className="h-4 w-4 text-muted-foreground" />
                                                    )}
                                                  </h5>
                                                  {isApproved && criteriaMaturityLevels.length === 0 && (
                                                    <Badge variant="outline" className="text-xs">
                                                      Ready for Step 4
                                                    </Badge>
                                                  )}
                                                </div>
                                                
                                                {!isApproved ? (
                                                  <p className="text-sm text-muted-foreground">
                                                    🔒 Approve this criteria first to unlock maturity level descriptors
                                                  </p>
                                                ) : (
                                                  <div className="grid grid-cols-5 gap-2">
                                                    {['basic', 'reactive', 'compliant', 'proactive', 'resilient'].map((level) => {
                                                      const levelDescriptor = criteriaMaturityLevels.find(ml => ml.level === level);
                                                      return (
                                                        <div key={level} className="text-center">
                                                          <Badge 
                                                            className={`${maturityLevelColors[level as keyof typeof maturityLevelColors]} text-xs mb-1 w-full`}
                                                          >
                                                            {level.toUpperCase()}
                                                          </Badge>
                                                          <div className="text-xs text-muted-foreground h-12 overflow-hidden">
                                                            {levelDescriptor ? (
                                                              levelDescriptor.descriptor
                                                            ) : (
                                                              <span className="italic">Descriptor will be generated in Step 4</span>
                                                            )}
                                                          </div>
                                                        </div>
                                                      );
                                                    })}
                                                  </div>
                                                )}
                                              </div>

                                              {/* Evidence Suggestions */}
                                              <div className="text-sm">
                                                <h6 className="font-medium mb-2">💡 Evidence Suggestions:</h6>
                                                <ul className="text-muted-foreground space-y-1">
                                                  <li>• Policy documents and procedures</li>
                                                  <li>• Implementation records and audit trails</li>
                                                  <li>• Training records and competency assessments</li>
                                                  <li>• Review meeting minutes and approval signatures</li>
                                                </ul>
                                              </div>
                                            </div>
                                          )}
                                        </CardContent>
                                      </CollapsibleContent>
                                    </Collapsible>
                                  </Card>
                                );
                              })}
                            </div>
                          )}
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                );
              })
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            
            <div className="flex gap-3">
              <div className="text-sm text-muted-foreground">
                {hasApprovedCriteria() ? (
                  allMPSHaveApprovedCriteria() ? (
                    "✅ All MPSs have approved criteria"
                  ) : (
                    "⚠️ Some MPSs need approved criteria"
                  )
                ) : (
                  "❌ No criteria approved yet"
                )}
              </div>
              
              <Button 
                onClick={completeCriteriaSetup}
                disabled={!hasApprovedCriteria()}
                className="min-w-[200px]"
              >
                {hasApprovedCriteria() ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Continue to Step 4 - Maturity Descriptors
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Approve Criteria to Continue
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};