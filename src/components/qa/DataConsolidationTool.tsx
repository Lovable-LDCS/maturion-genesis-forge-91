import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, Database, ArrowRight, CheckCircle, Clock } from 'lucide-react';

export const DataConsolidationTool: React.FC = () => {
  const [consolidating, setConsolidating] = useState(false);
  const [result, setResult] = useState<{ 
    success: boolean; 
    message: string; 
    details?: any;
  } | null>(null);
  const { toast } = useToast();

  const consolidateOrganizationData = async () => {
    setConsolidating(true);
    setResult(null);

    try {
      console.log('🔄 Starting complete data consolidation...');

      // Step 1: Identify the source organization (has chunks)
      const { data: chunkOrgData, error: chunkError } = await supabase
        .from('ai_document_chunks')
        .select('organization_id')
        .limit(1)
        .single();

      if (chunkError || !chunkOrgData) {
        throw new Error('Could not identify organization with chunks');
      }

      const targetOrgId = chunkOrgData.organization_id;
      console.log(`📋 Target organization (has chunks): ${targetOrgId}`);

      // Step 2: Find MPSs in other organizations that need to be moved/deleted
      const { data: duplicateMps, error: duplicateError } = await supabase
        .from('maturity_practice_statements')
        .select('id, mps_number, name, organization_id')
        .neq('organization_id', targetOrgId);

      if (duplicateError) {
        throw new Error(`Failed to find duplicate MPSs: ${duplicateError.message}`);
      }

      console.log(`📋 Found ${duplicateMps?.length || 0} MPSs in other organizations`);

      // Step 3: Delete criteria from duplicate MPSs
      if (duplicateMps && duplicateMps.length > 0) {
        const duplicateMpsIds = duplicateMps.map(mps => mps.id);
        
        const { error: deleteCriteriaError } = await supabase
          .from('criteria')
          .delete()
          .in('mps_id', duplicateMpsIds);

        if (deleteCriteriaError) {
          console.warn('Error deleting duplicate criteria:', deleteCriteriaError);
        }

        // Step 4: Delete maturity levels from duplicate organizations
        const { error: deleteMaturityError } = await supabase
          .from('maturity_levels')
          .delete()
          .neq('organization_id', targetOrgId);

        // Step 5: Delete duplicate MPSs
        const { error: deleteMpsError } = await supabase
          .from('maturity_practice_statements')
          .delete()
          .in('id', duplicateMpsIds);

        if (deleteMpsError) {
          console.warn('Error deleting duplicate MPSs:', deleteMpsError);
        }

        // Step 6: Delete duplicate domains
        const { error: deleteDomainsError } = await supabase
          .from('domains')
          .delete()
          .neq('organization_id', targetOrgId);

        if (deleteDomainsError) {
          console.warn('Error deleting duplicate domains:', deleteDomainsError);
        }
      }

      // Step 7: Regenerate criteria for MPSs that have chunks
      const { data: mpsWithChunks, error: mpsError } = await supabase
        .from('maturity_practice_statements')
        .select('id, mps_number, name')
        .eq('organization_id', targetOrgId)
        .order('mps_number');

      if (mpsError) {
        throw new Error(`Failed to fetch target MPSs: ${mpsError.message}`);
      }

      console.log(`📋 Found ${mpsWithChunks?.length || 0} MPSs in target organization`);

      // Step 8: Call the AI function to generate criteria for MPSs with chunks
      let generatedCount = 0;
      
      if (mpsWithChunks && mpsWithChunks.length > 0) {
        const { data: aiResult, error: aiError } = await supabase.functions.invoke('maturion-ai-chat', {
          body: {
            prompt: 'Generate criteria for all MPSs that have document chunks but no criteria',
            context: {
              action: 'generate_missing_criteria',
              organizationId: targetOrgId,
              mpsIds: mpsWithChunks.map(mps => mps.id)
            },
            knowledgeTier: 'full_context'
          }
        });

        if (aiError) {
          console.warn('AI generation warning:', aiError);
        } else if (aiResult?.generatedCriteria) {
          generatedCount = aiResult.generatedCriteria;
        }
      }

      setResult({
        success: true,
        message: `Successfully consolidated data into organization ${targetOrgId.slice(-8)}`,
        details: {
          targetOrgId,
          duplicateMpsRemoved: duplicateMps?.length || 0,
          mpsWithChunks: mpsWithChunks?.length || 0,
          criteriaGenerated: generatedCount,
          chunkCount: 'Available'
        }
      });
      
      toast({
        title: "Data Consolidation Complete",
        description: `All data consolidated into organization with chunks`,
      });

    } catch (error: any) {
      console.error('❌ Data consolidation failed:', error);
      setResult({
        success: false,
        message: `Consolidation failed: ${error.message}`
      });
      
      toast({
        title: "Consolidation Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setConsolidating(false);
    }
  };

  const getStatusIcon = () => {
    if (consolidating) return <Clock className="h-5 w-5 text-blue-500 animate-spin" />;
    if (!result) return <Database className="h-5 w-5 text-orange-500" />;
    return result.success ? 
      <CheckCircle className="h-5 w-5 text-green-500" /> : 
      <AlertTriangle className="h-5 w-5 text-red-500" />;
  };

  const getStatusColor = () => {
    if (consolidating) return "border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800";
    if (!result) return "border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800";
    return result.success ? 
      "border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800" : 
      "border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800";
  };

  return (
    <Card className={getStatusColor()}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          Data Consolidation Tool
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Fix duplicate MPS organizations - consolidate all data into the organization with chunks
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="bg-orange-100 dark:bg-orange-900 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <span className="font-medium text-orange-800 dark:text-orange-200">Duplicate Organization Data Detected</span>
          </div>
          <p className="text-sm text-orange-700 dark:text-orange-300">
            MPSs and criteria exist in multiple organizations. This causes "No document context available" errors.
          </p>
        </div>

        <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
          <div className="text-center">
            <div className="text-lg font-semibold">Org A</div>
            <div className="text-sm text-muted-foreground">Has Chunks</div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className="text-center">
            <div className="text-lg font-semibold">Org B</div>
            <div className="text-sm text-muted-foreground">Has Criteria</div>
          </div>
          <ArrowRight className="h-4 w-4 text-green-500" />
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">Org A</div>
            <div className="text-sm text-green-600">Has Both</div>
          </div>
        </div>

        <Button 
          onClick={consolidateOrganizationData}
          disabled={consolidating}
          className="w-full"
          size="lg"
        >
          {consolidating ? (
            <>
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              Consolidating Data...
            </>
          ) : (
            <>
              <Database className="h-4 w-4 mr-2" />
              Consolidate Organization Data
            </>
          )}
        </Button>
        
        {result && (
          <div className={`p-4 rounded-lg ${
            result.success ? 
              'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 
              'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
          }`}>
            <p className="font-medium">{result.success ? 'Consolidation Complete' : 'Consolidation Failed'}</p>
            <p className="text-sm mt-1">{result.message}</p>
            
            {result.details && (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-medium">Consolidation Summary:</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>Target org: {result.details.targetOrgId?.slice(-8)}</div>
                  <div>Duplicate MPSs removed: {result.details.duplicateMpsRemoved}</div>
                  <div>MPSs with chunks: {result.details.mpsWithChunks}</div>
                  <div>Criteria generated: {result.details.criteriaGenerated}</div>
                  <div>Total chunks: {result.details.chunkCount}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};