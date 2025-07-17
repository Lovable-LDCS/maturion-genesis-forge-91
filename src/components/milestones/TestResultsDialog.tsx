import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Download,
  CheckSquare,
  Square,
  Database,
  Shield,
  Settings,
  Zap,
  User
} from 'lucide-react';
import { TestSession, TestResult } from '@/hooks/useMilestoneTests';
import { format } from 'date-fns';

interface TestResultsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: TestSession | null;
  milestoneName?: string;
  onManualVerify: (verified: boolean, notes?: string) => void;
  onExport: () => void;
}

const getStatusIcon = (status: TestResult['status']) => {
  switch (status) {
    case 'passed':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-600" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    case 'running':
      return <Clock className="h-4 w-4 text-blue-600 animate-spin" />;
  }
};

const getStatusBadge = (status: TestResult['status']) => {
  switch (status) {
    case 'passed':
      return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">Passed</Badge>;
    case 'failed':
      return <Badge variant="destructive">Failed</Badge>;
    case 'warning':
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Warning</Badge>;
    case 'running':
      return <Badge variant="outline">Running</Badge>;
  }
};

const getCategoryIcon = (category: TestResult['category']) => {
  switch (category) {
    case 'database':
      return <Database className="h-4 w-4" />;
    case 'security':
      return <Shield className="h-4 w-4" />;
    case 'structure':
      return <Settings className="h-4 w-4" />;
    case 'performance':
      return <Zap className="h-4 w-4" />;
    case 'manual':
      return <User className="h-4 w-4" />;
  }
};

export const TestResultsDialog: React.FC<TestResultsDialogProps> = ({
  open,
  onOpenChange,
  session,
  milestoneName,
  onManualVerify,
  onExport
}) => {
  const [manualNotes, setManualNotes] = useState(session?.notes || '');
  const [activeTab, setActiveTab] = useState('overview');

  if (!session) return null;

  const resultsByCategory = session.results.reduce((acc, result) => {
    if (!acc[result.category]) {
      acc[result.category] = [];
    }
    acc[result.category].push(result);
    return acc;
  }, {} as Record<string, TestResult[]>);

  const totalTests = session.results.length;
  const passedTests = session.results.filter(r => r.status === 'passed').length;
  const failedTests = session.results.filter(r => r.status === 'failed').length;
  const warningTests = session.results.filter(r => r.status === 'warning').length;
  const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

  const handleManualVerify = () => {
    onManualVerify(true, manualNotes);
  };

  const handleRemoveVerification = () => {
    onManualVerify(false);
    setManualNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <span>Test Results</span>
            {milestoneName && <span className="text-muted-foreground">- {milestoneName}</span>}
            {getStatusIcon(session.overallStatus)}
          </DialogTitle>
          <DialogDescription>
            Test session from {format(session.timestamp, 'MMM d, yyyy at h:mm a')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger 
                value="overview" 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveTab('overview'); }}
              >
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="details"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveTab('details'); }}
              >
                Test Details
              </TabsTrigger>
              <TabsTrigger 
                value="manual"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveTab('manual'); }}
              >
                Manual Review
              </TabsTrigger>
              <TabsTrigger 
                value="export"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveTab('export'); }}
              >
                Export
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-auto">
              <TabsContent value="overview" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Overall Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(session.overallStatus)}
                        <span className="text-2xl font-bold">{Math.round(successRate)}%</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Test Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-green-600">✓ Passed</span>
                          <span className="font-medium">{passedTests}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-yellow-600">⚠ Warnings</span>
                          <span className="font-medium">{warningTests}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-red-600">✗ Failed</span>
                          <span className="font-medium">{failedTests}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Manual Verification</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center space-x-2">
                        {session.manualVerified ? (
                          <>
                            <CheckSquare className="h-4 w-4 text-green-600" />
                            <span className="text-sm text-green-600">Verified</span>
                          </>
                        ) : (
                          <>
                            <Square className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-500">Not verified</span>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Progress value={successRate} className="h-3" />
                    <p className="text-sm text-muted-foreground mt-2">
                      {passedTests} of {totalTests} tests passed
                    </p>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(resultsByCategory).map(([category, results]) => {
                    const categoryPassed = results.filter(r => r.status === 'passed').length;
                    const categoryTotal = results.length;
                    const categorySuccess = (categoryPassed / categoryTotal) * 100;

                    return (
                      <Card key={category}>
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center space-x-2 text-sm">
                            {getCategoryIcon(category as TestResult['category'])}
                            <span className="capitalize">{category}</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Progress value={categorySuccess} className="h-2 mb-2" />
                          <p className="text-xs text-muted-foreground">
                            {categoryPassed}/{categoryTotal} tests passed
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="details" className="space-y-4 mt-4">
                {Object.entries(resultsByCategory).map(([category, results]) => (
                  <Card key={category}>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        {getCategoryIcon(category as TestResult['category'])}
                        <span className="capitalize">{category} Tests</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {results.map((result) => (
                          <div key={result.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                            {getStatusIcon(result.status)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium">{result.name}</h4>
                                {getStatusBadge(result.status)}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">{result.message}</p>
                              {result.details && (
                                <details className="mt-2">
                                  <summary className="text-xs text-muted-foreground cursor-pointer">
                                    View details
                                  </summary>
                                  <p className="text-xs text-muted-foreground mt-1 font-mono whitespace-pre-wrap">
                                    {result.details}
                                  </p>
                                </details>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="manual" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Manual Verification</CardTitle>
                    <DialogDescription>
                      Review the test results and provide manual verification if needed.
                    </DialogDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {session.manualVerified && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <CheckSquare className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-green-800">Manual Verification Complete</span>
                        </div>
                        <p className="text-sm text-green-700 mt-1">
                          Verified on {session.manualVerifiedAt ? format(session.manualVerifiedAt, 'MMM d, yyyy at h:mm a') : 'Unknown'}
                        </p>
                        {session.notes && (
                          <p className="text-sm text-green-700 mt-2 font-mono whitespace-pre-wrap">
                            {session.notes}
                          </p>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="text-sm font-medium">Verification Notes</label>
                      <Textarea
                        value={manualNotes}
                        onChange={(e) => setManualNotes(e.target.value)}
                        placeholder="Add notes about manual review, additional checks performed, etc."
                        className="mt-1"
                        rows={4}
                      />
                    </div>

                    <div className="flex space-x-2">
                      {!session.manualVerified ? (
                        <Button onClick={handleManualVerify}>
                          <CheckSquare className="mr-2 h-4 w-4" />
                          Mark as Manually Verified
                        </Button>
                      ) : (
                        <Button variant="outline" onClick={handleRemoveVerification}>
                          <Square className="mr-2 h-4 w-4" />
                          Remove Verification
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="export" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Export Test Results</CardTitle>
                    <DialogDescription>
                      Download test results for external analysis or reporting.
                    </DialogDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">JSON Export</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          Complete test results with all details in JSON format.
                        </p>
                        <Button onClick={onExport}>
                          <Download className="mr-2 h-4 w-4" />
                          Download JSON
                        </Button>
                      </div>

                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">Copy to Clipboard</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          Copy a summary of test results to your clipboard.
                        </p>
                        <Button 
                          variant="outline"
                          onClick={() => {
                            const summary = `Test Results Summary
Milestone ID: ${session.milestoneId}
Timestamp: ${format(session.timestamp, 'MMM d, yyyy at h:mm a')}
Overall Status: ${session.overallStatus}
Success Rate: ${Math.round(successRate)}%

Tests: ${totalTests} total, ${passedTests} passed, ${warningTests} warnings, ${failedTests} failed

Manual Verification: ${session.manualVerified ? 'Yes' : 'No'}
${session.notes ? `Notes: ${session.notes}` : ''}`;
                            
                            navigator.clipboard.writeText(summary);
                          }}
                        >
                          Copy Summary
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};