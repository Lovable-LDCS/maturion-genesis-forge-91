import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, Shield, User, Database } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DiagnosticInfo {
  userId: string | null;
  userEmail: string | null;
  isAdmin: boolean;
  adminRole: string | null;
  policyLogsCount: number;
  visiblePolicyLogsCount: number;
}

export const PolicyLogDiagnosticPanel: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState<DiagnosticInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const runDiagnostics = async () => {
    setIsLoading(true);
    try {
      // Get current user info
      const { data: { user } } = await supabase.auth.getUser();
      
      // Check admin status
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('role, email')
        .eq('user_id', user?.id)
        .single();

      // Count total policy logs (bypassing RLS)
      const { count: totalCount, error: countError } = await supabase
        .from('policy_change_log')
        .select('*', { count: 'exact', head: true });

      // Count visible policy logs (with RLS)
      const { data: visibleLogs, error: visibleError } = await supabase
        .from('policy_change_log')
        .select('id');

      const diagnosticInfo: DiagnosticInfo = {
        userId: user?.id || null,
        userEmail: user?.email || null,
        isAdmin: !!adminData && !adminError,
        adminRole: adminData?.role || null,
        policyLogsCount: totalCount || 0,
        visiblePolicyLogsCount: visibleLogs?.length || 0
      };

      setDiagnostics(diagnosticInfo);

      console.log('Policy Log Diagnostics:', {
        diagnosticInfo,
        adminError,
        countError,
        visibleError
      });

    } catch (error) {
      console.error('Diagnostic error:', error);
      toast({
        title: "Diagnostic Error",
        description: "Failed to run policy log diagnostics",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const grantAdminAccess = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('grant-admin-access', {
        body: { 
          action: 'grant_admin_access',
          role: 'admin'
        }
      });

      if (error) throw error;

      toast({
        title: "Admin Access Granted",
        description: "Admin access has been granted. Please refresh the page.",
      });

      // Re-run diagnostics
      setTimeout(() => runDiagnostics(), 1000);

    } catch (error) {
      console.error('Error granting admin access:', error);
      toast({
        title: "Error",
        description: "Failed to grant admin access",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Policy Log Diagnostic Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={runDiagnostics}
            disabled={isLoading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Run Diagnostics
          </Button>
          
          {diagnostics && !diagnostics.isAdmin && (
            <Button
              onClick={grantAdminAccess}
              className="flex items-center gap-2"
            >
              <Shield className="w-4 h-4" />
              Grant Admin Access
            </Button>
          )}
        </div>

        {diagnostics && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span className="font-medium">User Information</span>
                </div>
                <div className="text-sm space-y-1">
                  <div><strong>User ID:</strong> {diagnostics.userId || 'Not authenticated'}</div>
                  <div><strong>Email:</strong> {diagnostics.userEmail || 'Unknown'}</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  <span className="font-medium">Admin Status</span>
                </div>
                <div className="text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <strong>Is Admin:</strong>
                    <Badge variant={diagnostics.isAdmin ? "default" : "destructive"}>
                      {diagnostics.isAdmin ? "YES" : "NO"}
                    </Badge>
                  </div>
                  {diagnostics.adminRole && (
                    <div><strong>Role:</strong> {diagnostics.adminRole}</div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                <span className="font-medium">Policy Logs Data</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Total Policy Logs:</strong> {diagnostics.policyLogsCount}
                </div>
                <div>
                  <strong>Visible to User:</strong> {diagnostics.visiblePolicyLogsCount}
                </div>
              </div>
            </div>

            {diagnostics.policyLogsCount > 0 && diagnostics.visiblePolicyLogsCount === 0 && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertDescription>
                  <strong>Issue Detected:</strong> There are {diagnostics.policyLogsCount} policy logs in the database, 
                  but none are visible to your user account. This indicates an RLS (Row Level Security) permissions issue.
                  {!diagnostics.isAdmin && " Click 'Grant Admin Access' to resolve this."}
                </AlertDescription>
              </Alert>
            )}

            {diagnostics.isAdmin && diagnostics.visiblePolicyLogsCount > 0 && (
              <Alert className="border-green-200 bg-green-50">
                <AlertDescription>
                  <strong>Success:</strong> Admin access is working correctly. You should now be able to see 
                  {diagnostics.visiblePolicyLogsCount} policy logs in the Policy Change Log viewer.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};