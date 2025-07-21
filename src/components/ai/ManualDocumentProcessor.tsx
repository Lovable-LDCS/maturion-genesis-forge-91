import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ManualDocumentProcessorProps {
  documentId: string;
  fileName: string;
}

export const ManualDocumentProcessor: React.FC<ManualDocumentProcessorProps> = ({ 
  documentId, 
  fileName 
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleManualProcess = async () => {
    setIsProcessing(true);
    try {
      console.log(`Manually triggering processing for document: ${documentId}`);
      
      const { data, error } = await supabase.functions.invoke('process-ai-document', {
        body: { documentId }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      console.log('Processing response:', data);

      toast({
        title: "Processing Triggered",
        description: `Manual processing started for "${fileName}". Check the status in a few moments.`,
      });

    } catch (error) {
      console.error('Manual processing error:', error);
      toast({
        title: "Processing Failed",
        description: `Failed to trigger processing: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-sm">Manual Document Processing</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            Document: {fileName}
          </div>
          <div className="text-xs text-muted-foreground">
            ID: {documentId}
          </div>
          <Button 
            onClick={handleManualProcess}
            disabled={isProcessing}
            className="w-full"
            size="sm"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3 mr-2" />
                Manually Process Document
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};