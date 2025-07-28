import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface DocumentProcessingDebuggerProps {
  onProcessingComplete?: () => void;
}

export const DocumentProcessingDebugger: React.FC<DocumentProcessingDebuggerProps> = ({
  onProcessingComplete
}) => {
  const [processing, setProcessing] = useState(false);

  const triggerProcessing = async () => {
    setProcessing(true);
    try {
      // Get a pending or failed document (try pending first, then failed)
      let pendingDoc;
      let fetchError;
      
      // First try pending documents
      const { data: pendingData, error: pendingError } = await supabase
        .from('ai_documents')
        .select('id, title, processing_status')
        .eq('processing_status', 'pending')
        .limit(1)
        .single();
        
      if (!pendingError && pendingData) {
        pendingDoc = pendingData;
      } else {
        // If no pending, try failed documents
        const { data: failedData, error: failedError } = await supabase
          .from('ai_documents')
          .select('id, title, processing_status')
          .eq('processing_status', 'failed')
          .limit(1)
          .single();
          
        if (!failedError && failedData) {
          pendingDoc = failedData;
          
          // Reset the failed document to pending first
          await supabase
            .from('ai_documents')
            .update({ 
              processing_status: 'pending', 
              total_chunks: 0, 
              processed_at: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', failedData.id);
        }
        
        fetchError = failedError;
      }

      if (fetchError || !pendingDoc) {
        toast({
          title: "No pending documents",
          description: "All documents have been processed or there are no documents to process",
          variant: "destructive"
        });
        return;
      }

      // Processing document: ${pendingDoc.title}

      // Call the edge function directly
      const { data, error } = await supabase.functions.invoke('process-ai-document', {
        body: { documentId: pendingDoc.id }
      });

      if (error) {
        console.error('Processing error:', error);
      }

      if (error) {
        throw error;
      }

      toast({
        title: "Processing triggered",
        description: `Successfully triggered processing for: ${pendingDoc.title}`,
      });

      onProcessingComplete?.();
    } catch (error: any) {
      console.error('Processing failed:', error);
      toast({
        title: "Processing failed",
        description: error.message || "Failed to trigger document processing",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const processAllPending = async () => {
    setProcessing(true);
    try {
      // Get all pending and failed documents
      const { data: pendingDocs, error: pendingError } = await supabase
        .from('ai_documents')
        .select('id, title, processing_status')
        .in('processing_status', ['pending', 'failed']);

      if (pendingError) throw pendingError;

      if (!pendingDocs || pendingDocs.length === 0) {
        toast({
          title: "No documents to process",
          description: "All documents have been processed",
        });
        return;
      }

      // Reset all failed documents to pending first
      const failedDocs = pendingDocs.filter(doc => doc.processing_status === 'failed');
      if (failedDocs.length > 0) {
        console.log(`Resetting ${failedDocs.length} failed documents to pending status`);
        
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

      // Processing ${pendingDocs.length} pending documents

      let successful = 0;
      let failed = 0;

      // Process documents one by one to avoid overwhelming the system
      for (const doc of pendingDocs) {
        try {
          const { error } = await supabase.functions.invoke('process-ai-document', {
            body: { documentId: doc.id }
          });

          if (error) {
            console.error(`Failed to process ${doc.title}:`, error);
            failed++;
          } else {
            // Successfully triggered processing for: ${doc.title}
            successful++;
          }

          // Small delay between requests
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Error processing ${doc.title}:`, error);
          failed++;
        }
      }

      toast({
        title: "Batch processing complete",
        description: `Successfully triggered: ${successful}, Failed: ${failed}`,
      });

      onProcessingComplete?.();
    } catch (error: any) {
      console.error('Batch processing failed:', error);
      toast({
        title: "Batch processing failed",
        description: error.message || "Failed to trigger batch processing",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="bg-card border rounded-lg p-4 space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Processing Debugger</h3>
      <p className="text-sm text-muted-foreground">
        Manually trigger document processing to test edge function
      </p>
      
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
    </div>
  );
};