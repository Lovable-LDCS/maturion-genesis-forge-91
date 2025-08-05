import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, TrendingDown, AlertTriangle, RefreshCw, CheckCircle } from 'lucide-react';

interface DriftDetection {
  id: string;
  drift_type: string;
  baseline_value: number;
  current_value: number;
  drift_percentage: number;
  threshold_exceeded: boolean;
  recovery_action_suggested: string;
  recovery_status: string;
  detected_at: string;
}

interface SystemDriftMonitorProps {
  organizationId?: string;
}

export const SystemDriftMonitor: React.FC<SystemDriftMonitorProps> = ({ organizationId }) => {
  const [driftData, setDriftData] = useState<DriftDetection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (organizationId) {
      loadDriftData();
    }
  }, [organizationId]);

  const loadDriftData = async () => {
    if (!organizationId) return;

    try {
      const { data } = await supabase
        .from('system_drift_detection')
        .select('*')
        .eq('organization_id', organizationId)
        .order('detected_at', { ascending: false })
        .limit(10);

      setDriftData(data || []);
    } catch (error) {
      console.error('Error loading drift data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerRecovery = async (driftId: string) => {
    try {
      await supabase
        .from('system_drift_detection')
        .update({ recovery_status: 'in_progress' })
        .eq('id', driftId);

      // Trigger recovery action via edge function
      await supabase.functions.invoke('process-qa-alerts', {
        body: {
          organizationId,
          action: 'drift_recovery',
          driftId
        }
      });

      loadDriftData();
    } catch (error) {
      console.error('Error triggering recovery:', error);
    }
  };

  const getDriftIcon = (percentage: number) => {
    if (percentage > 0) return <TrendingUp className="h-4 w-4 text-red-500" />;
    return <TrendingDown className="h-4 w-4 text-green-500" />;
  };

  const getDriftSeverity = (percentage: number) => {
    const absPercentage = Math.abs(percentage);
    if (absPercentage > 20) return { color: 'bg-red-500 text-white', label: 'Critical' };
    if (absPercentage > 10) return { color: 'bg-orange-500 text-white', label: 'High' };
    if (absPercentage > 5) return { color: 'bg-yellow-500 text-black', label: 'Medium' };
    return { color: 'bg-green-500 text-white', label: 'Low' };
  };

  const getRecoveryStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500 text-white';
      case 'in_progress': return 'bg-blue-500 text-white';
      case 'failed': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            System Drift Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          System Drift Monitor
        </CardTitle>
        <CardDescription>
          Real-time detection of system performance drift
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {driftData.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No drift detections found
            </p>
          ) : (
            driftData.map((drift) => {
              const severity = getDriftSeverity(drift.drift_percentage);
              
              return (
                <div key={drift.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getDriftIcon(drift.drift_percentage)}
                      <span className="font-medium capitalize">
                        {drift.drift_type.replace('_', ' ')} Drift
                      </span>
                      <Badge className={severity.color}>
                        {severity.label}
                      </Badge>
                      {drift.threshold_exceeded && (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {new Date(drift.detected_at).toLocaleString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Baseline:</span>
                      <p className="font-medium">{drift.baseline_value.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Current:</span>
                      <p className="font-medium">{drift.current_value.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Drift:</span>
                      <p className="font-medium">
                        {drift.drift_percentage > 0 ? '+' : ''}{drift.drift_percentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {drift.recovery_action_suggested && (
                    <div className="bg-muted rounded p-3">
                      <p className="text-sm font-medium mb-1">Suggested Recovery:</p>
                      <p className="text-sm text-muted-foreground">{drift.recovery_action_suggested}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <Badge className={getRecoveryStatusColor(drift.recovery_status)}>
                      {drift.recovery_status.replace('_', ' ')}
                    </Badge>
                    
                    {drift.recovery_status === 'pending' && (
                      <Button 
                        size="sm" 
                        onClick={() => triggerRecovery(drift.id)}
                        className="flex items-center gap-1"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Trigger Recovery
                      </Button>
                    )}
                    
                    {drift.recovery_status === 'completed' && (
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm">Recovered</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {driftData.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Active Drift Detections: {driftData.filter(d => d.threshold_exceeded).length}
              </span>
              <span className="text-muted-foreground">
                Recovery Rate: {((driftData.filter(d => d.recovery_status === 'completed').length / driftData.length) * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};