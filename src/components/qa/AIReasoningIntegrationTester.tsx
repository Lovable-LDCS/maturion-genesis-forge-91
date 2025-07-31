import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { Brain, CheckCircle, AlertCircle, XCircle, Play, FileText, Search, MessageSquare } from 'lucide-react';

interface TestResult {
  success: boolean;
  status: 'HEALTHY' | 'NEEDS_ATTENTION' | 'CRITICAL';
  governanceDocuments: any[];
  aiLogicDocuments: any[];
  searchTest: any;
  contextTest: any;
  issues: string[];
  recommendations: string[];
  timestamp: string;
}

export function AIReasoningIntegrationTester() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult | null>(null);
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();

  const runIntegrationTest = async () => {
    if (!currentOrganization?.id) {
      toast({
        title: "Error",
        description: "No organization selected",
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-ai-reasoning-integration', {
        body: {
          organizationId: currentOrganization.id,
          testQuery: "governance reasoning architecture platform anchor logic"
        }
      });

      if (error) throw error;

      setResults(data);
      
      const statusMessages = {
        HEALTHY: "All AI reasoning systems are functioning correctly!",
        NEEDS_ATTENTION: "Some issues detected that need attention",
        CRITICAL: "Critical issues found - AI reasoning may not be working properly"
      };

      toast({
        title: "Integration Test Complete",
        description: statusMessages[data.status],
        variant: data.status === 'HEALTHY' ? 'default' : 'destructive',
      });

    } catch (error) {
      console.error('Error running integration test:', error);
      toast({
        title: "Test Failed",
        description: "Failed to run AI reasoning integration test",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'HEALTHY': return 'bg-green-500';
      case 'NEEDS_ATTENTION': return 'bg-yellow-500';
      case 'CRITICAL': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'HEALTHY': return <CheckCircle className="h-4 w-4" />;
      case 'NEEDS_ATTENTION': return <AlertCircle className="h-4 w-4" />;
      case 'CRITICAL': return <XCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          AI Reasoning Integration Tester
        </CardTitle>
        <CardDescription>
          Reasoning Layer Integration - Verify that governance documents and AI logic policies are actively integrated into Maturion's reasoning layer
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button 
              onClick={runIntegrationTest} 
              disabled={isRunning || !currentOrganization?.id}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              {isRunning ? 'Running Test...' : 'Run Integration Test'}
            </Button>
            
            {results && (
              <Badge variant="outline" className={`${getStatusColor(results.status)} text-white`}>
                {getStatusIcon(results.status)}
                {results.status.replace('_', ' ')}
              </Badge>
            )}
          </div>

          {results && (
            <div className="space-y-6">
              {/* Governance Documents Status */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Governance Documents ({results.governanceDocuments.length})
                </h3>
                {results.governanceDocuments.length === 0 ? (
                  <div className="text-yellow-600 bg-yellow-50 p-3 rounded-lg">
                    No governance documents found
                  </div>
                ) : (
                  <div className="space-y-2">
                    {results.governanceDocuments.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{doc.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {doc.actual_chunks} chunks • {doc.processing_status}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {doc.processing_status === 'completed' && doc.actual_chunks > 0 ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* AI Logic Documents Status */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  AI Logic Documents ({results.aiLogicDocuments.length})
                </h3>
                {results.aiLogicDocuments.length === 0 ? (
                  <div className="text-yellow-600 bg-yellow-50 p-3 rounded-lg">
                    No AI logic documents found
                  </div>
                ) : (
                  <div className="space-y-2">
                    {results.aiLogicDocuments.slice(0, 5).map((doc, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{doc.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {doc.actual_chunks} chunks • {doc.processing_status}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {doc.processing_status === 'completed' && doc.actual_chunks > 0 ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </div>
                    ))}
                    {results.aiLogicDocuments.length > 5 && (
                      <div className="text-sm text-muted-foreground text-center">
                        ... and {results.aiLogicDocuments.length - 5} more
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Search Test Results */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Search Function Test
                </h3>
                <div className="p-3 border rounded-lg">
                  {results.searchTest?.success ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      Found {results.searchTest.results_found} governance/logic results
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-red-600">
                      <XCircle className="h-4 w-4" />
                      Search failed: {results.searchTest?.error}
                    </div>
                  )}
                </div>
              </div>

              {/* AI Chat Integration Test */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  AI Chat Integration Test
                </h3>
                <div className="p-3 border rounded-lg">
                  {results.contextTest?.success ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        AI chat function working
                      </div>
                      <div className="text-sm">
                        <strong>Governance content included:</strong> {results.contextTest.has_reasoning_architecture ? 'Yes' : 'No'}
                      </div>
                      <div className="text-sm">
                        <strong>Knowledge tier:</strong> {results.contextTest.knowledge_tier}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-red-600">
                      <XCircle className="h-4 w-4" />
                      AI chat failed: {results.contextTest?.error}
                    </div>
                  )}
                </div>
              </div>

              {/* Issues and Recommendations */}
              {(results.issues.length > 0 || results.recommendations.length > 0) && (
                <div className="space-y-4">
                  {results.issues.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-red-600">Issues Found</h3>
                      <ul className="space-y-1 text-sm">
                        {results.issues.map((issue, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {results.recommendations.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-blue-600">Recommendations</h3>
                      <ul className="space-y-1 text-sm">
                        {results.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                Test completed: {new Date(results.timestamp).toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}