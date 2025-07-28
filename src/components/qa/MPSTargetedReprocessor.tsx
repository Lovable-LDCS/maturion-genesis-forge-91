import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, FileText, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { useToast } from '@/hooks/use-toast';

interface MPSTargetedReprocessorProps {
  mpsNumber: number;
  mpsTitle: string;
}

interface ChunkAnalysis {
  documentId: string;
  documentName: string;
  totalChunks: number;
  validChunks: number;
  largestChunk: number;
  averageChunk: number;
  hasValidContent: boolean;
  samples: string[];
}

export const MPSTargetedReprocessor: React.FC<MPSTargetedReprocessorProps> = ({
  mpsNumber,
  mpsTitle
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [analysis, setAnalysis] = useState<ChunkAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();

  const analyzeCurrentChunks = async () => {
    if (!currentOrganization?.id) return;
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      console.log(`🔍 Analyzing chunks for MPS ${mpsNumber}`);
      
      // Search for existing chunks
      const contextSearch = await supabase.functions.invoke('search-ai-context', {
        body: {
          query: `MPS ${mpsNumber}`,
          organizationId: currentOrganization.id,
          documentTypes: ['mps_document', 'mps', 'standard'],
          limit: 20,
          threshold: 0.1, // Very low threshold to catch everything
          mpsNumber: mpsNumber
        }
      });
      
      if (contextSearch.error) {
        throw new Error(`Search failed: ${contextSearch.error.message}`);
      }
      
      const chunks = contextSearch.data?.results || [];
      console.log(`📊 Found ${chunks.length} chunks for analysis`);
      
      if (chunks.length === 0) {
        setAnalysis({
          documentId: '',
          documentName: `MPS ${mpsNumber} - No document found`,
          totalChunks: 0,
          validChunks: 0,
          largestChunk: 0,
          averageChunk: 0,
          hasValidContent: false,
          samples: ['No chunks found - document may not be processed yet']
        });
        return;
      }
      
      // Analyze chunk quality
      const validChunks = chunks.filter(chunk => (chunk.content?.length || 0) >= 1500);
      const chunkSizes = chunks.map(chunk => chunk.content?.length || 0);
      const largestChunk = Math.max(...chunkSizes);
      const averageChunk = chunkSizes.reduce((a, b) => a + b, 0) / chunkSizes.length;
      
      const samples = chunks.slice(0, 3).map((chunk, index) => 
        `CHUNK ${index + 1} (${chunk.content?.length || 0} chars): ${(chunk.content || '').slice(0, 200)}...`
      );
      
      setAnalysis({
        documentId: chunks[0]?.document_id || '',
        documentName: chunks[0]?.document_name || `MPS ${mpsNumber}`,
        totalChunks: chunks.length,
        validChunks: validChunks.length,
        largestChunk,
        averageChunk: Math.round(averageChunk),
        hasValidContent: validChunks.length > 0,
        samples
      });
      
      console.log(`📋 Analysis complete:`, {
        totalChunks: chunks.length,
        validChunks: validChunks.length,
        largestChunk,
        averageChunk: Math.round(averageChunk)
      });
      
    } catch (error: any) {
      console.error('Analysis failed:', error);
      setError(error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const forceReprocessDocument = async () => {
    if (!currentOrganization?.id || !analysis?.documentId) return;
    
    setIsReprocessing(true);
    setError(null);
    
    try {
      console.log(`🔧 Force reprocessing MPS ${mpsNumber} document`);
      
      // First, get the document details
      const { data: document, error: docError } = await supabase
        .from('ai_documents')
        .select('*')
        .eq('id', analysis.documentId)
        .single();
        
      if (docError || !document) {
        throw new Error('Document not found for reprocessing');
      }
      
      console.log(`📄 Found document: ${document.title} (${document.file_name})`);
      
      // Reset the document for reprocessing
      const resetResult = await supabase.functions.invoke('reset-failed-document', {
        body: { documentId: analysis.documentId }
      });
      
      if (resetResult.error) {
        throw new Error(`Reset failed: ${resetResult.error.message}`);
      }
      
      console.log(`✅ Document reset successfully`);
      
      // Trigger reprocessing
      const processResult = await supabase.functions.invoke('process-ai-document', {
        body: {
          documentId: analysis.documentId,
          organizationId: currentOrganization.id,
          forceReprocess: true,
          targetChunkSize: 1500, // Ensure larger chunks
          minChunkSize: 800,     // Minimum viable chunk size
          overlapSize: 200       // Good overlap for context
        }
      });
      
      if (processResult.error) {
        throw new Error(`Reprocessing failed: ${processResult.error.message}`);
      }
      
      console.log(`✅ Reprocessing initiated successfully`);
      
      toast({
        title: "Reprocessing Started",
        description: `MPS ${mpsNumber} document is being reprocessed with enhanced chunking.`,
      });
      
      // Wait a moment then re-analyze
      setTimeout(() => {
        analyzeCurrentChunks();
      }, 3000);
      
    } catch (error: any) {
      console.error('Reprocessing failed:', error);
      setError(error.message);
      toast({
        title: "Reprocessing Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsReprocessing(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          🔧 MPS {mpsNumber} Targeted Reprocessor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={analyzeCurrentChunks} 
            disabled={isAnalyzing}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isAnalyzing ? 'animate-spin' : ''}`} />
            {isAnalyzing ? 'Analyzing...' : 'Analyze Chunks'}
          </Button>
          
          {analysis && !analysis.hasValidContent && (
            <Button 
              onClick={forceReprocessDocument} 
              disabled={isReprocessing || !analysis.documentId}
              variant="default"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isReprocessing ? 'animate-spin' : ''}`} />
              {isReprocessing ? 'Reprocessing...' : 'Force Reprocess'}
            </Button>
          )}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Error:</strong> {error}
            </AlertDescription>
          </Alert>
        )}

        {analysis && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{analysis.totalChunks}</div>
                <div className="text-sm text-muted-foreground">Total Chunks</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-green-600">{analysis.validChunks}</div>
                <div className="text-sm text-muted-foreground">Valid (≥1500)</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{analysis.largestChunk}</div>
                <div className="text-sm text-muted-foreground">Largest Chunk</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{analysis.averageChunk}</div>
                <div className="text-sm text-muted-foreground">Average Size</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={analysis.hasValidContent ? "default" : "destructive"}>
                {analysis.hasValidContent ? (
                  <><CheckCircle className="h-3 w-3 mr-1" /> Ready for AI</>
                ) : (
                  <><XCircle className="h-3 w-3 mr-1" /> Needs Reprocessing</>
                )}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Document: {analysis.documentName}
              </span>
            </div>

            {analysis.samples.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Chunk Samples:</h4>
                <div className="space-y-2">
                  {analysis.samples.map((sample, index) => (
                    <div key={index} className="text-xs bg-muted p-2 rounded font-mono">
                      {sample}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!analysis.hasValidContent && analysis.totalChunks > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Issue Detected:</strong> All chunks are below 1500 characters. 
                  This suggests the document was chunked too aggressively. 
                  Click "Force Reprocess" to rechunk with larger segments.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};