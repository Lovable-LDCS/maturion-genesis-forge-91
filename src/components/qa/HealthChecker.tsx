import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  PlayCircle,
  FileText,
  Database,
  Code,
  Shield,
  Layers,
  Activity,
  Settings
} from 'lucide-react';
import { runQAChecks, getCategoryDisplayName, getCategoryDescription, type QACategoryResult } from '@/lib/qaService';

/**
 * Health Checker Component
 * 
 * Admin-only component that runs and displays QA checks in-app.
 * Provides one-click "Run QA" functionality with human-readable reports.
 * 
 * Based on qa/requirements.json and ARCHITECTURE.md
 */
export const HealthChecker: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [strictMode, setStrictMode] = useState(false);
  const [overallStatus, setOverallStatus] = useState<'green' | 'yellow' | 'red' | 'pending'>('pending');
  const [categoryResults, setCategoryResults] = useState<QACategoryResult[]>([]);
  const [lastRunTime, setLastRunTime] = useState<Date | null>(null);

  const handleRunQA = async () => {
    setIsRunning(true);
    setOverallStatus('pending');
    
    try {
      const results = await runQAChecks(strictMode);
      setCategoryResults(results.categories);
      setOverallStatus(results.overallStatus);
      setLastRunTime(results.timestamp);
    } catch (error) {
      console.error('QA execution failed:', error);
      setOverallStatus('red');
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: 'green' | 'yellow' | 'red' | 'pending') => {
    switch (status) {
      case 'green':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'yellow':
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
      case 'red':
        return <XCircle className="h-6 w-6 text-red-500" />;
      default:
        return <Activity className="h-6 w-6 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: 'green' | 'yellow' | 'red' | 'pending') => {
    const variants = {
      green: 'default' as const,
      yellow: 'secondary' as const,
      red: 'destructive' as const,
      pending: 'outline' as const
    };
    
    const labels = {
      green: 'GREEN - All Checks Passed',
      yellow: 'YELLOW - Warnings Present',
      red: 'RED - Failures Detected',
      pending: 'PENDING - Not Run Yet'
    };

    return (
      <Badge variant={variants[status]} className="text-lg px-4 py-2">
        {labels[status]}
      </Badge>
    );
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, React.ReactNode> = {
      architecture_compliance: <FileText className="h-5 w-5" />,
      wiring_verification: <Layers className="h-5 w-5" />,
      build_integrity: <Code className="h-5 w-5" />,
      database_integrity: <Database className="h-5 w-5" />,
      security_posture: <Shield className="h-5 w-5" />,
      environment_checks: <Settings className="h-5 w-5" />,
    };
    
    return icons[category] || <Activity className="h-5 w-5" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Activity className="h-6 w-6" />
                Health Checker
              </CardTitle>
              <CardDescription>
                QA System - Architecture Validation & System Health
              </CardDescription>
            </div>
            {getStatusIcon(overallStatus)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Overall Status */}
          <div className="flex items-center justify-between">
            <div>
              {getStatusBadge(overallStatus)}
            </div>
            <div className="text-sm text-muted-foreground">
              {lastRunTime && `Last run: ${lastRunTime.toLocaleString()}`}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            <Button
              onClick={handleRunQA}
              disabled={isRunning}
              size="lg"
              className="flex items-center gap-2"
            >
              <PlayCircle className="h-5 w-5" />
              {isRunning ? 'Running QA...' : 'Run Health Test'}
            </Button>
            
            <div className="flex items-center gap-2">
              <Switch
                id="strict-mode"
                checked={strictMode}
                onCheckedChange={setStrictMode}
              />
              <Label htmlFor="strict-mode" className="cursor-pointer">
                Strict Mode
                {strictMode && <Badge variant="destructive" className="ml-2">STRICT</Badge>}
              </Label>
            </div>
          </div>

          {/* Strict Mode Info */}
          {strictMode && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Strict mode enabled: Missing environment variables, database connectivity issues, 
                and optional dependencies will cause RED failures.
              </AlertDescription>
            </Alert>
          )}

          {/* Info Alert */}
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              This QA system validates the application against <strong>ARCHITECTURE.md</strong> (True North). 
              All checks are defined in <strong>qa/requirements.json</strong>.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Category Results */}
      {categoryResults.length > 0 && (
        <Tabs defaultValue={categoryResults[0]?.category} className="w-full">
          <TabsList className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {categoryResults.map((result) => (
              <TabsTrigger
                key={result.category}
                value={result.category}
                className="flex items-center gap-2"
              >
                {getCategoryIcon(result.category)}
                <span className="hidden lg:inline">
                  {result.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
                {result.status === 'red' && <XCircle className="h-4 w-4 text-red-500" />}
                {result.status === 'yellow' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                {result.status === 'green' && <CheckCircle className="h-4 w-4 text-green-500" />}
              </TabsTrigger>
            ))}
          </TabsList>

          {categoryResults.map((result) => (
            <TabsContent key={result.category} value={result.category}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getCategoryIcon(result.category)}
                    {result.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </CardTitle>
                  <CardDescription>
                    {result.passedChecks} of {result.totalChecks} checks passed
                    {result.failedChecks > 0 && ` • ${result.failedChecks} failed`}
                    {result.warningChecks > 0 && ` • ${result.warningChecks} warnings`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {result.checks.map((check) => (
                      <div
                        key={check.id}
                        className={`p-4 border rounded-lg ${
                          check.status === 'fail' ? 'border-red-300 bg-red-50' :
                          check.status === 'warning' ? 'border-yellow-300 bg-yellow-50' :
                          'border-green-300 bg-green-50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {check.status === 'pass' && <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />}
                          {check.status === 'fail' && <XCircle className="h-5 w-5 text-red-600 mt-0.5" />}
                          {check.status === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />}
                          
                          <div className="flex-1">
                            <div className="font-semibold">{check.name}</div>
                            <div className="text-sm text-muted-foreground">{check.description}</div>
                            {check.message && (
                              <div className={`mt-2 text-sm ${
                                check.status === 'fail' ? 'text-red-700' :
                                check.status === 'warning' ? 'text-yellow-700' :
                                'text-green-700'
                              }`}>
                                {check.message}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Initial State */}
      {categoryResults.length === 0 && !isRunning && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-semibold mb-2">Ready to run Health Test</p>
              <p className="text-sm text-muted-foreground">
                Click "Run Health Test" to validate the application against the architecture
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
