import React from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { SecurityGuard } from '@/components/security/SecurityGuard';
import { SecurityDashboard } from '@/components/security/SecurityDashboard';
import { SecurityAlertSystem } from '@/components/security/SecurityAlertSystem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Settings, AlertTriangle, Info } from 'lucide-react';

const AdminSecurityDashboard = () => {
  return (
    <AuthGuard>
      <SecurityGuard 
        requiredRole="admin" 
        operation="SECURITY_DASHBOARD_ACCESS"
        fallback={
          <div className="container mx-auto p-6">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Access denied. Security dashboard is restricted to administrators only.
              </AlertDescription>
            </Alert>
          </div>
        }
      >
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Security Administration</h1>
              <p className="text-muted-foreground">Monitor and manage system security</p>
            </div>
          </div>

          {/* Security Alerts at the top */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Active Security Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SecurityAlertSystem />
            </CardContent>
          </Card>

          {/* Manual Configuration Warnings */}
          <Alert>
            <Settings className="h-4 w-4" />
            <AlertTitle>Manual Configuration Required</AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-2">
                <p><strong>The following security settings must be configured manually in the Supabase Dashboard:</strong></p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li><strong>OTP Expiry</strong>: Go to Authentication → Settings → Set OTP expiry to 600 seconds (10 minutes)</li>
                  <li><strong>Leaked Password Protection</strong>: Go to Authentication → Settings → Enable "Leaked password protection"</li>
                </ul>
                <p className="text-sm mt-3">
                  <a 
                    href="https://supabase.com/dashboard/project/dmhlxhatogrrrvuruayv/auth/providers" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary underline hover:no-underline"
                  >
                    → Open Supabase Authentication Settings
                  </a>
                </p>
              </div>
            </AlertDescription>
          </Alert>

          <Tabs defaultValue="dashboard" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="dashboard">Security Dashboard</TabsTrigger>
              <TabsTrigger value="documentation">Security Documentation</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-4">
              <SecurityDashboard />
            </TabsContent>

            <TabsContent value="documentation" className="space-y-4">
              <div className="grid gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Info className="h-5 w-5" />
                      Security Status Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-semibold text-green-600 mb-2">✅ Implemented Security Features</h4>
                        <ul className="text-sm space-y-1">
                          <li>• Row Level Security (RLS) on all tables</li>
                          <li>• Input validation with XSS/injection protection</li>
                          <li>• Rate limiting for security operations</li>
                          <li>• Comprehensive audit trail logging</li>
                          <li>• Admin role validation and authorization</li>
                          <li>• Security event monitoring and alerting</li>
                          <li>• SECURITY DEFINER functions with proper isolation</li>
                        </ul>
                      </div>
                      
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-semibold text-yellow-600 mb-2">⚠️ Manual Configuration Required</h4>
                        <ul className="text-sm space-y-1">
                          <li>• OTP expiry setting (600 seconds recommended)</li>
                          <li>• Leaked password protection activation</li>
                          <li>• Vector extension in public schema (documented as acceptable)</li>
                        </ul>
                      </div>
                    </div>

                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Security Documentation:</strong> Complete security documentation is available in the 
                        project's <code>/docs/SECURITY.md</code> file, including incident response procedures, 
                        security testing guidelines, and compliance information.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SecurityGuard>
    </AuthGuard>
  );
};

export default AdminSecurityDashboard;