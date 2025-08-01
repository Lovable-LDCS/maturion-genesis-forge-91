import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface OrganizationContext {
  organization_id: string;
  user_role: string;
  organization_type: string;
  can_upload: boolean;
}

export const useOrganizationContext = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [contexts, setContexts] = useState<OrganizationContext[]>([]);
  const [currentContext, setCurrentContext] = useState<OrganizationContext | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch all organizational contexts for the current user
  const fetchOrganizationContexts = useCallback(async () => {
    if (!user?.id) {
      setContexts([]);
      setCurrentContext(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .rpc('get_user_organization_context');

      if (error) {
        console.error('Error fetching organization contexts:', error);
        toast({
          title: "Context Error",
          description: "Unable to load organization contexts",
          variant: "destructive",
        });
        return;
      }

      setContexts(data || []);
      
      // Auto-select the first context with upload permissions or first primary org
      if (data && data.length > 0) {
        const preferredContext = data.find((ctx: OrganizationContext) => 
          ctx.can_upload && ctx.organization_type === 'primary'
        ) || data.find((ctx: OrganizationContext) => 
          ctx.can_upload
        ) || data[0];
        
        setCurrentContext(preferredContext);
      }
    } catch (error) {
      console.error('Error in fetchOrganizationContexts:', error);
      toast({
        title: "Context Error",
        description: "Failed to load organization contexts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, toast]);

  // Validate if user can upload to a specific organization using secure validation
  const validateUploadPermission = useCallback(async (organizationId: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      // Use the new secure validation function
      const { data, error } = await supabase
        .rpc('validate_organization_access', {
          target_org_id: organizationId
        });

      if (error) {
        console.error('Upload permission validation error:', error);
        return false;
      }

      return data || false;
    } catch (error) {
      console.error('Error validating upload permission:', error);
      return false;
    }
  }, [user?.id]);

  // Log organizational context validation
  const logContextValidation = useCallback(async (
    sessionId: string,
    organizationId: string,
    success: boolean,
    details?: string
  ) => {
    if (!user?.id) return;

    try {
      await supabase.rpc('log_upload_context_validation', {
        session_id_param: sessionId,
        organization_id_param: organizationId,
        user_id_param: user.id,
        validation_result_param: success,
        error_details_param: details
      });
    } catch (error) {
      console.error('Error logging context validation:', error);
    }
  }, [user?.id]);

  // Switch to a different organizational context
  const switchContext = useCallback((organizationId: string) => {
    const context = contexts.find(ctx => ctx.organization_id === organizationId);
    if (context) {
      setCurrentContext(context);
    }
  }, [contexts]);

  // Check if current context has specific permissions
  const hasPermission = useCallback((permission: 'upload' | 'admin' | 'view') => {
    if (!currentContext) return false;

    switch (permission) {
      case 'upload':
        return currentContext.can_upload;
      case 'admin':
        return ['admin', 'owner'].includes(currentContext.user_role);
      case 'view':
        return ['viewer', 'assessor', 'admin', 'owner'].includes(currentContext.user_role);
      default:
        return false;
    }
  }, [currentContext]);

  useEffect(() => {
    fetchOrganizationContexts();
  }, [fetchOrganizationContexts]);

  return {
    contexts,
    currentContext,
    loading,
    switchContext,
    hasPermission,
    validateUploadPermission,
    logContextValidation,
    refreshContexts: fetchOrganizationContexts
  };
};