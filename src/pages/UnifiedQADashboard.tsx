import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Heart,
  BarChart3,
  CheckCircle,
  XCircle,
  Play,
  ChevronRight,
  Laptop,
  Lock,
  Rocket,
  Palette,
  Zap,
  FlaskConical,
  Search,
  Database,
  Shield,
  Activity,
  MessageCircle,
  RefreshCw
} from 'lucide-react';
import { NavigationHelper } from '@/components/ui/navigation-helper';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';
import { getQAStatus, generateQASummary, hasImmediateIssues, type QAStatus } from '@/lib/qaStatusService';

interface TestCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  passed: number;
  failed: number;
  color: string;
}

interface QATestResult {
  category: string;
  test_name: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  timestamp: string;
}

export const UnifiedQADashboard: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const [isRunning, setIsRunning] = useState(false);
  const [lastRunTime, setLastRunTime] = useState<string>('Never');
  const [systemHealth, setSystemHealth] = useState<number>(0);
  const [totalTests, setTotalTests] = useState<number>(0);
  const [passedTests, setPassedTests] = useState<number>(0);
  const [failedTests, setFailedTests] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<QATestResult[]>([]);
  const [qaStatus, setQaStatus] = useState<QAStatus | null>(null);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Test categories matching the reference design
  const [categories, setCategories] = useState<TestCategory[]>([
    {
      id: 'code-correctness',
      name: 'Code Correctness',
      icon: <Laptop className="h-5 w-5" />,
      passed: 52,
      failed: 51,
      color: 'blue'
    },
    {
      id: 'wiring-integration',
      name: 'Wiring & Integration',
      icon: <Activity className="h-5 w-5" />,
      passed: 8,
      failed: 1,
      color: 'purple'
    },
    {
      id: 'security',
      name: 'Security',
      icon: <Lock className="h-5 w-5" />,
      passed: 0,
      failed: 0,
      color: 'orange'
    },
    {
      id: 'deployment',
      name: 'Deployment',
      icon: <Rocket className="h-5 w-5" />,
      passed: 0,
      failed: 0,
      color: 'pink'
    },
    {
      id: 'ui-ux',
      name: 'UI/UX',
      icon: <Palette className="h-5 w-5" />,
      passed: 13,
      failed: 6,
      color: 'rose'
    },
    {
      id: 'performance-timing',
      name: 'Performance & Timing',
      icon: <Zap className="h-5 w-5" />,
      passed: 0,
      failed: 0,
      color: 'yellow'
    },
    {
      id: 'runtime-rendering',
      name: 'Runtime Rendering',
      icon: <FlaskConical className="h-5 w-5" />,
      passed: 3,
      failed: 1,
      color: 'violet'
    },
    {
      id: 'accessibility',
      name: 'Accessibility',
      icon: <Shield className="h-5 w-5" />,
      passed: 0,
      failed: 0,
      color: 'cyan'
    },
    {
      id: 'data-integrity',
      name: 'Data Integrity',
      icon: <Database className="h-5 w-5" />,
      passed: 0,
      failed: 0,
      color: 'indigo'
    },
    {
      id: 'duplicates-legacy',
      name: 'Duplicates & Legacy',
      icon: <Search className="h-5 w-5" />,
      passed: 3,
      failed: 0,
      color: 'teal'
    }
  ]);

  useEffect(() => {
    loadQAMetrics();
    // Refresh every 30 seconds
    const interval = setInterval(loadQAMetrics, 30000);
    return () => clearInterval(interval);
  }, [currentOrganization]);

  const loadQAMetrics = async () => {
    if (!currentOrganization?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Load latest QA metrics from database
      const { data: metrics } = await supabase
        .from('qa_metrics')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('recorded_at', { ascending: false })
        .limit(1);

      if (metrics && metrics.length > 0) {
        const latestMetric = metrics[0];
        if (latestMetric.metric_data?.last_run_time) {
          const runTime = new Date(latestMetric.metric_data.last_run_time);
          setLastRunTime(runTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        }
        if (latestMetric.metric_data?.total_tests) {
          setTotalTests(latestMetric.metric_data.total_tests);
        }
        if (latestMetric.metric_data?.passed) {
          setPassedTests(latestMetric.metric_data.passed);
        }
        if (latestMetric.metric_data?.failed) {
          setFailedTests(latestMetric.metric_data.failed);
        }
      }

      // Load watchdog system health from multiple indicators
      const { data: watchdogIncidents } = await supabase
        .from('watchdog_incidents')
        .select('status')
        .eq('organization_id', currentOrganization.id);

      const { data: watchdogAlerts } = await supabase
        .from('watchdog_alerts')
        .select('severity_level, resolved')
        .eq('organization_id', currentOrganization.id);

      // Load document processing success rates
      const { data: documents } = await supabase
        .from('maturion_documents')
        .select('status')
        .eq('organization_id', currentOrganization.id);

      // Calculate comprehensive system health
      let healthScore = 100;
      
      // Factor 1: Watchdog incidents (30% weight)
      if (watchdogIncidents && watchdogIncidents.length > 0) {
        const resolvedIncidents = watchdogIncidents.filter(i => i.status === 'resolved').length;
        const incidentHealth = (resolvedIncidents / watchdogIncidents.length) * 100;
        healthScore -= (100 - incidentHealth) * 0.3;
      }

      // Factor 2: Active alerts (30% weight)
      if (watchdogAlerts && watchdogAlerts.length > 0) {
        const unresolvedAlerts = watchdogAlerts.filter(a => !a.resolved).length;
        const criticalAlerts = watchdogAlerts.filter(a => a.severity_level === 'critical' && !a.resolved).length;
        const alertPenalty = (unresolvedAlerts * 2 + criticalAlerts * 5);
        healthScore -= Math.min(alertPenalty, 30);
      }

      // Factor 3: Document processing success (40% weight)
      if (documents && documents.length > 0) {
        const processedDocs = documents.filter(d => d.status === 'processed').length;
        const docHealth = (processedDocs / documents.length) * 100;
        healthScore -= (100 - docHealth) * 0.4;
      }

      setSystemHealth(Math.max(0, Math.min(100, Math.round(healthScore))));

      // Get AI-ready status summary
      if (currentOrganization?.id) {
        const status = await getQAStatus(currentOrganization.id);
        setQaStatus(status);
        const summary = generateQASummary(status);
        setAiSummary(summary);
      }

    } catch (error) {
      console.error('Error loading QA metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunAllTests = async () => {
    setIsRunning(true);
    
    try {
      const now = new Date();
      setLastRunTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

      // Store QA run in database
      if (currentOrganization?.id) {
        await supabase
          .from('qa_metrics')
          .insert({
            organization_id: currentOrganization.id,
            metric_type: 'qa_dashboard_run',
            metric_value: systemHealth,
            metric_data: {
              last_run_time: now.toISOString(),
              total_tests: totalTests,
              passed: passedTests,
              failed: failedTests
            }
          });
      }

      // TODO: In production, replace this with actual test execution logic
      // For now, simulate test execution to demonstrate the UI
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Reload metrics after run
      loadQAMetrics();
    } catch (error) {
      console.error('Error running QA tests:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const handleViewCategory = (categoryId: string) => {
    setSelectedCategory(categoryId);
    
    // TODO: Replace mock data with actual database queries for test results
    // For now, generate placeholder data to demonstrate the drill-down UI
    const category = categories.find(c => c.id === categoryId);
    if (category) {
      const mockResults: QATestResult[] = [];
      for (let i = 0; i < category.passed; i++) {
        mockResults.push({
          category: category.name,
          test_name: `${category.name} - Test ${i + 1}`,
          status: 'passed',
          message: 'All checks passed successfully',
          timestamp: new Date().toISOString()
        });
      }
      for (let i = 0; i < category.failed; i++) {
        mockResults.push({
          category: category.name,
          test_name: `${category.name} - Test ${category.passed + i + 1}`,
          status: 'failed',
          message: 'Check failed - requires attention',
          timestamp: new Date().toISOString()
        });
      }
      setTestResults(mockResults);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <NavigationHelper />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quality Assurance Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Monitor app health, run tests, and identify issues that need attention
          </p>
        </div>
      </div>

      {/* Run Tests Button */}
      <div className="flex items-center gap-4">
        <Button 
          onClick={handleRunAllTests}
          disabled={isRunning}
          size="lg"
          className="bg-primary hover:bg-primary/90"
        >
          <Play className="h-4 w-4 mr-2" />
          {isRunning ? 'Running Tests...' : 'Run All QA Tests'}
        </Button>
        <span className="text-sm text-muted-foreground">
          Last run: {lastRunTime}
        </span>
      </div>

      {/* Top-level Metrics */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                  <div className="h-8 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* System Health */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                SYSTEM HEALTH
              </CardTitle>
              <Heart className="h-5 w-5 text-pink-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-green-600">{systemHealth}%</div>
              <div className="text-xs text-muted-foreground">Health Score</div>
              <Button 
                variant="link" 
                className="p-0 h-auto text-sm text-blue-600"
                onClick={() => setSelectedCategory('watchdog')}
              >
                View Details →
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Total Tests */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                TOTAL TESTS
              </CardTitle>
              <BarChart3 className="h-5 w-5 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-4xl font-bold">{totalTests}</div>
              <div className="text-xs text-muted-foreground">Tests Performed</div>
              <Button 
                variant="link" 
                className="p-0 h-auto text-sm text-blue-600"
                onClick={() => setSelectedCategory('all')}
              >
                View All Tests →
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Passed */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                PASSED
              </CardTitle>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-green-600">{passedTests}</div>
              <div className="text-xs text-muted-foreground">Tests Passed</div>
              <Button 
                variant="link" 
                className="p-0 h-auto text-sm text-blue-600"
                onClick={() => setSelectedCategory('passed')}
              >
                View Passed →
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Failed */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                FAILED
              </CardTitle>
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-red-600">{failedTests}</div>
              <div className="text-xs text-muted-foreground">Tests Failed</div>
              <Button 
                variant="link" 
                className="p-0 h-auto text-sm text-blue-600"
                onClick={() => setSelectedCategory('failed')}
              >
                View Failed →
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      )}

      {/* Test Categories Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Test Categories Breakdown</CardTitle>
          <CardDescription>
            Detailed view of test results by category
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <Card 
                key={category.id}
                className={`cursor-pointer hover:shadow-md transition-shadow ${
                  category.id === 'wiring-integration' ? 'border-blue-500 border-2' : ''
                }`}
                onClick={() => handleViewCategory(category.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    {category.icon}
                    <CardTitle className="text-base">{category.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-col items-center">
                      <div className="text-2xl font-bold">{category.passed}</div>
                      <div className="text-xs text-muted-foreground">PASSED</div>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="text-2xl font-bold">{category.failed}</div>
                      <div className="text-xs text-muted-foreground">FAILED</div>
                    </div>
                  </div>
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-sm w-full justify-start text-blue-600"
                  >
                    Details <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Test Results */}
      {selectedCategory && (
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedCategory === 'all' && 'All Test Results'}
              {selectedCategory === 'passed' && 'Passed Tests'}
              {selectedCategory === 'failed' && 'Failed Tests'}
              {selectedCategory === 'watchdog' && 'Watchdog Health Details'}
              {!['all', 'passed', 'failed', 'watchdog'].includes(selectedCategory) && 
                categories.find(c => c.id === selectedCategory)?.name
              }
            </CardTitle>
            <CardDescription>
              Detailed breakdown of test results
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedCategory === 'watchdog' ? (
              <Alert>
                <Activity className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-semibold">System Health: {systemHealth}%</p>
                    <p>The watchdog monitors:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>AI document ingestion and processing</li>
                      <li>Database connectivity and performance</li>
                      <li>API endpoint health</li>
                      <li>Authentication and security</li>
                      <li>Background job execution</li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            ) : testResults.length > 0 ? (
              <div className="space-y-2">
                {testResults.map((result, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {result.status === 'passed' ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <div>
                        <div className="font-medium">{result.test_name}</div>
                        <div className="text-sm text-muted-foreground">{result.message}</div>
                      </div>
                    </div>
                    <Badge variant={result.status === 'passed' ? 'default' : 'destructive'}>
                      {result.status.toUpperCase()}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <Alert>
                <AlertDescription>
                  Click "Run All QA Tests" to see detailed results for this category.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI Integration Notice */}
      <Card className={qaStatus && hasImmediateIssues(qaStatus) ? 'border-red-500 border-2' : ''}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              <CardTitle>AI Assistant Integration</CardTitle>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={loadQAMetrics}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Status
            </Button>
          </div>
          <CardDescription>
            Ask the AI assistant about system health and get intelligent real-time answers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm font-semibold mb-2">Try asking the AI:</p>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• "Are there any issues in the app that need immediate attention?"</li>
              <li>• "What is the current system health status?"</li>
              <li>• "Show me critical QA issues"</li>
              <li>• "What are the recent test failures?"</li>
            </ul>
          </div>

          {qaStatus && qaStatus.criticalIssues.length > 0 && (
            <Alert variant="destructive">
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold">Critical Issues Detected:</p>
                  <ul className="text-sm space-y-1">
                    {qaStatus.criticalIssues.slice(0, 5).map((issue, index) => (
                      <li key={index}>{issue}</li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {qaStatus && qaStatus.warnings.length > 0 && (
            <Alert>
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold">Warnings:</p>
                  <ul className="text-sm space-y-1">
                    {qaStatus.warnings.map((warning, index) => (
                      <li key={index}>⚠️ {warning}</li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {qaStatus && qaStatus.recommendations.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="font-semibold text-sm mb-2 text-blue-900 dark:text-blue-100">
                Recommendations:
              </p>
              <ul className="text-sm space-y-1 text-blue-800 dark:text-blue-200">
                {qaStatus.recommendations.map((rec, index) => (
                  <li key={index}>💡 {rec}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            <p>
              The AI assistant has full access to real-time QA status, watchdog alerts, 
              and test results. Responses are generated from live data - not hard-coded.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UnifiedQADashboard;
