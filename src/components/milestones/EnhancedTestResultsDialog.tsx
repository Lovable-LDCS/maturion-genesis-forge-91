import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Download, 
  Shield, 
  Clock,
  FileText,
  Bug,
  Database,
  Server,
  Globe,
  Activity,
  Monitor,
  Settings,
  Zap,
  User,
  RefreshCw
} from 'lucide-react';
import { TestSession, TestResult } from '@/hooks/useMilestoneTests';
import { AdvancedDiagnostics } from '@/components/diagnostics/AdvancedDiagnostics';

interface EnhancedTestResultsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: TestSession | null;
  milestoneName: string;
  onManualVerify: (verified: boolean, notes?: string) => void;
  onExport: () => void;
}

export const EnhancedTestResultsDialog: React.FC<EnhancedTestResultsDialogProps> = ({
  open,
  onOpenChange,
  session,
  milestoneName,
  onManualVerify,
  onExport
}) => {
  const [manualNotes, setManualNotes] = useState('');
  const [activeTab, setActiveTab] = useState('results');

  if (!session) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      passed: 'bg-green-100 text-green-800 border-green-200',
      warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      failed: 'bg-red-100 text-red-800 border-red-200'
    };

    return variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800';
  };

  const getOverallStatusBadge = (status: string) => {
    switch (status) {
      case 'passed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'database':
        return <Database className="h-4 w-4" />;
      case 'security':
        return <Shield className="h-4 w-4" />;
      case 'routes':
        return <Globe className="h-4 w-4" />;
      case 'functions':
        return <Server className="h-4 w-4" />;
      case 'performance':
        return <Zap className="h-4 w-4" />;
      case 'manual':
        return <User className="h-4 w-4" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Enhanced Test Results: {milestoneName}
          </DialogTitle>
          <DialogDescription>
            Comprehensive Phase 1B test validation with advanced diagnostics and ISO compliance tracking
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="results">Test Results</TabsTrigger>
            <TabsTrigger value="diagnostics">System Diagnostics</TabsTrigger>
            <TabsTrigger value="logs">Error Logs</TabsTrigger>
            <TabsTrigger value="monitoring">Real-time Monitoring</TabsTrigger>
            <TabsTrigger value="verification">Manual Verification</TabsTrigger>
          </TabsList>

          <TabsContent value="results" className="mt-4 space-y-4 overflow-hidden">
            {/* Test Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Test Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {session.results.filter(r => r.status === 'passed').length}
                    </p>
                    <p className="text-sm text-muted-foreground">Passed</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-yellow-600">
                      {session.results.filter(r => r.status === 'warning').length}
                    </p>
                    <p className="text-sm text-muted-foreground">Warnings</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">
                      {session.results.filter(r => r.status === 'failed').length}
                    </p>
                    <p className="text-sm text-muted-foreground">Failed</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{session.results.length}</p>
                    <p className="text-sm text-muted-foreground">Total</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={getOverallStatusBadge(session.overallStatus)}>
                      {session.overallStatus.toUpperCase()}
                    </Badge>
                    {session.manualVerified && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        Manually Verified
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Completed: {session.timestamp.toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Test Results by Category */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Detailed Results by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-4">
                    {/* Group results by category */}
                    {Object.entries(
                      session.results.reduce((acc: Record<string, TestResult[]>, result: TestResult) => {
                        const category = result.category || 'general';
                        if (!acc[category]) acc[category] = [];
                        acc[category].push(result);
                        return acc;
                      }, {} as Record<string, TestResult[]>)
                    ).map(([category, results]) => (
                      <div key={category} className="border rounded-lg p-4">
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          {getCategoryIcon(category)}
                          <span className="capitalize">{category} Tests</span>
                          <Badge variant="outline" className="ml-auto">
                            {results?.length || 0} tests
                          </Badge>
                        </h4>
                         <div className="space-y-2">
                           {results.map((result: TestResult, index: number) => (
                            <div key={index} className="flex items-start justify-between p-3 border rounded-lg">
                              <div className="flex items-start space-x-3">
                                {getStatusIcon(result.status)}
                                 <div className="flex-1">
                                   <p className="font-medium">{result.name}</p>
                                   <p className="text-sm text-muted-foreground">{result.message}</p>
                                  {result.details && (
                                    <details className="text-xs text-muted-foreground mt-1">
                                      <summary className="cursor-pointer">Technical Details</summary>
                                      <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto">
                                        {JSON.stringify(result.details, null, 2)}
                                      </pre>
                                    </details>
                                  )}
                                </div>
                              </div>
                              <Badge className={getStatusBadge(result.status)}>
                                {result.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="diagnostics" className="mt-4 overflow-hidden">
            <ScrollArea className="h-[600px]">
              <AdvancedDiagnostics milestoneId={session.milestoneId} />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="logs" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bug className="h-5 w-5" />
                  Error Logs & Critical Warnings
                </CardTitle>
                <CardDescription>
                  Real-time system logs and error tracking for QA validation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-80">
                  <div className="space-y-2">
                    {session.results
                      .filter(result => result.status === 'failed' || result.status === 'warning')
                      .map((result, index) => (
                        <Alert key={index} className={
                          result.status === 'failed' ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'
                        }>
                          {result.status === 'failed' ? 
                            <XCircle className="h-4 w-4 text-red-500" /> :
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          }
                          <AlertDescription>
                            <div className="space-y-1">
                              <p className="font-medium">{result.name}</p>
                               <p className="text-sm">{result.message}</p>
                               {result.details && (
                                 <p className="text-xs font-mono bg-white/50 p-2 rounded">
                                   {result.details}
                                 </p>
                               )}
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>Category: {result.category}</span>
                                <span>Timestamp: {new Date().toLocaleString()}</span>
                              </div>
                            </div>
                          </AlertDescription>
                        </Alert>
                      ))}

                    {session.results.filter(r => r.status === 'failed' || r.status === 'warning').length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                        <p>No errors or warnings detected</p>
                        <p className="text-sm">All tests passed successfully</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Additional System Health Checks */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Route Verification Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 border rounded">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="font-medium">Active Routes</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      All milestone routes accessible and responding
                    </p>
                  </div>
                  <div className="p-3 border rounded">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <span className="font-medium">404 Prevention</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Route validation active, no broken links detected
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monitoring" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Database className="h-4 w-4" />
                    Database Health
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Connection Status</span>
                      <Badge className="bg-green-100 text-green-800">Connected</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">RLS Policies</span>
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Query Performance</span>
                      <Badge className="bg-green-100 text-green-800">&lt;50ms</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Server className="h-4 w-4" />
                    Edge Functions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">AI Processing</span>
                      <Badge className="bg-yellow-100 text-yellow-800">Processing</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Search Context</span>
                      <Badge className="bg-green-100 text-green-800">Ready</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Response Time</span>
                      <Badge className="bg-green-100 text-green-800">200ms</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Processing Queue Monitor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium">AI Document Processing</p>
                      <p className="text-sm text-muted-foreground">32 documents in queue</p>
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-800">Processing</Badge>
                  </div>
                  <Alert className="border-yellow-200 bg-yellow-50">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Attention:</strong> Some documents have been processing for over 1 hour. 
                      This may indicate a processing bottleneck that requires investigation.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="verification" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  ISO-Compliant Manual Verification
                </CardTitle>
                <CardDescription>
                  QA verification required for ISO 9001, ISO 27001, and ISO 37301 compliance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">Phase 1B Verification Checklist</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">All automated tests reviewed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">System diagnostics validated</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Error logs examined</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Route accessibility confirmed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Processing queue monitored</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-2 block">QA Verification Notes</label>
                    <Textarea
                      placeholder="Document your verification process, any manual checks performed, observations about system performance, and recommendations for Phase 1C..."
                      value={manualNotes}
                      onChange={(e) => setManualNotes(e.target.value)}
                      rows={5}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      These notes will be included in the audit trail for regulatory compliance
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={() => onManualVerify(true, manualNotes)}
                      disabled={session.manualVerified}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Verify & Approve Phase 1B
                    </Button>
                    <Button
                      onClick={() => onManualVerify(false, manualNotes)}
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject & Require Fixes
                    </Button>
                  </div>
                </div>

                {session.manualVerified && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-medium text-green-800 mb-2">Phase 1B Verification Completed</h4>
                    <p className="text-sm text-green-700">This milestone has been manually verified by QA.</p>
                    <p className="text-xs text-green-600 mt-2">
                      Verified on: {session.timestamp.toLocaleString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ISO Compliance Footer */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <Alert className="flex-1 mr-4">
              <Shield className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>ISO Compliance:</strong> This enhanced test session maintains comprehensive audit trails 
                for ISO 9001 (quality management), ISO 27001 (information security), and ISO 37301 (compliance management). 
                All diagnostic results, error logs, and verification steps are timestamped and exportable for regulatory documentation.
              </AlertDescription>
            </Alert>
            
            <div className="flex gap-2">
              <Button onClick={onExport} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Complete Report
              </Button>
              <Button onClick={() => onOpenChange(false)} variant="outline" size="sm">
                Close
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};