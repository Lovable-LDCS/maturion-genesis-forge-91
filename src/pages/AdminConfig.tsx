import React from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { SubscriptionConfigPanel } from '@/components/admin/SubscriptionConfigPanel';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

const AdminConfig = () => {
  const { isAdmin, loading } = useAdminAccess();

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex items-center justify-center min-h-screen">
          <div>Loading...</div>
        </div>
      </AuthGuard>
    );
  }

  if (!isAdmin) {
    return (
      <AuthGuard>
        <div className="container mx-auto p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Access denied. This panel is restricted to authorized administrators only.
            </AlertDescription>
          </Alert>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <SubscriptionConfigPanel />
    </AuthGuard>
  );
};

export default AdminConfig;