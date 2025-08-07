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
  const [batchHistory, setBatchHistory] = useState<Array<{batch: number, processed: number, timestamp: Date}>>([]);

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
      const batchNumber = currentBatch + 1;
      console.log(`Starting batch ${batchNumber}, auto-loop: ${autoLoop}`);
      
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

      // Add to batch history
      setBatchHistory(prev => [...prev, {
        batch: batchNumber,
        processed,
        timestamp: new Date()
      }]);

      console.log(`Batch ${batchNumber} completed: ${processed} chunks processed, auto-loop: ${autoLoop}`);

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
        title: `✅ Batch ${batchNumber} Complete`,
        description: `Processed ${processed} chunks. ${autoLoop ? 'Starting next batch...' : ''}`,
      });

      // Refresh status immediately after batch completion
      await refreshStatus();
      await refreshDocumentStatuses();

      // Set running to false before checking auto-loop continuation
      setIsRunning(false);

      // Check auto-loop continuation immediately after setting isRunning to false
      if (autoLoop && processed > 0) {
        console.log(`Auto-loop continuing: scheduling batch ${batchNumber + 1}`);
        
        // Use a very short delay to allow state updates, then continue
        setTimeout(() => {
          console.log(`Auto-loop check: autoLoop=${autoLoop}, starting next batch`);
          runEmbeddingBatch(false);
        }, 500); // Reduced to 500ms for faster continuation
      } else {
        console.log(`Auto-loop stopping: autoLoop=${autoLoop}, processed=${processed}`);
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
            setIsRunning(false);
            runEmbeddingBatch(true);
          }
        }, 5000 * Math.pow(2, retryCount));
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
    setAutoLoop(false); // Ensure single batch mode
    setCurrentBatch(0);
    setBatchHistory([]);
    runEmbeddingBatch();
  };

  const handleAutoLoop = () => {
    if (!autoLoop) {
      setAutoLoop(true);
      setCurrentBatch(0);
      setBatchHistory([]);
      // Use setTimeout to ensure state is set before running
      setTimeout(() => runEmbeddingBatch(), 100);
    }
  };

  const handleStop = () => {
    setAutoLoop(false);
    setIsRunning(false);
  };

  const remainingChunks = totalChunks - chunksWithEmbeddings;
  const isComplete = embeddingPercentage >= 99.9;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader className="pb-3">
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Embedding Generation Progress
          </DialogTitle>
          <DialogDescription>
            Generate embeddings for document chunks to enable AI vector search and context retrieval
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Compact Progress Overview */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Overall Progress</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={refreshStatus}
                  disabled={isRunning}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-2xl font-bold mb-2">
                {chunksWithEmbeddings.toLocaleString()} / {totalChunks.toLocaleString()}
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({embeddingPercentage.toFixed(1)}%)
                </span>
              </div>
              <Progress value={embeddingPercentage} className="h-2 mb-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Remaining: {remainingChunks.toLocaleString()}</span>
                {isComplete ? (
                  <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Complete
                  </Badge>
                ) : (
                  <span>{Math.ceil(remainingChunks / batchSize)} batches remaining</span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Compact Batch Controls */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Batch Processing</h4>
                <div className="flex items-center gap-2 text-sm">
                  <label>Size:</label>
                  <select 
                    value={batchSize} 
                    onChange={(e) => setBatchSize(Number(e.target.value))}
                    disabled={isRunning}
                    className="border rounded px-2 py-1 text-xs"
                  >
                    <option value={200}>200</option>
                    <option value={500}>500</option>
                    <option value={1000}>1000</option>
                  </select>
                </div>
              </div>

              {currentBatch > 0 && (
                <div className="bg-muted/30 rounded p-2 text-xs space-y-1">
                  <div className="font-medium">
                    Batch {currentBatch} completed ({lastProcessed} chunks)
                  </div>
                  {retryCount > 0 && (
                    <div className="text-orange-600">Retry attempt: {retryCount}/3</div>
                  )}
                  {lastError && (
                    <div className="text-red-600">Error: {lastError}</div>
                  )}
                  {batchHistory.length > 0 && (
                    <div className="text-muted-foreground">
                      Total batches completed: {batchHistory.length}
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
                <div className="p-2 bg-blue-50 rounded border border-blue-200">
                  <div className="flex items-center gap-2 text-blue-800 text-sm">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span className="font-medium">Auto-loop active</span>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    Processing batches automatically until complete
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Collapsible Document Status */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <h4 className="font-medium">Document Status ({documentStatuses.length})</h4>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={refreshDocumentStatuses}
                  disabled={isRunning}
                  title="Refresh document chunk counts"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {documentStatuses.map((doc) => (
                  <div key={doc.documentId} className="flex items-center justify-between p-2 bg-background rounded border text-xs">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{doc.documentTitle}</p>
                      <p className="text-muted-foreground">
                        {doc.chunksWithEmbeddings} / {doc.totalChunks} chunks ({doc.embeddingPercentage.toFixed(1)}%)
                      </p>
                    </div>
                    <Badge 
                      variant={doc.status === 'completed' ? 'default' : doc.status === 'partial' ? 'secondary' : 'outline'}
                      className={`text-xs ${doc.status === 'completed' ? 'bg-green-100 text-green-800' : ''}`}
                    >
                      {doc.status === 'completed' && <CheckCircle className="h-2 w-2 mr-1" />}
                      {doc.status === 'completed' ? 'Complete' : 
                       doc.status === 'partial' ? 'Partial' : 'Pending'}
                    </Badge>
                  </div>
                ))}
                {documentStatuses.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    No documents found or still loading...
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Batch History */}
          {batchHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Batch History</CardTitle>
                <CardDescription>
                  Recent batch completion record
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {batchHistory.slice(-5).map((batch) => (
                    <div key={batch.batch} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        Batch {batch.batch}
                      </span>
                      <span className="text-muted-foreground">
                        {batch.processed} chunks ({batch.timestamp.toLocaleTimeString()})
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

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