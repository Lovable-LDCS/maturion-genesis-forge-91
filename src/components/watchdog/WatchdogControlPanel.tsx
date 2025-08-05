import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useOrganizationContext } from '@/hooks/useOrganizationContext';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, Brain, Shield, Activity, TrendingUp, AlertCircle, CheckCircle, Clock, X } from 'lucide-react';
import { AIConfidenceHeatmap } from './AIConfidenceHeatmap';
import { SystemDriftMonitor } from './SystemDriftMonitor';
import { WatchdogIncidentManager } from './WatchdogIncidentManager';
import { CrossOrgTracker } from './CrossOrgTracker';
import { AIBehaviorAnalyzer } from './AIBehaviorAnalyzer';

interface WatchdogAlert {
  id: string;
  alert_type: string;
  severity_level: string;
  title: string;
  message: string;
  actionable_guidance: string;
  resolved: boolean;
  acknowledged_by: string | null;
  created_at: string;
  metadata: any;
}

interface SystemStats {
  totalIncidents: number;
  activeAlerts: number;
  avgConfidenceScore: number;
  driftDetections: number;
  behaviorAnomalies: number;
  systemHealth: number;
}

export const WatchdogControlPanel: React.FC = () => {
  const { currentContext: organization } = useOrganizationContext();
  const { isAdmin } = useAdminAccess();
  const [alerts, setAlerts] = useState<WatchdogAlert[]>([]);
  const [stats, setStats] = useState<SystemStats>({
    totalIncidents: 0,
    activeAlerts: 0,
    avgConfidenceScore: 0,
    driftDetections: 0,
    behaviorAnomalies: 0,
    systemHealth: 95
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (organization?.organization_id) {
      loadWatchdogData();
      
      if (autoRefresh) {
        const interval = setInterval(loadWatchdogData, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
      }
    }
  }, [organization?.organization_id, autoRefresh]);

  const loadWatchdogData = async () => {
    if (!organization?.organization_id) return;

    try {
      // Load alerts
      const { data: alertsData } = await supabase
        .from('watchdog_alerts')
        .select('*')
        .eq('organization_id', organization.organization_id)
        .order('created_at', { ascending: false })
        .limit(20);

      // Load system statistics
      const { data: incidentsData } = await supabase
        .from('watchdog_incidents')
        .select('id, status')
        .eq('organization_id', organization.organization_id);

      const { data: confidenceData } = await supabase
        .from('ai_confidence_scoring')
        .select('adjusted_confidence')
        .eq('organization_id', organization.organization_id);

      const { data: driftData } = await supabase
        .from('system_drift_detection')
        .select('id, threshold_exceeded')
        .eq('organization_id', organization.organization_id);

      const { data: behaviorData } = await supabase
        .from('ai_behavior_monitoring')
        .select('id, severity_level')
        .eq('organization_id', organization.organization_id);

      setAlerts(alertsData || []);

      // Calculate statistics
      const activeAlerts = alertsData?.filter(a => !a.resolved).length || 0;
      const avgConfidence = confidenceData?.reduce((sum, item) => sum + (item.adjusted_confidence || 0), 0) / (confidenceData?.length || 1);
      const driftDetections = driftData?.filter(d => d.threshold_exceeded).length || 0;
      const behaviorAnomalies = behaviorData?.filter(b => b.severity_level === 'high' || b.severity_level === 'critical').length || 0;
      
      // Calculate system health based on various factors
      let systemHealth = 100;
      if (activeAlerts > 5) systemHealth -= 10;
      if (driftDetections > 3) systemHealth -= 15;
      if (behaviorAnomalies > 2) systemHealth -= 20;
      if (avgConfidence < 0.7) systemHealth -= 10;

      setStats({
        totalIncidents: incidentsData?.length || 0,
        activeAlerts,
        avgConfidenceScore: avgConfidence,
        driftDetections,
        behaviorAnomalies,
        systemHealth: Math.max(systemHealth, 0)
      });

    } catch (error) {
      console.error('Error loading watchdog data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      await supabase
        .from('watchdog_alerts')
        .update({ 
          acknowledged_by: organization?.organization_id,
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', alertId);
      
      loadWatchdogData();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      await supabase
        .from('watchdog_alerts')
        .update({ 
          resolved: true,
          resolved_at: new Date().toISOString()
        })
        .eq('id', alertId);
      
      loadWatchdogData();
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  const triggerSystemRecovery = async () => {
    try {
      const { error } = await supabase.functions.invoke('process-qa-alerts', {
        body: {
          organizationId: organization?.organization_id,
          action: 'system_recovery',
          triggeredBy: 'manual'
        }
      });

      if (error) throw error;
      
      loadWatchdogData();
    } catch (error) {
      console.error('Error triggering system recovery:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'error': return 'bg-red-500 text-white';
      case 'warning': return 'bg-yellow-500 text-black';
      case 'info': return 'bg-blue-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getHealthColor = (health: number) => {
    if (health >= 90) return 'text-green-600';
    if (health >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!isAdmin) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Access Restricted</AlertTitle>
        <AlertDescription>
          Watchdog Control Panel requires admin access.
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Watchdog Control Panel</h1>
          <p className="text-muted-foreground">AI Intelligence & System Surveillance</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className="h-4 w-4 mr-2" />
            Auto Refresh {autoRefresh ? 'On' : 'Off'}
          </Button>
          <Button onClick={loadWatchdogData} size="sm" variant="outline">
            Refresh
          </Button>
          <Button onClick={triggerSystemRecovery} size="sm" variant="destructive">
            <Shield className="h-4 w-4 mr-2" />
            System Recovery
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className={`h-4 w-4 ${getHealthColor(stats.systemHealth)}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.systemHealth}%</div>
            <Progress value={stats.systemHealth} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeAlerts}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalIncidents} total incidents
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Confidence</CardTitle>
            <Brain className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats.avgConfidenceScore * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Average confidence score
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drift Detections</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.driftDetections}</div>
            <p className="text-xs text-muted-foreground">
              {stats.behaviorAnomalies} behavior anomalies
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts */}
      {alerts.filter(a => !a.resolved).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Active Alerts ({alerts.filter(a => !a.resolved).length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.filter(a => !a.resolved).slice(0, 5).map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getSeverityColor(alert.severity_level)}>
                        {alert.severity_level}
                      </Badge>
                      <span className="font-medium">{alert.title}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{alert.message}</p>
                    {alert.actionable_guidance && (
                      <p className="text-sm text-blue-600 mt-1">{alert.actionable_guidance}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!alert.acknowledged_by && (
                      <Button size="sm" variant="outline" onClick={() => acknowledgeAlert(alert.id)}>
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => resolveAlert(alert.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="confidence">AI Confidence</TabsTrigger>
          <TabsTrigger value="drift">System Drift</TabsTrigger>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
          <TabsTrigger value="behavior">AI Behavior</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AIConfidenceHeatmap organizationId={organization?.organization_id} />
            <SystemDriftMonitor organizationId={organization?.organization_id} />
          </div>
          <CrossOrgTracker />
        </TabsContent>

        <TabsContent value="confidence">
          <AIConfidenceHeatmap organizationId={organization?.organization_id} />
        </TabsContent>

        <TabsContent value="drift">
          <SystemDriftMonitor organizationId={organization?.organization_id} />
        </TabsContent>

        <TabsContent value="incidents">
          <WatchdogIncidentManager organizationId={organization?.organization_id} />
        </TabsContent>

        <TabsContent value="behavior">
          <AIBehaviorAnalyzer organizationId={organization?.organization_id} />
        </TabsContent>
      </Tabs>
    </div>
  );
};