import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DiscountCode {
  id: string;
  code: string;
  type: string;
  value: number;
  applicable_modules: string[];
  expiry_date?: string;
  usage_limit?: number;
  current_usage: number;
  status: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface DiscountCodeInput {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  applicable_modules: string[];
  expiry_date?: string;
  usage_limit?: number;
}

export const useDiscountCodes = () => {
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchDiscountCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('discount_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDiscountCodes(data || []);
    } catch (error) {
      console.error('Error fetching discount codes:', error);
      toast({
        title: "Error",
        description: "Failed to load discount codes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createDiscountCode = async (discountCode: DiscountCodeInput) => {
    try {
      const { error } = await supabase
        .from('admin_approval_requests')
        .insert({
          request_type: 'discount_code',
          entity_type: 'discount_codes',
          entity_id: crypto.randomUUID(),
          requested_changes: discountCode as any,
          requested_by: '',
        });

      if (error) throw error;

      toast({
        title: "Discount Code Request Created",
        description: "Request submitted for approval. Another admin must approve this discount code.",
      });

      return true;
    } catch (error) {
      console.error('Error creating discount code request:', error);
      toast({
        title: "Error",
        description: "Failed to create discount code request",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateDiscountCode = async (id: string, updates: Partial<DiscountCodeInput>) => {
    try {
      const { error } = await supabase
        .from('discount_codes')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Discount code updated successfully",
      });

      fetchDiscountCodes();
      return true;
    } catch (error) {
      console.error('Error updating discount code:', error);
      toast({
        title: "Error",
        description: "Failed to update discount code",
        variant: "destructive",
      });
      return false;
    }
  };

  const revokeDiscountCode = async (id: string) => {
    return updateDiscountCode(id, { status: 'revoked' } as any);
  };

  useEffect(() => {
    fetchDiscountCodes();
  }, []);

  return {
    discountCodes,
    loading,
    refetch: fetchDiscountCodes,
    createDiscountCode,
    updateDiscountCode,
    revokeDiscountCode,
  };
};