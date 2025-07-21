import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface ApprovalRequest {
  id: string;
  request_type: string;
  entity_type: string;
  entity_id: string;
  requested_changes: any;
  status: string;
  requested_by: string;
  approved_by?: string;
  rejection_reason?: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export const useApprovalRequests = () => {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_approval_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching approval requests:', error);
      toast({
        title: "Error",
        description: "Failed to load approval requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const approveRequest = async (requestId: string) => {
    if (!user) return false;

    try {
      const request = requests.find(r => r.id === requestId);
      if (!request) {
        throw new Error('Request not found');
      }

      if (request.requested_by === user.id) {
        toast({
          title: "Error",
          description: "You cannot approve your own request",
          variant: "destructive",
        });
        return false;
      }

      // Apply the changes based on request type
      if (request.request_type === 'price_change') {
        const { error: updateError } = await supabase
          .from('subscription_modules')
          .update({
            ...request.requested_changes,
            updated_by: user.id,
          })
          .eq('id', request.entity_id);

        if (updateError) throw updateError;
      } else if (request.request_type === 'discount_code') {
        const { error: insertError } = await supabase
          .from('discount_codes')
          .insert({
            ...request.requested_changes,
            status: 'active',
            created_by: request.requested_by,
            updated_by: user.id,
          });

        if (insertError) throw insertError;
      } else if (request.request_type === 'module_activation') {
        const { error: updateError } = await supabase
          .from('subscription_modules')
          .update({
            ...request.requested_changes,
            updated_by: user.id,
          })
          .eq('id', request.entity_id);

        if (updateError) throw updateError;
      }

      // Mark request as approved
      const { error } = await supabase
        .from('admin_approval_requests')
        .update({
          status: 'approved',
          approved_by: user.id,
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Request approved and changes applied",
      });

      fetchRequests();
      return true;
    } catch (error) {
      console.error('Error approving request:', error);
      toast({
        title: "Error",
        description: "Failed to approve request",
        variant: "destructive",
      });
      return false;
    }
  };

  const rejectRequest = async (requestId: string, reason?: string) => {
    try {
      const { error } = await supabase
        .from('admin_approval_requests')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          approved_by: user?.id,
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Request rejected",
      });

      fetchRequests();
      return true;
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({
        title: "Error",
        description: "Failed to reject request",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchRequests();

    // Set up real-time subscription for approval requests
    const channel = supabase
      .channel('approval_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_approval_requests'
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    requests,
    loading,
    refetch: fetchRequests,
    approveRequest,
    rejectRequest,
  };
};