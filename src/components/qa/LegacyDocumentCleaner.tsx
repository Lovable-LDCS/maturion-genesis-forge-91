import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Search, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';

interface LegacyCleanupResult {
  totalFound: number;
  totalCleaned: number;
  details: Array<{
    id: string;
    title: string;
    reason: string;
    success?: boolean;
    wouldDelete?: boolean;
    created?: string;
    status?: string;
    chunks?: number;
  }>;
}

export const LegacyDocumentCleaner: React.FC = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<LegacyCleanupResult | null>(null);
  const [cleanupResult, setCleanupResult] = useState<string | null>(null);
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();

  const analyzeDocuments = async () => {
    if (!currentOrganization?.id) {
      toast({
        title: "❌ No Organization",
        description: "Organization context is required for analysis",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('cleanup-legacy-documents', {
        body: { 
          organizationId: currentOrganization.id,
          dryRun: true
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.success) {
        setAnalysisResult(data);
        toast({
          title: "🔍 Analysis Complete",
          description: `Found ${data.totalFound} legacy documents that can be cleaned up`,
        });
      } else {
        throw new Error(data?.error || 'Unknown error occurred');
      }
    } catch (error: any) {
      console.error('Analysis failed:', error);
      toast({
        title: "❌ Analysis Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const cleanupLegacyDocuments = async () => {
    if (!currentOrganization?.id) {
      toast({
        title: "❌ No Organization",
        description: "Organization context is required for cleanup",
        variant: "destructive",
      });
      return;
    }

    setIsCleaning(true);
    setCleanupResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('cleanup-legacy-documents', {
        body: { 
          organizationId: currentOrganization.id,
          dryRun: false
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.success) {
        setCleanupResult(`Successfully cleaned up ${data.totalCleaned} legacy documents`);
        setAnalysisResult(null); // Clear analysis since we've cleaned up
        toast({
          title: "🎉 Cleanup Complete",
          description: `Removed ${data.totalCleaned} legacy documents. Refresh to see the changes.`,
        });
      } else {
        throw new Error(data?.error || 'Unknown error occurred');
      }
    } catch (error: any) {
      console.error('Cleanup failed:', error);
      setCleanupResult(`Error: ${error.message}`);
      toast({
        title: "❌ Cleanup Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-600" />
          Legacy Document Cleanup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Legacy Document Detection:</strong> Finds documents stuck in processing, failed uploads, or from previous upload systems.
          </p>
          <p className="text-sm text-blue-600 mt-1">
            This identifies documents with 0 chunks that are over 24 hours old, failed processing, or have legacy metadata.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Button
            onClick={analyzeDocuments}
            disabled={isAnalyzing || !currentOrganization}
            variant="outline"
            size="sm"
          >
            <Search className="h-4 w-4 mr-2" />
            {isAnalyzing ? 'Analyzing...' : 'Analyze Legacy Documents'}
          </Button>
          
          {analysisResult && analysisResult.totalFound > 0 && (
            <Button
              onClick={cleanupLegacyDocuments}
              disabled={isCleaning || !currentOrganization}
              variant="destructive"
              size="sm"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isCleaning ? 'Cleaning...' : `Remove ${analysisResult.totalFound} Legacy Documents`}
            </Button>
          )}
          
          <Badge variant="outline" className="text-xs">
            Organization-wide cleanup
          </Badge>
        </div>

        {analysisResult && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Search className="h-4 w-4" />
                Analysis Results: {analysisResult.totalFound} legacy documents found
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {analysisResult.details.map((detail, index) => (
                  <div key={index} className="flex items-center justify-between text-xs p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{detail.title}</p>
                      <p className="text-muted-foreground">
                        Reason: {detail.reason}
                      </p>
                      {detail.created && (
                        <p className="text-muted-foreground">
                          Created: {new Date(detail.created).toLocaleDateString()} | 
                          Status: {detail.status} | 
                          Chunks: {detail.chunks}
                        </p>
                      )}
                    </div>
                    <div className="ml-2">
                      <AlertTriangle className="h-3 w-3 text-yellow-600" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {cleanupResult && (
          <div className={`p-3 rounded-lg border ${cleanupResult.includes('Error') 
            ? 'bg-red-50 border-red-200 text-red-800' 
            : 'bg-green-50 border-green-200 text-green-800'
          }`}>
            <div className="flex items-center gap-2">
              {cleanupResult.includes('Error') ? 
                <AlertTriangle className="h-4 w-4" /> : 
                <CheckCircle className="h-4 w-4" />
              }
              <span className="text-sm font-medium">{cleanupResult}</span>
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p>This tool identifies documents that are stuck in processing, failed to upload properly, or are from previous versions of the upload system.</p>
        </div>
      </CardContent>
    </Card>
  );
};