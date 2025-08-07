import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, Pause, RefreshCw, CheckCircle, Database } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/useOrganization';
import { useEmbeddingStatus } from '@/hooks/useEmbeddingStatus';
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
  
  const [isRunning, setIsRunning] = useState(false);
  const [autoLoop, setAutoLoop] = useState(false);
  const [batchSize, setBatchSize] = useState(500);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [lastProcessed, setLastProcessed] = useState(0);

  // Auto-refresh status while dialog is open
  useEffect(() => {
    if (!open) return;
    
    const interval = setInterval(refreshStatus, 3000); // Refresh every 3 seconds
    return () => clearInterval(interval);
  }, [open, refreshStatus]);

  const runEmbeddingBatch = async () => {
    if (!currentOrganization?.id || isRunning) return;

    setIsRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('regenerate-embeddings', {
        body: {
          organizationId: currentOrganization.id,
          forceAll: false,
          batchSize: batchSize
        }
      });

      if (error) {
        throw error;
      }

      const processed = data?.processed || 0;
      setLastProcessed(processed);
      setCurrentBatch(prev => prev + 1);

      if (processed === 0) {
        // No more chunks to process
        setAutoLoop(false);
        toast({
          title: "Embedding Generation Complete",
          description: "All chunks now have embeddings",
        });
        return;
      }

      toast({
        title: "Batch Complete",
        description: `Processed ${processed} chunks in batch ${currentBatch + 1}`,
      });

      // Auto-loop if enabled and there are more chunks to process
      if (autoLoop && processed > 0) {
        setTimeout(() => {
          if (autoLoop) {
            runEmbeddingBatch();
          }
        }, 2000); // 2 second delay between batches
      }
    } catch (error: any) {
      console.error('Embedding regeneration error:', error);
      toast({
        title: "Embedding Generation Failed",
        description: error.message || "Failed to generate embeddings",
        variant: "destructive",
      });
      setAutoLoop(false);
    } finally {
      setIsRunning(false);
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
                <div className="text-sm text-muted-foreground">
                  Batch {currentBatch}: Processed {lastProcessed} chunks
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

          {isComplete && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Embedding Generation Complete!</span>
                </div>
                <p className="text-sm text-green-600 mt-1">
                  All {totalChunks.toLocaleString()} chunks now have embeddings. 
                  AI context retrieval is fully operational.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};