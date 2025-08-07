import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, Pause, RefreshCw, CheckCircle, Database, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/useOrganization';
import { useEmbeddingStatus } from '@/hooks/useEmbeddingStatus';
import { useDocumentEmbeddingStatus } from '@/hooks/useDocumentEmbeddingStatus';
import { supabase } from '@/integrations/supabase/client';

interface EmbeddingProgressDialogProps {
  open: boolean;
  onClose: () => void;
}

export const EmbeddingProgressDialog: React.FC<EmbeddingProgressDialogProps> = ({
  open,
  onClose
}) => {
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const { totalChunks, chunksWithEmbeddings, embeddingPercentage, refreshStatus } = useEmbeddingStatus();
  const { documentStatuses, refreshDocumentStatuses } = useDocumentEmbeddingStatus();
  
  const [isRunning, setIsRunning] = useState(false);
  const [autoLoop, setAutoLoop] = useState(false);
  const [batchSize, setBatchSize] = useState(500);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [lastProcessed, setLastProcessed] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  // Auto-refresh status while dialog is open
  useEffect(() => {
    if (!open) return;
    
    const interval = setInterval(() => {
      refreshStatus();
      refreshDocumentStatuses();
    }, 3000); // Refresh every 3 seconds
    return () => clearInterval(interval);
  }, [open, refreshStatus, refreshDocumentStatuses]);

  const runEmbeddingBatch = async (isRetry = false) => {
    if (!currentOrganization?.id) return;

    // Prevent multiple concurrent batches
    if (isRunning && !isRetry) {
      console.log('Batch already running, skipping...');
      return;
    }

    if (!isRetry) {
      setRetryCount(0);
      setLastError(null);
    }

    setIsRunning(true);
    
    try {
      console.log(`Starting batch ${currentBatch + 1}, auto-loop: ${autoLoop}`);
      
      const { data, error } = await supabase.functions.invoke('regenerate-embeddings', {
        body: {
          organizationId: currentOrganization.id,
          forceAll: false,
          batchSize: batchSize
        }
      });

      if (error) {
        throw new Error(error.message || 'Edge function returned an error');
      }

      const processed = data?.processed || 0;
      setLastProcessed(processed);
      setCurrentBatch(prev => prev + 1);
      setRetryCount(0);
      setLastError(null);

      console.log(`Batch completed: ${processed} chunks processed`);

      if (processed === 0) {
        // No more chunks to process
        setAutoLoop(false);
        setIsRunning(false);
        toast({
          title: "🎉 Embedding Generation Complete",
          description: `All ${totalChunks.toLocaleString()} chunks now have embeddings! AI retrieval is fully operational.`,
        });
        return;
      }

      toast({
        title: "Batch Complete",
        description: `Processed ${processed} chunks in batch ${currentBatch + 1}`,
      });

      // Refresh status immediately after batch completion
      await refreshStatus();
      await refreshDocumentStatuses();

      // Set isRunning to false before potential auto-loop continuation
      setIsRunning(false);

      // Auto-loop continuation
      if (autoLoop && processed > 0) {
        console.log('Auto-loop enabled, scheduling next batch...');
        
        setTimeout(async () => {
          // Double-check auto-loop is still enabled
          if (!autoLoop) {
            console.log('Auto-loop was disabled, stopping');
            return;
          }

          try {
            // Get fresh counts to determine if more work is needed
            const { data: freshCounts } = await supabase.rpc('count_chunks_by_organization', {
              org_id: currentOrganization?.id
            });
            
            const freshTotal = freshCounts?.[0]?.total_chunks || 0;
            const freshCompleted = freshCounts?.[0]?.chunks_with_embeddings || 0;
            const remaining = freshTotal - freshCompleted;
            
            console.log(`Auto-loop check: ${freshCompleted}/${freshTotal} (${remaining} remaining)`);
            
            if (remaining > 0) {
              console.log('Continuing auto-loop with next batch');
              runEmbeddingBatch(false);
            } else {
              console.log('Auto-loop complete - all embeddings generated');
              setAutoLoop(false);
              toast({
                title: "🎉 Auto-Loop Complete",
                description: `All ${freshTotal.toLocaleString()} embeddings have been generated successfully!`,
              });
            }
          } catch (error) {
            console.error('Error during auto-loop continuation:', error);
            setAutoLoop(false);
            toast({
              title: "Auto-Loop Stopped", 
              description: "Error occurred while checking remaining chunks",
              variant: "destructive",
            });
          }
        }, 3000); // 3 second delay between batches
      }
    } catch (error: any) {
      console.error('Embedding regeneration error:', error);
      const errorMessage = error.message || "Failed to generate embeddings";
      setLastError(errorMessage);

      // Retry logic for auto-loop
      if (autoLoop && retryCount < 3) {
        setRetryCount(prev => prev + 1);
        toast({
          title: "Retrying Batch",
          description: `Attempt ${retryCount + 2}/4: ${errorMessage}`,
          variant: "destructive",
        });
        
        // Retry with exponential backoff
        setTimeout(() => {
          if (autoLoop) {
            console.log(`Retrying batch after error: ${errorMessage}`);
            setIsRunning(false); // Reset running state before retry
            runEmbeddingBatch(true);
          }
        }, 5000 * Math.pow(2, retryCount)); // 5s, 10s, 20s
      } else {
        // Stop processing
        if (autoLoop) {
          toast({
            title: "Auto-Loop Stopped",
            description: `${errorMessage}. Stopped after ${retryCount + 1} failed attempts.`,
            variant: "destructive",
          });
          setAutoLoop(false);
        } else {
          toast({
            title: "Embedding Generation Failed",
            description: errorMessage,
            variant: "destructive",
          });
        }
        setIsRunning(false);
      }
    }
  };

  const handleStart = () => {
    setCurrentBatch(0);
    runEmbeddingBatch();
  };

  const handleAutoLoop = () => {
    setAutoLoop(true);
    setCurrentBatch(0);
    runEmbeddingBatch();
  };

  const handleStop = () => {
    setAutoLoop(false);
    setIsRunning(false);
  };

  const remainingChunks = totalChunks - chunksWithEmbeddings;
  const isComplete = embeddingPercentage >= 99.9;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Embedding Generation Progress
          </DialogTitle>
          <DialogDescription>
            Generate embeddings for document chunks to enable AI vector search and context retrieval
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                Overall Progress
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={refreshStatus}
                  disabled={isRunning}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-3xl font-bold text-center">
                {chunksWithEmbeddings.toLocaleString()} / {totalChunks.toLocaleString()}
                <span className="text-lg font-normal text-muted-foreground ml-2">
                  ({embeddingPercentage.toFixed(1)}%)
                </span>
              </div>
              <Progress value={embeddingPercentage} className="h-3" />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Remaining: </span>
                  <span className="font-medium">{remainingChunks.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status: </span>
                  {isComplete ? (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Complete
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      {Math.ceil(remainingChunks / batchSize)} batches remaining
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Batch Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Batch Processing</CardTitle>
              <CardDescription>
                Control how embeddings are generated
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium">Batch Size:</label>
                <select 
                  value={batchSize} 
                  onChange={(e) => setBatchSize(Number(e.target.value))}
                  disabled={isRunning}
                  className="border rounded px-2 py-1"
                >
                  <option value={200}>200 (Safe)</option>
                  <option value={500}>500 (Fast)</option>
                  <option value={1000}>1000 (Fastest)</option>
                </select>
              </div>

              {currentBatch > 0 && (
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">
                    Batch {currentBatch}: Processed {lastProcessed} chunks
                  </div>
                  {retryCount > 0 && (
                    <div className="text-sm text-orange-600">
                      Retry attempt: {retryCount}/3
                    </div>
                  )}
                  {lastError && (
                    <div className="text-sm text-red-600">
                      Last error: {lastError}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleStart}
                  disabled={isRunning || isComplete}
                  variant="default"
                >
                  {isRunning ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Run Single Batch
                </Button>

                <Button
                  onClick={autoLoop ? handleStop : handleAutoLoop}
                  disabled={isComplete}
                  variant={autoLoop ? "destructive" : "secondary"}
                >
                  {autoLoop ? (
                    <>
                      <Pause className="h-4 w-4 mr-2" />
                      Stop Auto-Loop
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Auto-Loop Until Complete
                    </>
                  )}
                </Button>
              </div>

              {autoLoop && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 text-blue-800">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="font-medium">Auto-loop active</span>
                  </div>
                  <p className="text-sm text-blue-600 mt-1">
                    Processing batches automatically until all embeddings are generated
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Per-Document Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Document Embedding Status
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={refreshDocumentStatuses}
                  disabled={isRunning}
                  title="Refresh document chunk counts"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </CardTitle>
              <CardDescription>
                Embedding progress for each uploaded document
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {documentStatuses.map((doc) => (
                  <div key={doc.documentId} className="flex items-center justify-between p-3 bg-background rounded-lg border">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.documentTitle}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.chunksWithEmbeddings} / {doc.totalChunks} chunks ({doc.embeddingPercentage.toFixed(1)}%)
                      </p>
                    </div>
                    <Badge 
                      variant={doc.status === 'completed' ? 'default' : doc.status === 'partial' ? 'secondary' : 'outline'}
                      className={doc.status === 'completed' ? 'bg-green-100 text-green-800' : ''}
                    >
                      {doc.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                      {doc.status === 'completed' ? 'Complete' : 
                       doc.status === 'partial' ? 'Partial' : 'Pending'}
                    </Badge>
                  </div>
                ))}
                {documentStatuses.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No documents found or still loading...
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {isComplete && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">🎉 Embedding Generation Complete!</span>
                </div>
                <p className="text-sm text-green-600 mt-1">
                  All {totalChunks.toLocaleString()} chunks now have embeddings. 
                  AI context retrieval is fully operational across all {documentStatuses.length} documents.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};