import React from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { SubscriptionConfigPanel } from '@/components/admin/SubscriptionConfigPanel';
import { SecurityGuard } from '@/components/security/SecurityGuard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

const AdminConfig = () => {
  return (
    <AuthGuard>
      <SecurityGuard 
        requiredRole="admin" 
        operation="ADMIN_CONFIG_ACCESS"
        fallback={
          <div className="container mx-auto p-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Access denied. This panel is restricted to authorized administrators only.
                This access attempt has been logged for security purposes.
              </AlertDescription>
            </Alert>
          </div>
        }
      >
        <SubscriptionConfigPanel />
      </SecurityGuard>
    </AuthGuard>
  );
};

export default AdminConfig;