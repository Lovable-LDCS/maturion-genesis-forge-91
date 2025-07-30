import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RotateCcw, Play, Download, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { useToast } from '@/hooks/use-toast';
import { logKeyDecision, logCriticalError } from '@/lib/errorUtils';

interface RegressionTestResult {
  mpsId: string;
  mpsNumber: number;
  mpsTitle: string;
  domainName: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'error';
  timestamp: string;
  criteriaCount?: number;
  issues?: string[];
  previousCriteriaCount?: number;
  drift?: 'none' | 'minor' | 'major';
  sourceMatch?: boolean;
}

interface RegressionTestModeProps {
  isVisible?: boolean;
  onTestComplete?: (results: RegressionTestResult[]) => void;
}

export const RegressionTestMode: React.FC<RegressionTestModeProps> = ({
  isVisible = false,
  onTestComplete
}) => {
  const [testResults, setTestResults] = useState<RegressionTestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();

  const getAllMPSs = useCallback(async () => {
    if (!currentOrganization?.id) return [];
    
    const { data: domains } = await supabase
      .from('domains')
      .select(`
        id,
        name,
        maturity_practice_statements (
          id,
          name,
          mps_number
        )
      `)
      .eq('organization_id', currentOrganization.id)
      .order('order_index');

    const allMPSs: Array<{
      mpsId: string;
      mpsNumber: number;
      mpsTitle: string;
      domainName: string;
    }> = [];

    domains?.forEach(domain => {
      domain.maturity_practice_statements?.forEach(mps => {
        allMPSs.push({
          mpsId: mps.id,
          mpsNumber: mps.mps_number,
          mpsTitle: mps.name,
          domainName: domain.name
        });
      });
    });

    return allMPSs.sort((a, b) => a.mpsNumber - b.mpsNumber);
  }, [currentOrganization]);

  const testSingleMPS = useCallback(async (mps: {
    mpsId: string;
    mpsNumber: number;
    mpsTitle: string;
    domainName: string;
  }): Promise<RegressionTestResult> => {
    const timestamp = new Date().toISOString();
    
    try {
      // Get current criteria count
      const { data: currentCriteria } = await supabase
        .from('criteria')
        .select('id, statement')
        .eq('mps_id', mps.mpsId);

      // Get historical data (if any)
      const { data: historicalData } = await supabase
        .from('criteria')
        .select('id')
        .eq('mps_id', mps.mpsId);

      // Test document context availability using the same direct query method as criteria generation
      const { data: directChunks, error: chunkError } = await supabase
        .from('ai_document_chunks')
        .select('content, ai_documents!inner(title, document_type)')
        .eq('organization_id', currentOrganization?.id)
        .eq('ai_documents.document_type', 'mps_document')
        .ilike('content', `%MPS ${mps.mpsNumber}%`)
        .limit(1);

      // Also test using the search function for comparison
      const { data: contextTest } = await supabase.functions.invoke('search-ai-context', {
        body: {
          query: `MPS ${mps.mpsNumber}`,
          organizationId: currentOrganization?.id,
          documentTypes: ['mps', 'standard'],
          threshold: 0.3,
          limit: 1
        }
      });

      const issues: string[] = [];
      let status: RegressionTestResult['status'] = 'passed';

      // Check for document availability using both methods
      const directDocumentFound = !chunkError && directChunks && directChunks.length > 0;
      const searchDocumentFound = contextTest?.data?.results?.length > 0;
      const documentFound = directDocumentFound || searchDocumentFound;
      
      if (!documentFound) {
        issues.push(`No document context available (Direct: ${directDocumentFound ? 'Found' : 'Not found'}, Search: ${searchDocumentFound ? 'Found' : 'Not found'})`);
        status = 'failed';
      }

      // Check for criteria drift
      const previousCount = historicalData?.length || 0;
      const currentCount = currentCriteria?.length || 0;
      let drift: 'none' | 'minor' | 'major' = 'none';

      if (Math.abs(currentCount - previousCount) > 5) {
        drift = 'major';
        issues.push(`Major criteria count drift: ${previousCount} → ${currentCount}`);
        status = 'failed';
      } else if (Math.abs(currentCount - previousCount) > 2) {
        drift = 'minor';
        issues.push(`Minor criteria count drift: ${previousCount} → ${currentCount}`);
      }

      // Check for placeholder content
      const hasPlaceholders = currentCriteria?.some(c => 
        /Assessment Criterion [0-9]/i.test(c.statement) ||
        /Criterion [A-Z]/i.test(c.statement) ||
        /\[PLACEHOLDER\]/i.test(c.statement)
      );

      if (hasPlaceholders) {
        issues.push('Placeholder content detected in criteria');
        status = 'failed';
      }

      // Log the test
      logKeyDecision('Regression Test', {
        mpsNumber: mps.mpsNumber,
        mpsTitle: mps.mpsTitle,
        organizationId: currentOrganization?.id || '',
        documentFound,
        aiDecisionPath: ['REGRESSION_TEST', status.toUpperCase()],
        fallbackTriggered: issues.length > 0 ? {
          reason: issues.join(', '),
          source: 'Regression Test'
        } : undefined
      }, true);

      return {
        mpsId: mps.mpsId,
        mpsNumber: mps.mpsNumber,
        mpsTitle: mps.mpsTitle,
        domainName: mps.domainName,
        status,
        timestamp,
        criteriaCount: currentCount,
        previousCriteriaCount: previousCount,
        issues: issues.length > 0 ? issues : undefined,
        drift,
        sourceMatch: documentFound
      };

    } catch (error) {
      logCriticalError('Regression test error', error);
      return {
        mpsId: mps.mpsId,
        mpsNumber: mps.mpsNumber,
        mpsTitle: mps.mpsTitle,
        domainName: mps.domainName,
        status: 'error',
        timestamp,
        issues: [`Test error: ${error.message}`]
      };
    }
  }, [currentOrganization]);

  const runRegressionTests = useCallback(async () => {
    if (!currentOrganization?.id || isRunning) return;

    setIsRunning(true);
    setProgress(0);
    setTestResults([]);

    try {
      const allMPSs = await getAllMPSs();
      
      if (allMPSs.length === 0) {
        toast({
          title: "No MPSs Found",
          description: "No maturity practice statements found to test",
          variant: "destructive"
        });
        return;
      }

      const results: RegressionTestResult[] = [];

      for (let i = 0; i < allMPSs.length; i++) {
        const mps = allMPSs[i];
        setCurrentTest(`Testing MPS ${mps.mpsNumber}: ${mps.mpsTitle}`);
        
        const result = await testSingleMPS(mps);
        results.push(result);
        setTestResults([...results]);
        
        setProgress((i + 1) / allMPSs.length * 100);
        
        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const passedCount = results.filter(r => r.status === 'passed').length;
      const failedCount = results.filter(r => r.status === 'failed').length;
      const errorCount = results.filter(r => r.status === 'error').length;

      toast({
        title: "Regression Tests Complete",
        description: `${passedCount} passed, ${failedCount} failed, ${errorCount} errors`,
        variant: failedCount > 0 || errorCount > 0 ? "destructive" : "default"
      });

      onTestComplete?.(results);

    } catch (error) {
      logCriticalError('Regression test suite error', error);
      toast({
        title: "Test Suite Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
      setCurrentTest(null);
      setProgress(0);
    }
  }, [currentOrganization, getAllMPSs, testSingleMPS, toast, onTestComplete, isRunning]);

  const downloadReport = useCallback(() => {
    const report = {
      title: 'Maturion Regression Test Report',
      timestamp: new Date().toISOString(),
      organization: currentOrganization?.name,
      summary: {
        total: testResults.length,
        passed: testResults.filter(r => r.status === 'passed').length,
        failed: testResults.filter(r => r.status === 'failed').length,
        errors: testResults.filter(r => r.status === 'error').length
      },
      results: testResults
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `regression-test-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [testResults, currentOrganization]);

  if (!isVisible) return null;

  const getStatusIcon = (status: RegressionTestResult['status']) => {
    switch (status) {
      case 'passed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'running': return <Clock className="h-4 w-4 text-blue-600" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: RegressionTestResult['status']) => {
    switch (status) {
      case 'passed': return 'default';
      case 'failed': return 'destructive';
      case 'error': return 'destructive';
      case 'running': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RotateCcw className="h-5 w-5" />
          Regression Test Mode
          <Badge variant="outline">ADMIN</Badge>
        </CardTitle>
        <CardDescription>
          Re-run all MPS generations and compare with previous versions to detect drift and issues
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Button 
            onClick={runRegressionTests}
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            {isRunning ? 'Running Tests...' : 'Run All Tests'}
          </Button>
          
          {testResults.length > 0 && (
            <Button onClick={downloadReport} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download Report
            </Button>
          )}
        </div>

        {isRunning && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <div className="text-sm text-muted-foreground">
              {currentTest || 'Preparing tests...'}
            </div>
          </div>
        )}

        {testResults.length > 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {testResults.filter(r => r.status === 'passed').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Passed</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {testResults.filter(r => r.status === 'failed').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {testResults.filter(r => r.status === 'error').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Errors</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold">
                    {testResults.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Total</div>
                </CardContent>
              </Card>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>MPS</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criteria</TableHead>
                  <TableHead>Drift</TableHead>
                  <TableHead>Issues</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {testResults.map((result, index) => (
                  <TableRow key={result.mpsId}>
                    <TableCell>
                      <div>
                        <div className="font-medium">MPS {result.mpsNumber}</div>
                        <div className="text-sm text-muted-foreground">
                          {result.mpsTitle}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {result.domainName}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(result.status)}
                        <Badge variant={getStatusColor(result.status)}>
                          {result.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        Current: {result.criteriaCount || 0}
                        {result.previousCriteriaCount !== undefined && (
                          <div className="text-xs text-muted-foreground">
                            Previous: {result.previousCriteriaCount}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {result.drift && result.drift !== 'none' && (
                        <Badge variant={result.drift === 'major' ? 'destructive' : 'secondary'}>
                          {result.drift}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {result.issues && result.issues.length > 0 && (
                        <div className="space-y-1">
                          {result.issues.map((issue, i) => (
                            <div key={i} className="text-xs text-red-600">
                              {issue}
                            </div>
                          ))}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};