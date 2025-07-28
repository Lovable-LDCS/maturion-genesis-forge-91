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
  isCorrupted: boolean;
  corruptionType?: 'xml_artifacts' | 'binary_data' | 'encoding_error' | 'metadata_only';
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
  const [recoveryInProgress, setRecoveryInProgress] = useState(false);
  const [recoveryComplete, setRecoveryComplete] = useState(false);
  
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();

  // 🔍 Corruption Detection Function
  const detectCorruption = (content: string): { isCorrupted: boolean; corruptionType?: string } => {
    if (!content || content.length < 10) return { isCorrupted: true, corruptionType: 'metadata_only' };
    
    // Check for XML artifacts
    if (content.includes('_rels/') || content.includes('customXml/') || content.includes('word/_rels') || 
        content.includes('.xml.rels') || content.includes('tomXml/')) {
      return { isCorrupted: true, corruptionType: 'xml_artifacts' };
    }
    
    // Check for binary data (excessive non-printable characters)
    const binaryCharCount = (content.match(/[\x00-\x08\x0E-\x1F\x7F-\xFF]/g) || []).length;
    const binaryRatio = binaryCharCount / content.length;
    if (binaryRatio > 0.3) {
      return { isCorrupted: true, corruptionType: 'binary_data' };
    }
    
    // Check for encoding errors (excessive ? characters and garbled patterns)
    const questionMarkCount = (content.match(/\?/g) || []).length;
    const questionMarkRatio = questionMarkCount / content.length;
    if (questionMarkRatio > 0.2 && content.includes('\\\\\\\\')) {
      return { isCorrupted: true, corruptionType: 'encoding_error' };
    }
    
    return { isCorrupted: false };
  };

  const analyzeCurrentChunks = async () => {
    if (!currentOrganization?.id) return;
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      console.log(`🔍 Analyzing chunks for MPS ${mpsNumber} with corruption detection`);
      
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
          isCorrupted: false,
          samples: ['No chunks found - document may not be processed yet']
        });
        return;
      }
      
      // Enhanced chunk analysis with corruption detection
      let corruptedChunks = 0;
      let detectedCorruptionType: string | undefined;
      
      const validChunks = chunks.filter(chunk => {
        const content = chunk.content || '';
        const corruption = detectCorruption(content);
        
        if (corruption.isCorrupted) {
          corruptedChunks++;
          if (!detectedCorruptionType) detectedCorruptionType = corruption.corruptionType;
          console.log(`🚨 CORRUPTION DETECTED in chunk:`, {
            type: corruption.corruptionType,
            contentLength: content.length,
            sample: content.slice(0, 100)
          });
        }
        
        return content.length >= 1500 && !corruption.isCorrupted;
      });
      
      const chunkSizes = chunks.map(chunk => chunk.content?.length || 0);
      const largestChunk = Math.max(...chunkSizes);
      const averageChunk = chunkSizes.reduce((a, b) => a + b, 0) / chunkSizes.length;
      
      const samples = chunks.slice(0, 3).map((chunk, index) => {
        const content = chunk.content || '';
        const corruption = detectCorruption(content);
        const corruptionNote = corruption.isCorrupted ? ` [CORRUPTED: ${corruption.corruptionType}]` : '';
        return `CHUNK ${index + 1} (${content.length} chars)${corruptionNote}: ${content.slice(0, 200)}...`;
      });
      
      const isCorrupted = corruptedChunks > 0;
      
      setAnalysis({
        documentId: chunks[0]?.document_id || '',
        documentName: chunks[0]?.document_name || `MPS ${mpsNumber}`,
        totalChunks: chunks.length,
        validChunks: validChunks.length,
        largestChunk,
        averageChunk: Math.round(averageChunk),
        hasValidContent: validChunks.length > 0 && !isCorrupted,
        isCorrupted,
        corruptionType: detectedCorruptionType as any,
        samples
      });
      
      console.log(`📋 Analysis complete:`, {
        totalChunks: chunks.length,
        validChunks: validChunks.length,
        corruptedChunks,
        detectedCorruptionType,
        largestChunk,
        averageChunk: Math.round(averageChunk)
      });

      // 🔧 Auto-trigger corruption recovery if all chunks are corrupted
      if (isCorrupted && validChunks.length === 0 && chunks.length > 0 && !recoveryInProgress && !recoveryComplete) {
        console.log(`🚨 ALL CHUNKS CORRUPTED - Auto-triggering recovery for MPS ${mpsNumber}`);
        toast({
          title: "Auto-Recovery Initiated",
          description: `Detected ${corruptedChunks} corrupted chunks. Starting automatic cleaning process...`,
        });
        setRecoveryInProgress(true);
        setTimeout(() => {
          triggerFullCorruptionRecovery();
        }, 1000);
      }
      
    } catch (error: any) {
      console.error('Analysis failed:', error);
      setError(error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 🔄 Step 1: Forced Deletion of Corrupted Chunks
  const forceDeleteCorruptedChunks = async () => {
    if (!currentOrganization?.id || !analysis?.documentId) return;
    
    setIsReprocessing(true);
    setError(null);
    
    try {
      console.log(`🗑️ Force deleting corrupted chunks for MPS ${mpsNumber}`);
      
      // Delete corrupted chunks via direct SQL
      const deleteResult = await supabase.functions.invoke('delete-corrupted-chunks', {
        body: {
          documentId: analysis.documentId,
          organizationId: currentOrganization.id,
          mpsNumber: mpsNumber
        }
      });
      
      if (deleteResult.error) {
        throw new Error(`Chunk deletion failed: ${deleteResult.error.message}`);
      }
      
      console.log(`✅ Corrupted chunks deleted successfully`);
      
      toast({
        title: "Corrupted Chunks Cleared",
        description: `Deleted corrupted chunks for MPS ${mpsNumber}. Ready for clean reprocessing.`,
      });
      
      // Re-analyze to confirm deletion
      setTimeout(() => {
        analyzeCurrentChunks();
      }, 1000);
      
    } catch (error: any) {
      console.error('Chunk deletion failed:', error);
      setError(error.message);
      toast({
        title: "Deletion Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsReprocessing(false);
    }
  };

  // 🔧 Full Automatic Corruption Recovery Flow
  const triggerFullCorruptionRecovery = async () => {
    if (!currentOrganization?.id || !analysis?.documentId) return;
    
    try {
      console.log(`🚨 Starting automatic corruption recovery for MPS ${mpsNumber}`);
      
      // Step 1: Clear corrupted data
      await forceDeleteCorruptedChunks();
      
      // Step 2: Wait and then reprocess
      setTimeout(async () => {
        await forceReprocessDocument();
        setRecoveryComplete(true);
        
        // Step 3: Final analysis after recovery
        setTimeout(() => {
          analyzeCurrentChunks();
          setRecoveryInProgress(false);
        }, 6000);
      }, 2000);
      
    } catch (error: any) {
      console.error('Automatic recovery failed:', error);
      setError(`Automatic recovery failed: ${error.message}`);
      setRecoveryInProgress(false);
    }
  };

  const forceReprocessDocument = async () => {
    if (!currentOrganization?.id || !analysis?.documentId) return;
    
    setIsReprocessing(true);
    setError(null);
    
    try {
      console.log(`🔧 Force reprocessing MPS ${mpsNumber} document with corruption recovery`);
      
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
      
      // Reset the document for reprocessing (clears existing chunks)
      const resetResult = await supabase.functions.invoke('reset-failed-document', {
        body: { documentId: analysis.documentId }
      });
      
      if (resetResult.error) {
        throw new Error(`Reset failed: ${resetResult.error.message}`);
      }
      
      console.log(`✅ Document reset successfully`);
      
      // Trigger enhanced reprocessing with corruption protection
      const processResult = await supabase.functions.invoke('process-ai-document', {
        body: {
          documentId: analysis.documentId,
          organizationId: currentOrganization.id,
          forceReprocess: true,
          corruptionRecovery: true,    // Enable corruption recovery mode
          targetChunkSize: 1500,       // Target 1200-1500 characters as requested
          minChunkSize: 800,           // Minimum viable chunk size
          overlapSize: 200,            // Good overlap for context
          validateTextOnly: true       // Ensure only text content is processed
        }
      });
      
      if (processResult.error) {
        // Check if corruption is beyond recovery
        if (processResult.error.message?.includes('Corruption detected') || 
            processResult.error.message?.includes('XML artifacts') ||
            processResult.error.message?.includes('binary ratio')) {
          
          console.error(`🚨 Document source corrupted beyond recovery: ${processResult.error.message}`);
          
          // Update document metadata to flag corruption recovery attempt
          await supabase
            .from('ai_documents')
            .update({
              metadata: {
                ...analysis.documentId ? {} : {},
                corruptionRecoveryAttempted: true,
                corruptionRecoveryFailed: true,
                corruptionType: processResult.error.message.includes('XML') ? 'xml_artifacts' : 'binary_corruption',
                lastRecoveryAttempt: new Date().toISOString()
              }
            })
            .eq('id', analysis.documentId);
          
          setError(`Document source corrupted beyond recovery – replacement required. ${processResult.error.message}`);
          
          toast({
            title: "Recovery Failed",
            description: "Document source is corrupted beyond recovery. Please upload a new, clean version of the MPS document.",
            variant: "destructive"
          });
          
          return;
        }
        
        throw new Error(`Reprocessing failed: ${processResult.error.message}`);
      }
      
      console.log(`✅ Corruption recovery reprocessing initiated successfully`);
      
      // Update document metadata to flag successful recovery attempt
      await supabase
        .from('ai_documents')
        .update({
          metadata: {
            corruptionRecoveryAttempted: true,
            corruptionRecoverySucceeded: true,
            recoveryTimestamp: new Date().toISOString(),
            recoveryMethod: 'validateTextOnly',
            targetChunkSize: 1500,
            minChunkSize: 800
          }
        })
        .eq('id', analysis.documentId);

      toast({
        title: "Corruption Recovery Started",
        description: `MPS ${mpsNumber} document is being reprocessed with enhanced text extraction and corruption protection.`,
      });
      
      // Wait longer for corruption recovery processing
      setTimeout(() => {
        analyzeCurrentChunks();
      }, 5000);
      
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
        <div className="flex gap-2 flex-wrap">
          <Button 
            onClick={analyzeCurrentChunks} 
            disabled={isAnalyzing || recoveryInProgress}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isAnalyzing ? 'animate-spin' : ''}`} />
            {isAnalyzing ? 'Analyzing...' : 'Analyze Chunks'}
          </Button>
          
          {/* 🔧 Force Auto-Recovery Button */}
          {mpsNumber === 1 && !recoveryInProgress && !recoveryComplete && (
            <Button 
              onClick={() => {
                console.log('🚨 Force triggering corruption recovery for MPS 1');
                setRecoveryInProgress(true);
                triggerFullCorruptionRecovery();
              }} 
              disabled={isReprocessing}
              variant="default"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isReprocessing ? 'animate-spin' : ''}`} />
              Force Recovery Now
            </Button>
          )}
          
          {analysis?.isCorrupted && !recoveryInProgress && (
            <Button 
              onClick={forceDeleteCorruptedChunks} 
              disabled={isReprocessing}
              variant="destructive"
              size="sm"
            >
              <XCircle className={`h-4 w-4 mr-2 ${isReprocessing ? 'animate-spin' : ''}`} />
              Clear Corrupted Data
            </Button>
          )}
          
          {analysis && !analysis.hasValidContent && !analysis.isCorrupted && (
            <Button 
              onClick={forceReprocessDocument} 
              disabled={isReprocessing || !analysis.documentId}
              variant="secondary"
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

        {/* 🔄 Recovery Progress Status */}
        {recoveryInProgress && (
          <Alert className="border-blue-200 bg-blue-50">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <AlertDescription>
              <strong>🔄 Automatic Recovery in Progress:</strong> Clearing corrupted data and triggering enhanced reprocessing...
              <div className="mt-2 text-sm">This may take 10-15 seconds to complete.</div>
            </AlertDescription>
          </Alert>
        )}

        {/* 📦 Recovery Completion Confirmation */}
        {recoveryComplete && analysis && !recoveryInProgress && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>✅ Recovery Complete:</strong> {analysis.totalChunks} chunks recreated (avg: {analysis.averageChunk} chars)
              <div className="mt-2 text-sm">
                Status: {analysis.hasValidContent ? '🟢 Ready for AI Generation' : '🟡 Manual review required'}
                <br />
                Preview: {analysis.samples[0]?.slice(0, 200) || 'No content preview available'}...
              </div>
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

            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={analysis.hasValidContent ? "default" : "destructive"}>
                {analysis.hasValidContent ? (
                  <><CheckCircle className="h-3 w-3 mr-1" /> Ready for AI</>
                ) : (
                  <><XCircle className="h-3 w-3 mr-1" /> Needs Reprocessing</>
                )}
              </Badge>
              
              {analysis.isCorrupted && (
                <Badge variant="destructive" className="bg-red-600">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  CORRUPTED: {analysis.corruptionType?.replace('_', ' ').toUpperCase()}
                </Badge>
              )}
              
              <span className="text-sm text-muted-foreground">
                Document: {analysis.documentName}
              </span>
            </div>

            {/* 🚨 Corruption-Specific Alerts */}
            {analysis.isCorrupted && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>🚨 Data Corruption Detected:</strong> The chunks contain {analysis.corruptionType === 'xml_artifacts' ? 'XML metadata' : 
                    analysis.corruptionType === 'binary_data' ? 'binary data' : 
                    analysis.corruptionType === 'encoding_error' ? 'encoding errors' : 'invalid content'} 
                  instead of readable text. 
                  <br />
                  <strong>Required Action:</strong> Clear corrupted data and run corruption recovery to extract clean text from the source document.
                </AlertDescription>
              </Alert>
            )}

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