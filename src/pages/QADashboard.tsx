import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { NavigationHelper } from '@/components/ui/navigation-helper';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Settings, TestTube, FileText, CheckCircle } from 'lucide-react';
import { QADebugHub, RegressionTestMode, AutomatedQALogs, RefactorQALogs } from '@/components/qa';
import { ChunkSourceConsistencyTest } from '@/components/qa/ChunkSourceConsistencyTest';
import { QAMetricsWidget } from '@/components/qa/QAMetricsWidget';
import { DeduplicationManager } from '@/components/qa/DeduplicationManager';
import { QARulesManager } from '@/components/qa/QARulesManager';
import { AILogicDocumentReprocessor } from '@/components/qa/AILogicDocumentReprocessor';
import { EdgeFunctionLinter } from '@/components/qa/EdgeFunctionLinter';
import { MPSLinkageRebuilder } from '@/components/qa/MPSLinkageRebuilder';
import { MPSDocumentReprocessor } from '@/components/qa/MPSDocumentReprocessor';
import { QASystemTest } from '@/components/qa/QASystemTest';
import { DocumentProcessingDebugger } from '@/components/ai/DocumentProcessingDebugger';
import { ManualMPSReprocessor } from '@/components/qa/ManualMPSReprocessor';
import { EdgeFunctionTester } from '@/components/qa/EdgeFunctionTester';
import { MPSCriteriaLinker } from '@/components/qa/MPSCriteriaLinker';
import { OrganizationDataSynchronizer } from '@/components/qa/OrganizationDataSynchronizer';
import { DataConsolidationTool } from '@/components/qa/DataConsolidationTool';
import { CriteriaRegenerationTool } from '@/components/qa/CriteriaRegenerationTool';
import { GovernanceDocumentFixer } from '@/components/qa/GovernanceDocumentFixer';
import { ReasoningScopeTracker } from '@/components/admin/ReasoningScopeTracker';
import { AIReasoningIntegrationTester } from '@/components/qa/AIReasoningIntegrationTester';
import { BatchDocumentReprocessor } from '@/components/qa/BatchDocumentReprocessor';
import { AILogicIngestionDashboard } from '@/components/qa/AILogicIngestionDashboard';
// import { DocumentChunkTester } from '@/components/qa/DocumentChunkTester'; // Disabled to avoid conflicts with Knowledge Base
import { ApprovedFilesQueue } from '@/components/ai/ApprovedFilesQueue';
import { DuplicateDocumentCleaner } from '@/components/qa/DuplicateDocumentCleaner';
import { LegacyDocumentCleaner } from '@/components/qa/LegacyDocumentCleaner';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { useEffect, useState as useReactState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface QADashboardProps {}

export const QADashboard: React.FC<QADashboardProps> = () => {
  const [activeTests, setActiveTests] = useState(0);
  const [completedTests, setCompletedTests] = useState(0);
  const [primaryOrg, setPrimaryOrg] = useReactState<{id: string, name: string, type: string} | null>(null);
  
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  // Get primary organization info
  useEffect(() => {
    const fetchPrimaryOrg = async () => {
      if (!user) return;
      
      try {
        const { data: primaryOrgId, error: orgError } = await supabase
          .rpc('get_user_primary_organization');
        
        if (!orgError && primaryOrgId) {
          const { data: orgData, error: fetchError } = await supabase
            .from('organizations')
            .select('id, name, organization_type')
            .eq('id', primaryOrgId)
            .single();
          
          if (!fetchError && orgData) {
            setPrimaryOrg({
              id: orgData.id,
              name: orgData.name,
              type: orgData.organization_type
            });
          }
        }
      } catch (error) {
        console.error('Error fetching primary organization:', error);
      }
    };

    fetchPrimaryOrg();
  }, [user]);

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
      <NavigationHelper />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">QA Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive quality assurance and validation system for Maturion AI
          </p>
          {primaryOrg && (
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="default" className="text-xs bg-primary">
                🎯 ACTIVE ORG: {primaryOrg.name}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {primaryOrg.type.toUpperCase()}
              </Badge>
            </div>
          )}
        </div>
        <Badge variant="outline" className="text-sm">
          SUPERUSER ONLY
        </Badge>
      </div>

      {/* Phase 2: Enhanced QA Metrics Dashboard */}
      <QAMetricsWidget timeRange="hour" />

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

      {/* 🧠 AI Logic Ingestion Comprehensive Dashboard */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-blue-800 dark:text-blue-200">🧠 AI Logic Ingestion - Comprehensive Diagnostic Dashboard</CardTitle>
          <CardDescription className="text-blue-700 dark:text-blue-300">
            Complete AI Logic Document investigation and fix workflow with holistic diagnostics, metadata validation, and processing pipeline integrity checks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AILogicIngestionDashboard />
        </CardContent>
      </Card>

      {/* 🚨 URGENT: Governance Document Fix & Edge Function Testing */}
      <div className="space-y-4">
        <Card className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
          <CardHeader>
            <CardTitle className="text-red-800 dark:text-red-200">🚨 CRITICAL: Governance Document Status Fix</CardTitle>
            <CardDescription className="text-red-700 dark:text-red-300">
              Fix governance documents that have chunks but are stuck in pending status. Your Maturion documents should show here.
            </CardDescription>
          </CardHeader>
          <CardContent>
          <GovernanceDocumentFixer />
          <AILogicDocumentReprocessor />
          <ReasoningScopeTracker />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AIReasoningIntegrationTester />
            <BatchDocumentReprocessor />
          </div>
          </CardContent>
        </Card>

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

        <Card className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
          <CardHeader>
            <CardTitle className="text-red-800 dark:text-red-200">🚨 URGENT: Document Mismatch Fix</CardTitle>
            <CardDescription className="text-red-700 dark:text-red-300">
              Duplicate MPS 10 documents causing display confusion in embedding dialog.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DuplicateDocumentCleaner />
            <LegacyDocumentCleaner />
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
          <CardHeader>
            <CardTitle className="text-red-800 dark:text-red-200">🚨 CRITICAL: Data Consolidation Required</CardTitle>
            <CardDescription className="text-red-700 dark:text-red-300">
              Multiple organizations detected - consolidate all data into the organization with chunks.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataConsolidationTool />
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50 dark:bg-purple-950 dark:border-purple-800">
          <CardHeader>
            <CardTitle className="text-purple-800 dark:text-purple-200">🔄 NEXT: Criteria Regeneration Required</CardTitle>
            <CardDescription className="text-purple-700 dark:text-purple-300">
              Delete placeholder criteria and regenerate fresh criteria from document chunks using AI.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CriteriaRegenerationTool />
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="text-amber-800 dark:text-amber-200">🔗 FINAL: MPS-Criteria Verification</CardTitle>
            <CardDescription className="text-amber-700 dark:text-amber-300">
              After criteria regeneration, use this to verify all linkages are correct.
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
      <Tabs defaultValue="automated-qa" className="w-full">
        <TabsList className="grid w-full grid-cols-9">
          <TabsTrigger value="automated-qa">Automated QA</TabsTrigger>
          <TabsTrigger value="deduplication">Deduplication</TabsTrigger>
          <TabsTrigger value="rules">QA Rules</TabsTrigger>
          <TabsTrigger value="chunk-tester">Chunk Tester</TabsTrigger>
          <TabsTrigger value="refactor-qa">Refactor Analysis</TabsTrigger>
          <TabsTrigger value="system-test">System Test</TabsTrigger>
          <TabsTrigger value="debug">QA Debug Hub</TabsTrigger>
          <TabsTrigger value="regression">Regression Tests</TabsTrigger>
          <TabsTrigger value="settings">QA Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="automated-qa" className="space-y-4">
          <AutomatedQALogs />
        </TabsContent>

        <TabsContent value="deduplication" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>🔍 Phase 2: Advanced Deduplication Engine</CardTitle>
              <CardDescription>
                Fingerprint and embedding-based duplicate detection with &lt; 2% false positive rate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DeduplicationManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>⚙️ Phase 2: QA Rules Engine</CardTitle>
              <CardDescription>
                Define and enforce quality assurance rules across the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <QARulesManager />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="chunk-tester" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-4 border rounded-lg bg-muted">
              <p className="text-muted-foreground">
                Document Chunk Tester has been moved to the Knowledge Base for focused testing.
                <br />
                Please use /maturion/knowledge-base for document uploads and chunk testing.
              </p>
            </div>
          </div>
          
          {/* Approved Files Queue */}
          <ApprovedFilesQueue />
        </TabsContent>
        
        <TabsContent value="refactor-qa" className="space-y-4">
          <RefactorQALogs />
        </TabsContent>
        
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
          <ChunkSourceConsistencyTest />
          
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