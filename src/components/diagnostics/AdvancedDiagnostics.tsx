import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Database, 
  Server, 
  Globe, 
  Shield, 
  Zap,
  RefreshCw,
  Download,
  Bug,
  Monitor,
  Activity
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DiagnosticResult {
  category: string;
  test: string;
  status: 'passed' | 'warning' | 'failed';
  message: string;
  details?: any;
  timestamp: Date;
}

interface EdgeFunctionStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'failed';
  lastRun?: Date;
  errorCount: number;
  avgResponseTime?: number;
}

export const AdvancedDiagnostics: React.FC<{ milestoneId?: string }> = ({ milestoneId }) => {
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [edgeFunctions, setEdgeFunctions] = useState<EdgeFunctionStatus[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [lastRunTime, setLastRunTime] = useState<Date | null>(null);
  const { toast } = useToast();

  const runComprehensiveDiagnostics = async () => {
    setIsRunning(true);
    const results: DiagnosticResult[] = [];
    
    try {
      // 1. Route Verification Tests
      await runRouteTests(results);
      
      // 2. Database Connectivity & RLS Tests
      await runDatabaseTests(results);
      
      // 3. Edge Function Health Checks
      await runEdgeFunctionTests(results);
      
      // 4. Processing Queue Monitoring
      await runProcessingQueueTests(results);
      
      // 5. Authentication & Authorization Tests
      await runAuthTests(results);
      
      setDiagnostics(results);
      setLastRunTime(new Date());
      
      // Show summary notification
      const passed = results.filter(r => r.status === 'passed').length;
      const warnings = results.filter(r => r.status === 'warning').length;
      const failed = results.filter(r => r.status === 'failed').length;
      
      toast({
        title: "Diagnostics Complete",
        description: `${passed} passed, ${warnings} warnings, ${failed} failed`,
        variant: failed > 0 ? "destructive" : warnings > 0 ? "default" : "default"
      });
      
    } catch (error) {
      console.error('Diagnostics failed:', error);
      toast({
        title: "Diagnostics Error",
        description: "Failed to complete diagnostic tests",
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  const runRouteTests = async (results: DiagnosticResult[]) => {
    const routes = [
      '/',
      '/ai/knowledge-base',
      '/assessment-framework',
      '/team',
      '/organization/settings',
      `/milestones/${milestoneId || '6b3cee30-13b1-4597-ab06-57d121923ffd'}`
    ];

    for (const route of routes) {
      try {
        const response = await fetch(window.location.origin + route, { method: 'HEAD' });
        results.push({
          category: 'Routes',
          test: `Route accessibility: ${route}`,
          status: response.ok ? 'passed' : 'failed',
          message: response.ok ? 'Route accessible' : `HTTP ${response.status}`,
          timestamp: new Date()
        });
      } catch (error) {
        results.push({
          category: 'Routes',
          test: `Route accessibility: ${route}`,
          status: 'failed',
          message: 'Network error or route not found',
          details: error,
          timestamp: new Date()
        });
      }
    }
  };

  const runDatabaseTests = async (results: DiagnosticResult[]) => {
    try {
      // Test basic connectivity
      const { data: healthCheck, error: healthError } = await supabase
        .from('profiles')
        .select('count(*)')
        .limit(1);

      results.push({
        category: 'Database',
        test: 'Database connectivity',
        status: healthError ? 'failed' : 'passed',
        message: healthError ? 'Database connection failed' : 'Database connected',
        details: healthError,
        timestamp: new Date()
      });

      // Test RLS policies
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userData.user) {
        // Test milestone access
        const { data: milestones, error: milestoneError } = await supabase
          .from('milestones')
          .select('id')
          .limit(1);

        results.push({
          category: 'Database',
          test: 'RLS Policy validation',
          status: milestoneError ? 'failed' : 'passed',
          message: milestoneError ? 'RLS policy blocking access' : 'RLS policies working correctly',
          details: milestoneError,
          timestamp: new Date()
        });

        // Test organization membership
        const { data: orgMembers, error: orgError } = await supabase
          .from('organization_members')
          .select('role')
          .eq('user_id', userData.user.id);

        results.push({
          category: 'Database',
          test: 'Organization membership',
          status: orgError ? 'failed' : orgMembers && orgMembers.length > 0 ? 'passed' : 'warning',
          message: orgError ? 'Membership check failed' : 
                   orgMembers && orgMembers.length > 0 ? 'Valid organization member' : 'No organization membership',
          timestamp: new Date()
        });
      }

    } catch (error) {
      results.push({
        category: 'Database',
        test: 'Database diagnostics',
        status: 'failed',
        message: 'Database diagnostic suite failed',
        details: error,
        timestamp: new Date()
      });
    }
  };

  const runEdgeFunctionTests = async (results: DiagnosticResult[]) => {
    const functions = [
      'process-ai-document',
      'search-ai-context',
      'send-invitation',
      'send-webhook'
    ];

    const functionStatuses: EdgeFunctionStatus[] = [];

    for (const funcName of functions) {
      try {
        const startTime = Date.now();
        
        // Ping edge function with health check
        const { data, error } = await supabase.functions.invoke(funcName, {
          body: { healthCheck: true }
        });

        const responseTime = Date.now() - startTime;

        const status = error ? 'failed' : 'healthy';
        
        results.push({
          category: 'Edge Functions',
          test: `Function health: ${funcName}`,
          status: error ? 'failed' : 'passed',
          message: error ? `Function error: ${error.message}` : `Healthy (${responseTime}ms)`,
          details: { responseTime, error },
          timestamp: new Date()
        });

        functionStatuses.push({
          name: funcName,
          status,
          lastRun: new Date(),
          errorCount: error ? 1 : 0,
          avgResponseTime: responseTime
        });

      } catch (error) {
        results.push({
          category: 'Edge Functions',
          test: `Function health: ${funcName}`,
          status: 'failed',
          message: 'Function unreachable',
          details: error,
          timestamp: new Date()
        });

        functionStatuses.push({
          name: funcName,
          status: 'failed',
          errorCount: 1
        });
      }
    }

    setEdgeFunctions(functionStatuses);
  };

  const runProcessingQueueTests = async (results: DiagnosticResult[]) => {
    try {
      // Check AI document processing queue
      const { data: processingDocs, error: docError } = await supabase
        .from('ai_documents')
        .select('id, processing_status, created_at')
        .in('processing_status', ['pending', 'processing']);

      if (docError) {
        results.push({
          category: 'Processing Queue',
          test: 'Document processing queue',
          status: 'failed',
          message: 'Unable to check processing queue',
          details: docError,
          timestamp: new Date()
        });
        return;
      }

      const stuckDocs = processingDocs?.filter(doc => {
        const createdAt = new Date(doc.created_at);
        const hoursOld = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
        return hoursOld > 1; // Consider stuck if processing for over 1 hour
      }) || [];

      results.push({
        category: 'Processing Queue',
        test: 'Document processing status',
        status: stuckDocs.length > 0 ? 'warning' : 'passed',
        message: stuckDocs.length > 0 
          ? `${stuckDocs.length} documents appear stuck in processing`
          : `${processingDocs?.length || 0} documents in queue, processing normally`,
        details: { totalProcessing: processingDocs?.length, stuckCount: stuckDocs.length },
        timestamp: new Date()
      });

      // Check for failed documents
      const { data: failedDocs } = await supabase
        .from('ai_documents')
        .select('id, file_name')
        .eq('processing_status', 'failed')
        .limit(10);

      if (failedDocs && failedDocs.length > 0) {
        results.push({
          category: 'Processing Queue',
          test: 'Failed document processing',
          status: 'warning',
          message: `${failedDocs.length} documents failed processing`,
          details: { failedDocs },
          timestamp: new Date()
        });
      }

    } catch (error) {
      results.push({
        category: 'Processing Queue',
        test: 'Processing queue monitoring',
        status: 'failed',
        message: 'Queue monitoring failed',
        details: error,
        timestamp: new Date()
      });
    }
  };

  const runAuthTests = async (results: DiagnosticResult[]) => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      results.push({
        category: 'Authentication',
        test: 'User authentication',
        status: authError || !user ? 'failed' : 'passed',
        message: authError ? 'Authentication failed' : user ? 'User authenticated' : 'No user session',
        timestamp: new Date()
      });

      if (user) {
        // Test session validity
        const { data: session } = await supabase.auth.getSession();
        const sessionValid = session?.session && new Date(session.session.expires_at! * 1000) > new Date();

        results.push({
          category: 'Authentication',
          test: 'Session validity',
          status: sessionValid ? 'passed' : 'warning',
          message: sessionValid ? 'Session valid' : 'Session expired or invalid',
          timestamp: new Date()
        });
      }

    } catch (error) {
      results.push({
        category: 'Authentication',
        test: 'Authentication diagnostics',
        status: 'failed',
        message: 'Authentication test failed',
        details: error,
        timestamp: new Date()
      });
    }
  };

  const exportDiagnosticReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      milestoneId,
      diagnostics,
      edgeFunctions,
      summary: {
        total: diagnostics.length,
        passed: diagnostics.filter(d => d.status === 'passed').length,
        warnings: diagnostics.filter(d => d.status === 'warning').length,
        failed: diagnostics.filter(d => d.status === 'failed').length
      }
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diagnostic-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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

    return (
      <Badge className={variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800'}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  // Auto-run diagnostics on mount
  useEffect(() => {
    runComprehensiveDiagnostics();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Advanced Diagnostics</h2>
          <p className="text-muted-foreground">
            Comprehensive system health monitoring for ISO-compliant QA validation
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={runComprehensiveDiagnostics}
            disabled={isRunning}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? 'Running...' : 'Run Diagnostics'}
          </Button>
          <Button
            onClick={exportDiagnosticReport}
            disabled={diagnostics.length === 0}
            variant="outline"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {diagnostics.filter(d => d.status === 'passed').length}
                </p>
                <p className="text-xs text-muted-foreground">Passed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold text-yellow-600">
                  {diagnostics.filter(d => d.status === 'warning').length}
                </p>
                <p className="text-xs text-muted-foreground">Warnings</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {diagnostics.filter(d => d.status === 'failed').length}
                </p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{diagnostics.length}</p>
                <p className="text-xs text-muted-foreground">Total Tests</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Diagnostic Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="routes">Routes</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="functions">Edge Functions</TabsTrigger>
          <TabsTrigger value="queue">Processing Queue</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                System Health Overview
              </CardTitle>
              <CardDescription>
                Last run: {lastRunTime?.toLocaleString() || 'Never'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {diagnostics.map((diagnostic, index) => (
                    <div key={index} className="flex items-start justify-between p-3 border rounded-lg">
                      <div className="flex items-start space-x-3">
                        {getStatusIcon(diagnostic.status)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{diagnostic.test}</span>
                            {getStatusBadge(diagnostic.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">{diagnostic.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {diagnostic.category} • {diagnostic.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="routes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Route Accessibility Tests
              </CardTitle>
              <CardDescription>
                Verification of critical application routes and 404 prevention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {diagnostics.filter(d => d.category === 'Routes').map((test, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(test.status)}
                      <div>
                        <p className="font-medium">{test.test}</p>
                        <p className="text-sm text-muted-foreground">{test.message}</p>
                      </div>
                    </div>
                    {getStatusBadge(test.status)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database & RLS Policy Validation
              </CardTitle>
              <CardDescription>
                Database connectivity, RLS policies, and data access verification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {diagnostics.filter(d => d.category === 'Database').map((test, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(test.status)}
                      <div>
                        <p className="font-medium">{test.test}</p>
                        <p className="text-sm text-muted-foreground">{test.message}</p>
                        {test.details && (
                          <details className="text-xs text-muted-foreground mt-1">
                            <summary className="cursor-pointer">Details</summary>
                            <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto">
                              {JSON.stringify(test.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(test.status)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="functions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Edge Function Health Status
              </CardTitle>
              <CardDescription>
                Real-time monitoring of Supabase Edge Functions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {edgeFunctions.map((func, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Zap className="h-5 w-5" />
                        <span className="font-medium">{func.name}</span>
                      </div>
                      <Badge className={
                        func.status === 'healthy' ? 'bg-green-100 text-green-800' :
                        func.status === 'degraded' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }>
                        {func.status.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Last Run</p>
                        <p>{func.lastRun?.toLocaleString() || 'Never'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Response Time</p>
                        <p>{func.avgResponseTime ? `${func.avgResponseTime}ms` : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Error Count</p>
                        <p className={func.errorCount > 0 ? 'text-red-600' : ''}>{func.errorCount}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queue">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bug className="h-5 w-5" />
                Processing Queue Monitor
              </CardTitle>
              <CardDescription>
                AI document processing queue status and stuck document detection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {diagnostics.filter(d => d.category === 'Processing Queue').map((test, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(test.status)}
                      <div>
                        <p className="font-medium">{test.test}</p>
                        <p className="text-sm text-muted-foreground">{test.message}</p>
                        {test.details && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {test.details.totalProcessing && (
                              <span>Queue: {test.details.totalProcessing} documents</span>
                            )}
                            {test.details.stuckCount > 0 && (
                              <span className="text-yellow-600 ml-2">
                                ({test.details.stuckCount} stuck)
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(test.status)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ISO Compliance Notice */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>ISO Compliance:</strong> This diagnostic system provides comprehensive 
          technical validation aligned with ISO 9001 (quality assurance), ISO 27001 
          (security monitoring), and ISO 37301 (compliance verification) requirements. 
          All test results are timestamped and exportable for audit documentation.
        </AlertDescription>
      </Alert>
    </div>
  );
};