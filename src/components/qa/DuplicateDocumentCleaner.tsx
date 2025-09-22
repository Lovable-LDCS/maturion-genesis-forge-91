import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const DuplicateDocumentCleaner: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const { toast } = useToast();

  const cleanupDuplicateMP10 = async () => {
    setIsProcessing(true);
    setResult(null);

    try {
      // Clean up the corrupted MPS 10 document (only 2 chunks)
      const { data, error } = await supabase.functions.invoke('cleanup-duplicate-document', {
        body: { documentId: 'a5ad3294-f7fa-44bf-b963-5fd70c407fda' }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.success) {
        setResult('Successfully cleaned up duplicate MPS 10 document');
        toast({
          title: "✅ Cleanup Complete",
          description: "Duplicate MPS 10 document has been removed. Refresh the embedding dialog to see the fix.",
        });
      } else {
        throw new Error(data?.error || 'Unknown error occurred');
      }
    } catch (error: any) {
      console.error('Cleanup failed:', error);
      setResult(`Error: ${error.message}`);
      toast({
        title: "❌ Cleanup Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          Duplicate Document Cleanup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
          <p className="text-sm text-orange-800">
            <strong>Issue Detected:</strong> There are duplicate MPS 10 documents causing display confusion in the embedding dialog.
          </p>
          <p className="text-sm text-orange-600 mt-1">
            One version has 209 chunks (correct), another has only 2 chunks (corrupted duplicate).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={cleanupDuplicateMP10}
            disabled={isProcessing}
            variant="destructive"
            size="sm"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {isProcessing ? 'Cleaning up...' : 'Remove Duplicate MPS 10'}
          </Button>
          
          <Badge variant="outline" className="text-xs">
            Target: Document with 2 chunks
          </Badge>
        </div>

        {result && (
          <div className={`p-3 rounded-lg border ${result.includes('Error') 
            ? 'bg-red-50 border-red-200 text-red-800' 
            : 'bg-green-50 border-green-200 text-green-800'
          }`}>
            <div className="flex items-center gap-2">
              {result.includes('Error') ? 
                <AlertTriangle className="h-4 w-4" /> : 
                <CheckCircle className="h-4 w-4" />
              }
              <span className="text-sm font-medium">{result}</span>
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p>This will remove the corrupted MPS 10 document (ID: a5ad3294-f7fa-44bf-b963-5fd70c407fda) and keep the correct one (ID: ee604a5e-2741-4339-b22c-3ef8020b2bf6).</p>
        </div>
      </CardContent>
    </Card>
  );
};