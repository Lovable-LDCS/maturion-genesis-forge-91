import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit3, Check, X, ChevronDown, ChevronUp, Sparkles, AlertTriangle, FileText, CheckCircle, Lock, Plus } from 'lucide-react';
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
  const [showCustomCriteriaModal, setShowCustomCriteriaModal] = useState<string | null>(null);
  const [customCriterion, setCustomCriterion] = useState({ statement: '', summary: '' });
  const [isProcessingCustom, setIsProcessingCustom] = useState(false);

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
        // Parse AI response - the response contains additional text, so extract just the JSON array
        let responseContent = data.content || data.response || '';
        console.log('Raw AI response length:', responseContent.length);
        console.log('Raw AI response preview:', responseContent.substring(0, 500));
        
        // Enhanced JSON extraction - handle multiple patterns and formatting issues
        console.log('Full response for debugging:', responseContent);
        
        // Try multiple extraction patterns
        let jsonString = '';
        
        // Pattern 1: Look for standard JSON array
        let arrayStart = responseContent.indexOf('[');
        if (arrayStart !== -1) {
          // Find matching bracket with proper nesting
          let bracketCount = 0;
          let arrayEnd = -1;
          
          for (let i = arrayStart; i < responseContent.length; i++) {
            if (responseContent[i] === '[') bracketCount++;
            if (responseContent[i] === ']') {
              bracketCount--;
              if (bracketCount === 0) {
                arrayEnd = i;
                break;
              }
            }
          }
          
          if (arrayEnd !== -1) {
            jsonString = responseContent.substring(arrayStart, arrayEnd + 1);
          }
        }
        
        // Pattern 2: If no array found, try extracting from code blocks
        if (!jsonString) {
          const codeBlockMatch = responseContent.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
          if (codeBlockMatch) {
            jsonString = codeBlockMatch[1];
          }
        }
        
        // Pattern 3: Last resort - extract everything between first [ and last ]
        if (!jsonString) {
          const firstBracket = responseContent.indexOf('[');
          const lastBracket = responseContent.lastIndexOf(']');
          if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
            jsonString = responseContent.substring(firstBracket, lastBracket + 1);
          }
        }
        
        if (!jsonString) {
          throw new Error('No JSON array found in response');
        }
        
        console.log('Extracted JSON string length:', jsonString.length);
        console.log('Extracted JSON preview:', jsonString.substring(0, 300));
        
        // Parse and validate the JSON
        const parsedData = JSON.parse(jsonString);
        
        // Ensure it's an array
        if (!Array.isArray(parsedData)) {
          throw new Error('Response is not an array');
        }
        
        // Validate each criterion has required fields
        for (const criterion of parsedData) {
          if (!criterion.criteria_number || !criterion.statement) {
            console.warn('Invalid criterion structure:', criterion);
            throw new Error('Criterion missing required fields (criteria_number or statement)');
          }
          
          // Only reject truly generic placeholder responses 
          if (criterion.statement.startsWith('Assessment criterion') && 
              criterion.statement.includes('for ') &&
              criterion.statement.length < 50) {
            console.warn('Placeholder statement detected:', criterion.statement);
            throw new Error('AI returned placeholder statements instead of full descriptors');
          }
        }
        
        generatedCriteria = parsedData;
        console.log(`✅ Generated ${generatedCriteria.length} criteria for MPS ${mps.mps_number}`);
      } catch (parseError) {
        console.error('Failed to parse criteria response:', parseError);
        console.error('Response was:', data);
        throw new Error(`Failed to generate valid criteria: ${parseError.message}`);
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

      // Check if this was the last criteria for the MPS to show custom criteria modal
      const criteria = criteriaList.find(c => c.id === criteriaId);
      if (criteria) {
        const mpssCriteria = getCriteriaForMPS(criteria.mps_id);
        const allApproved = mpssCriteria.every(c => c.id === criteriaId || c.status === 'approved_locked');
        
        if (allApproved) {
          setTimeout(() => setShowCustomCriteriaModal(criteria.mps_id), 500);
        }
      }

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

  const approveAllCriteria = async (mpsId: string) => {
    if (!currentOrganization?.id) return;

    const mpssCriteria = getCriteriaForMPS(mpsId);
    const unapprovedCriteria = mpssCriteria.filter(c => c.status !== 'approved_locked');

    try {
      for (const criteria of unapprovedCriteria) {
        const { error } = await supabase
          .from('criteria')
          .update({
            status: 'approved_locked',
            statement_approved_by: currentOrganization.owner_id,
            statement_approved_at: new Date().toISOString(),
            updated_by: currentOrganization.owner_id
          })
          .eq('id', criteria.id);

        if (error) throw error;
      }

      // Refresh data
      await fetchMPSsAndCriteria();

      // Show custom criteria modal after approval
      setTimeout(() => setShowCustomCriteriaModal(mpsId), 500);

      toast({
        title: "All Criteria Approved",
        description: `Successfully approved ${unapprovedCriteria.length} criteria.`,
      });

    } catch (error) {
      console.error('Error approving all criteria:', error);
      toast({
        title: "Approval Failed",
        description: "Failed to approve all criteria.",
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

  const getMPSByID = (mpsId: string) => {
    return mpsList.find(mps => mps.id === mpsId);
  };

  const addCustomCriterion = async () => {
    if (!currentOrganization?.id || !showCustomCriteriaModal) return;

    setIsProcessingCustom(true);
    try {
      const mps = getMPSByID(showCustomCriteriaModal);
      if (!mps) throw new Error('MPS not found');

      const mpssCriteria = getCriteriaForMPS(showCustomCriteriaModal);
      const nextNumber = mpssCriteria.length + 1;
      const criteriaNumber = `${mps.mps_number}.${nextNumber}`;

      // Validate and improve the custom criterion using AI
      const prompt = `Please review and improve this custom assessment criterion:

Statement: ${customCriterion.statement}
Summary: ${customCriterion.summary}

For MPS ${mps.mps_number}: ${mps.name}
Domain: ${domainName}

Please provide an improved version that:
1. Is specific, measurable, and auditable
2. Follows international standards format
3. Aligns with the MPS intent and domain
4. Has clear language and structure

Return as JSON:
{
  "statement": "Improved statement text",
  "summary": "Improved summary text",
  "evidence_suggestions": "Specific evidence recommendation"
}`;

      const { data, error } = await supabase.functions.invoke('maturion-ai-chat', {
        body: {
          prompt: prompt,
          context: 'Custom criteria validation',
          currentDomain: domainName,
          organizationId: currentOrganization.id
        }
      });

      if (error) throw error;

      let improvedCriterion = {
        statement: customCriterion.statement,
        summary: customCriterion.summary,
        evidence_suggestions: "Documentation and implementation evidence"
      };

      try {
        const responseContent = data.content || data.response || '';
        const jsonStart = responseContent.indexOf('{');
        const jsonEnd = responseContent.lastIndexOf('}');
        
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const jsonString = responseContent.substring(jsonStart, jsonEnd + 1);
          const parsedData = JSON.parse(jsonString);
          if (parsedData.statement && parsedData.summary) {
            improvedCriterion = parsedData;
          }
        }
      } catch (parseError) {
        console.warn('Could not parse AI response, using original criterion');
      }

      // Insert the new criterion
      const { error: insertError } = await supabase
        .from('criteria')
        .insert({
          mps_id: showCustomCriteriaModal,
          organization_id: currentOrganization.id,
          criteria_number: criteriaNumber,
          statement: improvedCriterion.statement,
          summary: improvedCriterion.summary,
          status: 'not_started',
          created_by: currentOrganization.owner_id,
          updated_by: currentOrganization.owner_id
        });

      if (insertError) throw insertError;

      // Refresh data
      await fetchMPSsAndCriteria();

      toast({
        title: "Custom Criterion Added",
        description: `Successfully added criterion ${criteriaNumber}`,
      });

      setShowCustomCriteriaModal(null);
      setCustomCriterion({ statement: '', summary: '' });

    } catch (error) {
      console.error('Error adding custom criterion:', error);
      toast({
        title: "Failed to Add Criterion",
        description: "Could not add the custom criterion.",
        variant: "destructive"
      });
    } finally {
      setIsProcessingCustom(false);
    }
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
              
              {/* User Guidance for Generation */}
              <div className="mt-4 p-3 bg-white/80 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 text-blue-600">
                  <div className="text-lg">👆</div>
                  <span className="font-medium">Click an MPS block below to begin generating criteria</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 ml-6">
                  Each MPS will expand to show generated assessment criteria when clicked
                </p>
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
                              {mpssCriteria.length > 0 && mpssCriteria.some(c => c.status !== 'approved_locked') && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => e.stopPropagation()}
                                      className="mr-2"
                                    >
                                      <CheckCircle className="h-4 w-4 mr-1" />
                                      Approve All
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Approve All Criteria</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to approve all {mpssCriteria.filter(c => c.status !== 'approved_locked').length} criteria for MPS {mps.mps_number} at once?
                                        <br /><br />
                                        Once approved, any edits will require approval from the Chain of Custody Owner.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => approveAllCriteria(mps.id)}>
                                        Approve All
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
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
                                                      if (!isCriteriaExpanded) {
                                                        toggleCriteriaExpansion(criteria.id);
                                                        setTimeout(() => startEditing(criteria), 100);
                                                      } else {
                                                        startEditing(criteria);
                                                      }
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

        {/* Custom Criteria Modal */}
        <Dialog open={!!showCustomCriteriaModal} onOpenChange={() => setShowCustomCriteriaModal(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Custom Criterion</DialogTitle>
              <div className="text-sm text-muted-foreground">
                Would you like to add any of your own custom criteria to MPS {getMPSByID(showCustomCriteriaModal || '')?.mps_number}?
              </div>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="custom-statement">Criterion Statement</Label>
                <Textarea
                  id="custom-statement"
                  placeholder="Enter your custom criterion statement..."
                  value={customCriterion.statement}
                  onChange={(e) => setCustomCriterion({ ...customCriterion, statement: e.target.value })}
                  className="mt-1"
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="custom-summary">Summary</Label>
                <Textarea
                  id="custom-summary"
                  placeholder="Brief explanation of what this criterion assesses..."
                  value={customCriterion.summary}
                  onChange={(e) => setCustomCriterion({ ...customCriterion, summary: e.target.value })}
                  className="mt-1"
                  rows={2}
                />
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>AI Validation:</strong> Your criterion will be reviewed and potentially improved by AI to ensure it meets international standards and assessment requirements.
                </p>
              </div>
              
              <div className="flex justify-end gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowCustomCriteriaModal(null)}
                  disabled={isProcessingCustom}
                >
                  Skip
                </Button>
                <Button 
                  onClick={addCustomCriterion}
                  disabled={!customCriterion.statement.trim() || isProcessingCustom}
                >
                  {isProcessingCustom ? (
                    <>
                      <Sparkles className="h-4 w-4 mr-2 animate-pulse" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Criterion
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};