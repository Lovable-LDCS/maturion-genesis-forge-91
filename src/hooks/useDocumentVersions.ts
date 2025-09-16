import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  title: string;
  domain?: string;
  tags?: string;
  upload_notes?: string;
  document_type: string;
  metadata: any;
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  created_at: string;
  created_by: string;
  change_reason?: string;
  organization_id: string;
}

export const useDocumentVersions = (documentId?: string) => {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchVersions = async (docId: string) => {
    if (!docId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_document_versions')
        .select('*')
        .eq('document_id', docId)
        .order('version_number', { ascending: false });

      if (error) throw error;
      setVersions((data || []) as DocumentVersion[]);
    } catch (error: any) {
      console.error('Error fetching versions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch document versions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const rollbackToVersion = async (documentId: string, versionId: string): Promise<boolean> => {
    try {
      // Get the version data
      const { data: version, error: versionError } = await supabase
        .from('ai_document_versions')
        .select('*')
        .eq('id', versionId)
        .single();

      if (versionError || !version) throw new Error('Version not found');

      // Update the main document with version data
      const { error: updateError } = await supabase
        .from('ai_documents')
        .update({
          title: version.title,
          domain: version.domain,
          tags: Array.isArray(version.tags) ? version.tags : (version.tags ? [version.tags] : []),
          upload_notes: version.upload_notes,
          document_type: version.document_type,
          updated_at: new Date().toISOString(),
          metadata: {
            ...(typeof version.metadata === 'object' && version.metadata !== null ? version.metadata : {}),
            rollback_from_version: version.version_number,
            rollback_at: new Date().toISOString(),
            change_reason: `Rolled back to version ${version.version_number}`
          }
        })
        .eq('id', documentId);

      if (updateError) throw updateError;

      // Create audit log
      await supabase
        .from('ai_upload_audit')
        .insert({
          organization_id: version.organization_id,
          document_id: documentId,
          action: 'rollback',
          user_id: (await supabase.auth.getUser()).data.user?.id || '',
          metadata: {
            rolled_back_to_version: version.version_number,
            rollback_timestamp: new Date().toISOString()
          }
        });

      toast({
        title: "Rollback successful",
        description: `Document rolled back to version ${version.version_number}`,
      });

      return true;
    } catch (error: any) {
      console.error('Rollback error:', error);
      toast({
        title: "Rollback failed",
        description: error.message || "Failed to rollback document",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    if (documentId) {
      fetchVersions(documentId);
    }
  }, [documentId]);

  return {
    versions,
    loading,
    fetchVersions,
    rollbackToVersion
  };
};