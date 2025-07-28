import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, AlertTriangle, CheckCircle2, FileText, Database } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ReprocessingStatus {
  status: 'idle' | 'fetching' | 'processing' | 'completed' | 'error';
  total: number;
  processed: number;
  errors: string[];
  results: Array<{
    documentId: string;
    fileName: string;
    success: boolean;
    chunksCreated?: number;
    error?: string;
  }>;
}

export const MPSDocumentReprocessor: React.FC = () => {
  const { toast } = useToast();
  const [reprocessing, setReprocessing] = useState<ReprocessingStatus>({
    status: 'idle',
    total: 0,
    processed: 0,
    errors: [],
    results: []
  });

  const resetMPSDocuments = async () => {
    try {
      console.log('🔄 Starting MPS document reset...');
      
      const { data, error } = await supabase.rpc('reset_my_mps_documents');
      
      if (error) {
        console.error('❌ Reset failed:', error);
        throw error;
      }
      
      console.log('✅ Reset result:', data);
      
      // Type-safe data access
      const resetResult = data as any;
      
      if (resetResult?.success) {
        toast({
          title: "MPS Documents Reset",
          description: `Successfully reset ${resetResult.documents_reset} documents and cleared ${resetResult.criteria_cleared} criteria.`,
        });
      } else {
        throw new Error(resetResult?.error || 'Reset failed');
      }
      
      return resetResult;
    } catch (error: any) {
      console.error('❌ Reset error:', error);
      toast({
        title: "Reset Failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const reprocessAllMPSDocuments = async () => {
    setReprocessing({
      status: 'fetching',
      total: 0,
      processed: 0,
      errors: [],
      results: []
    });

    try {
      // First, reset all MPS documents to remove placeholder chunks
      console.log('🗑️ Resetting existing MPS documents...');
      await resetMPSDocuments();

      // Get all MPS documents that need reprocessing
      const { data: documents, error: fetchError } = await supabase
        .from('ai_documents')
        .select('id, file_name, document_type, processing_status')
        .eq('document_type', 'mps_document')
        .in('processing_status', ['pending', 'failed', 'completed']);

      if (fetchError) {
        throw new Error(`Failed to fetch documents: ${fetchError.message}`);
      }

      if (!documents || documents.length === 0) {
        toast({
          title: "No Documents Found",
          description: "No MPS documents found for reprocessing.",
          variant: "destructive",
        });
        setReprocessing(prev => ({ ...prev, status: 'idle' }));
        return;
      }

      console.log(`📄 Found ${documents.length} MPS documents to reprocess`);

      setReprocessing(prev => ({
        ...prev,
        status: 'processing',
        total: documents.length
      }));

      const results: ReprocessingStatus['results'] = [];
      const errors: string[] = [];

      // Process documents sequentially to avoid overwhelming the system
      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        
        try {
          console.log(`🔄 Processing document ${i + 1}/${documents.length}: ${doc.file_name}`);
          
          // Call the process-ai-document edge function
          const { data, error } = await supabase.functions.invoke('process-ai-document', {
            body: { documentId: doc.id }
          });

          if (error) {
            console.error(`❌ Processing failed for ${doc.file_name}:`, error);
            throw error;
          }

          const result = data;
          
          if (result?.success) {
            console.log(`✅ Successfully processed ${doc.file_name}: ${result.chunks_created} chunks created`);
            results.push({
              documentId: doc.id,
              fileName: doc.file_name,
              success: true,
              chunksCreated: result.chunks_created
            });
          } else {
            const errorMsg = result?.error || 'Unknown processing error';
            console.error(`❌ Processing failed for ${doc.file_name}:`, errorMsg);
            errors.push(`${doc.file_name}: ${errorMsg}`);
            results.push({
              documentId: doc.id,
              fileName: doc.file_name,
              success: false,
              error: errorMsg
            });
          }
        } catch (error: any) {
          console.error(`❌ Error processing ${doc.file_name}:`, error);
          const errorMsg = error.message || 'Processing failed';
          errors.push(`${doc.file_name}: ${errorMsg}`);
          results.push({
            documentId: doc.id,
            fileName: doc.file_name,
            success: false,
            error: errorMsg
          });
        }

        // Update progress
        setReprocessing(prev => ({
          ...prev,
          processed: i + 1,
          results: [...results],
          errors: [...errors]
        }));

        // Small delay between documents to prevent overwhelming the system
        if (i < documents.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      setReprocessing(prev => ({
        ...prev,
        status: 'completed'
      }));

      toast({
        title: "Reprocessing Complete",
        description: `Successfully processed ${successCount} documents. ${failureCount} failed.`,
        variant: failureCount > 0 ? "destructive" : "default",
      });

    } catch (error: any) {
      console.error('❌ Reprocessing failed:', error);
      setReprocessing(prev => ({
        ...prev,
        status: 'error',
        errors: [...prev.errors, error.message]
      }));
      
      toast({
        title: "Reprocessing Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getProgressPercentage = () => {
    if (reprocessing.total === 0) return 0;
    return (reprocessing.processed / reprocessing.total) * 100;
  };

  const resetToIdle = () => {
    setReprocessing({
      status: 'idle',
      total: 0,
      processed: 0,
      errors: [],
      results: []
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          MPS Document Reprocessor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This tool will reprocess all MPS documents with improved content chunking (1500 char chunks vs previous 300 char chunks) 
            and fix embedding format issues. This will clear existing placeholder chunks and regenerate with full document content.
          </AlertDescription>
        </Alert>

        {reprocessing.status === 'idle' && (
          <div className="space-y-4">
            <Button 
              onClick={reprocessAllMPSDocuments}
              className="w-full"
              size="lg"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reprocess All MPS Documents
            </Button>
          </div>
        )}

        {(reprocessing.status === 'fetching' || reprocessing.status === 'processing') && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>
                {reprocessing.status === 'fetching' ? 'Fetching documents...' : 
                 `Processing ${reprocessing.processed}/${reprocessing.total} documents...`}
              </span>
            </div>
            
            {reprocessing.total > 0 && (
              <Progress value={getProgressPercentage()} className="w-full" />
            )}

            {reprocessing.results.length > 0 && (
              <div className="max-h-40 overflow-y-auto space-y-1">
                {reprocessing.results.map((result, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    {result.success ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="truncate">
                      {result.fileName}
                      {result.success && result.chunksCreated && ` (${result.chunksCreated} chunks)`}
                      {!result.success && result.error && ` - ${result.error}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {reprocessing.status === 'completed' && (
          <div className="space-y-4">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Reprocessing completed! 
                Successful: {reprocessing.results.filter(r => r.success).length} | 
                Failed: {reprocessing.results.filter(r => !r.success).length}
              </AlertDescription>
            </Alert>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {reprocessing.results.map((result, index) => (
                <div key={index} className="flex items-start gap-2 p-2 border rounded">
                  {result.success ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{result.fileName}</div>
                    {result.success && result.chunksCreated && (
                      <div className="text-sm text-green-600">
                        ✅ {result.chunksCreated} chunks created with full content
                      </div>
                    )}
                    {!result.success && result.error && (
                      <div className="text-sm text-red-600">
                        ❌ {result.error}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <Button onClick={resetToIdle} variant="outline" className="w-full">
              Reset
            </Button>
          </div>
        )}

        {reprocessing.status === 'error' && (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Reprocessing failed. Check the errors below.
              </AlertDescription>
            </Alert>

            {reprocessing.errors.length > 0 && (
              <div className="max-h-40 overflow-y-auto space-y-1">
                {reprocessing.errors.map((error, index) => (
                  <div key={index} className="text-sm text-red-600 p-2 bg-red-50 rounded">
                    {error}
                  </div>
                ))}
              </div>
            )}

            <Button onClick={resetToIdle} variant="outline" className="w-full">
              Reset
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};