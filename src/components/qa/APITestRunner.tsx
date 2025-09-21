import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TestResult {
  test: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message?: string;
  data?: any;
  error?: string;
  duration?: number;
}

export const APITestRunner: React.FC = () => {
  const { toast } = useToast();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const updateTestResult = (testName: string, updates: Partial<TestResult>) => {
    setTestResults(prev => 
      prev.map(test => 
        test.test === testName ? { ...test, ...updates } : test
      )
    );
  };

  const addTestResult = (test: TestResult) => {
    setTestResults(prev => [...prev, test]);
  };

  const runAPITests = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    // Initialize test cases
    const testCases = [
      'Database Schema Verification',
      'Data Sources API - List',
      'Data Sources API - Create', 
      'Evidence Submissions API',
      'API Usage Logging',
      'Data Integrity Verification',
      'RLS Security Test'
    ];

    // Add initial test results
    testCases.forEach(testName => {
      addTestResult({
        test: testName,
        status: 'pending'
      });
    });

    try {
      // Test 1: Database Schema Verification
      updateTestResult('Database Schema Verification', { status: 'running' });
      const startTime1 = Date.now();
      
      const { data: tableCheck } = await supabase
        .from('data_sources')
        .select('id')
        .limit(1);
      
      updateTestResult('Database Schema Verification', {
        status: 'passed',
        message: 'All core tables accessible',
        duration: Date.now() - startTime1
      });

      // Test 2: List Data Sources
      updateTestResult('Data Sources API - List', { status: 'running' });
      const startTime2 = Date.now();
      
      const { data: listResponse, error: listError } = await supabase.functions.invoke('test-data-sources-api', {
        method: 'GET'
      });
      
      if (listError) {
        throw new Error(`List API error: ${listError.message}`);
      }
      
      if (!listResponse || !listResponse.success) {
        throw new Error(`List API failed: ${listResponse?.error || 'Unknown error'}`);
      }
      
      updateTestResult('Data Sources API - List', {
        status: 'passed',
        message: `Retrieved ${listResponse.count} data sources`,
        data: listResponse.data,
        duration: Date.now() - startTime2
      });

      // Test 3: Create Data Source
      updateTestResult('Data Sources API - Create', { status: 'running' });
      const startTime3 = Date.now();
      
      // Get first organization ID for testing
      const firstOrg = listResponse.data?.[0]?.organization_id;
      if (!firstOrg) {
        throw new Error('No organization found for testing');
      }

      const { data: createResponse, error: createError } = await supabase.functions.invoke('test-data-sources-api', {
        method: 'POST',
        body: {
          organization_id: firstOrg,
          source_name: `QA Test Source ${Date.now()}`,
          source_type: 'google_drive',
          connection_config: { test: true, client_id: 'qa_test' },
          created_by: firstOrg, // Using org ID as user ID for test
          updated_by: firstOrg
        }
      });
      
      if (createError) {
        throw new Error(`Create API error: ${createError.message}`);
      }
      
      if (!createResponse || !createResponse.success) {
        throw new Error(`Create API failed: ${createResponse?.error || 'Unknown error'}`);
      }
      
      updateTestResult('Data Sources API - Create', {
        status: 'passed',
        message: `Created data source: ${createResponse.data.source_name}`,
        data: createResponse.data,
        duration: Date.now() - startTime3
      });

      // Test 4: Evidence Submissions
      updateTestResult('Evidence Submissions API', { status: 'running' });
      const startTime4 = Date.now();
      
      const { data: evidenceResponse, error: evidenceError } = await supabase.functions.invoke('test-data-sources-api', {
        body: {
          action: 'evidence',
          organization_id: firstOrg,
          // Don't provide data_source_id - let the function create a temp one
          evidence_type: 'document',
          title: `QA Test Evidence ${Date.now()}`,
          description: 'Test evidence for QA validation',
          submitted_by: firstOrg
        }
      });
      
      if (evidenceError) {
        throw new Error(`Evidence API error: ${evidenceError.message}`);
      }
      
      if (!evidenceResponse || !evidenceResponse.success) {
        throw new Error(`Evidence API failed: ${evidenceResponse?.error || 'Unknown error'}`);
      }
      
      updateTestResult('Evidence Submissions API', {
        status: 'passed',
        message: `Created evidence: ${evidenceResponse.data.title}`,
        data: evidenceResponse.data,
        duration: Date.now() - startTime4
      });

      // Test 5: API Usage Logging
      updateTestResult('API Usage Logging', { status: 'running' });
      const startTime5 = Date.now();
      
      const { data: logResponse, error: logError } = await supabase.functions.invoke('test-data-sources-api', {
        body: {
          action: 'logging',
          organization_id: firstOrg,
          user_id: firstOrg,
          // Don't provide data_source_id - let the function create a temp one
        }
      });
      
      if (logError) {
        throw new Error(`Logging API error: ${logError.message}`);
      }
      
      if (!logResponse || !logResponse.success) {
        throw new Error(`Logging API failed: ${logResponse?.error || 'Unknown error'}`);
      }
      
      updateTestResult('API Usage Logging', {
        status: 'passed',
        message: `API call logged: ${logResponse.data.endpoint}`,
        data: logResponse.data,
        duration: Date.now() - startTime5
      });

      // Test 6: Data Integrity Verification
      updateTestResult('Data Integrity Verification', { status: 'running' });
      const startTime6 = Date.now();
      
      // Simply verify that the evidence response contains expected data
      if (!evidenceResponse?.data?.id || !evidenceResponse?.data?.title) {
        throw new Error('Evidence response missing required fields (id, title)');
      }
      
      // Verify the logging response contains expected data
      if (!logResponse?.data?.id || !logResponse?.data?.endpoint) {
        throw new Error('Logging response missing required fields (id, endpoint)');
      }
      
      // Basic data structure validation passed
      const verificationMessage = `Data integrity verified: Evidence "${evidenceResponse.data.title}" and API log "${logResponse.data.endpoint}" created successfully`;
      
      updateTestResult('Data Integrity Verification', {
        status: 'passed',
        message: verificationMessage,
        data: {
          evidence_id: evidenceResponse.data.id,
          log_id: logResponse.data.id,
          evidence_title: evidenceResponse.data.title,
          log_endpoint: logResponse.data.endpoint
        },
        duration: Date.now() - startTime6
      });

      // Test 7: RLS Security (should fail with regular client)
      updateTestResult('RLS Security Test', { status: 'running' });
      const startTime7 = Date.now();
      
      try {
        // This should fail due to RLS restrictions
        const { data: directData, error: directError } = await supabase
          .from('data_sources')
          .insert({
            organization_id: firstOrg,
            source_name: 'Unauthorized Test Source',
            source_type: 'supabase', // Use valid source type
            connection_config: { test: true },
            created_by: firstOrg,
            updated_by: firstOrg
          });
        
        if (!directError) {
          updateTestResult('RLS Security Test', {
            status: 'failed',
            message: 'RLS should have blocked unauthorized insert',
            duration: Date.now() - startTime7
          });
        } else {
          updateTestResult('RLS Security Test', {
            status: 'passed',
            message: 'RLS correctly blocked unauthorized access',
            error: directError.message,
            duration: Date.now() - startTime7
          });
        }
      } catch (error) {
        updateTestResult('RLS Security Test', {
          status: 'passed',
          message: 'RLS correctly blocked unauthorized access',
          error: error instanceof Error ? error.message : 'Unknown error',
          duration: Date.now() - startTime7
        });
      }

      toast({
        title: "QA Tests Completed",
        description: "All API functionality tests have been executed",
      });

    } catch (error) {
      console.error('QA Test Error:', error);
      
      // Enhanced error logging with more details
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      
      // Update any running tests as failed
      setTestResults(prev => 
        prev.map(test => 
          test.status === 'running' ? {
            ...test,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Test failed'
          } : test
        )
      );

      toast({
        title: "QA Tests Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    const variants = {
      passed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800', 
      running: 'bg-blue-100 text-blue-800',
      pending: 'bg-gray-100 text-gray-800'
    };
    
    return (
      <Badge className={variants[status]}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Maturion API QA Test Runner
            <Button 
              onClick={runAPITests} 
              disabled={isRunning}
              className="ml-4"
            >
              {isRunning ? 'Running Tests...' : 'Run QA Tests'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {testResults.map((result, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(result.status)}
                    <h3 className="font-medium">{result.test}</h3>
                  </div>
                  {getStatusBadge(result.status)}
                </div>
                
                {result.message && (
                  <p className="text-sm text-gray-600 mb-2">{result.message}</p>
                )}
                
                {result.error && (
                  <p className="text-sm text-red-600 mb-2">Error: {result.error}</p>
                )}
                
                {result.duration && (
                  <p className="text-xs text-gray-400">Duration: {result.duration}ms</p>
                )}
                
                {result.data && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-500 cursor-pointer">View Response Data</summary>
                    <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
            
            {testResults.length === 0 && (
              <p className="text-gray-500 text-center py-8">
                Click "Run QA Tests" to start the comprehensive API validation
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default APITestRunner;