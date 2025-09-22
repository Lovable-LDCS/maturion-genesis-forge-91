import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { AlertTriangle, CheckCircle, Download, Play, FileText } from 'lucide-react';

interface BulkUpdateReport {
  totalDocuments: number;
  updatedDocuments: number;
  errors: Array<{
    documentId: string;
    title: string;
    error: string;
  }>;
  auditEntries: number;
  dryRun: boolean;
  scope: string;
  timestamp: string;
}

export const BulkContextUpdater: React.FC = () => {
  const [updating, setUpdating] = useState(false);
  const [report, setReport] = useState<BulkUpdateReport | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [scopeAllOrgs, setScopeAllOrgs] = useState(false);
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();

  const runBulkUpdate = async () => {
    if (!currentOrganization && !scopeAllOrgs) {
      toast({
        title: "Organization required",
        description: "Please select an organization or enable 'All Organizations' scope",
        variant: "destructive"
      });
      return;
    }

    setUpdating(true);
    
    try {
      const orgScope = scopeAllOrgs ? null : currentOrganization?.id;
      const scopeDesc = scopeAllOrgs ? 'ALL organizations' : `organization: ${currentOrganization?.name}`;
      
      toast({
        title: `Starting bulk context update (${scopeDesc})`,
        description: dryRun ? 'Running in preview mode - no changes will be made' : 'This will update document contexts and create audit entries',
      });

      const { data, error } = await supabase.functions.invoke('bulk-update-context', {
        body: { 
          organizationId: orgScope,
          dryRun,
          changeReason: "Change organisation"
        }
      });

      if (error) throw error;

      setReport(data.report);
      
      toast({
        title: data.message,
        description: `${data.report.updatedDocuments} documents ${dryRun ? 'would be' : 'were'} updated to Backoffice/Global context`,
      });
      
    } catch (error) {
      console.error('Bulk update error:', error);
      toast({
        title: "Update failed",
        description: error.message || 'An unexpected error occurred',
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  const exportReport = () => {
    if (!report) return;

    const csvRows = [
      ['Document ID', 'Title', 'Status', 'Error Details'].join(','),
      ...report.errors.map(error => 
        [error.documentId, `"${error.title}"`, 'Failed', `"${error.error}"`].join(',')
      )
    ];

    if (report.errors.length === 0) {
      csvRows.push(['No errors', 'All documents processed successfully', 'Success', ''].join(','));
    }

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bulk-context-update-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Bulk Context Updater
          </CardTitle>
          <CardDescription>
            Update all documents to Backoffice/Global context with full audit logging
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This operation will update all documents (that aren't already Global) to have Backoffice/Global context. 
              Each change will be logged in the audit trail with the reason "Change organisation".
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="dry-run"
                checked={dryRun}
                onCheckedChange={setDryRun}
                disabled={updating}
              />
              <Label htmlFor="dry-run">
                Dry Run (Preview Mode) - {dryRun ? 'No changes will be made' : 'Will modify documents and create audit entries'}
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="scope-all-orgs"
                checked={scopeAllOrgs}
                onCheckedChange={setScopeAllOrgs}
                disabled={updating}
              />
              <Label htmlFor="scope-all-orgs">
                Update ALL organizations (not just current: {currentOrganization?.name})
              </Label>
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              onClick={runBulkUpdate}
              disabled={updating}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              {updating ? 'Processing...' : (dryRun ? 'Preview Update' : 'Run Update')}
            </Button>
          </div>

          {updating && (
            <div className="space-y-2">
              <Progress value={50} className="w-full" />
              <p className="text-sm text-muted-foreground">Processing documents...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {report && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Update Report
            </CardTitle>
            <CardDescription>
              Operation completed at {new Date(report.timestamp).toLocaleString()}
              {report.dryRun && ' (Preview Mode)'} • 
              Scope: {report.scope}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{report.totalDocuments}</div>
                <div className="text-sm text-muted-foreground">Documents Found</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{report.updatedDocuments}</div>
                <div className="text-sm text-muted-foreground">
                  {report.dryRun ? 'Would Update' : 'Updated'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{report.errors.length}</div>
                <div className="text-sm text-muted-foreground">Errors</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{report.auditEntries}</div>
                <div className="text-sm text-muted-foreground">
                  {report.dryRun ? 'Audit Entries (Preview)' : 'Audit Entries Created'}
                </div>
              </div>
            </div>

            {report.errors.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Errors ({report.errors.length})</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {report.errors.map((error, index) => (
                    <div key={index} className="p-2 bg-red-50 border border-red-200 rounded text-sm">
                      <div className="font-medium">{error.title}</div>
                      <div className="text-red-600">{error.error}</div>
                      <div className="text-xs text-gray-500">ID: {error.documentId}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={exportReport} className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export CSV Report
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};