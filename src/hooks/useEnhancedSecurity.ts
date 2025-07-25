import { useState, useCallback } from 'react';
import { validateSecureInput, logSecurityEvent } from '@/lib/security';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface SecurityValidationResult {
  isValid: boolean;
  sanitized: string;
  errors: string[];
}

interface EnhancedSecurityHook {
  validateAndSanitizeInput: (input: string, maxLength?: number) => SecurityValidationResult;
  logSecurityAttempt: (eventType: string, details: Record<string, any>) => void;
  isProcessing: boolean;
}

export const useEnhancedSecurity = (): EnhancedSecurityHook => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const validateAndSanitizeInput = useCallback((input: string, maxLength: number = 1000): SecurityValidationResult => {
    setIsProcessing(true);
    
    try {
      const result = validateSecureInput(input, maxLength);
      
      if (!result.isValid) {
        logSecurityEvent('INPUT_VALIDATION_FAILED', {
          userId: user?.id,
          inputLength: input.length,
          errors: result.errors,
          timestamp: new Date().toISOString()
        });
        
        toast({
          title: "Input Validation Failed",
          description: "The input contains potentially unsafe content.",
          variant: "destructive",
        });
      }
      
      return result;
    } finally {
      setIsProcessing(false);
    }
  }, [user?.id, toast]);

  const logSecurityAttempt = useCallback((eventType: string, details: Record<string, any>) => {
    logSecurityEvent(eventType, {
      ...details,
      userId: user?.id,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      url: window.location.href
    });
  }, [user?.id]);

  return {
    validateAndSanitizeInput,
    logSecurityAttempt,
    isProcessing
  };
};