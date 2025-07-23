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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Edit3, Check, X, ChevronDown, ChevronUp, Sparkles, AlertTriangle, FileText, CheckCircle, Lock, Plus, MoreVertical, XCircle } from 'lucide-react';
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
  deferral_status?: string | null;
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
  const [showAddAnotherModal, setShowAddAnotherModal] = useState<string | null>(null);
  const [customCriterion, setCustomCriterion] = useState({ statement: '', summary: '' });
  const [isProcessingCustom, setIsProcessingCustom] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showPlacementModal, setShowPlacementModal] = useState<{
    criteriaId: string;
    suggestion: {
      domain: string;
      mpsNumber: number;
      mpsTitle: string;
      reason: string;
      scenario: 'same_domain' | 'future_domain' | 'past_domain';
    };
  } | null>(null);
  const [showDeferralWarning, setShowDeferralWarning] = useState<{
    deferrals: Array<{
      domain: string;
      mpsNumber: number;
      count: number;
    }>;
  } | null>(null);
  const [showSplitCriteriaModal, setShowSplitCriteriaModal] = useState<{
    originalStatement: string;
    splitCriteria: Array<{
      statement: string;
      summary: string;
    }>;
    mpsId: string;
  } | null>(null);

  // Load existing MPSs and criteria when modal opens
  useEffect(() => {
    if (isOpen && currentOrganization?.id) {
      fetchMPSsAndCriteria();
      checkForDeferredCriteria();
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
        
        // Add MPS 4 specific debugging
        const isMPS4 = mps.mps_number === 4 || mps.name.includes('Risk Management');
        if (isMPS4) {
          console.log('🔍 MPS 4 DEBUG - Starting JSON parsing');
          console.log('📄 Full AI response length:', responseContent.length);
          console.log('📋 Response content (first 1000 chars):', responseContent.substring(0, 1000));
          console.log('📋 Response content (last 500 chars):', responseContent.substring(Math.max(0, responseContent.length - 500)));
          console.log('🔍 MPS 4 DEBUG - Full response content:', responseContent);
        }
        
        let jsonString = '';
        
        // Strategy 1: First/last bracket extraction (most reliable for complete arrays)
        console.log('🔍 Trying first/last bracket extraction...');
        const firstBracket = responseContent.indexOf('[');
        const lastBracket = responseContent.lastIndexOf(']');
        if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
          jsonString = responseContent.substring(firstBracket, lastBracket + 1);
          console.log('✅ Using first/last bracket extraction');
          console.log('Extracted length:', jsonString.length);
        }
        
        // Strategy 2: Enhanced criteria array detection with multiple patterns (fallback)
        if (!jsonString) {
          console.log('🔍 Trying pattern matching...');
          const criteriaArrayPatterns = [
            // Pattern for markdown code blocks
            /```(?:json)?\s*(\[[\s\S]*?\])\s*```/i,
            // Pattern for direct array start with criteria_number
            /\[\s*\{[^}]*["']criteria_number["'][^}]*\}/i,
            // Pattern for array with newlines
            /\[\s*\n\s*\{[^}]*["']criteria_number["'][^}]*\}/i,
            // Pattern for any array containing criteria objects
            /\[[^[]*["']criteria_number["'][^[]*\]/i,
            // Fallback pattern for any bracketed array
            /\[[\s\S]*\]/
          ];
          
          // Try each pattern in order of specificity
          for (const pattern of criteriaArrayPatterns) {
            const match = responseContent.match(pattern);
            if (match) {
              // If it's a code block match, use the captured group
              jsonString = match[1] || match[0];
              console.log(`✅ Found JSON using pattern: ${pattern}`);
              console.log('Extracted JSON preview:', jsonString.substring(0, 200));
              break;
            }
          }
        }
        
        // Strategy 3: Manual bracket matching (most conservative)
        if (!jsonString) {
          console.log('🔍 Pattern matching failed, trying manual bracket search...');
          
          let startIndex = -1;
          let endIndex = -1;
          
          // Find the first '[' that's followed by criteria content
          for (let i = 0; i < responseContent.length - 20; i++) {
            if (responseContent[i] === '[') {
              // Look ahead for criteria_number within reasonable distance
              const lookahead = responseContent.substring(i, i + 500);
              if (lookahead.includes('criteria_number') || lookahead.includes('"statement"')) {
                startIndex = i;
                break;
              }
            }
          }
          
          if (startIndex !== -1) {
            // Find matching closing bracket
            let bracketCount = 0;
            for (let i = startIndex; i < responseContent.length; i++) {
              if (responseContent[i] === '[') bracketCount++;
              if (responseContent[i] === ']') {
                bracketCount--;
                if (bracketCount === 0) {
                  endIndex = i;
                  break;
                }
              }
            }
            
            if (endIndex !== -1) {
              jsonString = responseContent.substring(startIndex, endIndex + 1);
              console.log('✅ Found JSON using manual bracket matching');
            }
          }
        }
        
        if (!jsonString) {
          console.error('❌ No valid JSON array found in response');
          console.log('Response content for debugging:', responseContent);
          
          // Add specific error for MPS 4 debugging
          console.error('MPS 4 DEBUG: Response analysis');
          console.log('Contains [:', responseContent.includes('['));
          console.log('Contains ]:', responseContent.includes(']'));
          console.log('Contains criteria_number:', responseContent.includes('criteria_number'));
          console.log('Response length:', responseContent.length);
          
          throw new Error('No JSON array found in response');
        }
        
        console.log('Extracted JSON string length:', jsonString.length);
        console.log('Extracted JSON preview:', jsonString.substring(0, 300));
        
        // Clean the JSON string before parsing
        let cleanedJsonString = jsonString
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
          .replace(/\n/g, ' ') // Replace newlines with spaces
          .replace(/\r/g, '') // Remove carriage returns
          .replace(/\t/g, ' ') // Replace tabs with spaces
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();
          
        console.log('Cleaned JSON preview:', cleanedJsonString.substring(0, 300));
        
        // Parse and validate the JSON
        let parsedData;
        
        // Add extra debugging for MPS 4
        if (isMPS4) {
          console.log('🔍 MPS 4 DEBUG - About to parse JSON, length:', cleanedJsonString.length);
          console.log('🔍 MPS 4 DEBUG - JSON starts with:', cleanedJsonString.substring(0, 100));
          console.log('🔍 MPS 4 DEBUG - JSON ends with:', cleanedJsonString.substring(Math.max(0, cleanedJsonString.length - 100)));
        }
        
        try {
          parsedData = JSON.parse(cleanedJsonString);
          if (isMPS4) {
            console.log('✅ MPS 4 DEBUG - JSON parsed successfully, array length:', Array.isArray(parsedData) ? parsedData.length : 'not array');
          }
        } catch (parseError) {
          console.error('JSON Parse Error:', parseError);
          console.log('Failed JSON string (first 500 chars):', cleanedJsonString.substring(0, 500));
          console.log('Failed JSON string (last 500 chars):', cleanedJsonString.substring(Math.max(0, cleanedJsonString.length - 500)));
          
          // Enhanced JSON repair for MPS 4 specific issues
          let fixedJson = cleanedJsonString;
          
          // Step 1: Fix obvious structural issues
          fixedJson = fixedJson
            .replace(/,\s*}/g, '}') // Remove trailing commas before }
            .replace(/,\s*]/g, ']') // Remove trailing commas before ]
            .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":') // Quote unquoted keys
            .replace(/:\s*'([^']*)'/g, ':"$1"') // Replace single quotes with double quotes
            .replace(/([^\\])"/g, '$1"'); // Fix escaped quotes
          
          // Step 2: Handle truncated strings specifically
          if (parseError.message.includes('position')) {
            const errorPos = parseInt(parseError.message.match(/position (\d+)/)?.[1] || '0');
            console.log(`Truncation detected at position ${errorPos}`);
            
            // Find the last complete object before the error position
            let workingJson = fixedJson.substring(0, errorPos);
            
            // Find the last complete object
            let objectStart = -1;
            let braceCount = 0;
            
            for (let i = workingJson.length - 1; i >= 0; i--) {
              if (workingJson[i] === '}') braceCount++;
              if (workingJson[i] === '{') {
                braceCount--;
                if (braceCount === 0) {
                  objectStart = i;
                  break;
                }
              }
            }
            
            if (objectStart > 0) {
              // Keep everything up to the last complete object
              workingJson = workingJson.substring(0, objectStart);
              
              // Remove any trailing comma and close the array
              workingJson = workingJson.replace(/,\s*$/, '') + ']';
              
              console.log('Truncated to last complete object, length:', workingJson.length);
              fixedJson = workingJson;
            }
          }
          
          console.log('Attempting to parse enhanced-repair JSON:', fixedJson.substring(0, 300));
          try {
            parsedData = JSON.parse(fixedJson);
          } catch (secondError) {
            console.error('Enhanced repair also failed:', secondError);
            
            // Last resort: try to extract individual objects
            const objectRegex = /\{\s*"criteria_number":\s*"[^"]+",\s*"statement":\s*"[^"]*",\s*"summary":\s*"[^"]*",\s*"evidence_suggestions":\s*"[^"]*"\s*\}/g;
            const objects = cleanedJsonString.match(objectRegex);
            
            if (objects && objects.length > 0) {
              console.log(`Found ${objects.length} individual objects, reconstructing array`);
              const reconstructedJson = '[' + objects.join(',') + ']';
              parsedData = JSON.parse(reconstructedJson);
            } else {
              throw new Error(`Failed to parse or repair JSON: ${secondError.message}`);
            }
          }
        }
        
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

      // Add validation check and retry logic for empty results
      if (generatedCriteria.length === 0) {
        console.warn('⚠️ Generated 0 criteria - this might be a parsing failure');
        toast({
          title: "⚠️ Generation Issue Detected",
          description: `No criteria were generated for MPS ${mps.mps_number}. This might be a temporary issue.`,
          variant: "destructive",
          action: (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => generateCriteriaForMPS(mps)}
            >
              Retry
            </Button>
          )
        });
      } else {
        toast({
          title: "Criteria Generated",
          description: `Successfully generated ${generatedCriteria.length} criteria for MPS ${mps.mps_number}`,
        });
      }

    } catch (error) {
      console.error('Error generating criteria:', error);
      
      // Provide more specific error messages based on the error type
      let errorMessage = "Failed to generate criteria. Please try again.";
      let debugInfo = "";
      
      if (error?.message?.includes('No JSON array found')) {
        errorMessage = "AI response was invalid. The criteria format could not be parsed.";
        debugInfo = "Debug: No valid JSON array structure found in AI response.";
      } else if (error?.message?.includes('Unexpected token') || error?.message?.includes('JSON')) {
        errorMessage = "AI response contained malformed JSON. Please try regenerating.";
        debugInfo = `Debug: JSON parsing failed - ${error.message}`;
      } else if (error?.message?.includes('missing required fields')) {
        errorMessage = "Generated criteria were incomplete. Please try again.";
        debugInfo = "Debug: Criteria missing required fields (criteria_number or statement).";
      } else if (error?.message?.includes('placeholder statements')) {
        errorMessage = "AI returned generic placeholders instead of actual criteria. Please regenerate.";
        debugInfo = "Debug: AI response contained placeholder text instead of proper criteria.";
      }
      
      console.error(`MPS ${mps.mps_number} Generation Error:`, error);
      console.error('Debug Info:', debugInfo);
      
      toast({
        title: "Generation Failed",
        description: errorMessage,
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
      // Get current values for edit history
      const { data: currentCriteria } = await supabase
        .from('criteria')
        .select('statement, summary')
        .eq('id', criteriaId)
        .single();

      if (currentCriteria) {
        // Log edit history for changed fields
        const editHistoryEntries = [];
        
        if (currentCriteria.statement !== updates.statement) {
          editHistoryEntries.push({
            criteria_id: criteriaId,
            organization_id: currentOrganization.id,
            edited_by: currentOrganization.owner_id,
            field_name: 'statement',
            old_value: currentCriteria.statement,
            new_value: updates.statement,
            change_reason: 'User edit'
          });
        }
        
        if (currentCriteria.summary !== updates.summary) {
          editHistoryEntries.push({
            criteria_id: criteriaId,
            organization_id: currentOrganization.id,
            edited_by: currentOrganization.owner_id,
            field_name: 'summary',
            old_value: currentCriteria.summary,
            new_value: updates.summary,
            change_reason: 'User edit'
          });
        }

        // Insert edit history
        if (editHistoryEntries.length > 0) {
          const { error: historyError } = await supabase
            .from('criteria_edit_history')
            .insert(editHistoryEntries);

          if (historyError) {
            console.error('Error logging edit history:', historyError);
          }
        }
      }

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
        title: "✅ Criteria Updated",
        description: "Criteria has been successfully updated and edit history logged.",
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

  const rejectCriteria = async (criteriaId: string, reason: string) => {
    if (!currentOrganization?.id) return;

    try {
      // Log rejection
      const { error: rejectError } = await supabase
        .from('criteria_rejections')
        .insert({
          criteria_id: criteriaId,
          organization_id: currentOrganization.id,
          rejected_by: currentOrganization.owner_id,
          rejection_reason: reason
        });

      if (rejectError) throw rejectError;

      // Update criteria status to rejected
      const { error } = await supabase
        .from('criteria')
        .update({
          status: 'rejected',
          updated_by: currentOrganization.owner_id
        })
        .eq('id', criteriaId);

      if (error) throw error;

      // Refresh data
      await fetchMPSsAndCriteria();
      setShowRejectModal(null);
      setRejectionReason('');

      toast({
        title: "⚠️ Criteria Rejected",
        description: "Criteria has been rejected and logged for audit trail.",
      });

    } catch (error) {
      console.error('Error rejecting criteria:', error);
      toast({
        title: "Rejection Failed",
        description: "Failed to reject criteria.",
        variant: "destructive"
      });
    }
  };

  const getCriteriaForMPS = (mpsId: string) => {
    return criteriaList.filter(criteria => 
      criteria.mps_id === mpsId && 
      criteria.deferral_status !== 'deferred'
    );
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

      // Enhanced AI validation with smart placement detection
      const prompt = `Please review this custom assessment criterion and check for proper placement:

Statement: ${customCriterion.statement}
Summary: ${customCriterion.summary}

Current Context:
- Target MPS ${mps.mps_number}: ${mps.name}
- Domain: ${domainName}

Please:
1. Validate if this criterion belongs in the current MPS and domain
2. If misaligned, suggest the correct domain and MPS with explanation
3. Improve the criterion text for standards compliance

Return as JSON:
{
  "belongs_here": true/false,
  "suggested_domain": "domain name if misaligned",
  "suggested_mps_number": number or null,
  "suggested_mps_title": "title if misaligned",
  "reason": "explanation for placement",
  "improved_statement": "enhanced statement text",
  "improved_summary": "enhanced summary text",
  "evidence_suggestions": "specific evidence recommendation"
}`;

      const { data, error } = await supabase.functions.invoke('maturion-ai-chat', {
        body: {
          prompt: prompt,
          context: 'Smart criteria placement validation',
          currentDomain: domainName,
          organizationId: currentOrganization.id,
          allowExternalContext: false,
          knowledgeBaseUsed: true
        }
      });

      
      if (error) {
        console.warn('AI placement analysis failed, proceeding with original criterion placement:', error);
        // Fallback: proceed with normal insertion if AI analysis fails
      }

      let placementAnalysis: {
        belongs_here: boolean;
        suggested_domain?: string;
        suggested_mps_number?: number;
        suggested_mps_title?: string;
        reason?: string;
        improved_statement: string;
        improved_summary: string;
        evidence_suggestions: string;
      } = {
        belongs_here: true,
        improved_statement: customCriterion.statement,
        improved_summary: customCriterion.summary,
        evidence_suggestions: "Documentation and implementation evidence"
      };

      try {
        // Only parse if we have a successful response
        if (!error && data?.content) {
          const responseContent = data.content || data.response || '';
          const jsonStart = responseContent.indexOf('{');
          const jsonEnd = responseContent.lastIndexOf('}');
          
          if (jsonStart !== -1 && jsonEnd !== -1) {
            const jsonString = responseContent.substring(jsonStart, jsonEnd + 1);
            const parsedData = JSON.parse(jsonString);
            if (parsedData.belongs_here !== undefined) {
              placementAnalysis = parsedData;
            }
          }
        }
      } catch (parseError) {
        console.warn('Could not parse AI placement analysis, proceeding with original criterion');
      }

      // If misaligned AND we have a successful AI analysis, show placement suggestion modal
      if (!error && !placementAnalysis.belongs_here && placementAnalysis.suggested_domain) {
        // Create the criterion first, then show placement modal
        const { data: newCriterion, error: insertError } = await supabase
          .from('criteria')
          .insert({
            mps_id: showCustomCriteriaModal,
            organization_id: currentOrganization.id,
            criteria_number: criteriaNumber,
            statement: placementAnalysis.improved_statement,
            summary: placementAnalysis.improved_summary,
            status: 'not_started',
            deferral_status: 'pending_placement',
            created_by: currentOrganization.owner_id,
            updated_by: currentOrganization.owner_id
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Determine scenario based on domain status
        const scenario = await determinePlacementScenario(placementAnalysis.suggested_domain, domainName);

        setShowPlacementModal({
          criteriaId: newCriterion.id,
          suggestion: {
            domain: placementAnalysis.suggested_domain,
            mpsNumber: placementAnalysis.suggested_mps_number || 0,
            mpsTitle: placementAnalysis.suggested_mps_title || '',
            reason: placementAnalysis.reason || 'Better alignment with domain focus',
            scenario: scenario
          }
        });

        setShowCustomCriteriaModal(null);
        setCustomCriterion({ statement: '', summary: '' });
        return;
      }

      // Insert normally if placement is correct
      const { error: insertError } = await supabase
        .from('criteria')
        .insert({
          mps_id: showCustomCriteriaModal,
          organization_id: currentOrganization.id,
          criteria_number: criteriaNumber,
          statement: placementAnalysis.improved_statement,
          summary: placementAnalysis.improved_summary,
          status: 'not_started',
          created_by: currentOrganization.owner_id,
          updated_by: currentOrganization.owner_id
        });

      if (insertError) throw insertError;

      // Refresh data
      await fetchMPSsAndCriteria();

      toast({
        title: "✅ Custom Criterion Added",
        description: `Successfully added criterion ${criteriaNumber}`,
      });

      // Reset form and show "Add Another?" modal
      setCustomCriterion({ statement: '', summary: '' });
      setShowCustomCriteriaModal(null);
      setShowAddAnotherModal(showCustomCriteriaModal);
      setCustomCriterion({ statement: '', summary: '' });

    } catch (error) {
      console.error('Error adding custom criterion:', error);
      
      // Check if this is a function call error and provide more specific feedback
      if (error?.message?.includes('Edge Function returned a non-2xx status code')) {
        toast({
          title: "AI Analysis Temporarily Unavailable",
          description: "Criterion added without smart placement analysis. Please manually review if it fits this domain.",
          variant: "default"
        });
        
        // Proceed with normal insertion as fallback
        try {
          const mps = getMPSByID(showCustomCriteriaModal);
          if (!mps) throw new Error('MPS not found');
          
          const mpssCriteria = getCriteriaForMPS(showCustomCriteriaModal);
          const nextNumber = mpssCriteria.length + 1;
          const criteriaNumber = `${mps.mps_number}.${nextNumber}`;
          
          const { error: insertError } = await supabase
            .from('criteria')
            .insert({
              mps_id: showCustomCriteriaModal,
              organization_id: currentOrganization.id,
              criteria_number: criteriaNumber,
              statement: customCriterion.statement,
              summary: customCriterion.summary,
              status: 'not_started',
              created_by: currentOrganization.owner_id,
              updated_by: currentOrganization.owner_id
            });

          if (!insertError) {
            await fetchMPSsAndCriteria();
            setShowCustomCriteriaModal(null);
            setCustomCriterion({ statement: '', summary: '' });
            return;
          }
        } catch (fallbackError) {
          console.error('Fallback insertion also failed:', fallbackError);
        }
      }
      
      toast({
        title: "Failed to Add Criterion",
        description: "Could not add the custom criterion.",
        variant: "destructive"
      });
    } finally {
      setIsProcessingCustom(false);
    }
  };

  const deferCriterion = async (criteriaId: string, suggestion: any) => {
    if (!currentOrganization?.id) return;

    try {
      // Create deferral record
      const { error: deferralError } = await supabase
        .from('criteria_deferrals')
        .insert({
          proposed_criteria_id: criteriaId,
          organization_id: currentOrganization.id,
          suggested_domain: suggestion.domain,
          suggested_mps_number: suggestion.mpsNumber,
          suggested_mps_title: suggestion.mpsTitle,
          reason: suggestion.reason,
          user_id: currentOrganization.owner_id,
          original_mps_id: showCustomCriteriaModal
        });

      if (deferralError) throw deferralError;

      // Update criteria status to deferred
      const { error } = await supabase
        .from('criteria')
        .update({
          deferral_status: 'deferred',
          updated_by: currentOrganization.owner_id
        })
        .eq('id', criteriaId);

      if (error) throw error;

      await fetchMPSsAndCriteria();
      setShowPlacementModal(null);

      toast({
        title: "🧠 Criterion Deferred",
        description: `Criterion moved to ${suggestion.domain} - MPS ${suggestion.mpsNumber} queue for future processing.`,
      });

      // Show "Add Another?" modal after deferral
      setShowAddAnotherModal(suggestion.domain === domainName ? criteriaId.substring(0, 36) : null);

    } catch (error) {
      console.error('Error deferring criterion:', error);
      toast({
        title: "Deferral Failed",
        description: "Failed to defer criterion.",
        variant: "destructive"
      });
    }
  };

  const checkForDeferredCriteria = async () => {
    if (!currentOrganization?.id) return;

    try {
      const { data: deferrals, error } = await supabase
        .from('criteria_deferrals')
        .select('suggested_domain, suggested_mps_number')
        .eq('organization_id', currentOrganization.id)
        .eq('approved', false);

      if (error) throw error;

      if (deferrals && deferrals.length > 0) {
        // Group by domain and MPS
        const grouped = deferrals.reduce((acc, def) => {
          const key = `${def.suggested_domain}-${def.suggested_mps_number}`;
          if (!acc[key]) {
            acc[key] = {
              domain: def.suggested_domain,
              mpsNumber: def.suggested_mps_number,
              count: 0
            };
          }
          acc[key].count++;
          return acc;
        }, {} as Record<string, any>);

        const deferralList = Object.values(grouped);
        if (deferralList.length > 0) {
          setShowDeferralWarning({ deferrals: deferralList });
        }
      }
    } catch (error) {
      console.error('Error checking deferred criteria:', error);
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

  const allCriteriaApproved = () => {
    return criteriaList.length > 0 && criteriaList.every(criteria => criteria.status === 'approved_locked');
  };

  const hasAnyCustomCriteria = () => {
    // Check if any criteria beyond the AI-generated ones exist
    return mpsList.some(mps => {
      const mpssCriteria = getCriteriaForMPS(mps.id);
      // Consider custom if there are more criteria than typically generated or if any have specific patterns
      return mpssCriteria.length > 10 || mpssCriteria.some(c => 
        c.statement.toLowerCase().includes('custom') || 
        c.criteria_number.includes('.') && parseInt(c.criteria_number.split('.')[1]) > 10
      );
    });
  };

  const resetCustomCriteriaForm = () => {
    setCustomCriterion({ statement: '', summary: '' });
  };

  // Enhanced criteria placement analysis
  const determinePlacementScenario = async (suggestedDomain: string, currentDomain: string): Promise<'same_domain' | 'future_domain' | 'past_domain'> => {
    if (suggestedDomain === currentDomain) {
      return 'same_domain';
    }

    // Check if suggested domain has been completed
    const { data: domainData } = await supabase
      .from('domains')
      .select('status')
      .eq('organization_id', currentOrganization?.id)
      .eq('name', suggestedDomain)
      .single();

    if (domainData?.status === 'approved_locked') {
      return 'past_domain';
    }

    return 'future_domain';
  };

  // Analyze criteria for potential splitting
  const analyzeCriteriaForSplitting = (statement: string) => {
    const splitIndicators = [
      ' and ',
      ' & ',
      'must have',
      'must conduct',
      'must implement',
      'must establish',
      'must maintain',
      'must ensure'
    ];

    const evidenceCount = splitIndicators.filter(indicator => 
      statement.toLowerCase().includes(indicator.toLowerCase())
    ).length;

    if (evidenceCount >= 2) {
      // Simple splitting logic - this could be enhanced with AI
      const parts = statement.split(/\s+and\s+|\s+&\s+/i);
      
      if (parts.length >= 2) {
        return {
          shouldSplit: true,
          splitCriteria: parts.map((part, index) => ({
            statement: part.trim(),
            summary: `Part ${index + 1} of multi-requirement criterion`
          }))
        };
      }
    }

    return { shouldSplit: false, splitCriteria: [] };
  };

  // Handle split criteria approval
  const handleSplitCriteriaApproval = async (splitCriteria: Array<{ statement: string; summary: string }>, mpsId: string) => {
    if (!currentOrganization?.id) return;

    try {
      const mps = getMPSByID(mpsId);
      if (!mps) throw new Error('MPS not found');

      for (let i = 0; i < splitCriteria.length; i++) {
        const mpssCriteria = getCriteriaForMPS(mpsId);
        const nextNumber = mpssCriteria.length + 1 + i; // Account for multiple insertions
        const criteriaNumber = `${mps.mps_number}.${nextNumber}`;
        
        await supabase
          .from('criteria')
          .insert({
            mps_id: mpsId,
            organization_id: currentOrganization.id,
            criteria_number: criteriaNumber,
            statement: splitCriteria[i].statement,
            summary: splitCriteria[i].summary,
            status: 'not_started',
            created_by: currentOrganization.owner_id,
            updated_by: currentOrganization.owner_id
          });
      }

      // Log the split action
      await logCriteriaAction('SPLIT', mpsId, `Split into ${splitCriteria.length} criteria`);

      await fetchMPSsAndCriteria();
      
      toast({
        title: "Criteria Split Successfully",
        description: `Created ${splitCriteria.length} separate criteria for better assessment.`,
      });

      setShowSplitCriteriaModal(null);
      setShowAddAnotherModal(mpsId);

    } catch (error) {
      console.error('Error splitting criteria:', error);
      toast({
        title: "Error Splitting Criteria",
        description: "Failed to split the criteria. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Enhanced logging function
  const logCriteriaAction = async (action: string, entityId: string, details: string) => {
    try {
      await supabase
        .from('audit_trail')
        .insert({
          organization_id: currentOrganization?.id,
          table_name: 'criteria',
          record_id: entityId,
          action: action,
          changed_by: currentOrganization?.owner_id,
          change_reason: details
        });
    } catch (error) {
      console.error('Error logging criteria action:', error);
    }
  };

  const getUnapprovedCriteriaCount = () => {
    return criteriaList.filter(criteria => criteria.status !== 'approved_locked').length;
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
                                               {isApproved ? (
                                                 <Badge className="bg-green-500 text-xs">
                                                   <Lock className="h-3 w-3 mr-1" />
                                                   Locked
                                                 </Badge>
                                               ) : criteria.status === 'rejected' ? (
                                                 <Badge variant="destructive" className="text-xs">
                                                   <XCircle className="h-3 w-3 mr-1" />
                                                   Rejected
                                                 </Badge>
                                               ) : (
                                                 <>
                                                   <DropdownMenu>
                                                     <DropdownMenuTrigger asChild>
                                                       <Button
                                                         size="sm"
                                                         variant="ghost"
                                                         onClick={(e) => e.stopPropagation()}
                                                         className="h-6 w-6 p-0"
                                                       >
                                                         <MoreVertical className="h-3 w-3" />
                                                       </Button>
                                                     </DropdownMenuTrigger>
                                                     <DropdownMenuContent align="end">
                                                       <DropdownMenuItem onClick={() => {
                                                         if (!isCriteriaExpanded) {
                                                           toggleCriteriaExpansion(criteria.id);
                                                           setTimeout(() => startEditing(criteria), 100);
                                                         } else {
                                                           startEditing(criteria);
                                                         }
                                                       }}>
                                                         <Edit3 className="h-3 w-3 mr-2" />
                                                         Edit
                                                       </DropdownMenuItem>
                                                       <DropdownMenuItem onClick={() => setShowRejectModal(criteria.id)}>
                                                         <XCircle className="h-3 w-3 mr-2" />
                                                         Reject
                                                       </DropdownMenuItem>
                                                     </DropdownMenuContent>
                                                   </DropdownMenu>
                                                   <Button
                                                     size="sm"
                                                     onClick={(e) => {
                                                       e.stopPropagation();
                                                       approveCriteria(criteria.id);
                                                     }}
                                                     className="h-6"
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
                onClick={() => {
                  if (!allCriteriaApproved()) {
                    const unapprovedCount = getUnapprovedCriteriaCount();
                    toast({
                      title: "Cannot Continue",
                      description: `You still have ${unapprovedCount} unapproved ${unapprovedCount === 1 ? 'criterion' : 'criteria'}. Please approve, reject, or edit them before continuing to Step 4.`,
                      variant: "destructive"
                    });
                    return;
                  }
                  completeCriteriaSetup();
                }}
                disabled={!hasApprovedCriteria()}
                className="min-w-[200px]"
              >
                {allCriteriaApproved() ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Continue to Step 4 - Maturity Descriptors
                  </>
                ) : hasApprovedCriteria() ? (
                  <>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    {getUnapprovedCriteriaCount()} Criteria Need Approval
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

        {/* Add Another Criteria Modal */}
        <Dialog open={showAddAnotherModal !== null} onOpenChange={() => setShowAddAnotherModal(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-500" />
                Add Another Criterion?
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                💡 You can keep adding as many custom criteria as needed — we'll help with placement, structure, and quality.
              </p>
              
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowAddAnotherModal(null)}
                >
                  ⚪ No, I'm Done
                </Button>
                <Button
                  onClick={() => {
                    const mpsId = showAddAnotherModal;
                    setShowAddAnotherModal(null);
                    resetCustomCriteriaForm();
                    setShowCustomCriteriaModal(mpsId);
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  🔹 Yes, Add Another
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

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
                  onClick={() => {
                    resetCustomCriteriaForm();
                    setShowCustomCriteriaModal(null);
                  }}
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

        {/* Smart Placement Modal */}
        <Dialog open={showPlacementModal !== null} onOpenChange={() => setShowPlacementModal(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                🧠 Smart MPS Placement Detected
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-sm">
                  <strong>💡 Maturion detected:</strong> This criterion looks like it fits better under:
                </p>
                <div className="mt-2 p-3 bg-white rounded border">
                  <p className="font-medium text-blue-700">
                    {showPlacementModal?.suggestion.domain} - MPS {showPlacementModal?.suggestion.mpsNumber}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {showPlacementModal?.suggestion.mpsTitle}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  <strong>Reason:</strong> {showPlacementModal?.suggestion.reason}
                </p>
              </div>
              
              <p className="text-sm">
                I'll hold it there and bring it up when you reach that step. Continue?
              </p>
              
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowPlacementModal(null)}
                >
                  Keep Here
                </Button>
                <Button
                  onClick={() => {
                    if (showPlacementModal) {
                      deferCriterion(showPlacementModal.criteriaId, showPlacementModal.suggestion);
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  🌍 Defer to Correct Domain
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Deferral Warning Modal */}
        <Dialog open={showDeferralWarning !== null} onOpenChange={() => setShowDeferralWarning(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                ⚠️ Unresolved Deferred Criteria
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You have unapproved deferred criteria in other domains:
              </p>
              
              <div className="space-y-2">
                {showDeferralWarning?.deferrals.map((def, index) => (
                  <div key={index} className="p-3 bg-yellow-50 rounded border border-yellow-200">
                    <p className="font-medium text-yellow-800">
                      {def.domain} - MPS {def.mpsNumber}
                    </p>
                    <p className="text-sm text-yellow-600">
                      {def.count} pending {def.count === 1 ? 'criterion' : 'criteria'}
                    </p>
                  </div>
                ))}
              </div>
              
              <p className="text-sm">
                Do you want to review these before continuing to Step 4?
              </p>
              
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowDeferralWarning(null)}
                >
                  Continue Anyway
                </Button>
                <Button
                  onClick={() => {
                    setShowDeferralWarning(null);
                    // In a real implementation, this would navigate to the appropriate domain
                    toast({
                      title: "Navigation Required",
                      description: "Navigate to the domains with pending criteria to resolve them.",
                    });
                  }}
                >
                  📍 Review Deferred Criteria
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Split Criteria Modal */}
        <Dialog open={showSplitCriteriaModal !== null} onOpenChange={() => setShowSplitCriteriaModal(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                ✂️ Split Multi-Requirement Criterion
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                We've detected multiple requirements in your criterion. We recommend splitting them for clearer assessment:
              </p>
              
              {showSplitCriteriaModal && (
                <div className="space-y-4">
                  <div className="p-3 bg-orange-50 rounded border border-orange-200">
                    <h4 className="font-medium text-orange-800 mb-2">Original Statement:</h4>
                    <p className="text-sm text-orange-700">{showSplitCriteriaModal.originalStatement}</p>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-medium">Proposed Split:</h4>
                    {showSplitCriteriaModal.splitCriteria.map((criterion, index) => (
                      <div key={index} className="p-3 bg-green-50 rounded border border-green-200">
                        <h5 className="font-medium text-green-800">Criterion {index + 1}:</h5>
                        <p className="text-sm text-green-700 mt-1">{criterion.statement}</p>
                        <p className="text-xs text-green-600 mt-1">{criterion.summary}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowSplitCriteriaModal(null)}
                >
                  Keep as One
                </Button>
                <Button
                  onClick={() => {
                    if (showSplitCriteriaModal) {
                      handleSplitCriteriaApproval(
                        showSplitCriteriaModal.splitCriteria,
                        showSplitCriteriaModal.mpsId
                      );
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  ✅ Proceed with Split
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Enhanced Placement Modal with 5 Scenarios */}
        <Dialog open={showPlacementModal !== null} onOpenChange={() => setShowPlacementModal(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {showPlacementModal?.suggestion.scenario === 'same_domain' && (
                  <>🔄 Better MPS Placement</>
                )}
                {showPlacementModal?.suggestion.scenario === 'future_domain' && (
                  <>🔮 Future Domain Detected</>
                )}
                {showPlacementModal?.suggestion.scenario === 'past_domain' && (
                  <>⏰ Past Domain Detected</>
                )}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {showPlacementModal && (
                <>
                  {showPlacementModal.suggestion.scenario === 'same_domain' && (
                    <p className="text-sm text-muted-foreground">
                      This criterion fits better under <strong>MPS {showPlacementModal.suggestion.mpsNumber} - {showPlacementModal.suggestion.mpsTitle}</strong> within the same domain.
                    </p>
                  )}
                  {showPlacementModal.suggestion.scenario === 'future_domain' && (
                    <p className="text-sm text-muted-foreground">
                      This criterion belongs to <strong>{showPlacementModal.suggestion.domain}</strong> which you haven't configured yet. We'll defer it and remind you when you reach that domain.
                    </p>
                  )}
                  {showPlacementModal.suggestion.scenario === 'past_domain' && (
                    <p className="text-sm text-muted-foreground">
                      This criterion belongs to <strong>{showPlacementModal.suggestion.domain}</strong> which you've already completed. Do you want to return to add it?
                    </p>
                  )}
                  
                  <div className="p-3 bg-blue-50 rounded border border-blue-200">
                    <p className="text-sm text-blue-700">
                      <strong>Reason:</strong> {showPlacementModal.suggestion.reason}
                    </p>
                  </div>
                </>
              )}
              
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    // Keep in current location - this would need custom handling
                    setShowPlacementModal(null);
                    toast({
                      title: "Kept in Current MPS",
                      description: "Criterion added to current MPS as requested.",
                    });
                  }}
                >
                  Keep Here
                </Button>
                <Button
                  onClick={() => {
                    if (showPlacementModal) {
                      deferCriterion(showPlacementModal.criteriaId, showPlacementModal.suggestion);
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {showPlacementModal?.suggestion.scenario === 'same_domain' && '🔄 Move to Correct MPS'}
                  {showPlacementModal?.suggestion.scenario === 'future_domain' && '⏳ Defer to Future Domain'}
                  {showPlacementModal?.suggestion.scenario === 'past_domain' && '📍 Return to Past Domain'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Rejection Modal */}
        <Dialog open={showRejectModal !== null} onOpenChange={() => setShowRejectModal(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                ⚠️ Reject Criterion
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to reject this proposed criterion? This action will be logged for audit trail purposes.
              </p>
              <div className="space-y-2">
                <Label htmlFor="rejection-reason">Rejection Reason (Optional)</Label>
                <Textarea
                  id="rejection-reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this criterion is being rejected..."
                  className="min-h-[80px]"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectModal(null);
                    setRejectionReason('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (showRejectModal) {
                      rejectCriteria(showRejectModal, rejectionReason);
                    }
                  }}
                >
                  💡 Reject Criterion
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};