import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/useOrganization';

export interface PolicyChangeLog {
  id: string;
  title: string;
  type: string;
  domain_scope: string;
  summary: string;
  logged_by: string;
  linked_document_id: string | null;
  tags: string[] | null;
  metadata: any;
  created_at: string;
  updated_at: string;
  organization_id: string | null;
}

export interface CreatePolicyLogData {
  title: string;
  type: string;
  domain_scope: string;
  summary: string;
  linked_document_id?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export const usePolicyChangeLog = () => {
  const [logs, setLogs] = useState<PolicyChangeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();

  const fetchLogs = async () => {
    if (!currentOrganization?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('policy_change_log')
        .select('*')
        .or(`organization_id.eq.${currentOrganization.id},organization_id.is.null`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching policy logs:', error);
        toast({
          title: "Error",
          description: "Failed to fetch policy change logs",
          variant: "destructive",
        });
      } else {
        setLogs(data || []);
      }
    } catch (error) {
      console.error('Error fetching policy logs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch policy change logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createPolicyLog = async (logData: CreatePolicyLogData): Promise<boolean> => {
    if (!currentOrganization?.id) {
      toast({
        title: "Error",
        description: "No organization found",
        variant: "destructive",
      });
      return false;
    }

    try {
      const { data, error } = await supabase.rpc('log_policy_change', {
        title_param: logData.title,
        type_param: logData.type,
        domain_scope_param: logData.domain_scope,
        summary_param: logData.summary,
        linked_document_id_param: logData.linked_document_id || null,
        tags_param: logData.tags || [],
        logged_by_param: 'Manual Entry',
        organization_id_param: currentOrganization.id,
        metadata_param: logData.metadata || {}
      });

      if (error) {
        console.error('Error creating policy log:', error);
        toast({
          title: "Error",
          description: "Failed to create policy log",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Success",
        description: "Policy change log created successfully",
      });
      
      await fetchLogs(); // Refresh the list
      return true;
    } catch (error) {
      console.error('Error creating policy log:', error);
      toast({
        title: "Error",
        description: "Failed to create policy log",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [currentOrganization?.id]);

  return {
    logs,
    loading,
    fetchLogs,
    createPolicyLog
  };
};