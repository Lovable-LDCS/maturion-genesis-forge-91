import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';
import { Link, AlertTriangle, CheckCircle, RefreshCw, FileText, Database } from 'lucide-react';

interface MPSLinkageResult {
  success: boolean;
  linked_documents: number;
  updated_chunks: number;
  mps_mappings: Record<number, string>;
  errors?: string[];
}

export const MPSLinkageRebuilder: React.FC = () => {
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [lastResult, setLastResult] = useState<MPSLinkageResult | null>(null);
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();

  const handleRebuildLinkage = async (forceRebuild = false) => {
    if (!currentOrganization?.id) {
      toast({
        title: "Error",
        description: "No organization context available",
        variant: "destructive"
      });
      return;
    }

    setIsRebuilding(true);
    
    try {
      console.log('🔗 Starting MPS linkage rebuild...');
      
      const { data, error } = await supabase.functions.invoke('rebuild-mps-linkage', {
        body: {
          organizationId: currentOrganization.id,
          forceRebuild
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Linkage rebuild failed');
      }

      setLastResult(data);
      
      toast({
        title: "MPS Linkage Rebuilt",
        description: `Successfully linked ${data.linked_documents} documents and updated ${data.updated_chunks} chunks`,
      });

      console.log('✅ MPS linkage rebuild completed:', data);

    } catch (error) {
      console.error('Error rebuilding MPS linkage:', error);
      toast({
        title: "Rebuild Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive"
      });
    } finally {
      setIsRebuilding(false);
    }
  };

  const getMPSCoverage = () => {
    if (!lastResult?.mps_mappings) return { covered: 0, total: 25 };
    
    const covered = Object.keys(lastResult.mps_mappings).length;
    return { covered, total: 25 };
  };

  const { covered, total } = getMPSCoverage();
  const coveragePercentage = total > 0 ? (covered / total) * 100 : 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link className="h-5 w-5 text-primary" />
            <CardTitle>MPS Document Linkage</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            ADMIN
          </Badge>
        </div>
        <CardDescription>
          Rebuild and validate MPS document linkages for criteria generation
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {lastResult && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded-lg">
              <FileText className="h-4 w-4 text-primary" />
              <div>
                <div className="font-medium">{lastResult.linked_documents}</div>
                <div className="text-xs text-muted-foreground">Linked Documents</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded-lg">
              <Database className="h-4 w-4 text-primary" />
              <div>
                <div className="font-medium">{lastResult.updated_chunks}</div>
                <div className="text-xs text-muted-foreground">Updated Chunks</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded-lg">
              <CheckCircle className="h-4 w-4 text-primary" />
              <div>
                <div className="font-medium">{covered}/{total}</div>
                <div className="text-xs text-muted-foreground">MPS Coverage</div>
              </div>
            </div>
          </div>
        )}

        {lastResult && coveragePercentage < 100 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              MPS coverage is {coveragePercentage.toFixed(1)}%. Missing linkages may cause criteria generation failures.
            </AlertDescription>
          </Alert>
        )}

        {lastResult?.errors && lastResult.errors.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <div className="font-medium">Linkage Issues:</div>
                {lastResult.errors.slice(0, 3).map((error, index) => (
                  <div key={index} className="text-xs">• {error}</div>
                ))}
                {lastResult.errors.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    ... and {lastResult.errors.length - 3} more issues
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button 
            onClick={() => handleRebuildLinkage(false)}
            disabled={isRebuilding}
            className="flex-1"
          >
            {isRebuilding ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Rebuilding...
              </>
            ) : (
              <>
                <Link className="h-4 w-4 mr-2" />
                Rebuild Linkage
              </>
            )}
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => handleRebuildLinkage(true)}
            disabled={isRebuilding}
          >
            Force Rebuild
          </Button>
        </div>

        {lastResult?.mps_mappings && Object.keys(lastResult.mps_mappings).length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">MPS Document Mappings:</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {Object.entries(lastResult.mps_mappings)
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([mpsNumber, documentName]) => (
                <div key={mpsNumber} className="flex items-center justify-between p-2 bg-secondary/30 rounded text-xs">
                  <span className="font-medium">MPS {mpsNumber}</span>
                  <span className="text-muted-foreground truncate ml-2" title={documentName}>
                    {documentName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};