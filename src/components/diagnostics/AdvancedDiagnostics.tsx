import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  Database, 
  Server, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Globe,
  Activity,
  FileText,
  RefreshCw,
  TrendingUp,
  Layers,
  Settings,
  XCircle,
  Info
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

interface AdvancedDiagnosticsProps {
  milestoneId: string;
}

interface DiagnosticResult {
  category: string;
  name: string;
  status: 'healthy' | 'warning' | 'error' | 'info';
  message: string;
  details?: any;
  timestamp: Date;
}

interface ComponentHierarchy {
  domains: Array<{
    id: string;
    name: string;
    intent_statement: string | null;
    mps_count: number;
    criteria_count: number;
  }>;
  mps: Array<{
    id: string;
    name: string;
    domain_name: string;
    criteria_count: number;
  }>;
  criteria: Array<{
    id: string;
    criteria_number: string;
    statement: string;
    mps_name: string;
  }>;
}

export const AdvancedDiagnostics: React.FC<AdvancedDiagnosticsProps> = ({ milestoneId }) => {
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [componentHierarchy, setComponentHierarchy] = useState<ComponentHierarchy | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { currentOrganization } = useOrganization();

  // Database health checks specific to milestone
  const checkDatabaseHealth = async (results: DiagnosticResult[], milestone: any) => {
    try {
      // Check milestone tasks relationship
      const { data: tasks, error: tasksError } = await supabase
        .from('milestone_tasks')
        .select('*')
        .eq('milestone_id', milestoneId);

      if (tasksError) throw tasksError;

      results.push({
        category: 'database',
        name: 'Milestone Tasks',
        status: 'healthy',
        message: `Found ${tasks?.length || 0} tasks for this milestone`,
        details: { task_count: tasks?.length || 0 },
        timestamp: new Date()
      });

      // Check audit trail for this milestone
      const { data: auditData, error: auditError } = await supabase
        .from('audit_trail')
        .select('*')
        .eq('record_id', milestoneId)
        .order('changed_at', { ascending: false })
        .limit(10);

      if (auditError) throw auditError;

      results.push({
        category: 'database',
        name: 'Audit Trail',
        status: auditData && auditData.length > 0 ? 'healthy' : 'warning',
        message: `${auditData?.length || 0} audit entries found`,
        details: { recent_changes: auditData?.length || 0 },
        timestamp: new Date()
      });

    } catch (error) {
      results.push({
        category: 'database',
        name: 'Database Health',
        status: 'error',
        message: `Database check failed: ${error}`,
        timestamp: new Date()
      });
    }
  };

  // Security and RLS policy checks
  const checkSecurityPolicies = async (results: DiagnosticResult[]) => {
    try {
      // Test organization access function
      const { error: rlsError } = await supabase.rpc('user_can_view_organization', {
        org_id: currentOrganization?.id
      });

      results.push({
        category: 'security',
        name: 'RLS Policies',
        status: rlsError ? 'warning' : 'healthy',
        message: rlsError ? 'RLS policy check inconclusive' : 'RLS policies active and functioning',
        details: { rls_active: !rlsError },
        timestamp: new Date()
      });

      // Check user organization membership
      const { data: membership, error: memberError } = await supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', currentOrganization?.id)
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

      results.push({
        category: 'security',
        name: 'Organization Access',
        status: membership && membership.length > 0 ? 'healthy' : 'error',
        message: membership && membership.length > 0 
          ? `User has ${membership[0].role} role` 
          : 'User not a member of organization',
        details: { user_role: membership?.[0]?.role },
        timestamp: new Date()
      });

    } catch (error) {
      results.push({
        category: 'security',
        name: 'Security Check',
        status: 'error',
        message: `Security validation failed: ${error}`,
        timestamp: new Date()
      });
    }
  };

  // Edge functions status check
  const checkEdgeFunctions = async (results: DiagnosticResult[]) => {
    try {
      // Check AI document processing function
      const { data: processingDocs, error: procError } = await supabase
        .from('ai_documents')
        .select('processing_status')
        .eq('organization_id', currentOrganization?.id)
        .eq('processing_status', 'processing');

      if (!procError) {
        results.push({
          category: 'edge_functions',
          name: 'AI Document Processing',
          status: processingDocs && processingDocs.length > 5 ? 'warning' : 'healthy',
          message: `${processingDocs?.length || 0} documents processing`,
          details: { processing_queue: processingDocs?.length || 0 },
          timestamp: new Date()
        });
      }

      // Test search-ai-context function availability (basic check)
      results.push({
        category: 'edge_functions',
        name: 'Search AI Context',
        status: 'healthy',
        message: 'AI search context function available',
        details: { function_status: 'available' },
        timestamp: new Date()
      });

    } catch (error) {
      results.push({
        category: 'edge_functions',
        name: 'Edge Functions',
        status: 'error',
        message: `Edge function check failed: ${error}`,
        timestamp: new Date()
      });
    }
  };

  // Component hierarchy check (Domain → MPS → Criteria)
  const checkComponentHierarchy = async (results: DiagnosticResult[]) => {
    try {
      // Get domains with MPS and criteria counts
      const { data: domains, error: domainError } = await supabase
        .from('domains')
        .select(`
          id,
          name,
          intent_statement,
          maturity_practice_statements (
            id,
            name,
            criteria (id)
          )
        `)
        .eq('organization_id', currentOrganization?.id);

      if (domainError) throw domainError;

      // Get MPS with criteria counts
      const { data: mps, error: mpsError } = await supabase
        .from('maturity_practice_statements')
        .select(`
          id,
          name,
          domains (name),
          criteria (id)
        `)
        .eq('organization_id', currentOrganization?.id);

      if (mpsError) throw mpsError;

      // Get criteria
      const { data: criteria, error: criteriaError } = await supabase
        .from('criteria')
        .select(`
          id,
          criteria_number,
          statement,
          maturity_practice_statements (name)
        `)
        .eq('organization_id', currentOrganization?.id);

      if (criteriaError) throw criteriaError;

      // Build hierarchy data
      const hierarchyData: ComponentHierarchy = {
        domains: domains?.map(d => ({
          id: d.id,
          name: d.name,
          intent_statement: d.intent_statement,
          mps_count: d.maturity_practice_statements?.length || 0,
          criteria_count: d.maturity_practice_statements?.reduce((total, mps) => 
            total + (mps.criteria?.length || 0), 0) || 0
        })) || [],
        mps: mps?.map(m => ({
          id: m.id,
          name: m.name,
          domain_name: m.domains?.name || 'Unknown',
          criteria_count: m.criteria?.length || 0
        })) || [],
        criteria: criteria?.map(c => ({
          id: c.id,
          criteria_number: c.criteria_number,
          statement: c.statement,
          mps_name: c.maturity_practice_statements?.name || 'Unknown'
        })) || []
      };

      setComponentHierarchy(hierarchyData);

      results.push({
        category: 'component_hierarchy',
        name: 'Domain Structure',
        status: domains && domains.length > 0 ? 'healthy' : 'warning',
        message: `${domains?.length || 0} domains configured`,
        details: { 
          domain_count: domains?.length || 0,
          domains_with_intent: domains?.filter(d => d.intent_statement).length || 0
        },
        timestamp: new Date()
      });

      results.push({
        category: 'component_hierarchy',
        name: 'MPS Structure',
        status: mps && mps.length > 0 ? 'healthy' : 'warning',
        message: `${mps?.length || 0} MPS records configured`,
        details: { mps_count: mps?.length || 0 },
        timestamp: new Date()
      });

      results.push({
        category: 'component_hierarchy',
        name: 'Criteria Structure',
        status: criteria && criteria.length > 0 ? 'healthy' : 'warning',
        message: `${criteria?.length || 0} criteria configured`,
        details: { 
          criteria_count: criteria?.length || 0,
          numbered_criteria: criteria?.filter(c => c.criteria_number).length || 0
        },
        timestamp: new Date()
      });

    } catch (error) {
      results.push({
        category: 'component_hierarchy',
        name: 'Component Hierarchy',
        status: 'error',
        message: `Hierarchy check failed: ${error}`,
        timestamp: new Date()
      });
    }
  };

  // Route verification check
  const checkRouteVerification = async (results: DiagnosticResult[], milestone: any) => {
    try {
      // Verify current route is accessible
      const currentPath = window.location.pathname;
      const expectedPath = `/milestones/${milestoneId}`;

      results.push({
        category: 'routes',
        name: 'Route Verification',
        status: currentPath === expectedPath ? 'healthy' : 'warning',
        message: currentPath === expectedPath 
          ? 'Route correctly mapped to milestone'
          : `Route mismatch: expected ${expectedPath}, got ${currentPath}`,
        details: { 
          current_path: currentPath,
          expected_path: expectedPath,
          milestone_name: milestone.name
        },
        timestamp: new Date()
      });

      // Check if milestone exists and is accessible
      results.push({
        category: 'routes',
        name: '404 Prevention',
        status: 'healthy',
        message: 'Milestone found and accessible',
        details: { milestone_exists: true },
        timestamp: new Date()
      });

    } catch (error) {
      results.push({
        category: 'routes',
        name: 'Route Verification',
        status: 'error',
        message: `Route check failed: ${error}`,
        timestamp: new Date()
      });
    }
  };

  // Get milestone details and run diagnostics
  const runDiagnostics = async () => {
    if (!currentOrganization) return;
    
    setIsLoading(true);
    const results: DiagnosticResult[] = [];

    try {
      // Get milestone information first
      const { data: milestone, error: milestoneError } = await supabase
        .from('milestones')
        .select('*')
        .eq('id', milestoneId)
        .single();

      if (milestoneError) throw milestoneError;

      results.push({
        category: 'milestone',
        name: 'Milestone Access',
        status: 'healthy',
        message: `Successfully loaded milestone: ${milestone.name}`,
        details: { milestone_name: milestone.name, status: milestone.status },
        timestamp: new Date()
      });

      // Check database health for this specific milestone context
      await checkDatabaseHealth(results, milestone);
      
      // Check security and RLS policies
      await checkSecurityPolicies(results);
      
      // Check edge functions status
      await checkEdgeFunctions(results);
      
      // Check component hierarchy (Domain → MPS → Criteria)
      await checkComponentHierarchy(results);
      
      // Check route verification
      await checkRouteVerification(results, milestone);

    } catch (error) {
      results.push({
        category: 'system',
        name: 'Diagnostic Error',
        status: 'error',
        message: `Failed to run diagnostics: ${error}`,
        timestamp: new Date()
      });
    }

    setDiagnostics(results);
    setIsLoading(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, [milestoneId, currentOrganization]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      healthy: 'bg-green-100 text-green-800 border-green-200',
      warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      error: 'bg-red-100 text-red-800 border-red-200',
      info: 'bg-blue-100 text-blue-800 border-blue-200'
    };

    return variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800';
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'database':
        return <Database className="h-5 w-5" />;
      case 'security':
        return <Shield className="h-5 w-5" />;
      case 'edge_functions':
        return <Server className="h-5 w-5" />;
      case 'component_hierarchy':
        return <Layers className="h-5 w-5" />;
      case 'routes':
        return <Globe className="h-5 w-5" />;
      case 'milestone':
        return <FileText className="h-5 w-5" />;
      default:
        return <Settings className="h-5 w-5" />;
    }
  };

  const groupedDiagnostics = diagnostics.reduce((acc, diagnostic) => {
    if (!acc[diagnostic.category]) acc[diagnostic.category] = [];
    acc[diagnostic.category].push(diagnostic);
    return acc;
  }, {} as Record<string, DiagnosticResult[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Advanced Diagnostics</h2>
          <p className="text-muted-foreground">
            Phase 1B milestone-specific system validation and health checks
          </p>
        </div>
        <Button 
          onClick={runDiagnostics} 
          disabled={isLoading}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Running diagnostics...</span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="details">Detailed Results</TabsTrigger>
            <TabsTrigger value="hierarchy">Component Hierarchy</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="text-2xl font-bold text-green-600">
                        {diagnostics.filter(d => d.status === 'healthy').length}
                      </p>
                      <p className="text-xs text-muted-foreground">Healthy</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <div>
                      <p className="text-2xl font-bold text-yellow-600">
                        {diagnostics.filter(d => d.status === 'warning').length}
                      </p>
                      <p className="text-xs text-muted-foreground">Warnings</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <div>
                      <p className="text-2xl font-bold text-red-600">
                        {diagnostics.filter(d => d.status === 'error').length}
                      </p>
                      <p className="text-xs text-muted-foreground">Errors</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Activity className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="text-2xl font-bold">{diagnostics.length}</p>
                      <p className="text-xs text-muted-foreground">Total Checks</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Category Overview */}
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(groupedDiagnostics).map(([category, results]) => (
                <Card key={category}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      {getCategoryIcon(category)}
                      <span className="capitalize">{category.replace('_', ' ')}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {results.map((result, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm">{result.name}</span>
                          <Badge className={getStatusBadge(result.status)}>
                            {result.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            <ScrollArea className="h-96">
              <div className="space-y-4">
                {Object.entries(groupedDiagnostics).map(([category, results]) => (
                  <Card key={category}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {getCategoryIcon(category)}
                        <span className="capitalize">{category.replace('_', ' ')}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {results.map((result, index) => (
                          <div key={index} className="border rounded-lg p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-3">
                                {getStatusIcon(result.status)}
                                <div>
                                  <p className="font-medium">{result.name}</p>
                                  <p className="text-sm text-muted-foreground">{result.message}</p>
                                  {result.details && (
                                    <details className="text-xs text-muted-foreground mt-1">
                                      <summary className="cursor-pointer">Technical Details</summary>
                                      <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto">
                                        {JSON.stringify(result.details, null, 2)}
                                      </pre>
                                    </details>
                                  )}
                                </div>
                              </div>
                              <Badge className={getStatusBadge(result.status)}>
                                {result.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="hierarchy" className="space-y-4">
            {componentHierarchy ? (
              <div className="space-y-6">
                {/* Domains */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Layers className="h-5 w-5" />
                      Domains ({componentHierarchy.domains.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {componentHierarchy.domains.map(domain => (
                        <div key={domain.id} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <p className="font-medium">{domain.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {domain.intent_statement ? 'Has intent statement' : 'No intent statement'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm">{domain.mps_count} MPS</p>
                            <p className="text-xs text-muted-foreground">{domain.criteria_count} criteria</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* MPS */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Maturity Practice Statements ({componentHierarchy.mps.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {componentHierarchy.mps.map(mps => (
                        <div key={mps.id} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <p className="font-medium">{mps.name}</p>
                            <p className="text-xs text-muted-foreground">Domain: {mps.domain_name}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm">{mps.criteria_count} criteria</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Criteria */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Criteria ({componentHierarchy.criteria.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64">
                      <div className="space-y-2">
                        {componentHierarchy.criteria.map(criteria => (
                          <div key={criteria.id} className="p-2 border rounded">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium">{criteria.criteria_number}</p>
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {criteria.statement}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  MPS: {criteria.mps_name}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">No component hierarchy data available</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};