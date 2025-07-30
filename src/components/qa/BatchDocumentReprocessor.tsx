import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { RefreshCw, Database, AlertTriangle, CheckCircle } from 'lucide-react';

interface BatchReprocessingResult {
  documentsFound: number;
  documentsFixed: number;
  results: Array<{
    id: string;
    title: string;
    success: boolean;
    action: string;
    reason?: string;
    error?: string;
  }>;
}

export function BatchDocumentReprocessor() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<BatchReprocessingResult | null>(null);
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();

  const runBatchReprocessing = async () => {
    if (!currentOrganization?.id) {
      toast({
        title: "Error",
        description: "No organization selected",
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);
    setResults(null);

    try {
      const { data, error } = await supabase.functions.invoke('fix-governance-documents');

      if (error) throw error;

      const fixedCount = data.results?.filter((r: any) => r.success && r.action === 'reset_for_reprocessing').length || 0;
      
      setResults({
        documentsFound: data.results?.length || 0,
        documentsFixed: fixedCount,
        results: data.results || []
      });

      if (fixedCount > 0) {
        toast({
          title: "Batch Reprocessing Complete",
          description: `Fixed ${fixedCount} documents with missing chunks`,
        });
      } else {
        toast({
          title: "No Issues Found",
          description: "All documents have correct chunk status",
        });
      }

    } catch (error) {
      console.error('Error running batch reprocessing:', error);
      toast({
        title: "Reprocessing Failed",
        description: "Failed to run batch document reprocessing",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'reset_for_reprocessing': return 'destructive';
      case 'status_corrected': return 'default';
      case 'no_change_needed': return 'secondary';
      default: return 'outline';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'reset_for_reprocessing': return <RefreshCw className="h-3 w-3" />;
      case 'status_corrected': return <CheckCircle className="h-3 w-3" />;
      case 'no_change_needed': return <CheckCircle className="h-3 w-3" />;
      default: return <AlertTriangle className="h-3 w-3" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Batch Document Reprocessor
        </CardTitle>
        <CardDescription>
          Fix all documents marked as 'completed' but missing chunks (actual_chunks = 0)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Button 
              onClick={runBatchReprocessing} 
              disabled={isRunning || !currentOrganization?.id}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRunning ? 'animate-spin' : ''}`} />
              {isRunning ? 'Scanning & Fixing...' : 'Fix Missing Chunks'}
            </Button>

            {results && (
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {results.documentsFound} documents scanned
                </Badge>
                <Badge variant={results.documentsFixed > 0 ? "destructive" : "secondary"}>
                  {results.documentsFixed} fixed
                </Badge>
              </div>
            )}
          </div>

          {results && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Found <strong>{results.documentsFound}</strong> documents, fixed <strong>{results.documentsFixed}</strong> with missing chunks
              </div>

              {results.results.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Processing Results</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {results.results.map((result, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{result.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {result.reason || (result.success ? 'Processed successfully' : result.error)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={getActionBadgeVariant(result.action)}
                            className="text-xs"
                          >
                            {getActionIcon(result.action)}
                            {result.action.replace(/_/g, ' ')}
                          </Badge>
                          {result.success ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                Completed: {new Date().toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}