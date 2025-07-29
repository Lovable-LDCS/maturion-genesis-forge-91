import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle, CheckCircle, GitMerge, Clock, Database } from 'lucide-react';

export const OrganizationDataSynchronizer: React.FC = () => {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<{ 
    success: boolean; 
    message: string; 
    details?: any;
  } | null>(null);
  const { toast } = useToast();

  const synchronizeOrganizationData = async () => {
    setSyncing(true);
    setResult(null);

    try {
      console.log('🔄 Starting organization data synchronization...');

      // Step 1: Identify the organization with chunks (source)
      const { data: chunksOrg, error: chunksError } = await supabase
        .from('ai_document_chunks')
        .select('organization_id')
        .limit(1)
        .single();

      if (chunksError || !chunksOrg) {
        throw new Error('Could not identify chunks organization');
      }

      const sourceOrgId = chunksOrg.organization_id;
      console.log(`📋 Source organization (has chunks): ${sourceOrgId}`);

      // Step 2: Get MPSs from source organization that need criteria
      const { data: sourceMps, error: mpsError } = await supabase
        .from('maturity_practice_statements')
        .select('id, mps_number, name, organization_id')
        .eq('organization_id', sourceOrgId)
        .order('mps_number');

      if (mpsError) {
        throw new Error(`Failed to fetch source MPSs: ${mpsError.message}`);
      }

      console.log(`📋 Found ${sourceMps?.length || 0} MPSs in source organization`);

      // Step 3: Check which MPSs already have criteria
      const mpsWithCriteria = [];
      const mpsNeedingCriteria = [];

      for (const mps of sourceMps || []) {
        const { data: existingCriteria, error: criteriaError } = await supabase
          .from('criteria')
          .select('id')
          .eq('mps_id', mps.id)
          .limit(1);

        if (!criteriaError && existingCriteria && existingCriteria.length > 0) {
          mpsWithCriteria.push(mps);
        } else {
          mpsNeedingCriteria.push(mps);
        }
      }

      console.log(`📊 Analysis: ${mpsWithCriteria.length} have criteria, ${mpsNeedingCriteria.length} need criteria`);

      // Step 4: Find reference criteria from the other organization
      const { data: referenceCriteria, error: refError } = await supabase
        .from('criteria')
        .select(`
          id,
          mps_id,
          statement,
          summary,
          criteria_number,
          maturity_practice_statements!inner(mps_number, name)
        `)
        .neq('organization_id', sourceOrgId)
        .limit(50);

      if (refError) {
        throw new Error(`Failed to fetch reference criteria: ${refError.message}`);
      }

      console.log(`📋 Found ${referenceCriteria?.length || 0} reference criteria from other organization`);

      // Step 5: Copy criteria structure to source organization MPSs
      let createdCount = 0;
      const creationDetails = [];

      for (const mps of mpsNeedingCriteria) {
        // Find matching criteria from reference organization by MPS number
        const matchingReferenceCriteria = referenceCriteria?.filter(
          rc => rc.maturity_practice_statements?.mps_number === mps.mps_number
        ) || [];

        if (matchingReferenceCriteria.length === 0) {
          console.log(`⚠️ No reference criteria found for MPS ${mps.mps_number}`);
          continue;
        }

        console.log(`🔄 Creating ${matchingReferenceCriteria.length} criteria for MPS ${mps.mps_number}`);

        // Create criteria for this MPS
        for (let i = 0; i < matchingReferenceCriteria.length; i++) {
          const refCriterion = matchingReferenceCriteria[i];
          
          try {
            const { data: newCriterion, error: createError } = await supabase
              .from('criteria')
              .insert({
                mps_id: mps.id,
                organization_id: sourceOrgId,
                criteria_number: `${mps.mps_number}.${i + 1}`,
                statement: refCriterion.statement,
                summary: refCriterion.summary,
                status: 'not_started',
                created_by: '1dfc1c68-022a-4b49-a86e-272a83bff8d3', // User ID from context
                updated_by: '1dfc1c68-022a-4b49-a86e-272a83bff8d3'
              })
              .select()
              .single();

            if (createError) {
              console.error(`❌ Failed to create criterion for MPS ${mps.mps_number}:`, createError);
            } else {
              createdCount++;
              creationDetails.push({
                mpsNumber: mps.mps_number,
                criteriaNumber: `${mps.mps_number}.${i + 1}`,
                statement: refCriterion.statement.substring(0, 50) + '...'
              });
            }
          } catch (createErr: any) {
            console.error(`❌ Error creating criterion:`, createErr);
          }
        }
      }

      setResult({
        success: true,
        message: `Successfully synchronized ${createdCount} criteria across ${mpsNeedingCriteria.length} MPS documents.`,
        details: {
          sourceOrgId,
          mpsWithCriteria: mpsWithCriteria.length,
          mpsNeedingCriteria: mpsNeedingCriteria.length,
          createdCriteria: createdCount,
          creationDetails: creationDetails.slice(0, 5) // Show first 5 examples
        }
      });
      
      toast({
        title: "Data Synchronization Complete",
        description: `Created ${createdCount} criteria in the correct organization`,
      });

    } catch (error: any) {
      console.error('❌ Organization data synchronization failed:', error);
      setResult({
        success: false,
        message: `Synchronization failed: ${error.message}`
      });
      
      toast({
        title: "Synchronization Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSyncing(false);
    }
  };

  const getStatusIcon = () => {
    if (syncing) return <Clock className="h-5 w-5 text-blue-500 animate-spin" />;
    if (!result) return <GitMerge className="h-5 w-5 text-gray-500" />;
    return result.success ? 
      <CheckCircle className="h-5 w-5 text-green-500" /> : 
      <AlertCircle className="h-5 w-5 text-red-500" />;
  };

  const getStatusColor = () => {
    if (syncing) return "border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800";
    if (!result) return "border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800";
    return result.success ? 
      "border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800" : 
      "border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800";
  };

  return (
    <Card className={getStatusColor()}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          Organization Data Synchronizer
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Fix organization data split - synchronize criteria to match chunk organization
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="bg-amber-100 dark:bg-amber-900 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Database className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="font-medium text-amber-800 dark:text-amber-200">Organization Mismatch Detected</span>
          </div>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Chunks exist in one organization, but criteria exist in another. This causes "No document context available" errors.
          </p>
        </div>

        <Button 
          onClick={synchronizeOrganizationData}
          disabled={syncing}
          className="w-full"
          size="lg"
        >
          {syncing ? (
            <>
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              Synchronizing Data...
            </>
          ) : (
            <>
              <GitMerge className="h-4 w-4 mr-2" />
              Synchronize Organization Data
            </>
          )}
        </Button>
        
        {result && (
          <div className={`p-4 rounded-lg ${
            result.success ? 
              'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 
              'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
          }`}>
            <p className="font-medium">{result.success ? 'Synchronization Complete' : 'Synchronization Failed'}</p>
            <p className="text-sm mt-1">{result.message}</p>
            
            {result.details && (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-medium">Synchronization Details:</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>MPSs with criteria: {result.details.mpsWithCriteria}</div>
                  <div>MPSs needing criteria: {result.details.mpsNeedingCriteria}</div>
                  <div>Created criteria: {result.details.createdCriteria}</div>
                  <div>Target org: {result.details.sourceOrgId?.slice(-8)}</div>
                </div>
                
                {result.details.creationDetails?.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium mb-1">Sample Created Criteria:</p>
                    {result.details.creationDetails.slice(0, 3).map((detail: any, index: number) => (
                      <div key={index} className="text-xs opacity-75">
                        MPS {detail.mpsNumber}.{detail.criteriaNumber.split('.')[1]}: {detail.statement}
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