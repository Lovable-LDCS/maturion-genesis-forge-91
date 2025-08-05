import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WatchdogMetrics {
  activeAlerts: number;
  systemHealth: number;
  avgConfidenceScore: number;
  driftDetections: number;
  behaviorAnomalies: number;
  lastUpdate: string;
}

interface RealtimeAlert {
  id: string;
  alert_type: string;
  severity_level: string;
  title: string;
  message: string;
  organization_id: string;
  created_at: string;
}

export const useWatchdogRealTime = (organizationId?: string, enabled: boolean = true) => {
  const [metrics, setMetrics] = useState<WatchdogMetrics>({
    activeAlerts: 0,
    systemHealth: 95,
    avgConfidenceScore: 0.75,
    driftDetections: 0,
    behaviorAnomalies: 0,
    lastUpdate: new Date().toISOString()
  });
  const [recentAlerts, setRecentAlerts] = useState<RealtimeAlert[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!organizationId || !enabled) return;

    console.log('🔄 Setting up Watchdog real-time monitoring for org:', organizationId);

    // Subscribe to watchdog alerts
    const alertsChannel = supabase
      .channel('watchdog-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'watchdog_alerts',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => {
          console.log('🚨 New watchdog alert:', payload.new);
          const newAlert = payload.new as RealtimeAlert;
          
          setRecentAlerts(prev => [newAlert, ...prev.slice(0, 9)]);
          
          // Show critical alerts as toasts
          if (newAlert.severity_level === 'critical' || newAlert.severity_level === 'error') {
            toast({
              title: `🚨 ${newAlert.severity_level.toUpperCase()}: ${newAlert.title}`,
              description: newAlert.message,
              variant: newAlert.severity_level === 'critical' ? 'destructive' : 'default',
            });
          }

          // Update metrics
          setMetrics(prev => ({
            ...prev,
            activeAlerts: prev.activeAlerts + 1,
            lastUpdate: new Date().toISOString()
          }));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'watchdog_alerts',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => {
          const updatedAlert = payload.new as RealtimeAlert;
          console.log('📝 Watchdog alert updated:', updatedAlert.id);
          
          // If alert was resolved, decrease active count
          if ((payload.new as any).resolved && !(payload.old as any).resolved) {
            setMetrics(prev => ({
              ...prev,
              activeAlerts: Math.max(0, prev.activeAlerts - 1),
              lastUpdate: new Date().toISOString()
            }));
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Watchdog alerts subscription status:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    // Subscribe to AI confidence updates
    const confidenceChannel = supabase
      .channel('ai-confidence-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_confidence_scoring',
          filter: `organization_id=eq.${organizationId}`
        },
        async (payload) => {
          console.log('🧠 AI confidence update:', payload);
          
          // Recalculate average confidence
          const { data: confidenceData } = await supabase
            .from('ai_confidence_scoring')
            .select('adjusted_confidence')
            .eq('organization_id', organizationId);

          if (confidenceData?.length) {
            const avgConfidence = confidenceData.reduce(
              (sum, item) => sum + (item.adjusted_confidence || 0), 
              0
            ) / confidenceData.length;

            setMetrics(prev => ({
              ...prev,
              avgConfidenceScore: avgConfidence,
              lastUpdate: new Date().toISOString()
            }));
          }
        }
      )
      .subscribe();

    // Subscribe to system drift updates
    const driftChannel = supabase
      .channel('system-drift-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_drift_detection',
          filter: `organization_id=eq.${organizationId}`
        },
        async (payload) => {
          console.log('📈 System drift update:', payload);
          
          // Recalculate drift metrics
          const { data: driftData } = await supabase
            .from('system_drift_detection')
            .select('id, threshold_exceeded')
            .eq('organization_id', organizationId);

          const driftCount = driftData?.filter(d => d.threshold_exceeded).length || 0;
          
          setMetrics(prev => ({
            ...prev,
            driftDetections: driftCount,
            systemHealth: Math.max(60, 100 - (driftCount * 5) - (prev.activeAlerts * 3)),
            lastUpdate: new Date().toISOString()
          }));
        }
      )
      .subscribe();

    // Subscribe to AI behavior monitoring
    const behaviorChannel = supabase
      .channel('ai-behavior-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_behavior_monitoring',
          filter: `organization_id=eq.${organizationId}`
        },
        async (payload) => {
          console.log('🤖 AI behavior update:', payload);
          
          // Recalculate behavior anomalies
          const { data: behaviorData } = await supabase
            .from('ai_behavior_monitoring')
            .select('id, severity_level')
            .eq('organization_id', organizationId);

          const anomalyCount = behaviorData?.filter(
            b => b.severity_level === 'high' || b.severity_level === 'critical'
          ).length || 0;
          
          setMetrics(prev => ({
            ...prev,
            behaviorAnomalies: anomalyCount,
            lastUpdate: new Date().toISOString()
          }));
        }
      )
      .subscribe();

    // Cleanup subscriptions
    return () => {
      console.log('🔌 Cleaning up Watchdog real-time subscriptions');
      supabase.removeChannel(alertsChannel);
      supabase.removeChannel(confidenceChannel);
      supabase.removeChannel(driftChannel);
      supabase.removeChannel(behaviorChannel);
    };
  }, [organizationId, enabled, toast]);

  const triggerManualQA = async () => {
    if (!organizationId) return;

    try {
      console.log('🔧 Triggering manual QA test for org:', organizationId);
      
      const { data, error } = await supabase.functions.invoke('process-watchdog-alerts', {
        body: {
          action: 'system_recovery',
          organizationId,
          triggeredBy: 'manual_qa_test'
        }
      });

      if (error) throw error;

      toast({
        title: "Manual QA Test Triggered",
        description: "System recovery and QA checks initiated",
      });

      return data;
    } catch (error) {
      console.error('Error triggering manual QA:', error);
      toast({
        title: "QA Test Failed",
        description: "Failed to trigger manual QA test",
        variant: "destructive",
      });
      throw error;
    }
  };

  const sendTestNotification = async () => {
    if (!organizationId) return;

    try {
      console.log('📧 Sending test notification for org:', organizationId);
      
      const { data, error } = await supabase.functions.invoke('send-watchdog-notifications', {
        body: {
          organizationId,
          forceNotification: true
        }
      });

      if (error) throw error;

      toast({
        title: "Test Notification Sent",
        description: "Check your configured channels for the test alert",
      });

      return data;
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast({
        title: "Notification Failed",
        description: "Failed to send test notification",
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    metrics,
    recentAlerts,
    isConnected,
    triggerManualQA,
    sendTestNotification
  };
};