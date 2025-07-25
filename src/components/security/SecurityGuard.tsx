import React, { useEffect, useState } from 'react';
import { useSecurityValidation } from '@/hooks/useSecurityValidation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle } from 'lucide-react';

interface SecurityGuardProps {
  children: React.ReactNode;
  requiredRole?: string;
  operation?: string;
  fallback?: React.ReactNode;
}

export const SecurityGuard: React.FC<SecurityGuardProps> = ({
  children,
  requiredRole = 'admin',
  operation,
  fallback
}) => {
  const { validateUserRole, validateAdminOperation, logAuditEvent } = useSecurityValidation();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      setLoading(true);
      
      try {
        // First check role
        const hasRole = await validateUserRole(requiredRole);
        
        if (!hasRole) {
          setHasAccess(false);
          await logAuditEvent('ACCESS_DENIED', {
            requiredRole,
            operation,
            reason: 'Insufficient role'
          });
          return;
        }

        // If specific operation is required, validate it
        if (operation) {
          const hasOperationAccess = await validateAdminOperation(operation);
          setHasAccess(hasOperationAccess);
          
          if (!hasOperationAccess) {
            await logAuditEvent('OPERATION_DENIED', {
              requiredRole,
              operation,
              reason: 'Operation not authorized'
            });
          }
        } else {
          setHasAccess(true);
        }
      } catch (error) {
        setHasAccess(false);
        await logAuditEvent('SECURITY_CHECK_ERROR', {
          requiredRole,
          operation,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [requiredRole, operation, validateUserRole, validateAdminOperation, logAuditEvent]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Shield className="h-5 w-5 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Validating access...</span>
      </div>
    );
  }

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <Alert variant="destructive" className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Access denied. You don't have permission to view this content.
          {operation && ` Required operation: ${operation}`}
        </AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
};