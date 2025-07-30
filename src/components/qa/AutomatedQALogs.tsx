import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Clock, Play, AlertTriangle, CheckCircle, XCircle, Loader, TestTube, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';

interface QATestLog {
  id: string;
  run_at: string;
  mps_number: number;
  mps_title: string;
  test_type: 'criteria_generation' | 'regression';
  result: 'passed' | 'failed' | 'error';
  criteria_generated: number;
  drift_detected: boolean;
  notes: string;
  run_type: string;
  triggered_by: string | null;
  created_at: string;
}

interface QASummary {
  lastRun: string | null;
  totalMPSs: number;
  criteriaGeneration: {
    passed: number;
    failed: number;
    successRate: number;
  };
  regression: {
    passed: number;
    failed: number;
    successRate: number;
  };
  alertsTriggered: number;
  failedMPSs: number[];
}

interface TrendData {
  date: string;
  criteriaSuccessRate: number;
  regressionSuccessRate: number;
}

export const AutomatedQALogs: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const [logs, setLogs] = useState<QATestLog[]>([]);
  const [summary, setSummary] = useState<QASummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);

  const fetchQALogs = async () => {
    if (!currentOrganization?.id) return;

    try {
      setLoading(true);
      
      // Fetch recent logs
      const { data: logsData, error: logsError } = await supabase
        .from('qa_test_log')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('run_at', { ascending: false })
        .limit(50);

      if (logsError) {
        console.error('Error fetching QA logs:', logsError);
        toast.error('Failed to fetch QA logs');
        return;
      }

      setLogs((logsData || []) as QATestLog[]);

      // Calculate summary statistics
      if (logsData && logsData.length > 0) {
        const latestRun = logsData[0].run_at;
        const recentLogs = logsData.filter(log => log.run_at === latestRun);
        
        const criteriaGenLogs = recentLogs.filter(log => log.test_type === 'criteria_generation');
        const regressionLogs = recentLogs.filter(log => log.test_type === 'regression');
        
        const criteriaPassed = criteriaGenLogs.filter(log => log.result === 'passed').length;
        const criteriaFailed = criteriaGenLogs.filter(log => log.result !== 'passed').length;
        
        const regressionPassed = regressionLogs.filter(log => log.result === 'passed').length;
        const regressionFailed = regressionLogs.filter(log => log.result !== 'passed').length;
        
        const totalMPSs = Math.max(criteriaGenLogs.length, regressionLogs.length);
        const alertsTriggered = recentLogs.filter(log => log.result === 'failed' || log.result === 'error').length;
        const failedMPSs = recentLogs.filter(log => log.result !== 'passed').map(log => log.mps_number).filter((v, i, a) => a.indexOf(v) === i);

        setSummary({
          lastRun: latestRun,
          totalMPSs,
          criteriaGeneration: {
            passed: criteriaPassed,
            failed: criteriaFailed,
            successRate: criteriaGenLogs.length > 0 ? (criteriaPassed / criteriaGenLogs.length) * 100 : 0
          },
          regression: {
            passed: regressionPassed,
            failed: regressionFailed,
            successRate: regressionLogs.length > 0 ? (regressionPassed / regressionLogs.length) * 100 : 0
          },
          alertsTriggered,
          failedMPSs
        });
      } else {
        setSummary({
          lastRun: null,
          totalMPSs: 0,
          criteriaGeneration: { passed: 0, failed: 0, successRate: 0 },
          regression: { passed: 0, failed: 0, successRate: 0 },
          alertsTriggered: 0,
          failedMPSs: []
        });
      }
    } catch (error) {
      console.error('Error in fetchQALogs:', error);
      toast.error('Failed to fetch QA logs');
    } finally {
      setLoading(false);
    }
  };

  const triggerManualQACycle = async () => {
    try {
      setIsRunning(true);
      toast.info('Triggering manual QA cycle...');
      
      const { data, error } = await supabase.functions.invoke('run-full-qa-cycle', {
        body: { manual: true, organizationId: currentOrganization?.id }
      });

      if (error) {
        throw error;
      }

      toast.success('QA cycle completed successfully');
      
      // Refresh logs after a delay
      setTimeout(() => {
        fetchQALogs();
      }, 2000);
      
    } catch (error) {
      console.error('Error triggering QA cycle:', error);
      toast.error('Failed to trigger QA cycle');
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    fetchQALogs();
  }, [currentOrganization?.id]);

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getResultBadge = (result: string) => {
    switch (result) {
      case 'passed':
        return <Badge variant="default" className="bg-green-600">Passed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'error':
        return <Badge variant="outline" className="border-yellow-600 text-yellow-600">Error</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Loader className="h-8 w-8 mx-auto mb-2 animate-spin" />
          <p>Loading QA logs...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Alert Panel for Recent Failures */}
        {summary && summary.failedMPSs.length > 0 && (
          <Alert className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription>
              <div className="font-medium text-red-800 dark:text-red-200 mb-1">
                ⚠️ Last QA cycle detected {summary.failedMPSs.length} failures
              </div>
              <div className="text-sm text-red-700 dark:text-red-300">
                Failed MPSs: {summary.failedMPSs.map(num => `MPS ${num}`).join(', ')} — check details below
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Success Alert */}
        {summary && summary.failedMPSs.length === 0 && summary.lastRun && (
          <Alert className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription>
              <div className="font-medium text-green-800 dark:text-green-200">
                ✅ All {summary.totalMPSs} MPSs passed the last QA cycle — no action required
              </div>
            </AlertDescription>
          </Alert>
        )}
      {/* QA Summary Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-6 w-6 mx-auto text-blue-600 mb-2" />
            <div className="text-lg font-bold">
              {summary?.lastRun ? new Date(summary.lastRun).toLocaleDateString() : 'Never'}
            </div>
            <div className="text-sm text-muted-foreground">Last QA Run</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-6 w-6 mx-auto text-green-600 mb-2" />
            <div className="text-lg font-bold">
              {summary?.criteriaGeneration.successRate.toFixed(0) || 0}%
            </div>
            <div className="text-sm text-muted-foreground">Criteria Success Rate</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <TestTube className="h-6 w-6 mx-auto text-purple-600 mb-2" />
            <div className="text-lg font-bold">
              {summary?.regression.successRate.toFixed(0) || 0}%
            </div>
            <div className="text-sm text-muted-foreground">Regression Success Rate</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-6 w-6 mx-auto text-red-600 mb-2" />
            <div className="text-lg font-bold">{summary?.alertsTriggered || 0}</div>
            <div className="text-sm text-muted-foreground">Recent Alerts</div>
          </CardContent>
        </Card>
      </div>

      {/* Manual Trigger and Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Automated QA Cycle Management
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">Runs every 12 hours</Badge>
              <Button 
                onClick={triggerManualQACycle} 
                disabled={isRunning}
                size="sm"
              >
                {isRunning ? (
                  <>
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Run Manual QA Cycle
                  </>
                )}
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Automated quality assurance runs every 12 hours to validate criteria generation and regression tests across all MPSs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {summary && summary.lastRun && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-1">Last QA Cycle Results</div>
                <div className="text-sm space-y-1">
                  <div>✅ Criteria Generation: {summary.criteriaGeneration.passed}/{summary.criteriaGeneration.passed + summary.criteriaGeneration.failed} MPSs passed ({summary.criteriaGeneration.successRate.toFixed(0)}%)</div>
                  <div>🔍 Regression Tests: {summary.regression.passed}/{summary.regression.passed + summary.regression.failed} MPSs passed ({summary.regression.successRate.toFixed(0)}%)</div>
                  {summary.alertsTriggered > 0 && (
                    <div className="text-red-600">⚠️ {summary.alertsTriggered} alerts triggered</div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* QA Test Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent QA Test Results</CardTitle>
          <CardDescription>
            Detailed logs from automated QA cycles, showing results for each MPS
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No QA logs found. Run a manual QA cycle to start collecting data.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Run Time</TableHead>
                  <TableHead>MPS</TableHead>
                  <TableHead>Test Type</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Criteria</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      <div>{new Date(log.run_at).toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">
                        {log.run_type === 'manual' ? '👤 Manual' : '⏰ Scheduled'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium flex items-center gap-2">
                        MPS {log.mps_number}
                        {log.drift_detected && (
                          <Tooltip>
                            <TooltipTrigger>
                              <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Drift detected between previous and current criteria. Investigate for AI hallucination or logic shift.</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {log.mps_title}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {log.test_type === 'criteria_generation' ? 'Generation' : 'Regression'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getResultIcon(log.result)}
                        {getResultBadge(log.result)}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="text-xs">
                        {log.criteria_generated}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <div className="text-sm truncate" title={log.notes}>
                        {log.notes || 'No notes'}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
    </TooltipProvider>
  );
};