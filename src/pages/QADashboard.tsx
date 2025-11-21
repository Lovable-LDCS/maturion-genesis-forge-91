import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { NavigationHelper } from '@/components/ui/navigation-helper';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Settings, TestTube, FileText, CheckCircle } from 'lucide-react';
import { RegressionTestMode, AutomatedQALogs, RefactorQALogs } from '@/components/qa';
import { QAMetricsWidget } from '@/components/qa/QAMetricsWidget';
import { DeduplicationManager } from '@/components/qa/DeduplicationManager';
import { QARulesManager } from '@/components/qa/QARulesManager';
import { EdgeFunctionLinter } from '@/components/qa/EdgeFunctionLinter';
import { DocumentProcessingDebugger } from '@/components/ai/DocumentProcessingDebugger';
import { EdgeFunctionTester } from '@/components/qa/EdgeFunctionTester';
import { MPSCriteriaLinker } from '@/components/qa/MPSCriteriaLinker';
import { CriteriaRegenerationTool } from '@/components/qa/CriteriaRegenerationTool';
import { ReasoningScopeTracker } from '@/components/admin/ReasoningScopeTracker';
import { AIReasoningIntegrationTester } from '@/components/qa/AIReasoningIntegrationTester';
import { AILogicIngestionDashboard } from '@/components/qa/AILogicIngestionDashboard';
// import { DocumentChunkTester } from '@/components/qa/DocumentChunkTester'; // Disabled to avoid conflicts with Knowledge Base
import { ApprovedFilesQueue } from '@/components/ai/ApprovedFilesQueue';
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

      {/* Active QA Tools - Kept for Evaluation */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-1">
            <p className="font-semibold">Note: Temporary QA Tools Removed</p>
            <p className="text-sm">
              One-time fix tools and debug components have been removed. Remaining tools are essential QA infrastructure.
              For advanced diagnostics, use the new unified QA dashboard at <strong>/qa-dashboard</strong>.
            </p>
          </div>
        </AlertDescription>
      </Alert>

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

      {/* Phase 2 Recovery: AI Reasoning Integration */}
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
        <CardHeader>
          <CardTitle className="text-amber-800 dark:text-amber-200">🔧 Phase 2: AI Reasoning Integration</CardTitle>
          <CardDescription className="text-amber-700 dark:text-amber-300">
            Test AI reasoning integration and scope tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReasoningScopeTracker />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            <AIReasoningIntegrationTester />
          </div>
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
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="automated-qa">Automated QA</TabsTrigger>
          <TabsTrigger value="deduplication">Deduplication</TabsTrigger>
          <TabsTrigger value="rules">QA Rules</TabsTrigger>
          <TabsTrigger value="chunk-tester">Chunk Tester</TabsTrigger>
          <TabsTrigger value="refactor-qa">Refactor Analysis</TabsTrigger>
          <TabsTrigger value="regression">Regression Tests</TabsTrigger>
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
          
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Edge Function Testing</CardTitle>
              <CardDescription>
                Test and lint edge functions for proper operation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <EdgeFunctionTester />
                <EdgeFunctionLinter />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default QADashboard;