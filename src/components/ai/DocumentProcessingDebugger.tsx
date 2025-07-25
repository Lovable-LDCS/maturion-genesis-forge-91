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
      // Get a pending document
      const { data: pendingDoc, error: fetchError } = await supabase
        .from('ai_documents')
        .select('id, title')
        .eq('processing_status', 'pending')
        .limit(1)
        .single();

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
      // Get all pending documents
      const { data: pendingDocs, error: fetchError } = await supabase
        .from('ai_documents')
        .select('id, title')
        .eq('processing_status', 'pending');

      if (fetchError) throw fetchError;

      if (!pendingDocs || pendingDocs.length === 0) {
        toast({
          title: "No pending documents",
          description: "All documents have been processed",
        });
        return;
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