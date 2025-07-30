import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Trash, CheckCircle, Clock, AlertTriangle, PlayCircle } from 'lucide-react';

interface MPSStatus {
  id: string;
  mps_number: number;
  name: string;
  criteriaCount: number;
  status: 'success' | 'missing' | 'loading';
}

export const CriteriaRegenerationTool: React.FC = () => {
  const [regenerating, setRegenerating] = useState(false);
  const [mpsStatuses, setMpsStatuses] = useState<MPSStatus[]>([]);
  const [loadingMpsStatus, setLoadingMpsStatus] = useState(false);
  const [regeneratingMps, setRegeneratingMps] = useState<Set<number>>(new Set());
  const [result, setResult] = useState<{ 
    success: boolean; 
    message: string; 
    details?: any;
  } | null>(null);
  const { toast } = useToast();

  // Load MPS status on component mount
  useEffect(() => {
    loadMpsStatus();
  }, []);

  const loadMpsStatus = async () => {
    setLoadingMpsStatus(true);
    try {
      // Get primary organization
      const { data: orgId, error: orgError } = await supabase
        .rpc('get_user_primary_organization');

      if (orgError || !orgId) {
        console.warn('Could not load primary organization for MPS status');
        return;
      }

      // Get all MPSs
      const { data: mpsList, error: mpsError } = await supabase
        .from('maturity_practice_statements')
        .select('id, mps_number, name')
        .eq('organization_id', orgId)
        .order('mps_number');

      if (mpsError || !mpsList) {
        console.warn('Could not load MPS list');
        return;
      }

      // Get criteria count for each MPS
      const { data: criteriaCounts, error: criteriaError } = await supabase
        .from('criteria')
        .select('mps_id')
        .in('mps_id', mpsList.map(mps => mps.id));

      if (criteriaError) {
        console.warn('Could not load criteria counts');
        return;
      }

      // Count criteria per MPS
      const criteriaCountMap = criteriaCounts?.reduce((acc, criteria) => {
        acc[criteria.mps_id] = (acc[criteria.mps_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Build status array
      const statuses: MPSStatus[] = mpsList.map(mps => ({
        id: mps.id,
        mps_number: mps.mps_number,
        name: mps.name,
        criteriaCount: criteriaCountMap[mps.id] || 0,
        status: criteriaCountMap[mps.id] > 0 ? 'success' : 'missing'
      }));

      setMpsStatuses(statuses);
    } catch (error) {
      console.error('Error loading MPS status:', error);
    } finally {
      setLoadingMpsStatus(false);
    }
  };

  const regenerateSingleMps = async (mpsNumber: number) => {
    // Add to regenerating set
    setRegeneratingMps(prev => new Set([...prev, mpsNumber]));
    
    try {
      // Get primary organization
      const { data: orgId, error: orgError } = await supabase
        .rpc('get_user_primary_organization');

      if (orgError || !orgId) {
        throw new Error('Could not get primary organization');
      }

      // Find the specific MPS
      const mps = mpsStatuses.find(m => m.mps_number === mpsNumber);
      if (!mps) {
        throw new Error(`MPS ${mpsNumber} not found`);
      }

      console.log(`🤖 Regenerating criteria for MPS ${mpsNumber}: ${mps.name}`);

      // Delete existing criteria for this MPS only
      await supabase
        .from('criteria')
        .delete()
        .eq('mps_id', mps.id);

      // Delete associated maturity levels for this MPS
      await supabase
        .from('maturity_levels')
        .delete()
        .eq('criteria_id', mps.id);

      // Generate and save new criteria for this MPS
      const { data: saveResult, error: saveError } = await supabase.functions.invoke('generate-and-save-criteria', {
        body: {
          mpsId: mps.id,
          mpsNumber: mpsNumber,
          mpsName: mps.name,
          organizationId: orgId
        }
      });

      if (saveError || !saveResult?.success) {
        throw new Error(saveError?.message || saveResult?.error || 'Failed to generate and save criteria');
      }

      console.log(`✅ Successfully regenerated criteria for MPS ${mpsNumber}`);
      
      toast({
        title: "MPS Regeneration Complete",
        description: `Successfully regenerated criteria for MPS ${mpsNumber}`,
      });

      // Reload status to reflect changes
      await loadMpsStatus();

    } catch (error: any) {
      console.error(`Error regenerating MPS ${mpsNumber}:`, error);
      toast({
        title: "MPS Regeneration Failed",
        description: `Failed to regenerate MPS ${mpsNumber}: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      // Remove from regenerating set
      setRegeneratingMps(prev => {
        const next = new Set(prev);
        next.delete(mpsNumber);
        return next;
      });
    }
  };

  const regenerateAllCriteria = async () => {
    setRegenerating(true);
    setResult(null);

    try {
      console.log('🔄 Starting criteria regeneration...');

      // Step 1: Get the user's primary organization (audit-scoped entity)
      const { data: primaryOrgData, error: orgError } = await supabase
        .rpc('get_user_primary_organization');

      if (orgError) {
        console.error('Error finding primary organization:', orgError);
        throw new Error(`Failed to identify primary organization: ${orgError.message}`);
      }

      if (!primaryOrgData) {
        throw new Error('No primary organization found. Ensure you have completed the maturity setup process.');
      }

      const orgId = primaryOrgData;
      console.log(`📋 Using primary organization: ${orgId}`);

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
      const { data: chunkVerification, error: verificationError } = await supabase
        .from('ai_document_chunks')
        .select('document_id')
        .eq('organization_id', orgId)
        .limit(1);

      if (verificationError || !chunkVerification || chunkVerification.length === 0) {
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
          
          // Call the new function to generate AND save criteria for this specific MPS
          const { data: saveResult, error: saveError } = await supabase.functions.invoke('generate-and-save-criteria', {
            body: {
              mpsId: mps.id,
              mpsNumber: mps.mps_number,
              mpsName: mps.name,
              organizationId: orgId
            }
          });

          if (saveError || !saveResult?.success) {
            console.warn(`Criteria generation/save error for MPS ${mps.mps_number}:`, saveError || saveResult?.error);
            generationResults.push({
              mpsNumber: mps.mps_number,
              status: 'error',
              error: saveError?.message || saveResult?.error || 'Unknown error'
            });
          } else {
            console.log(`✅ Generated and saved ${saveResult.criteriaGenerated} criteria for MPS ${mps.mps_number}`);
            generatedCount++;
            generationResults.push({
              mpsNumber: mps.mps_number,
              status: 'success',
              criteriaCount: saveResult.criteriaGenerated
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

      // Step 6: Verify final results and identify failures
      const { data: finalCheck, error: finalError } = await supabase
        .from('criteria')
        .select('id, mps_id')
        .in('mps_id', mpsWithChunks?.map(mps => mps.id) || []);

      const finalCriteriaCount = finalCheck?.length || 0;
      
      // Identify failed MPSs
      const failedResults = generationResults.filter(r => r.status === 'error');
      const successfulMpsIds = new Set(
        generationResults.filter(r => r.status === 'success').map(r => 
          mpsWithChunks?.find(mps => mps.mps_number === r.mpsNumber)?.id
        )
      );
      
      // Double-check criteria count by MPS
      const criteriaByMps = finalCheck?.reduce((acc, criteria) => {
        acc[criteria.mps_id] = (acc[criteria.mps_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      setResult({
        success: true,
        message: `Successfully regenerated criteria for ${generatedCount}/${mpsWithChunks?.length || 0} MPSs${failedResults.length > 0 ? ` (${failedResults.length} failed)` : ''}`,
        details: {
          orgId,
          totalMps: mpsWithChunks?.length || 0,
          deletedCriteria: deletedCount,
          generatedMps: generatedCount,
          finalCriteriaCount,
          failedMps: failedResults.map(f => ({ mpsNumber: f.mpsNumber, error: f.error })),
          criteriaByMps: Object.keys(criteriaByMps).length,
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

        {/* Individual MPS Status and Regeneration */}
        {mpsStatuses.length > 0 && (
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-sm">Individual MPS Status</h4>
              <Button
                onClick={loadMpsStatus}
                disabled={loadingMpsStatus}
                variant="outline"
                size="sm"
              >
                {loadingMpsStatus ? (
                  <Clock className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3 mr-1" />
                )}
                Refresh
              </Button>
            </div>
            
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {mpsStatuses.map((mps) => (
                <div
                  key={mps.id}
                  className="flex items-center justify-between p-2 rounded border text-xs"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {mps.status === 'success' ? (
                      <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="h-3 w-3 text-orange-500 flex-shrink-0" />
                    )}
                    <span className="font-medium flex-shrink-0">MPS {mps.mps_number}:</span>
                    <span className="truncate" title={mps.name}>{mps.name}</span>
                    <span className="text-muted-foreground flex-shrink-0">
                      ({mps.criteriaCount} criteria)
                    </span>
                  </div>
                  
                  {mps.status === 'missing' && (
                    <Button
                      onClick={() => regenerateSingleMps(mps.mps_number)}
                      disabled={regeneratingMps.has(mps.mps_number) || regenerating}
                      size="sm"
                      variant="outline"
                      className="ml-2 h-6"
                    >
                      {regeneratingMps.has(mps.mps_number) ? (
                        <Clock className="h-3 w-3 animate-spin" />
                      ) : (
                        <PlayCircle className="h-3 w-3" />
                      )}
                      <span className="ml-1">Retry</span>
                    </Button>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-2 text-xs text-muted-foreground">
              {mpsStatuses.filter(m => m.status === 'success').length} of {mpsStatuses.length} MPSs have criteria
            </div>
          </div>
        )}
        
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
                
                {result.details.failedMps?.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium mb-1 text-red-600 dark:text-red-400">Failed MPSs:</p>
                    {result.details.failedMps.map((failed: any, index: number) => (
                      <div key={index} className="text-xs bg-red-50 dark:bg-red-900 p-2 rounded mb-1">
                        <div className="font-medium">MPS {failed.mpsNumber}</div>
                        <div className="opacity-75 text-red-600 dark:text-red-300">{failed.error}</div>
                      </div>
                    ))}
                  </div>
                )}
                
                {result.details.generationResults?.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium mb-1">Recent Generation Status:</p>
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