import { useState } from 'react';
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
  deferral_status?: string | null;
}

interface CustomCriterionInput {
  statement: string;
  summary: string;
}

interface PlacementAnalysis {
  belongs_here: boolean;
  suggested_domain?: string;
  suggested_mps_number?: number;
  suggested_mps_title?: string;
  reason?: string;
  improved_statement: string;
  improved_summary: string;
  evidence_suggestions: string;
}

interface PlacementSuggestion {
  criteriaId: string;
  suggestion: {
    domain: string;
    mpsNumber: number;
    mpsTitle: string;
    reason: string;
    scenario: 'same_domain' | 'future_domain' | 'past_domain';
  };
  currentStatement?: string;
  currentSummary?: string;
  originalMpsId?: string;
}

interface UseCustomCriterionProps {
  organizationId: string;
  organizationOwnerId: string;
  domainName: string;
  getMPSByID: (id: string) => MPS | undefined;
  getCriteriaForMPS: (mpsId: string) => Criteria[];
  checkForDuplicateCriteria: (statement: string, criteria: Criteria[]) => Promise<boolean>;
  determinePlacementScenario: (suggestedDomain: string, currentDomain: string) => Promise<'same_domain' | 'future_domain' | 'past_domain'>;
  onRefreshData: () => Promise<void>;
  onShowPlacementModal: (data: PlacementSuggestion) => void;
}

export const useCustomCriterion = ({
  organizationId,
  organizationOwnerId,
  domainName,
  getMPSByID,
  getCriteriaForMPS,
  checkForDuplicateCriteria,
  determinePlacementScenario,
  onRefreshData,
  onShowPlacementModal
}: UseCustomCriterionProps) => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const validateInputs = (criterion: CustomCriterionInput): { isValid: boolean; error?: string } => {
    console.log('📝 Validating inputs:', { 
      statement: criterion.statement.trim(), 
      summary: criterion.summary.trim() 
    });

    if (!criterion.statement.trim() || !criterion.summary.trim()) {
      console.log('❌ Validation failed - missing statement or summary');
      return {
        isValid: false,
        error: "Please provide both a criterion statement and summary."
      };
    }

    console.log('✅ Validation passed');
    return { isValid: true };
  };

  const validateRequiredData = (mpsId: string): { isValid: boolean; error?: string } => {
    console.log('🔬 Validating required data:', {
      hasOrganizationId: !!organizationId,
      hasMpsId: !!mpsId,
      organizationId,
      mpsId
    });

    if (!organizationId || !mpsId) {
      console.log('❌ Missing required data:', { 
        hasOrganization: !!organizationId, 
        hasMpsId: !!mpsId
      });
      return {
        isValid: false,
        error: "Missing organization or MPS data"
      };
    }

    console.log('✅ Required data check passed');
    return { isValid: true };
  };

  const performAIPlacementAnalysis = async (
    criterion: CustomCriterionInput,
    mps: MPS
  ): Promise<PlacementAnalysis> => {
    const prompt = `Please review this custom assessment criterion and check for proper placement:

Statement: ${criterion.statement}
Summary: ${criterion.summary}

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

    console.log('🤖 Calling AI placement analysis...');
    const { data, error } = await supabase.functions.invoke('maturion-ai-chat', {
      body: {
        prompt: prompt,
        context: 'Smart criteria placement validation',
        currentDomain: domainName,
        organizationId: organizationId,
        allowExternalContext: false,
        knowledgeBaseUsed: true
      }
    });

    console.log('🤖 AI analysis result:', { data, error });

    // Default fallback analysis
    let placementAnalysis: PlacementAnalysis = {
      belongs_here: true,
      improved_statement: criterion.statement,
      improved_summary: criterion.summary,
      evidence_suggestions: "Documentation and implementation evidence"
    };

    if (error) {
      console.warn('AI placement analysis failed, using default placement:', error);
      return placementAnalysis;
    }

    try {
      if (data?.content) {
        const responseContent = data.content || data.response || '';
        console.log('🧠 AI Placement Analysis Response:', responseContent);
        
        const jsonStart = responseContent.indexOf('{');
        const jsonEnd = responseContent.lastIndexOf('}');
        
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const jsonString = responseContent.substring(jsonStart, jsonEnd + 1);
          console.log('🔍 Extracted JSON for placement analysis:', jsonString);
          
          const parsedData = JSON.parse(jsonString);
          console.log('📊 Parsed placement analysis:', parsedData);
          
          if (parsedData.belongs_here !== undefined) {
            placementAnalysis = parsedData;
            console.log('✅ Placement analysis assigned:', placementAnalysis);
          }
        }
      }
    } catch (parseError) {
      console.warn('Could not parse AI placement analysis, using default:', parseError);
    }

    return placementAnalysis;
  };

  const insertCriterion = async (
    mpsId: string,
    criteriaNumber: string,
    placementAnalysis: PlacementAnalysis,
    deferralStatus?: string
  ): Promise<{ success: boolean; criteriaId?: string; error?: any }> => {
    try {
      const { data: newCriterion, error: insertError } = await supabase
        .from('criteria')
        .insert({
          mps_id: mpsId,
          organization_id: organizationId,
          criteria_number: criteriaNumber,
          statement: placementAnalysis.improved_statement,
          summary: placementAnalysis.improved_summary,
          status: 'not_started',
          deferral_status: deferralStatus || null,
          created_by: organizationOwnerId,
          updated_by: organizationOwnerId
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Database insertion failed:', insertError);
        return { success: false, error: insertError };
      }

      console.log('✅ Criterion inserted successfully:', newCriterion);
      return { success: true, criteriaId: newCriterion.id };
    } catch (error) {
      console.error('❌ Unexpected error during insertion:', error);
      return { success: false, error };
    }
  };

  const addCustomCriterion = async (
    criterion: CustomCriterionInput,
    mpsId: string
  ): Promise<{ success: boolean; placementModalTriggered?: boolean; error?: string }> => {
    console.log('🚀 addCustomCriterion called with:', { 
      criterion, 
      mpsId, 
      organizationId 
    });

    try {
      setIsProcessing(true);

      // Step 1: Validate required data
      const dataValidation = validateRequiredData(mpsId);
      if (!dataValidation.isValid) {
        toast({
          title: "Missing Data",
          description: dataValidation.error,
          variant: "destructive"
        });
        return { success: false, error: dataValidation.error };
      }

      // Step 2: Validate inputs
      const inputValidation = validateInputs(criterion);
      if (!inputValidation.isValid) {
        toast({
          title: "Invalid Input",
          description: inputValidation.error,
          variant: "destructive"
        });
        return { success: false, error: inputValidation.error };
      }

      // Step 3: Get MPS data
      const mps = getMPSByID(mpsId);
      if (!mps) {
        const error = 'MPS not found';
        console.log('❌', error);
        toast({
          title: "MPS Not Found",
          description: "Could not find the specified MPS.",
          variant: "destructive"
        });
        return { success: false, error };
      }
      console.log('🎯 Found MPS:', mps);

      // Step 4: Check for duplicates
      const mpssCriteria = getCriteriaForMPS(mpsId);
      console.log('📋 Existing criteria for MPS:', mpssCriteria.length);
      console.log('🔍 Starting duplicate check...');
      
      const duplicateResult = await checkForDuplicateCriteria(criterion.statement, mpssCriteria);
      if (!duplicateResult) {
        console.log('❌ Duplicate check failed or user cancelled');
        return { success: false, error: "Duplicate check failed or cancelled" };
      }
      console.log('✅ Duplicate check passed');

      // Step 5: Generate criteria number
      const nextNumber = mpssCriteria.length + 1;
      const criteriaNumber = `${mps.mps_number}.${nextNumber}`;
      console.log('📊 Generated criteria number:', criteriaNumber);

      // Step 6: AI placement analysis
      const placementAnalysis = await performAIPlacementAnalysis(criterion, mps);

      // Step 7: Handle placement decision
      console.log('🎯 Placement check:', { 
        belongsHere: placementAnalysis.belongs_here, 
        suggestedDomain: placementAnalysis.suggested_domain,
        shouldTriggerModal: !placementAnalysis.belongs_here && placementAnalysis.suggested_domain
      });

      if (!placementAnalysis.belongs_here && placementAnalysis.suggested_domain) {
        // Insert with pending placement status
        const insertResult = await insertCriterion(
          mpsId, 
          criteriaNumber, 
          placementAnalysis, 
          'pending_placement'
        );

        if (!insertResult.success) {
          toast({
            title: "Failed to Create Criterion",
            description: "Could not create criterion for placement review.",
            variant: "destructive"
          });
          return { success: false, error: "Insertion failed" };
        }

        // Determine scenario and show placement modal
        const scenario = await determinePlacementScenario(
          placementAnalysis.suggested_domain, 
          domainName
        );

        onShowPlacementModal({
          criteriaId: insertResult.criteriaId!,
          suggestion: {
            domain: placementAnalysis.suggested_domain,
            mpsNumber: placementAnalysis.suggested_mps_number || 0,
            mpsTitle: placementAnalysis.suggested_mps_title || '',
            reason: placementAnalysis.reason || 'Better alignment with domain focus',
            scenario: scenario
          },
          currentStatement: placementAnalysis.improved_statement,
          currentSummary: placementAnalysis.improved_summary,
          originalMpsId: mpsId
        });

        console.log('✅ Placement modal triggered');
        return { success: true, placementModalTriggered: true };
      }

      // Step 8: Insert normally if placement is correct
      const insertResult = await insertCriterion(mpsId, criteriaNumber, placementAnalysis);
      
      if (!insertResult.success) {
        toast({
          title: "Failed to Add Criterion", 
          description: "Could not add the custom criterion to the database.",
          variant: "destructive"
        });
        return { success: false, error: "Database insertion failed" };
      }

      // Step 9: Refresh data and show success
      await onRefreshData();
      
      toast({
        title: "✅ Custom Criterion Added",
        description: `Successfully added criterion ${criteriaNumber}`,
      });

      console.log('✅ Custom criterion added successfully');
      return { success: true };

    } catch (error) {
      console.error('💥 Unexpected error in addCustomCriterion:', error);
      
      // Show user-friendly error message
      let errorMessage = "An unexpected error occurred while adding the criterion.";
      
      if (error?.message?.includes('Edge Function returned a non-2xx status code')) {
        errorMessage = "AI analysis is temporarily unavailable. The criterion will be added without smart placement validation.";
        
        // Try fallback insertion
        try {
          const mps = getMPSByID(mpsId);
          if (mps) {
            const mpssCriteria = getCriteriaForMPS(mpsId);
            const nextNumber = mpssCriteria.length + 1;
            const criteriaNumber = `${mps.mps_number}.${nextNumber}`;
            
            const fallbackAnalysis: PlacementAnalysis = {
              belongs_here: true,
              improved_statement: criterion.statement,
              improved_summary: criterion.summary,
              evidence_suggestions: "Documentation and implementation evidence"
            };
            
            const insertResult = await insertCriterion(mpsId, criteriaNumber, fallbackAnalysis);
            
            if (insertResult.success) {
              await onRefreshData();
              toast({
                title: "✅ Criterion Added (No AI Validation)",
                description: "Added successfully but please manually verify placement.",
                variant: "default"
              });
              return { success: true };
            }
          }
        } catch (fallbackError) {
          console.error('❌ Fallback insertion also failed:', fallbackError);
        }
      }

      toast({
        title: "Error Adding Criterion",
        description: errorMessage,
        variant: "destructive"
      });

      return { success: false, error: error?.message || "Unknown error" };
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    addCustomCriterion,
    isProcessing
  };
};