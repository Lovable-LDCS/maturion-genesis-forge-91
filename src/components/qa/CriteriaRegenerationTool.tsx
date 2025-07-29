import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Trash, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

export const CriteriaRegenerationTool: React.FC = () => {
  const [regenerating, setRegenerating] = useState(false);
  const [result, setResult] = useState<{ 
    success: boolean; 
    message: string; 
    details?: any;
  } | null>(null);
  const { toast } = useToast();

  const regenerateAllCriteria = async () => {
    setRegenerating(true);
    setResult(null);

    try {
      console.log('🔄 Starting criteria regeneration...');

      // Step 1: Get the current user's organization
      const { data: userOrg, error: userError } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (userError || !userOrg) {
        throw new Error('Could not identify user organization');
      }

      const orgId = userOrg.organization_id;
      console.log(`📋 Working with organization: ${orgId}`);

      // Step 2: Get all MPSs that have chunks
      const { data: mpsWithChunks, error: mpsError } = await supabase
        .from('maturity_practice_statements')
        .select(`
          id,
          mps_number,
          name,
          organization_id
        `)
        .eq('organization_id', orgId)
        .order('mps_number');

      if (mpsError) {
        throw new Error(`Failed to fetch MPSs: ${mpsError.message}`);
      }

      console.log(`📋 Found ${mpsWithChunks?.length || 0} MPSs in organization`);

      // Step 3: Verify these MPSs have document chunks
      const { data: chunkCheck, error: chunkError } = await supabase
        .from('ai_document_chunks')
        .select('document_id')
        .eq('organization_id', orgId)
        .limit(1);

      if (chunkError || !chunkCheck || chunkCheck.length === 0) {
        throw new Error('No document chunks found in organization');
      }

      // Step 4: Delete ALL existing criteria (including placeholders)
      let deletedCount = 0;
      if (mpsWithChunks && mpsWithChunks.length > 0) {
        const mpsIds = mpsWithChunks.map(mps => mps.id);
        
        const { error: deleteError, count } = await supabase
          .from('criteria')
          .delete({ count: 'exact' })
          .in('mps_id', mpsIds);

        if (deleteError) {
          console.warn('Error deleting criteria:', deleteError);
        } else {
          deletedCount = count || 0;
        }

        // Also delete associated maturity levels
        await supabase
          .from('maturity_levels')
          .delete()
          .eq('organization_id', orgId);
      }

      console.log(`🗑️ Deleted ${deletedCount} existing criteria`);

      // Step 5: Generate fresh criteria for each MPS using AI
      let generatedCount = 0;
      const generationResults = [];

      for (const mps of mpsWithChunks || []) {
        try {
          console.log(`🤖 Generating criteria for MPS ${mps.mps_number}: ${mps.name}`);
          
          // Call the AI function to generate criteria for this specific MPS
          const { data: aiResult, error: aiError } = await supabase.functions.invoke('maturion-ai-chat', {
            body: {
              prompt: `Generate comprehensive assessment criteria for MPS ${mps.mps_number}: ${mps.name}. Use the uploaded MPS document content to create specific, measurable criteria.`,
              context: {
                action: 'generate_criteria',
                organizationId: orgId,
                mpsId: mps.id,
                mpsNumber: mps.mps_number,
                mpsName: mps.name,
                requireDocumentContext: true
              },
              knowledgeTier: 'full_context',
              requireDocumentContext: true
            }
          });

          if (aiError) {
            console.warn(`AI generation error for MPS ${mps.mps_number}:`, aiError);
            generationResults.push({
              mpsNumber: mps.mps_number,
              status: 'error',
              error: aiError.message
            });
          } else {
            console.log(`✅ Generated criteria for MPS ${mps.mps_number}`);
            generatedCount++;
            generationResults.push({
              mpsNumber: mps.mps_number,
              status: 'success',
              result: aiResult
            });
          }

          // Small delay to avoid overwhelming the AI function
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error: any) {
          console.error(`Error generating criteria for MPS ${mps.mps_number}:`, error);
          generationResults.push({
            mpsNumber: mps.mps_number,
            status: 'error',
            error: error.message
          });
        }
      }

      // Step 6: Verify final results
      const { data: finalCheck, error: finalError } = await supabase
        .from('criteria')
        .select('id')
        .in('mps_id', mpsWithChunks?.map(mps => mps.id) || []);

      const finalCriteriaCount = finalCheck?.length || 0;

      setResult({
        success: true,
        message: `Successfully regenerated criteria for ${generatedCount}/${mpsWithChunks?.length || 0} MPSs`,
        details: {
          orgId,
          totalMps: mpsWithChunks?.length || 0,
          deletedCriteria: deletedCount,
          generatedMps: generatedCount,
          finalCriteriaCount,
          generationResults: generationResults.slice(0, 5) // Show first 5 for display
        }
      });
      
      toast({
        title: "Criteria Regeneration Complete",
        description: `Generated fresh criteria for ${generatedCount} MPSs`,
      });

    } catch (error: any) {
      console.error('❌ Criteria regeneration failed:', error);
      setResult({
        success: false,
        message: `Regeneration failed: ${error.message}`
      });
      
      toast({
        title: "Regeneration Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setRegenerating(false);
    }
  };

  const getStatusIcon = () => {
    if (regenerating) return <Clock className="h-5 w-5 text-blue-500 animate-spin" />;
    if (!result) return <RefreshCw className="h-5 w-5 text-purple-500" />;
    return result.success ? 
      <CheckCircle className="h-5 w-5 text-green-500" /> : 
      <AlertTriangle className="h-5 w-5 text-red-500" />;
  };

  const getStatusColor = () => {
    if (regenerating) return "border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800";
    if (!result) return "border-purple-200 bg-purple-50 dark:bg-purple-950 dark:border-purple-800";
    return result.success ? 
      "border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800" : 
      "border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800";
  };

  return (
    <Card className={getStatusColor()}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          Criteria Regeneration Tool
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Delete all placeholder criteria and regenerate from document chunks using AI
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="bg-amber-100 dark:bg-amber-900 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="font-medium text-amber-800 dark:text-amber-200">Placeholder Criteria Detected</span>
          </div>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Existing criteria contain placeholder content or are missing entirely. Need to regenerate from actual document chunks.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Trash className="h-4 w-4 text-red-500" />
            <span>Delete all existing criteria (including placeholders)</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <RefreshCw className="h-4 w-4 text-blue-500" />
            <span>Generate fresh criteria from document chunks for each MPS</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>Ensure proper MPS → chunk → criteria linkage</span>
          </div>
        </div>

        <Button 
          onClick={regenerateAllCriteria}
          disabled={regenerating}
          className="w-full"
          size="lg"
        >
          {regenerating ? (
            <>
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              Regenerating Criteria...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Regenerate All Criteria from Chunks
            </>
          )}
        </Button>
        
        {result && (
          <div className={`p-4 rounded-lg ${
            result.success ? 
              'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 
              'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
          }`}>
            <p className="font-medium">{result.success ? 'Regeneration Complete' : 'Regeneration Failed'}</p>
            <p className="text-sm mt-1">{result.message}</p>
            
            {result.details && (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-medium">Regeneration Summary:</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>Total MPSs: {result.details.totalMps}</div>
                  <div>Deleted criteria: {result.details.deletedCriteria}</div>
                  <div>Generated for MPSs: {result.details.generatedMps}</div>
                  <div>Final criteria count: {result.details.finalCriteriaCount}</div>
                </div>
                
                {result.details.generationResults?.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium mb-1">Generation Status:</p>
                    {result.details.generationResults.slice(0, 3).map((gen: any, index: number) => (
                      <div key={index} className="text-xs opacity-75">
                        MPS {gen.mpsNumber}: {gen.status === 'success' ? '✅' : '❌'} {gen.status}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};