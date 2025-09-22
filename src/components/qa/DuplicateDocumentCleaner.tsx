import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';

interface CleanupResult {
  duplicateSets: number;
  totalCleaned: number;
  details: Array<{
    title: string;
    removedId: string;
    keptId: string;
    removedChunks: number;
    keptChunks: number;
    success: boolean;
  }>;
}

export const DuplicateDocumentCleaner: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [cleanupDetails, setCleanupDetails] = useState<CleanupResult | null>(null);
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();

  const cleanupAllDuplicates = async () => {
    if (!currentOrganization?.id) {
      toast({
        title: "❌ No Organization",
        description: "Organization context is required for cleanup",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setResult(null);
    setCleanupDetails(null);

    try {
      // Auto-clean all duplicates for the organization
      const { data, error } = await supabase.functions.invoke('cleanup-duplicate-document', {
        body: { 
          autoCleanAll: true,
          organizationId: currentOrganization.id 
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.success) {
        setResult(`Successfully cleaned up ${data.totalCleaned} duplicate documents from ${data.duplicateSets} duplicate sets`);
        setCleanupDetails(data);
        toast({
          title: "🎉 Cleanup Complete",
          description: `Removed ${data.totalCleaned} duplicate documents. Refresh the embedding dialog to see the fixes.`,
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
            <strong>Duplicate Detection System:</strong> Automatically finds and removes corrupted duplicate documents across your entire organization.
          </p>
          <p className="text-sm text-orange-600 mt-1">
            Keeps the best version of each document (highest chunk count, completed status, newest) and removes inferior duplicates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={cleanupAllDuplicates}
            disabled={isProcessing || !currentOrganization}
            variant="destructive"
            size="sm"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {isProcessing ? 'Scanning & Cleaning...' : 'Clean All Duplicates'}
          </Button>
          
          <Badge variant="outline" className="text-xs">
            Organization-wide cleanup
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

        {cleanupDetails && cleanupDetails.details.length > 0 && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-sm">Cleanup Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {cleanupDetails.details.map((detail, index) => (
                  <div key={index} className="flex items-center justify-between text-xs p-2 bg-muted/30 rounded">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{detail.title}</p>
                      <p className="text-muted-foreground">
                        Kept: {detail.keptChunks} chunks | Removed: {detail.removedChunks} chunks
                      </p>
                    </div>
                    <div className="ml-2">
                      {detail.success ? (
                        <CheckCircle className="h-3 w-3 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-3 w-3 text-red-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-xs text-muted-foreground">
          <p>This automatically detects documents with identical titles, keeps the highest quality version (most chunks, completed status), and removes all inferior duplicates.</p>
        </div>
      </CardContent>
    </Card>
  );
};