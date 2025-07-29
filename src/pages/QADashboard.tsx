import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Settings, TestTube, FileText, CheckCircle } from 'lucide-react';
import { QADebugHub, RegressionTestMode } from '@/components/qa';
import { EdgeFunctionLinter } from '@/components/qa/EdgeFunctionLinter';
import { MPSLinkageRebuilder } from '@/components/qa/MPSLinkageRebuilder';
import { MPSDocumentReprocessor } from '@/components/qa/MPSDocumentReprocessor';
import { QASystemTest } from '@/components/qa/QASystemTest';
import { DocumentProcessingDebugger } from '@/components/ai/DocumentProcessingDebugger';
import { ManualMPSReprocessor } from '@/components/qa/ManualMPSReprocessor';
import { EdgeFunctionTester } from '@/components/qa/EdgeFunctionTester';
import { MPSCriteriaLinker } from '@/components/qa/MPSCriteriaLinker';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';

interface QADashboardProps {}

export const QADashboard: React.FC<QADashboardProps> = () => {
  const [activeTests, setActiveTests] = useState(0);
  const [completedTests, setCompletedTests] = useState(0);
  
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  const mockMpsContext = {
    mpsId: 'test-mps-id',
    mpsNumber: 4,
    mpsTitle: 'Risk Management',
    domainId: 'leadership-governance',
    organizationId: currentOrganization?.id || ''
  };

  const mockOrgContext = {
    id: currentOrganization?.id || '',
    name: currentOrganization?.name || 'Test Organization',
    industry_tags: currentOrganization?.industry_tags || [],
    region_operating: currentOrganization?.region_operating || '',
    compliance_commitments: currentOrganization?.compliance_commitments || [],
    custom_industry: currentOrganization?.custom_industry || ''
  };

  const handleTestComplete = (results: any[]) => {
    setCompletedTests(results.length);
    setActiveTests(0);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">QA Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive quality assurance and validation system for Maturion AI
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          SUPERUSER ONLY
        </Badge>
      </div>

      {/* QA Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <Shield className="h-8 w-8 mx-auto text-green-600 mb-2" />
            <div className="text-2xl font-bold text-green-600">7</div>
            <div className="text-sm text-muted-foreground">Active QA Rules</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <TestTube className="h-8 w-8 mx-auto text-blue-600 mb-2" />
            <div className="text-2xl font-bold">{activeTests}</div>
            <div className="text-sm text-muted-foreground">Running Tests</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <CheckCircle className="h-8 w-8 mx-auto text-green-600 mb-2" />
            <div className="text-2xl font-bold">{completedTests}</div>
            <div className="text-sm text-muted-foreground">Completed Tests</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <FileText className="h-8 w-8 mx-auto text-purple-600 mb-2" />
            <div className="text-2xl font-bold">100%</div>
            <div className="text-sm text-muted-foreground">Compliance Rate</div>
          </CardContent>
        </Card>
      </div>

      {/* QA Framework Status */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <div className="font-medium mb-1">QA Framework Status: ACTIVE</div>
          <div className="text-sm space-y-1">
            <div>✅ Red Alert monitoring enabled</div>
            <div>✅ Prompt validation active (12,000 token limit)</div>
            <div>✅ Annex 1 fallback detection enabled</div>
            <div>✅ Evidence-first structure enforcement active</div>
            <div>✅ Placeholder content blocking enabled</div>
          </div>
        </AlertDescription>
      </Alert>

      {/* 🚨 URGENT: Edge Function Testing & MPS-Criteria Linking */}
      <div className="space-y-4">
        <Card className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
          <CardHeader>
            <CardTitle className="text-red-800 dark:text-red-200">🚨 URGENT: Edge Function Recovery</CardTitle>
            <CardDescription className="text-red-700 dark:text-red-300">
              Edge function syntax was fixed. Test single document processing before running full batch.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EdgeFunctionTester />
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="text-amber-800 dark:text-amber-200">🔗 CRITICAL: MPS-Criteria Linking</CardTitle>
            <CardDescription className="text-amber-700 dark:text-amber-300">
              Generate missing criteria from processed document chunks to fix regression test failures.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MPSCriteriaLinker />
          </CardContent>
        </Card>
      </div>

      {/* Phase 2 Recovery: Manual MPS Reprocessor */}
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
        <CardHeader>
          <CardTitle className="text-amber-800 dark:text-amber-200">🔧 Phase 2 Recovery: Enhanced Mammoth.js Pipeline</CardTitle>
          <CardDescription className="text-amber-700 dark:text-amber-300">
            Manual reprocessing of all pending MPS documents with enhanced Mammoth.js integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ManualMPSReprocessor />
        </CardContent>
      </Card>

      {/* Document Processing Debugger */}
      <Card>
        <CardHeader>
          <CardTitle>Document Processing Status</CardTitle>
          <CardDescription>
            Monitor and debug MPS document processing pipeline
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentProcessingDebugger />
        </CardContent>
      </Card>

      {/* QA Tools Tabs */}
      <Tabs defaultValue="system-test" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="system-test">System Test</TabsTrigger>
          <TabsTrigger value="debug">QA Debug Hub</TabsTrigger>
          <TabsTrigger value="regression">Regression Tests</TabsTrigger>
          <TabsTrigger value="settings">QA Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="system-test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Diagnostic Test</CardTitle>
              <CardDescription>
                Comprehensive validation of all QA fixes and system components
              </CardDescription>
            </CardHeader>
            <CardContent>
              <QASystemTest />
            </CardContent>
          </Card>
          
          <MPSDocumentReprocessor />
          <MPSLinkageRebuilder />
          <EdgeFunctionLinter />
        </TabsContent>
        
        <TabsContent value="debug" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>QA Debug Hub</CardTitle>
              <CardDescription>
                Test and validate prompt logic, detect security violations, and ensure compliance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <QADebugHub
                mpsContext={mockMpsContext}
                organizationContext={mockOrgContext}
                isVisible={true}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="regression" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Regression Test Suite</CardTitle>
              <CardDescription>
                Run comprehensive tests across all MPSs to detect drift and validate system integrity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RegressionTestMode
                isVisible={true}
                onTestComplete={handleTestComplete}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>QA Configuration</CardTitle>
              <CardDescription>
                Configure quality assurance rules and validation parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Settings className="h-4 w-4" />
                <AlertDescription>
                  QA settings are currently managed through code configuration. 
                  Future versions will provide a management interface here.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <div className="font-medium">Prompt Token Limit</div>
                    <div className="text-sm text-muted-foreground">Maximum tokens allowed in AI prompts</div>
                  </div>
                  <Badge variant="outline">12,000</Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <div className="font-medium">Annex 1 Fallback Detection</div>
                    <div className="text-sm text-muted-foreground">Block unauthorized Annex 1 references</div>
                  </div>
                  <Badge variant="default">ENABLED</Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <div className="font-medium">Evidence-First Enforcement</div>
                    <div className="text-sm text-muted-foreground">Ensure criteria start with evidence types</div>
                  </div>
                  <Badge variant="default">ENABLED</Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <div className="font-medium">Placeholder Detection</div>
                    <div className="text-sm text-muted-foreground">Block placeholder content in criteria</div>
                  </div>
                  <Badge variant="default">ENABLED</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default QADashboard;