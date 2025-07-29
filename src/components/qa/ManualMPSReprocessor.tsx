import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ProcessingLog {
  timestamp: string;
  documentTitle: string;
  status: 'processing' | 'success' | 'error';
  message: string;
  chunks?: number;
}

export const ManualMPSReprocessor: React.FC = () => {
  const [processing, setProcessing] = useState(false);
  const [logs, setLogs] = useState<ProcessingLog[]>([]);
  const [currentDocument, setCurrentDocument] = useState<string>('');
  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const addLog = (log: ProcessingLog) => {
    setLogs(prev => [...prev, log]);
  };

  const processWithTimeout = async (documentId: string, title: string, timeout = 90000) => {
    return Promise.race([
      supabase.functions.invoke('process-ai-document', {
        body: { documentId }
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Processing timeout')), timeout)
      )
    ]);
  };

  const reprocessMPSDocuments = async () => {
    setProcessing(true);
    setLogs([]);
    setProcessedCount(0);
    setTotalCount(0);
    
    try {
      // Get all pending MPS documents
      const { data: mpsDocuments, error: fetchError } = await supabase
        .from('ai_documents')
        .select('id, title, file_name, processing_status')
        .eq('document_type', 'mps_document')
        .eq('processing_status', 'pending')
        .order('file_name');

      if (fetchError) throw fetchError;

      if (!mpsDocuments || mpsDocuments.length === 0) {
        toast({
          title: "No pending MPS documents",
          description: "All MPS documents have been processed or there are none in pending status",
        });
        return;
      }

      setTotalCount(mpsDocuments.length);
      
      addLog({
        timestamp: new Date().toLocaleTimeString(),
        documentTitle: 'System',
        status: 'processing',
        message: `Found ${mpsDocuments.length} pending MPS documents. Starting enhanced Mammoth.js reprocessing...`
      });

      let successful = 0;
      let failed = 0;

      // Process MPS 1 and MPS 4 first (user requested these specifically)
      const priorityDocs = mpsDocuments.filter(doc => 
        doc.title.includes('MPS 1 –') || doc.title.includes('MPS 4 –')
      );
      const otherDocs = mpsDocuments.filter(doc => 
        !doc.title.includes('MPS 1 –') && !doc.title.includes('MPS 4 –')
      );
      
      const processingOrder = [...priorityDocs, ...otherDocs];

      for (const doc of processingOrder) {
        setCurrentDocument(doc.title);
        
        addLog({
          timestamp: new Date().toLocaleTimeString(),
          documentTitle: doc.title,
          status: 'processing',
          message: 'Starting enhanced Mammoth.js extraction...'
        });

        try {
          const result = await processWithTimeout(doc.id, doc.title) as any;

          if (result.error) {
            addLog({
              timestamp: new Date().toLocaleTimeString(),
              documentTitle: doc.title,
              status: 'error',
              message: `Processing failed: ${result.error.message || result.error}`
            });
            failed++;
          } else {
            // Check final status and chunks
            const { data: finalDoc } = await supabase
              .from('ai_documents')
              .select('processing_status, total_chunks')
              .eq('id', doc.id)
              .single();

            const chunks = finalDoc?.total_chunks || 0;
            
            if (chunks > 0) {
              addLog({
                timestamp: new Date().toLocaleTimeString(),
                documentTitle: doc.title,
                status: 'success',
                message: `✅ Success! Created ${chunks} clean chunks with Mammoth.js`,
                chunks
              });
              successful++;
            } else {
              addLog({
                timestamp: new Date().toLocaleTimeString(),
                documentTitle: doc.title,
                status: 'error',
                message: 'Processing completed but no valid chunks created'
              });
              failed++;
            }
          }

          setProcessedCount(prev => prev + 1);
          
          // Small delay between requests to avoid overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error: any) {
          addLog({
            timestamp: new Date().toLocaleTimeString(),
            documentTitle: doc.title,
            status: 'error',
            message: `Processing failed: ${error.message || 'Unknown error'}`
          });
          
          failed++;
          setProcessedCount(prev => prev + 1);
        }
      }

      addLog({
        timestamp: new Date().toLocaleTimeString(),
        documentTitle: 'System',
        status: successful > failed ? 'success' : 'error',
        message: `🎯 Enhanced Mammoth.js reprocessing complete! ✅ ${successful} successful, ❌ ${failed} failed`
      });

      toast({
        title: "MPS Reprocessing Complete",
        description: `✅ ${successful} documents processed successfully, ❌ ${failed} failed`,
        variant: successful > 0 ? "default" : "destructive"
      });

    } catch (error: any) {
      addLog({
        timestamp: new Date().toLocaleTimeString(),
        documentTitle: 'System',
        status: 'error',
        message: `System error: ${error.message || 'Failed to start reprocessing'}`
      });
      
      toast({
        title: "Reprocessing Failed",
        description: error.message || "Failed to trigger MPS reprocessing",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
      setCurrentDocument('');
    }
  };

  const getStatusIcon = (status: ProcessingLog['status']) => {
    switch (status) {
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Manual MPS Reprocessor
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Manually trigger reprocessing of all pending MPS documents using enhanced Mammoth.js pipeline
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress Indicator */}
        {processing && totalCount > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress: {processedCount}/{totalCount}</span>
              <span>{Math.round((processedCount / totalCount) * 100)}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300" 
                style={{ width: `${(processedCount / totalCount) * 100}%` }}
              />
            </div>
            {currentDocument && (
              <p className="text-sm text-muted-foreground">
                Currently processing: <strong>{currentDocument}</strong>
              </p>
            )}
          </div>
        )}
        
        {/* Control Button */}
        <Button 
          onClick={reprocessMPSDocuments}
          disabled={processing}
          className="w-full"
          size="lg"
        >
          {processing ? (
            <>
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              Reprocessing MPS Documents...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Start MPS Reprocessing
            </>
          )}
        </Button>
        
        {/* Real-time Logs */}
        {logs.length > 0 && (
          <Card className="border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Reprocessing Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64 w-full">
                <div className="space-y-2">
                  {logs.map((log, index) => (
                    <div 
                      key={index}
                      className={`flex items-start gap-2 p-2 rounded text-sm ${
                        log.status === 'success' ? 'bg-green-50 dark:bg-green-950' :
                        log.status === 'error' ? 'bg-red-50 dark:bg-red-950' :
                        'bg-blue-50 dark:bg-blue-950'
                      }`}
                    >
                      {getStatusIcon(log.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <span className="font-medium truncate">
                            {log.documentTitle}
                          </span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {log.timestamp}
                          </span>
                        </div>
                        <p className="text-xs mt-1">{log.message}</p>
                        {log.chunks !== undefined && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Chunks: {log.chunks}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};