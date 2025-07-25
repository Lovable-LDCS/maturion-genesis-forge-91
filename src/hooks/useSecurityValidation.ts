import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { validateSecureInput, logSecurityEvent, createRateLimiter } from '@/lib/security';
import { useToast } from '@/hooks/use-toast';

// Rate limiter for security operations (5 requests per minute)
const securityRateLimit = createRateLimiter(5, 60000);

export const useSecurityValidation = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isValidating, setIsValidating] = useState(false);

  const validateAdminOperation = useCallback(async (operationType: string): Promise<boolean> => {
    if (!user) {
      logSecurityEvent('UNAUTHORIZED_ADMIN_ATTEMPT', { operationType, userId: null });
      return false;
    }

    // Check rate limit
    if (!securityRateLimit(user.id)) {
      toast({
        title: "Rate Limit Exceeded",
        description: "Too many security operations. Please wait before trying again.",
        variant: "destructive",
      });
      return false;
    }

    setIsValidating(true);
    try {
      const { data, error } = await supabase.rpc('validate_admin_operation', {
        operation_type: operationType
      });

      if (error) {
        logSecurityEvent('ADMIN_VALIDATION_ERROR', { 
          operationType, 
          userId: user.id, 
          error: error.message 
        });
        return false;
      }

      if (!data) {
        logSecurityEvent('UNAUTHORIZED_ADMIN_ATTEMPT', { 
          operationType, 
          userId: user.id 
        });
        toast({
          title: "Access Denied",
          description: "You don't have permission for this operation. This incident has been logged.",
          variant: "destructive",
        });
        return false;
      }

      return true;
    } catch (error) {
      logSecurityEvent('ADMIN_VALIDATION_EXCEPTION', { 
        operationType, 
        userId: user.id, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return false;
    } finally {
      setIsValidating(false);
    }
  }, [user, toast]);

  const validateUserRole = useCallback(async (requiredRole: string = 'admin'): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.rpc('user_has_role', {
        user_uuid: user.id,
        required_role: requiredRole
      });

      if (error) {
        logSecurityEvent('ROLE_VALIDATION_ERROR', { 
          requiredRole, 
          userId: user.id, 
          error: error.message 
        });
        return false;
      }

      return data || false;
    } catch (error) {
      logSecurityEvent('ROLE_VALIDATION_EXCEPTION', { 
        requiredRole, 
        userId: user.id, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return false;
    }
  }, [user]);

  const validateInput = useCallback((input: string, maxLength?: number) => {
    const result = validateSecureInput(input, maxLength);
    
    if (!result.isValid) {
      logSecurityEvent('INVALID_INPUT_DETECTED', {
        userId: user?.id,
        errors: result.errors,
        inputLength: input.length
      });
      
      toast({
        title: "Invalid Input",
        description: result.errors.join(', '),
        variant: "destructive",
      });
    }

    return result;
  }, [user, toast]);

  const logAuditEvent = useCallback(async (action: string, details: Record<string, any>) => {
    if (!user) return;

    try {
      await supabase.from('audit_trail').insert({
        organization_id: '00000000-0000-0000-0000-000000000000', // System organization
        table_name: 'client_security_events',
        record_id: crypto.randomUUID(),
        action,
        changed_by: user.id,
        change_reason: JSON.stringify(details)
      });
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }, [user]);

  return {
    validateAdminOperation,
    validateUserRole,
    validateInput,
    logAuditEvent,
    isValidating
  };
};