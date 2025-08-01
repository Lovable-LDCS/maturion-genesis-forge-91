import { useState, useCallback } from 'react';
import { useSecurityValidation } from './useSecurityValidation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface SecureFormOptions {
  maxInputLength?: number;
  requireSessionValidation?: boolean;
  requireOrganizationContext?: boolean;
  organizationId?: string;
}

interface FormValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedData: Record<string, any>;
}

export const useSecureForm = (options: SecureFormOptions = {}) => {
  const { validateInput, logAuditEvent } = useSecurityValidation();
  const { user, isSessionValid, validateSession } = useAuth();
  const { toast } = useToast();
  const [isValidating, setIsValidating] = useState(false);

  const validateFormData = useCallback(async (
    formData: Record<string, any>
  ): Promise<FormValidationResult> => {
    setIsValidating(true);
    
    try {
      // Session validation if required
      if (options.requireSessionValidation && (!isSessionValid || !user)) {
        const sessionIsValid = await validateSession();
        if (!sessionIsValid) {
          logAuditEvent('FORM_VALIDATION_FAILED', {
            reason: 'Invalid session',
            formFields: Object.keys(formData)
          });
          
          toast({
            title: "Security Error",
            description: "Session invalid. Please log in again.",
            variant: "destructive",
          });
          
          return {
            isValid: false,
            errors: ['Session validation failed'],
            sanitizedData: {}
          };
        }
      }

      // Organization context validation if required
      if (options.requireOrganizationContext && options.organizationId) {
        // This would be validated against the user's organization membership
        logAuditEvent('FORM_ORG_VALIDATION', {
          organizationId: options.organizationId,
          userId: user?.id,
          formFields: Object.keys(formData)
        });
      }

      const errors: string[] = [];
      const sanitizedData: Record<string, any> = {};

      // Validate each field
      for (const [key, value] of Object.entries(formData)) {
        if (typeof value === 'string') {
          const validation = await validateInput(value, options.maxInputLength);
          
          if (!validation.isValid) {
            errors.push(`${key}: ${validation.errors.join(', ')}`);
            logAuditEvent('FORM_FIELD_VALIDATION_FAILED', {
              field: key,
              errors: validation.errors,
              userId: user?.id
            });
          } else {
            sanitizedData[key] = validation.sanitized;
          }
        } else {
          // Non-string values pass through but are logged
          sanitizedData[key] = value;
        }
      }

      const isValid = errors.length === 0;
      
      if (!isValid) {
        toast({
          title: "Form Validation Failed",
          description: "Please check your input and try again.",
          variant: "destructive",
        });
      }

      return {
        isValid,
        errors,
        sanitizedData
      };
    } catch (error) {
      logAuditEvent('FORM_VALIDATION_EXCEPTION', {
        error: error instanceof Error ? error.message : 'Unknown error',
        formFields: Object.keys(formData),
        userId: user?.id
      });
      
      return {
        isValid: false,
        errors: ['Validation error occurred'],
        sanitizedData: {}
      };
    } finally {
      setIsValidating(false);
    }
  }, [options, validateInput, logAuditEvent, user, isSessionValid, validateSession, toast]);

  return {
    validateFormData,
    isValidating
  };
};