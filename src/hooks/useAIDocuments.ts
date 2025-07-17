import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AIDocument {
  id: string;
  organization_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  document_type: 'maturity_model' | 'sector_context' | 'scoring_logic' | 'sop_template' | 'general' | 'mps_document' | 'iso_alignment' | 'assessment_framework_component';
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  total_chunks: number;
  metadata: any;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  processed_at?: string;
}

export const useAIDocuments = () => {
  const [documents, setDocuments] = useState<AIDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments((data || []) as AIDocument[]);
    } catch (error: any) {
      console.error('Error fetching AI documents:', error);
      toast({
        title: "Error",
        description: "Failed to fetch documents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadDocument = async (
    file: File,
    documentType: AIDocument['document_type'],
    organizationId: string,
    userId: string
  ): Promise<string | null> => {
    setUploading(true);
    
    try {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('ai-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Create document record
      const { data: docData, error: docError } = await supabase
        .from('ai_documents')
        .insert({
          organization_id: organizationId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          document_type: documentType,
          uploaded_by: userId,
          metadata: {
            original_name: file.name,
            upload_timestamp: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (docError) throw docError;

      // Create audit log
      await supabase
        .from('ai_upload_audit')
        .insert({
          organization_id: organizationId,
          document_id: docData.id,
          action: 'upload',
          user_id: userId,
          metadata: {
            file_name: file.name,
            file_size: file.size,
            document_type: documentType
          }
        });

      // Trigger processing
      const { error: processError } = await supabase.functions.invoke('process-ai-document', {
        body: { documentId: docData.id }
      });

      if (processError) {
        console.error('Processing error:', processError);
        // Don't fail the upload if processing fails, just log it
      }

      toast({
        title: "Upload successful",
        description: `${file.name} has been uploaded and is being processed`,
      });

      // Refresh documents list
      await fetchDocuments();
      
      return docData.id;
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload document",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = async (documentId: string) => {
    try {
      // Get document info first
      const { data: doc } = await supabase
        .from('ai_documents')
        .select('file_path, organization_id')
        .eq('id', documentId)
        .single();

      if (!doc) throw new Error('Document not found');

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('ai-documents')
        .remove([doc.file_path]);

      if (storageError) throw storageError;

      // Delete document record (chunks will be deleted via CASCADE)
      const { error: deleteError } = await supabase
        .from('ai_documents')
        .delete()
        .eq('id', documentId);

      if (deleteError) throw deleteError;

      // Create audit log
      await supabase
        .from('ai_upload_audit')
        .insert({
          organization_id: doc.organization_id,
          document_id: documentId,
          action: 'delete',
          user_id: (await supabase.auth.getUser()).data.user?.id || '',
          metadata: { deleted_at: new Date().toISOString() }
        });

      toast({
        title: "Document deleted",
        description: "Document and all associated data have been removed",
      });

      // Refresh documents list
      await fetchDocuments();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete document",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  return {
    documents,
    loading,
    uploading,
    uploadDocument,
    deleteDocument,
    refreshDocuments: fetchDocuments
  };
};