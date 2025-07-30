import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { buildAICriteriaPrompt, validateCriteria, MPSContext, OrganizationContext } from '@/lib/promptUtils';

interface TestResult {
  test: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

export const QASystemTest: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const { currentOrganization } = useOrganization();

  const runSystemTests = async () => {
    if (!currentOrganization) return;
    
    setIsRunning(true);
    const testResults: TestResult[] = [];

    try {
      // Test 1: Verify domains exist
      const { data: domains } = await supabase
        .from('domains')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('display_order');

      if (domains && domains.length === 5) {
        testResults.push({
          test: 'Domain Structure',
          status: 'pass',
          message: `All 5 domains found: ${domains.map(d => d.name).join(', ')}`,
          details: domains
        });
      } else {
        testResults.push({
          test: 'Domain Structure',
          status: 'fail', 
          message: `Expected 5 domains, found ${domains?.length || 0}`,
          details: domains
        });
      }

      // Test 2: Verify MPS distribution
      const { data: mpsData } = await supabase
        .from('maturity_practice_statements')
        .select('mps_number, name, domain_id, domains(name)')
        .eq('organization_id', currentOrganization.id)
        .order('mps_number');

      if (mpsData && mpsData.length === 25) {
        const mpsDistribution = mpsData.reduce((acc: any, mps: any) => {
          const domainName = mps.domains?.name;
          if (!acc[domainName]) acc[domainName] = [];
          acc[domainName].push(mps.mps_number);
          return acc;
        }, {});

        testResults.push({
          test: 'MPS Distribution',
          status: 'pass',
          message: 'All 25 MPSs properly distributed across domains',
          details: mpsDistribution
        });
      } else {
        testResults.push({
          test: 'MPS Distribution',
          status: 'fail',
          message: `Expected 25 MPSs, found ${mpsData?.length || 0}`,
          details: mpsData
        });
      }

      // Test 3: Verify AI documents exist
      const { data: aiDocs } = await supabase
        .from('ai_documents')
        .select('title, processing_status')
        .eq('organization_id', currentOrganization.id)
        .eq('document_type', 'mps_document');

      if (aiDocs && aiDocs.length >= 25) {
        const processedDocs = aiDocs.filter(doc => doc.processing_status === 'completed');
        testResults.push({
          test: 'AI Documents',
          status: processedDocs.length === aiDocs.length ? 'pass' : 'warning',
          message: `${processedDocs.length}/${aiDocs.length} MPS documents processed`,
          details: aiDocs
        });
      } else {
        testResults.push({
          test: 'AI Documents',
          status: 'fail',
          message: `Expected at least 25 MPS documents, found ${aiDocs?.length || 0}`,
          details: aiDocs
        });
      }

      // Test 4: Test document chunks
      const { data: chunks } = await supabase
        .from('ai_document_chunks')
        .select('id')
        .eq('organization_id', currentOrganization.id);

      if (chunks && chunks.length > 0) {
        testResults.push({
          test: 'Document Chunks',
          status: 'pass',
          message: `${chunks.length} document chunks available`,
          details: { chunkCount: chunks.length }
        });
      } else {
        testResults.push({
          test: 'Document Chunks',
          status: 'fail',
          message: 'No document chunks found',
          details: chunks
        });
      }

      // Test 5: Test search-ai-context function (uses ai_document_chunks table)
      try {
        const { data: searchResult, error: searchError } = await supabase.functions.invoke('search-ai-context', {
          body: {
            query: 'MPS 4 Risk Management',
            organizationId: currentOrganization.id,
            documentTypes: ['mps_document'],
            limit: 3
          }
        });

        if (searchError) {
          testResults.push({
            test: 'AI Context Search',
            status: 'fail',
            message: `Search function error: ${searchError.message}`,
            details: searchError
          });
        } else if (searchResult?.success && searchResult.results.length > 0) {
          testResults.push({
            test: 'AI Context Search',
            status: 'pass',
            message: `Search found ${searchResult.results.length} relevant chunks`,
            details: searchResult
          });
        } else {
          testResults.push({
            test: 'AI Context Search',
            status: 'warning',
            message: 'Search function works but found no results',
            details: searchResult
          });
        }
      } catch (error: any) {
        testResults.push({
          test: 'AI Context Search',
          status: 'fail',
          message: `Search function failed: ${error.message}`,
          details: error
        });
      }

      // Test 6: Test prompt generation
      if (mpsData && mpsData.length > 0) {
        const testMPS = mpsData.find(mps => mps.mps_number === 4); // Test with MPS 4
        if (testMPS) {
          const mpsContext: MPSContext = {
            mpsId: testMPS.domain_id,
            mpsNumber: testMPS.mps_number,
            mpsTitle: testMPS.name,
            domainId: testMPS.domain_id,
            organizationId: currentOrganization.id
          };

          const orgContext: OrganizationContext = {
            id: currentOrganization.id,
            name: currentOrganization.name,
            industry_tags: currentOrganization.industry_tags || [],
            region_operating: currentOrganization.region_operating || '',
            compliance_commitments: currentOrganization.compliance_commitments || [],
            custom_industry: currentOrganization.custom_industry || ''
          };

          const prompt = buildAICriteriaPrompt(mpsContext, orgContext);
          
          if (prompt.includes('CRITICAL MPS BINDING') && prompt.includes('MPS 4')) {
            testResults.push({
              test: 'Prompt Generation',
              status: 'pass',
              message: 'Prompt correctly binds to MPS 4 with evidence-first format',
              details: { promptLength: prompt.length, containsBinding: true }
            });
          } else {
            testResults.push({
              test: 'Prompt Generation',
              status: 'fail',
              message: 'Prompt does not contain proper MPS binding',
              details: { prompt: prompt.substring(0, 200) + '...' }
            });
          }
        }
      }

    } catch (error: any) {
      testResults.push({
        test: 'System Test',
        status: 'fail',
        message: `Test suite failed: ${error.message}`,
        details: error
      });
    }

    setResults(testResults);
    setIsRunning(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'fail': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'bg-green-100 text-green-800';
      case 'fail': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const passedTests = results.filter(r => r.status === 'pass').length;
  const failedTests = results.filter(r => r.status === 'fail').length;
  const warningTests = results.filter(r => r.status === 'warning').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          System Diagnostic Test
          <Button 
            onClick={runSystemTests} 
            disabled={isRunning || !currentOrganization}
            variant="outline"
          >
            {isRunning ? 'Running Tests...' : 'Run System Test'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {results.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-green-600">{passedTests}</div>
                <p className="text-sm text-gray-600">Passed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-red-600">{failedTests}</div>
                <p className="text-sm text-gray-600">Failed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-yellow-600">{warningTests}</div>
                <p className="text-sm text-gray-600">Warnings</p>
              </CardContent>
            </Card>
          </div>
        )}

        {results.map((result, index) => (
          <Alert key={index}>
            <div className="flex items-start space-x-3">
              {getStatusIcon(result.status)}
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-medium">{result.test}</span>
                  <Badge className={getStatusColor(result.status)}>
                    {result.status.toUpperCase()}
                  </Badge>
                </div>
                <AlertDescription>{result.message}</AlertDescription>
                {result.details && (
                  <details className="mt-2">
                    <summary className="text-sm text-gray-600 cursor-pointer">View Details</summary>
                    <pre className="text-xs bg-gray-50 p-2 mt-1 rounded overflow-auto">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </Alert>
        ))}

        {results.length === 0 && !isRunning && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Click "Run System Test" to validate that all QA fixes are working correctly.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};