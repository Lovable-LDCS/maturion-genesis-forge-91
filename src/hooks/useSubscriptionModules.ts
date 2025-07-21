import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SubscriptionModule {
  id: string;
  name: string;
  slug: string;
  monthly_price: number;
  yearly_discount_percentage: number;
  bundle_discount_percentage: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface PricingUpdate {
  monthly_price: number;
  yearly_discount_percentage: number;
  bundle_discount_percentage: number;
}

export const useSubscriptionModules = () => {
  const [modules, setModules] = useState<SubscriptionModule[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchModules = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_modules')
        .select('*')
        .order('name');

      if (error) throw error;
      setModules(data || []);
    } catch (error) {
      console.error('Error fetching modules:', error);
      toast({
        title: "Error",
        description: "Failed to load subscription modules",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createApprovalRequest = async (
    moduleId: string,
    requestType: string,
    changes: any
  ) => {
    try {
      const { error } = await supabase
        .from('admin_approval_requests')
        .insert({
          request_type: requestType,
          entity_type: 'subscription_modules',
          entity_id: moduleId,
          requested_changes: changes,
          requested_by: '',
        });

      if (error) throw error;

      toast({
        title: "Approval Request Created",
        description: "Request submitted for approval. Another admin must approve this change.",
      });

      return true;
    } catch (error) {
      console.error('Error creating approval request:', error);
      toast({
        title: "Error",
        description: "Failed to create approval request",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateModulePricing = async (moduleId: string, pricing: PricingUpdate) => {
    return createApprovalRequest(moduleId, 'price_change', pricing);
  };

  const toggleModuleStatus = async (moduleId: string, isActive: boolean) => {
    return createApprovalRequest(moduleId, 'module_activation', { is_active: isActive });
  };

  useEffect(() => {
    fetchModules();
  }, []);

  return {
    modules,
    loading,
    refetch: fetchModules,
    updateModulePricing,
    toggleModuleStatus,
  };
};