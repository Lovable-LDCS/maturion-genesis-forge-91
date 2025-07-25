import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, AlertTriangle, Eye, Clock, Users, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SecurityMetrics {
  failedAuthAttempts: number;
  adminOperationAttempts: number;
  inputValidationFailures: number;
  recentSecurityEvents: Array<{
    id: string;
    action: string;
    changed_by: string;
    changed_at: string;
    change_reason: string;
  }>;
}

export const SecurityDashboard = () => {
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    failedAuthAttempts: 0,
    adminOperationAttempts: 0,
    inputValidationFailures: 0,
    recentSecurityEvents: []
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSecurityMetrics();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchSecurityMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchSecurityMetrics = async () => {
    try {
      setLoading(true);
      
      // Get recent security events from audit trail
      const { data: securityEvents, error } = await supabase
        .from('audit_trail')
        .select('id, action, changed_by, changed_at, change_reason')
        .or('action.ilike.%SECURITY%,action.ilike.%UNAUTHORIZED%,action.ilike.%VALIDATION%')
        .order('changed_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Count different types of security events
      const failedAuth = securityEvents?.filter(e => 
        e.action.includes('UNAUTHORIZED') || e.action.includes('AUTH_FAILED')
      ).length || 0;

      const adminOps = securityEvents?.filter(e => 
        e.action.includes('ADMIN_OPERATION') || e.action.includes('ADMIN_VALIDATION')
      ).length || 0;

      const inputFailures = securityEvents?.filter(e => 
        e.action.includes('INPUT_VALIDATION') || e.action.includes('INVALID_INPUT')
      ).length || 0;

      setMetrics({
        failedAuthAttempts: failedAuth,
        adminOperationAttempts: adminOps,
        inputValidationFailures: inputFailures,
        recentSecurityEvents: securityEvents || []
      });

    } catch (error) {
      console.error('Error fetching security metrics:', error);
      toast({
        title: "Error",
        description: "Failed to load security metrics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getEventSeverity = (action: string) => {
    if (action.includes('UNAUTHORIZED') || action.includes('BLOCKED')) return 'high';
    if (action.includes('VALIDATION') || action.includes('ADMIN')) return 'medium';
    return 'low';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Security Dashboard</h2>
        </div>
        <Button onClick={fetchSecurityMetrics} disabled={loading}>
          <Activity className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Security Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Auth Attempts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{metrics.failedAuthAttempts}</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admin Operations</CardTitle>
            <Users className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{metrics.adminOperationAttempts}</div>
            <p className="text-xs text-muted-foreground">Recent attempts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Input Validation Failures</CardTitle>
            <Eye className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info">{metrics.inputValidationFailures}</div>
            <p className="text-xs text-muted-foreground">Blocked inputs</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Security Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Security Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading security events...</div>
          ) : metrics.recentSecurityEvents.length === 0 ? (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                No recent security events detected. Your system is secure.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {metrics.recentSecurityEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={getEventSeverity(event.action) === 'high' ? 'destructive' : 
                                    getEventSeverity(event.action) === 'medium' ? 'secondary' : 'outline'}>
                        {event.action}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(event.changed_at).toLocaleString()}
                      </span>
                    </div>
                    {event.change_reason && (
                      <p className="text-sm mt-1">{event.change_reason}</p>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    User: {event.changed_by?.slice(0, 8)}...
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Security Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>Manual Configuration Required:</strong>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>• Set OTP expiry to 600 seconds in Supabase Auth settings</li>
                  <li>• Enable leaked password protection in Supabase Auth</li>
                  <li>• Review email templates for sensitive data exposure</li>
                </ul>
              </AlertDescription>
            </Alert>
            
            {metrics.failedAuthAttempts > 5 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  High number of failed authentication attempts detected. Consider implementing additional rate limiting.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};