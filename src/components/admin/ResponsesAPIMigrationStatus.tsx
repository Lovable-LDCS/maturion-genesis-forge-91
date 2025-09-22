import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, Clock, Zap, Brain, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TestResult {
  status: 'PASS' | 'FAIL';
  [key: string]: any;
}

interface TestResults {
  timestamp: string;
  testType: string;
  results: {
    basic?: TestResult;
    tools?: TestResult;
    conversation?: TestResult;
    performance?: TestResult;
  };
  summary: {
    overall_status: string;
    passed_tests: number;
    total_tests: number;
    migration_ready: boolean;
    recommendations: string[];
  };
}

export const ResponsesAPIMigrationStatus: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const runMigrationTest = async (testType: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-responses-api-integration', {
        body: { testType }
      });

      if (error) throw error;
      
      setTestResults(data);
      toast({
        title: "Test Completed",
        description: `${data.summary.passed_tests}/${data.summary.total_tests} tests passed`,
        variant: data.summary.migration_ready ? "default" : "destructive"
      });
    } catch (error) {
      console.error('Test failed:', error);
      toast({
        title: "Test Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASS':
      case 'ALL_PASS':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'FAIL':
      case 'SOME_FAILURES':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const migrationChecklist = [
    { item: 'API Endpoint Migration', status: 'completed', description: 'All functions migrated from /v1/chat/completions to /v1/responses' },
    { item: 'Model Upgrade', status: 'completed', description: 'Upgraded from gpt-4o-mini to gpt-5 for enhanced reasoning' },
    { item: 'Security Configuration', status: 'completed', description: 'Configured store: false and encrypted reasoning for compliance' },
    { item: 'Built-in Tools Integration', status: 'enhanced', description: 'Web search and file search tools integrated' },
    { item: 'Conversation State Management', status: 'enhanced', description: 'Previous response ID and context chaining implemented' },
    { item: 'Documentation', status: 'completed', description: 'Migration documentation and best practices documented' }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-6 w-6" />
            OpenAI Responses API Migration Status
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            This shows the migration status from OpenAI's Chat Completions API to the new Responses API with GPT-5. 
            The migration enhances Maturion's reasoning capabilities for document analysis and industry-specific insights.
          </p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="checklist" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="checklist">Migration Checklist</TabsTrigger>
              <TabsTrigger value="testing">API Testing</TabsTrigger>
              <TabsTrigger value="benefits">Benefits Realized</TabsTrigger>
            </TabsList>

            <TabsContent value="checklist" className="space-y-4">
              <div className="grid gap-4">
                {migrationChecklist.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {item.status === 'completed' && <CheckCircle className="h-5 w-5 text-green-500" />}
                      {item.status === 'enhanced' && <Zap className="h-5 w-5 text-blue-500" />}
                      <div>
                        <h4 className="font-medium">{item.item}</h4>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                    <Badge variant={item.status === 'completed' ? 'default' : 'secondary'}>
                      {item.status === 'completed' ? 'Complete' : 'Enhanced'}
                    </Badge>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="testing" className="space-y-4">
              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-3">
                  <strong>Purpose:</strong> This tests the AI reasoning engine that powers Maturion's document analysis. 
                  Run these tests to verify that the AI can properly analyze your uploaded documents and provide 
                  industry-specific insights aligned with your organization's context.
                </p>
              </div>
              <div className="flex gap-2 mb-4">
                <Button 
                  onClick={() => runMigrationTest('basic')} 
                  disabled={isLoading}
                  variant="outline"
                >
                  Test Basic API
                </Button>
                <Button 
                  onClick={() => runMigrationTest('tools')} 
                  disabled={isLoading}
                  variant="outline"
                >
                  Test Tools Integration
                </Button>
                <Button 
                  onClick={() => runMigrationTest('conversation')} 
                  disabled={isLoading}
                  variant="outline"
                >
                  Test Conversations
                </Button>
                <Button 
                  onClick={() => runMigrationTest('all')} 
                  disabled={isLoading}
                >
                  Run All Tests
                </Button>
              </div>

              {testResults && (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {getStatusIcon(testResults.summary.overall_status)}
                        Test Results Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Tests Passed</p>
                          <p className="text-2xl font-bold">{testResults.summary.passed_tests}/{testResults.summary.total_tests}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Migration Ready</p>
                          <Badge variant={testResults.summary.migration_ready ? 'default' : 'destructive'}>
                            {testResults.summary.migration_ready ? 'Ready' : 'Needs Work'}
                          </Badge>
                        </div>
                      </div>
                      
                      {testResults.summary.recommendations.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-medium mb-2">Recommendations:</h4>
                          <ul className="space-y-1">
                            {testResults.summary.recommendations.map((rec, index) => (
                              <li key={index} className="text-sm text-muted-foreground">• {rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <div className="grid gap-4">
                    {Object.entries(testResults.results).map(([testName, result]) => (
                      <Card key={testName}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium capitalize">{testName} Test</h4>
                            {getStatusIcon(result.status)}
                          </div>
                          <div className="mt-2 text-sm text-muted-foreground">
                            {testName === 'performance' && (
                              <p>Response time: {result.response_time_ms}ms | Cost efficient: {result.cost_efficient ? 'Yes' : 'No'}</p>
                            )}
                            {testName === 'tools' && (
                              <p>Tool calls detected: {result.has_tool_calls ? 'Yes' : 'No'}</p>
                            )}
                            {testName === 'conversation' && (
                              <p>Context maintained: {result.context_maintained ? 'Yes' : 'No'}</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="benefits" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-blue-500" />
                      Performance Improvements
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li>• 3% improvement in reasoning accuracy</li>
                      <li>• 40-80% cost reduction via better caching</li>
                      <li>• Faster response times with GPT-5</li>
                      <li>• Enhanced agentic behavior</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-green-500" />
                      Security & Compliance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li>• Zero data retention (store: false)</li>
                      <li>• Encrypted reasoning for compliance</li>
                      <li>• Enhanced audit trail capabilities</li>
                      <li>• Policy-aligned governance</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-purple-500" />
                      Enhanced Capabilities
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li>• Built-in web search integration</li>
                      <li>• File search for document analysis</li>
                      <li>• Multi-step reasoning chains</li>
                      <li>• Better context retention</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      Future-Proofing
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li>• Compatible with future OpenAI models</li>
                      <li>• Structured item-based responses</li>
                      <li>• Event-driven architecture</li>
                      <li>• Ready for advanced tools</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};