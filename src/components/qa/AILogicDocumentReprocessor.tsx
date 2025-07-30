import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AILogicDocument {
  id: string;
  title: string;
  file_name: string;
  processing_status: string;
}

interface ProcessingResult {
  documentId: string;
  title: string;
  success: boolean;
  error?: string;
}

export const AILogicDocumentReprocessor: React.FC = () => {
  const [documents, setDocuments] = useState<AILogicDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const { toast } = useToast();

  const fetchPendingDocuments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_documents')
        .select('id, title, file_name, processing_status')
        .eq('document_type', 'ai_logic_rule_global')
        .eq('processing_status', 'pending')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: "Error",
        description: "Failed to fetch pending AI Logic documents",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const triggerReprocessing = async () => {
    if (documents.length === 0) {
      toast({
        title: "No Documents",
        description: "No pending AI Logic documents found to reprocess",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setResults([]);
    
    const processResults: ProcessingResult[] = [];

    for (const doc of documents) {
      try {
        console.log(`🔧 Triggering reprocessing for: ${doc.title}`);
        
        const { data, error } = await supabase.functions.invoke('process-ai-document', {
          body: { 
            documentId: doc.id,
            forceReprocess: true,
            emergencyChunking: true // Enable fallback chunking for short/PDF documents
          }
        });

        if (error) throw error;

        processResults.push({
          documentId: doc.id,
          title: doc.title,
          success: true
        });

        toast({
          title: "Processing Triggered",
          description: `Reprocessing started for: ${doc.title}`,
        });

      } catch (error) {
        console.error(`Error processing ${doc.title}:`, error);
        processResults.push({
          documentId: doc.id,
          title: doc.title,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      // Small delay between requests to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setResults(processResults);
    setIsProcessing(false);

    const successCount = processResults.filter(r => r.success).length;
    const failCount = processResults.length - successCount;

    toast({
      title: "Reprocessing Complete",
      description: `✅ ${successCount} successful, ❌ ${failCount} failed`,
      variant: successCount === processResults.length ? "default" : "destructive",
    });

    // Refresh the document list
    fetchPendingDocuments();
  };

  React.useEffect(() => {
    fetchPendingDocuments();
  }, []);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          AI Logic Document Reprocessor
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Trigger reprocessing for AI Logic Policy documents with updated metadata and fallback chunking
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={fetchPendingDocuments}
            disabled={isLoading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh List
          </Button>
          
          <Button
            onClick={triggerReprocessing}
            disabled={isProcessing || documents.length === 0}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
            {isProcessing ? 'Processing...' : `Reprocess ${documents.length} Documents`}
          </Button>
        </div>

        {documents.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Pending AI Logic Documents ({documents.length}):</h4>
            <div className="grid gap-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">{doc.file_name}</p>
                  </div>
                  <Badge variant="secondary">{doc.processing_status}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Processing Results:</h4>
            <div className="grid gap-2">
              {results.map((result) => (
                <div key={result.documentId} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{result.title}</p>
                    {result.error && (
                      <p className="text-xs text-red-600">{result.error}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    )}
                    <Badge variant={result.success ? "default" : "destructive"}>
                      {result.success ? "Success" : "Failed"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {documents.length === 0 && !isLoading && (
          <div className="text-center py-4 text-muted-foreground">
            No pending AI Logic documents found
          </div>
        )}
      </CardContent>
    </Card>
  );
};