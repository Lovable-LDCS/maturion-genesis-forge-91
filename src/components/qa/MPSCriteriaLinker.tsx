import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle, CheckCircle, Zap, Clock, FileText } from 'lucide-react';

interface MPSCriteriaStatus {
  mpsNumber: number;
  mpsName: string;
  hasChunks: boolean;
  hasCriteria: boolean;
  status: 'ready' | 'missing_chunks' | 'has_criteria' | 'failed';
}

export const MPSCriteriaLinker: React.FC = () => {
  const [linking, setLinking] = useState(false);
  const [result, setResult] = useState<{ 
    success: boolean; 
    message: string; 
    mpsStatuses?: MPSCriteriaStatus[];
    generated?: number;
  } | null>(null);
  const { toast } = useToast();

  const linkMPSDocumentsToCriteria = async () => {
    setLinking(true);
    setResult(null);

    try {
      console.log('🔗 Starting MPS-to-Criteria linkage validation and generation...');

      // Step 1: Check the current state of MPS documents, chunks, and criteria
      const { data: mpsStatus, error: statusError } = await supabase
        .from('maturity_practice_statements')
        .select(`
          id,
          mps_number,
          name,
          organization_id
        `)
        .order('mps_number');

      if (statusError) {
        throw new Error(`Failed to fetch MPS status: ${statusError.message}`);
      }

      // Step 2: Check chunks and criteria for each MPS
      const mpsStatuses: MPSCriteriaStatus[] = [];
      
      for (const mps of mpsStatus || []) {
        // Check if documents and chunks exist for this MPS
        const { data: chunks, error: chunksError } = await supabase
          .from('ai_document_chunks')
          .select('id')
          .eq('organization_id', mps.organization_id)
          .ilike('ai_documents.title', `%MPS ${mps.mps_number}%`);

        // Check if criteria exist for this MPS
        const { data: criteria, error: criteriaError } = await supabase
          .from('criteria')
          .select('id')
          .eq('mps_id', mps.id);

        const hasChunks = !chunksError && chunks && chunks.length > 0;
        const hasCriteria = !criteriaError && criteria && criteria.length > 0;

        let status: MPSCriteriaStatus['status'] = 'failed';
        if (hasCriteria) {
          status = 'has_criteria';
        } else if (hasChunks) {
          status = 'ready';
        } else {
          status = 'missing_chunks';
        }

        mpsStatuses.push({
          mpsNumber: mps.mps_number,
          mpsName: mps.name,
          hasChunks,
          hasCriteria,
          status
        });
      }

      // Step 3: Identify MPSs that need criteria generation
      const mpsNeedingCriteria = mpsStatuses.filter(mps => mps.status === 'ready');
      
      console.log(`📊 MPS Analysis Complete:
        - Total MPS: ${mpsStatuses.length}
        - Has Criteria: ${mpsStatuses.filter(m => m.hasCriteria).length}
        - Ready for Generation: ${mpsNeedingCriteria.length}
        - Missing Chunks: ${mpsStatuses.filter(m => m.status === 'missing_chunks').length}`);

      if (mpsNeedingCriteria.length === 0) {
        setResult({
          success: true,
          message: `All ${mpsStatuses.length} MPS documents are already linked to criteria. No generation needed.`,
          mpsStatuses,
          generated: 0
        });
        
        toast({
          title: "Linkage Check Complete",
          description: "All MPS documents already have criteria linked.",
        });
        return;
      }

      // Step 4: Generate criteria for MPSs that need them
      let generatedCount = 0;
      
      for (const mpsToGenerate of mpsNeedingCriteria) {
        console.log(`🤖 Generating criteria for MPS ${mpsToGenerate.mpsNumber} - ${mpsToGenerate.mpsName}`);
        
        // Find the MPS record
        const mpsRecord = mpsStatus?.find(m => m.mps_number === mpsToGenerate.mpsNumber);
        if (!mpsRecord) continue;

        try {
          // Trigger criteria generation via the AI function
          const { data: genData, error: genError } = await supabase.functions.invoke('maturion-ai-chat', {
            body: {
              prompt: `Generate criteria for MPS ${mpsToGenerate.mpsNumber} - ${mpsToGenerate.mpsName} based on processed document chunks.`,
              context: `Criteria generation for MPS ${mpsToGenerate.mpsNumber}`,
              organizationId: mpsRecord.organization_id,
              mpsId: mpsRecord.id,
              action: 'generate_criteria_from_chunks'
            }
          });

          if (genError) {
            console.error(`❌ Failed to generate criteria for MPS ${mpsToGenerate.mpsNumber}:`, genError);
          } else {
            console.log(`✅ Successfully generated criteria for MPS ${mpsToGenerate.mpsNumber}`);
            generatedCount++;
          }
        } catch (mpsError: any) {
          console.error(`❌ Error generating criteria for MPS ${mpsToGenerate.mpsNumber}:`, mpsError);
        }
      }

      setResult({
        success: true,
        message: `Successfully linked ${generatedCount}/${mpsNeedingCriteria.length} MPS documents to criteria.`,
        mpsStatuses,
        generated: generatedCount
      });
      
      toast({
        title: "MPS-Criteria Linking Complete",
        description: `Generated criteria for ${generatedCount} MPS documents`,
      });

    } catch (error: any) {
      console.error('❌ MPS-Criteria linking failed:', error);
      setResult({
        success: false,
        message: `Linking failed: ${error.message}`,
        generated: 0
      });
      
      toast({
        title: "Linking Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLinking(false);
    }
  };

  const getStatusIcon = () => {
    if (linking) return <Clock className="h-5 w-5 text-blue-500 animate-spin" />;
    if (!result) return <Zap className="h-5 w-5 text-gray-500" />;
    return result.success ? 
      <CheckCircle className="h-5 w-5 text-green-500" /> : 
      <AlertCircle className="h-5 w-5 text-red-500" />;
  };

  const getStatusColor = () => {
    if (linking) return "border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800";
    if (!result) return "border-gray-200 bg-gray-50 dark:bg-gray-950 dark:border-gray-800";
    return result.success ? 
      "border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800" : 
      "border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800";
  };

  return (
    <Card className={getStatusColor()}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          MPS-Criteria Linker
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Generate missing criteria from processed MPS document chunks for regression testing
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Button 
          onClick={linkMPSDocumentsToCriteria}
          disabled={linking}
          className="w-full"
          size="lg"
        >
          {linking ? (
            <>
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              Generating Criteria...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              Link MPS Documents to Criteria
            </>
          )}
        </Button>
        
        {result && (
          <div className={`p-4 rounded-lg ${
            result.success ? 
              'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 
              'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
          }`}>
            <p className="font-medium">{result.success ? 'Linking Complete' : 'Linking Failed'}</p>
            <p className="text-sm mt-1">{result.message}</p>
            
            {result.mpsStatuses && (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-medium">MPS Status Summary:</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Has Criteria: {result.mpsStatuses.filter(m => m.hasCriteria).length}
                  </div>
                  <div className="flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    Generated: {result.generated || 0}
                  </div>
                  <div className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    Has Chunks: {result.mpsStatuses.filter(m => m.hasChunks).length}
                  </div>
                  <div className="flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Missing: {result.mpsStatuses.filter(m => m.status === 'missing_chunks').length}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};