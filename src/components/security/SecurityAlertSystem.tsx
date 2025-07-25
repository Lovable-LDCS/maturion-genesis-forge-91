import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Shield, X, Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SecurityAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  timestamp: string;
  acknowledged: boolean;
}

export const SecurityAlertSystem = () => {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkSecurityAlerts();
    
    // Check for new alerts every 60 seconds
    const interval = setInterval(checkSecurityAlerts, 60000);
    return () => clearInterval(interval);
  }, []);

  const checkSecurityAlerts = async () => {
    try {
      setLoading(true);
      
      // Check for suspicious activity patterns
      const { data: recentEvents, error } = await supabase
        .from('audit_trail')
        .select('*')
        .gte('changed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('changed_at', { ascending: false });

      if (error) throw error;

      const newAlerts: SecurityAlert[] = [];

      // Check for multiple failed admin operations
      const failedAdminOps = recentEvents?.filter(e => 
        e.action.includes('UNAUTHORIZED_ADMIN') || e.action.includes('BLOCKED')
      ) || [];

      if (failedAdminOps.length > 5) {
        newAlerts.push({
          id: `admin-failures-${Date.now()}`,
          type: 'critical',
          title: 'Multiple Failed Admin Operations',
          description: `${failedAdminOps.length} failed admin operations detected in the last 24 hours. Potential security breach attempt.`,
          timestamp: new Date().toISOString(),
          acknowledged: false
        });
      }

      // Check for multiple input validation failures
      const inputFailures = recentEvents?.filter(e => 
        e.action.includes('INPUT_VALIDATION_FAILED') || e.action.includes('INVALID_INPUT')
      ) || [];

      if (inputFailures.length > 10) {
        newAlerts.push({
          id: `input-failures-${Date.now()}`,
          type: 'warning',
          title: 'High Input Validation Failures',
          description: `${inputFailures.length} input validation failures detected. Possible injection attack attempts.`,
          timestamp: new Date().toISOString(),
          acknowledged: false
        });
      }

      // Check for unusual activity patterns
      const uniqueUsers = new Set(recentEvents?.map(e => e.changed_by) || []).size;
      const totalEvents = recentEvents?.length || 0;

      if (totalEvents > 100 && uniqueUsers < 3) {
        newAlerts.push({
          id: `unusual-activity-${Date.now()}`,
          type: 'warning',
          title: 'Unusual Activity Pattern',
          description: `High volume of events (${totalEvents}) from few users (${uniqueUsers}). Review for automated attacks.`,
          timestamp: new Date().toISOString(),
          acknowledged: false
        });
      }

      // Check rate limit table for blocked users
      const { data: rateLimits } = await supabase
        .from('security_rate_limits')
        .select('*')
        .not('blocked_until', 'is', null)
        .gte('blocked_until', new Date().toISOString());

      if (rateLimits && rateLimits.length > 0) {
        newAlerts.push({
          id: `rate-limited-${Date.now()}`,
          type: 'info',
          title: 'Users Rate Limited',
          description: `${rateLimits.length} users are currently rate limited due to suspicious activity.`,
          timestamp: new Date().toISOString(),
          acknowledged: false
        });
      }

      setAlerts(newAlerts);

    } catch (error) {
      console.error('Error checking security alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ));
    
    toast({
      title: "Alert Acknowledged",
      description: "Security alert has been acknowledged and dismissed.",
    });
  };

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  const unacknowledgedAlerts = alerts.filter(alert => !alert.acknowledged);
  const criticalAlerts = unacknowledgedAlerts.filter(alert => alert.type === 'critical');

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Bell className="h-4 w-4" />
        Checking security status...
      </div>
    );
  }

  if (unacknowledgedAlerts.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <Shield className="h-4 w-4" />
        No active security alerts
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {criticalAlerts.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Critical Security Alert!</AlertTitle>
          <AlertDescription>
            You have {criticalAlerts.length} critical security alert(s) that require immediate attention.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        {unacknowledgedAlerts.map((alert) => (
          <Alert 
            key={alert.id} 
            variant={alert.type === 'critical' ? 'destructive' : 
                    alert.type === 'warning' ? 'default' : 'default'}
            className="relative"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {alert.type === 'critical' ? 
                    <AlertTriangle className="h-4 w-4" /> : 
                    <Shield className="h-4 w-4" />
                  }
                  <AlertTitle>{alert.title}</AlertTitle>
                </div>
                <AlertDescription className="mt-2">
                  {alert.description}
                </AlertDescription>
                <div className="flex gap-2 mt-3">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => acknowledgeAlert(alert.id)}
                  >
                    Acknowledge
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => dismissAlert(alert.id)}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Dismiss
                  </Button>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(alert.timestamp).toLocaleString()}
              </div>
            </div>
          </Alert>
        ))}
      </div>
    </div>
  );
};