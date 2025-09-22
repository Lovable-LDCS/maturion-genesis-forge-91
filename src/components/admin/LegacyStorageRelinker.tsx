import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';
import { 
  Search, 
  RefreshCw, 
  Download, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  FileX, 
  Database,
  Clock,
  PlayCircle,
  Loader2
} from 'lucide-react';

interface RelinkResult {
  documentId: string;
  fileName: string;
  title?: string;
  oldPath: string;
  newPath?: string;
  status: 'found_and_relinked' | 'found_but_failed' | 'not_found' | 'already_exists';
  bucket?: string;
  error?: string;
  processingTriggered?: boolean;
}

interface RelinkReport {
  totalDocuments: number;
  successfulRelinks: number;
  failedRelinks: number;
  notFound: number;
  alreadyExists: number;
  results: RelinkResult[];
  scanTime: string;
  executedBy: string;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'found_and_relinked': return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'found_but_failed': return <XCircle className="h-4 w-4 text-red-600" />;
    case 'not_found': return <FileX className="h-4 w-4 text-red-600" />;
    case 'already_exists': return <Database className="h-4 w-4 text-blue-600" />;
    default: return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'found_and_relinked': return <Badge className="bg-green-100 text-green-800">Relinked</Badge>;
    case 'found_but_failed': return <Badge variant="destructive">Failed</Badge>;
    case 'not_found': return <Badge variant="destructive">Not Found</Badge>;
    case 'already_exists': return <Badge variant="secondary">OK</Badge>;
    default: return <Badge variant="outline">Unknown</Badge>;
  }
};

export const LegacyStorageRelinker: React.FC = () => {
  const [scanning, setScanning] = useState(false);
  const [report, setReport] = useState<RelinkReport | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();

  const runRelink = async () => {
    setScanning(true);
    setProgress(0);
    
    try {
      toast({
        title: `Starting storage scan`,
        description: dryRun ? 'Running in preview mode - no changes will be made' : 'This will modify storage and database records',
      });

      const { data, error } = await supabase.functions.invoke('relink-legacy-storage', {
        body: { 
          organizationId: currentOrganization?.id,
          dryRun 
        }
      });

      if (error) throw error;

      if (data?.success) {
        setReport(data.report);
        setProgress(100);
        
        toast({
          title: `Storage scan completed`,
          description: dryRun 
            ? `Found ${data.report.successfulRelinks} documents that can be relinked`
            : `Successfully relinked ${data.report.successfulRelinks} documents`,
        });
      } else {
        throw new Error(data?.error || 'Unknown error occurred');
      }
    } catch (error: any) {
      console.error('Relink error:', error);
      toast({
        title: 'Storage scan failed',
        description: error?.message || 'Failed to scan legacy storage',
        variant: 'destructive',
      });
    } finally {
      setScanning(false);
    }
  };

  const exportReport = () => {
    if (!report) return;

    const csvContent = [
      ['Document ID', 'File Name', 'Title', 'Status', 'Old Path', 'New Path', 'Bucket', 'Error'],
      ...report.results.map(result => [
        result.documentId,
        result.fileName,
        result.title || '',
        result.status,
        result.oldPath,
        result.newPath || '',
        result.bucket || '',
        result.error || ''
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `legacy-storage-relink-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Legacy Storage Relinker
          </CardTitle>
          <CardDescription>
            Scan and remediate documents with missing or mislocated storage files across buckets
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Admin Tool</AlertTitle>
            <AlertDescription>
              This tool scans across storage buckets (ai-documents, documents, ai_documents, chunk-tester) 
              to find and relink missing files. Use dry run first to preview changes.
            </AlertDescription>
          </Alert>

          <div className="flex items-center space-x-2">
            <Switch
              id="dry-run"
              checked={dryRun}
              onCheckedChange={setDryRun}
              disabled={scanning}
            />
            <Label htmlFor="dry-run">
              Dry Run (Preview Mode) - {dryRun ? 'No changes will be made' : 'Will modify storage and database'}
            </Label>
          </div>

          <div className="flex gap-4">
            <Button 
              onClick={runRelink} 
              disabled={scanning}
              className="flex items-center gap-2"
            >
              {scanning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PlayCircle className="h-4 w-4" />
              )}
              {scanning ? 'Scanning...' : dryRun ? 'Preview Relink' : 'Execute Relink'}
            </Button>

            {report && (
              <Button variant="outline" onClick={exportReport}>
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            )}
          </div>

          {scanning && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Scanning storage buckets...
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {report && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Relink Report
            </CardTitle>
            <CardDescription>
              Scan completed at {new Date(report.scanTime).toLocaleString()}
              {dryRun && ' (Preview Mode)'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="summary" className="w-full">
              <TabsList>
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="results">Detailed Results</TabsTrigger>
                <TabsTrigger value="actions">Next Actions</TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Total Scanned</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{report.totalDocuments}</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-1">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        {dryRun ? 'Can Relink' : 'Relinked'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">{report.successfulRelinks}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-1">
                        <XCircle className="h-4 w-4 text-red-600" />
                        Failed
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">{report.failedRelinks}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-1">
                        <FileX className="h-4 w-4 text-red-600" />
                        Not Found
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">{report.notFound}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-1">
                        <Database className="h-4 w-4 text-blue-600" />
                        Already OK
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">{report.alreadyExists}</div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="results" className="space-y-4">
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Document</TableHead>
                        <TableHead>File Name</TableHead>
                        <TableHead>Found In</TableHead>
                        <TableHead>Path</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.results.map((result) => (
                        <TableRow key={result.documentId}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(result.status)}
                              {getStatusBadge(result.status)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{result.title || 'Untitled'}</div>
                              <div className="text-xs text-muted-foreground font-mono">
                                {result.documentId.slice(0, 8)}...
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{result.fileName}</TableCell>
                          <TableCell>
                            {result.bucket && (
                              <Badge variant="outline">{result.bucket}</Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs max-w-xs truncate">
                            {result.newPath || result.oldPath}
                          </TableCell>
                          <TableCell className="text-red-600 text-sm">
                            {result.error}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="actions" className="space-y-4">
                <div className="space-y-4">
                  {dryRun && report.successfulRelinks > 0 && (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertTitle>Ready to Execute</AlertTitle>
                      <AlertDescription>
                        {report.successfulRelinks} documents can be automatically relinked. 
                        Turn off dry run mode and click "Execute Relink" to apply changes.
                      </AlertDescription>
                    </Alert>
                  )}

                  {report.notFound > 0 && (
                    <Alert>
                      <FileX className="h-4 w-4" />
                      <AlertTitle>Manual Re-upload Required</AlertTitle>
                      <AlertDescription>
                        {report.notFound} documents could not be found in any storage bucket. 
                        These will need to be manually re-uploaded using the Replace Document feature.
                      </AlertDescription>
                    </Alert>
                  )}

                  {report.failedRelinks > 0 && (
                    <Alert>
                      <XCircle className="h-4 w-4" />
                      <AlertTitle>Failed Relinks</AlertTitle>
                      <AlertDescription>
                        {report.failedRelinks} documents were found but could not be relinked due to errors. 
                        Check the detailed results for specific error messages.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <h4 className="font-medium">Recommended Next Steps:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      {dryRun && report.successfulRelinks > 0 && (
                        <li>Execute the relink operation by disabling dry run mode</li>
                      )}
                      {report.notFound > 0 && (
                        <li>Use "Replace Document" feature for {report.notFound} missing documents</li>
                      )}
                      {report.failedRelinks > 0 && (
                        <li>Review error messages and manually fix {report.failedRelinks} failed documents</li>
                      )}
                      <li>Run the Failed Documents retry after relinking to ensure all documents process correctly</li>
                      <li>Export the report for record keeping and further analysis</li>
                    </ul>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};