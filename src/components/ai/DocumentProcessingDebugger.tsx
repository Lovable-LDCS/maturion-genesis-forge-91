import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, CheckCircle, Clock, X } from 'lucide-react';

interface ProcessingLog {
  timestamp: string;
  documentTitle: string;
  status: 'processing' | 'success' | 'error';
  message: string;
  chunks?: number;
}

interface DocumentProcessingDebuggerProps {
  onProcessingComplete?: () => void;
}

export const DocumentProcessingDebugger: React.FC<DocumentProcessingDebuggerProps> = ({
  onProcessingComplete
}) => {
  const [processing, setProcessing] = useState(false);
  const [logs, setLogs] = useState<ProcessingLog[]>([]);
  const [currentDocument, setCurrentDocument] = useState<string>('');
  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const addLog = (log: ProcessingLog) => {
    setLogs(prev => [...prev, log]);
  };

  const clearLogs = () => {
    setLogs([]);
    setCurrentDocument('');
    setProcessedCount(0);
    setTotalCount(0);
  };

  const processWithTimeout = async (documentId: string, title: string, timeout = 60000) => {
    return Promise.race([
      supabase.functions.invoke('process-ai-document', {
        body: { documentId }
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Processing timeout')), timeout)
      )
    ]);
  };

  const triggerProcessing = async () => {
    setProcessing(true);
    clearLogs();
    
    try {
      // Get user's organization first (prioritize primary organization)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      let organizationId;

      // First, check if user owns a primary organization
      const { data: primaryOrg } = await supabase
        .from('organizations')
        .select('id')
        .eq('owner_id', user.id)
        .eq('organization_type', 'primary')
        .maybeSingle();

      if (primaryOrg) {
        organizationId = primaryOrg.id;
        console.log('Using primary organization:', organizationId);
      } else {
        // If no primary org, check if they're a member of a primary organization
        const { data: primaryMember } = await supabase
          .from('organization_members')
          .select('organization_id, organizations!inner(organization_type)')
          .eq('user_id', user.id)
          .eq('organizations.organization_type', 'primary')
          .maybeSingle();

        if (primaryMember) {
          organizationId = primaryMember.organization_id;
          console.log('Using primary organization via membership:', organizationId);
        } else {
          // Fall back to any organization they own
          const { data: anyOwnedOrg } = await supabase
            .from('organizations')
            .select('id')
            .eq('owner_id', user.id)
            .maybeSingle();

          if (anyOwnedOrg) {
            organizationId = anyOwnedOrg.id;
            console.log('Using any owned organization:', organizationId);
          } else {
            // Finally, fall back to any organization they're a member of
            const { data: anyMember } = await supabase
              .from('organization_members')
              .select('organization_id')
              .eq('user_id', user.id)
              .maybeSingle();

            if (anyMember) {
              organizationId = anyMember.organization_id;
              console.log('Using any organization via membership:', organizationId);
            }
          }
        }
      }

      if (!organizationId) {
        throw new Error('User not part of any organization');
      }

      // Get a pending or failed document (try pending first, then failed)
      let pendingDoc;
      
      // First try pending documents
      const { data: pendingData, error: pendingError } = await supabase
        .from('ai_documents')
        .select('id, title, processing_status, organization_id')
        .eq('processing_status', 'pending')
        .eq('organization_id', organizationId)
        .limit(1)
        .maybeSingle();
        
      if (!pendingError && pendingData) {
        pendingDoc = pendingData;
      } else {
        // If no pending, try failed documents
        const { data: failedData, error: failedError } = await supabase
          .from('ai_documents')
          .select('id, title, processing_status, organization_id')
          .eq('processing_status', 'failed')
          .eq('organization_id', organizationId)
          .limit(1)
          .maybeSingle();
          
        if (!failedError && failedData) {
          pendingDoc = failedData;
          
          // Reset the failed document to pending first
          const { error: resetError } = await supabase
            .from('ai_documents')
            .update({ 
              processing_status: 'pending', 
              total_chunks: 0, 
              processed_at: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', failedData.id);

          if (resetError) {
            throw new Error(`Failed to reset document status: ${resetError.message}`);
          }

          addLog({
            timestamp: new Date().toLocaleTimeString(),
            documentTitle: failedData.title,
            status: 'processing',
            message: 'Reset failed document to pending status'
          });
        }
      }

      if (!pendingDoc) {
        toast({
          title: "No pending documents",
          description: "All documents have been processed or there are no documents to process",
          variant: "destructive"
        });
        return;
      }

      setCurrentDocument(pendingDoc.title);
      setTotalCount(1);
      
      addLog({
        timestamp: new Date().toLocaleTimeString(),
        documentTitle: pendingDoc.title,
        status: 'processing',
        message: `Starting document processing for ID: ${pendingDoc.id}`
      });

      // Call the edge function with timeout and proper error handling
      console.log('Triggering edge function for document:', pendingDoc.id);
      const result = await processWithTimeout(pendingDoc.id, pendingDoc.title) as any;
      
      console.log('Edge function result:', result);

      if (result.error) {
        // Enhanced error logging with specific failure details
        const errorMsg = result.error.message || result.error || 'Processing failed';
        const isCorrupted = errorMsg.includes('corrupted') || errorMsg.includes('Invalid docx file signature');
        const isTimeout = errorMsg.includes('timeout');
        const isUnsupported = errorMsg.includes('unsupported features') || errorMsg.includes('password-protected');
        
        addLog({
          timestamp: new Date().toLocaleTimeString(),
          documentTitle: pendingDoc.title,
          status: 'error',
          message: `${errorMsg}${isCorrupted ? ' (File may be corrupted)' : ''}${isTimeout ? ' (Processing timed out)' : ''}${isUnsupported ? ' (Unsupported format)' : ''}`
        });
        
        throw result.error;
      }

      // Check final status with retry logic
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for processing to complete
      
      const { data: finalDoc, error: finalError } = await supabase
        .from('ai_documents')
        .select('processing_status, total_chunks')
        .eq('id', pendingDoc.id)
        .maybeSingle();

      if (finalError) {
        throw new Error(`Failed to check final status: ${finalError.message}`);
      }

      const chunks = finalDoc?.total_chunks || 0;
      const status = finalDoc?.processing_status || 'unknown';
      setProcessedCount(1);
      
      addLog({
        timestamp: new Date().toLocaleTimeString(),
        documentTitle: pendingDoc.title,
        status: chunks > 0 ? 'success' : 'error',
        message: chunks > 0 
          ? `Successfully processed: ${chunks} chunks created (Status: ${status})`
          : `Processing completed but no valid chunks created (Status: ${status})`,
        chunks
      });

      toast({
        title: chunks > 0 ? "Processing successful" : "Processing warning",
        description: chunks > 0 
          ? `${pendingDoc.title}: ${chunks} chunks created`
          : `${pendingDoc.title}: No valid chunks created`,
        variant: chunks > 0 ? "default" : "destructive"
      });

      onProcessingComplete?.();
    } catch (error: any) {
      const isTimeout = error.message === 'Processing timeout';
      
      addLog({
        timestamp: new Date().toLocaleTimeString(),
        documentTitle: currentDocument || 'Unknown',
        status: 'error',
        message: isTimeout 
          ? 'Processing timed out after 60 seconds'
          : error.message || 'Processing failed'
      });
      
      toast({
        title: isTimeout ? "Processing timeout" : "Processing failed",
        description: isTimeout 
          ? "Processing took too long. Try processing individual documents."
          : error.message || "Failed to trigger document processing",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
      setCurrentDocument('');
    }
  };

  const processAllPending = async () => {
    setProcessing(true);
    clearLogs();
    
    try {
      // Get user's organization first (prioritize primary organization)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      let organizationId;

      // First, check if user owns a primary organization
      const { data: primaryOrg } = await supabase
        .from('organizations')
        .select('id')
        .eq('owner_id', user.id)
        .eq('organization_type', 'primary')
        .maybeSingle();

      if (primaryOrg) {
        organizationId = primaryOrg.id;
        console.log('Batch processing: Using primary organization:', organizationId);
      } else {
        // If no primary org, check if they're a member of a primary organization
        const { data: primaryMember } = await supabase
          .from('organization_members')
          .select('organization_id, organizations!inner(organization_type)')
          .eq('user_id', user.id)
          .eq('organizations.organization_type', 'primary')
          .maybeSingle();

        if (primaryMember) {
          organizationId = primaryMember.organization_id;
          console.log('Batch processing: Using primary organization via membership:', organizationId);
        } else {
          // Fall back to any organization they own
          const { data: anyOwnedOrg } = await supabase
            .from('organizations')
            .select('id')
            .eq('owner_id', user.id)
            .maybeSingle();

          if (anyOwnedOrg) {
            organizationId = anyOwnedOrg.id;
            console.log('Batch processing: Using any owned organization:', organizationId);
          } else {
            // Finally, fall back to any organization they're a member of
            const { data: anyMember } = await supabase
              .from('organization_members')
              .select('organization_id')
              .eq('user_id', user.id)
              .maybeSingle();

            if (anyMember) {
              organizationId = anyMember.organization_id;
              console.log('Batch processing: Using any organization via membership:', organizationId);
            }
          }
        }
      }

      if (!organizationId) {
        throw new Error('User not part of any organization');
      }

      // Get all pending and failed documents for the user's organization
      const { data: pendingDocs, error: pendingError } = await supabase
        .from('ai_documents')
        .select('id, title, processing_status, organization_id')
        .in('processing_status', ['pending', 'failed'])
        .eq('organization_id', organizationId);

      if (pendingError) throw pendingError;

      if (!pendingDocs || pendingDocs.length === 0) {
        toast({
          title: "No documents to process",
          description: "All documents have been processed",
        });
        return;
      }

      setTotalCount(pendingDocs.length);
      
      addLog({
        timestamp: new Date().toLocaleTimeString(),
        documentTitle: 'System',
        status: 'processing',
        message: `Starting batch processing of ${pendingDocs.length} documents...`
      });

      // Reset all failed documents to pending first
      const failedDocs = pendingDocs.filter(doc => doc.processing_status === 'failed');
      if (failedDocs.length > 0) {
        addLog({
          timestamp: new Date().toLocaleTimeString(),
          documentTitle: 'System',
          status: 'processing',
          message: `Resetting ${failedDocs.length} failed documents to pending status`
        });
        
        for (const doc of failedDocs) {
          await supabase
            .from('ai_documents')
            .update({ 
              processing_status: 'pending', 
              total_chunks: 0, 
              processed_at: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', doc.id);
        }
      }

      let successful = 0;
      let failed = 0;

      // Process documents one by one to avoid overwhelming the system
      for (const doc of pendingDocs) {
        setCurrentDocument(doc.title);
        
        addLog({
          timestamp: new Date().toLocaleTimeString(),
          documentTitle: doc.title,
          status: 'processing',
          message: 'Processing document...'
        });

        try {
          const result = await processWithTimeout(doc.id, doc.title, 90000) as any; // 90 second timeout for batch

          if (result.error) {
            // Enhanced error logging with specific failure details  
            const errorMsg = result.error.message || result.error || 'Processing failed';
            const isCorrupted = errorMsg.includes('corrupted') || errorMsg.includes('Invalid docx file signature');
            const isTimeout = errorMsg.includes('timeout');
            const isUnsupported = errorMsg.includes('unsupported features') || errorMsg.includes('password-protected');
            
            addLog({
              timestamp: new Date().toLocaleTimeString(),
              documentTitle: doc.title,
              status: 'error',
              message: `${errorMsg}${isCorrupted ? ' (File may be corrupted)' : ''}${isTimeout ? ' (Processing timed out)' : ''}${isUnsupported ? ' (Unsupported format)' : ''}`
            });
            failed++;
          } else {
            // Check final status to get chunk count with retry logic
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for processing to complete
            
            const { data: finalDoc, error: finalError } = await supabase
              .from('ai_documents')
              .select('processing_status, total_chunks')
              .eq('id', doc.id)
              .maybeSingle();

            if (finalError) {
              throw new Error(`Failed to check final status: ${finalError.message}`);
            }

            const chunks = finalDoc?.total_chunks || 0;
            
            addLog({
              timestamp: new Date().toLocaleTimeString(),
              documentTitle: doc.title,
              status: chunks > 0 ? 'success' : 'error',
              message: chunks > 0 
                ? `Successfully processed: ${chunks} chunks created`
                : 'Processing completed but no valid chunks created',
              chunks
            });
            
            if (chunks > 0) {
              successful++;
            } else {
              failed++;
            }
          }

          setProcessedCount(prev => prev + 1);
          
          // Small delay between requests
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error: any) {
          const isTimeout = error.message === 'Processing timeout';
          const errorMsg = error.message || 'Processing failed';
          const isPlaceholder = errorMsg.includes('Placeholder content detected');
          const isCorrupted = errorMsg.includes('corrupted') || errorMsg.includes('Invalid docx file signature');
          const isUnsupported = errorMsg.includes('unsupported features') || errorMsg.includes('password-protected');
          
          let detailedMessage = errorMsg;
          
          if (isPlaceholder) {
            detailedMessage = `${errorMsg} - This document appears to contain template or placeholder text rather than real MPS content. Consider reviewing the document or uploading a different version.`;
          } else if (isCorrupted) {
            detailedMessage = `${errorMsg} - The file may be corrupted or not a valid document format. Try re-uploading the document.`;
          } else if (isTimeout) {
            detailedMessage = `${errorMsg} - The document took too long to process. Try processing it individually or check if it's very large.`;
          } else if (isUnsupported) {
            detailedMessage = `${errorMsg} - The document format or features are not supported by the current processor.`;
          }
          
          addLog({
            timestamp: new Date().toLocaleTimeString(),
            documentTitle: doc.title,
            status: 'error',
            message: detailedMessage
          });
          
          failed++;
          setProcessedCount(prev => prev + 1);
        }
      }

      addLog({
        timestamp: new Date().toLocaleTimeString(),
        documentTitle: 'System',
        status: successful > failed ? 'success' : 'error',
        message: `Batch processing complete: ${successful} successful, ${failed} failed`
      });

      toast({
        title: "Batch processing complete",
        description: `Successfully processed: ${successful}, Failed: ${failed}`,
        variant: successful > 0 ? "default" : "destructive"
      });

      onProcessingComplete?.();
    } catch (error: any) {
      addLog({
        timestamp: new Date().toLocaleTimeString(),
        documentTitle: 'System',
        status: 'error',
        message: error.message || 'Batch processing failed'
      });
      
      toast({
        title: "Batch processing failed",
        description: error.message || "Failed to trigger batch processing",
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
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Document Processing Debugger
            {logs.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearLogs}
                disabled={processing}
              >
                <X className="h-4 w-4" />
                Clear Logs
              </Button>
            )}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Manually trigger document processing with real-time feedback and timeout protection
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
          
          {/* Control Buttons */}
          <div className="flex gap-2">
            <Button 
              onClick={triggerProcessing}
              disabled={processing}
              variant="outline"
            >
              {processing ? 'Processing...' : 'Process One Document'}
            </Button>
            
            <Button 
              onClick={processAllPending}
              disabled={processing}
              variant="default"
            >
              {processing ? 'Processing...' : 'Process All Pending'}
            </Button>
          </div>
          
          {/* Real-time Logs */}
          {logs.length > 0 && (
            <Card className="border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Processing Logs</CardTitle>
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
    </div>
  );
};