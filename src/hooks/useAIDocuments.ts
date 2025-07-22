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
  updated_by: string;
  created_at: string;
  updated_at: string;
  processed_at?: string;
  title?: string;
  domain?: string;
  tags?: string;
  upload_notes?: string;
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
    userId: string,
    title?: string,
    domain?: string,
    tags?: string,
    uploadNotes?: string
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
          title: title || file.name.replace(/\.[^/.]+$/, ''), // Use provided title or filename without extension
          domain: domain,
          tags: tags,
          upload_notes: uploadNotes,
          uploaded_by: userId,
          updated_by: userId,
          metadata: {
            original_name: file.name,
            upload_timestamp: new Date().toISOString(),
            title: title,
            domain: domain,
            tags: tags?.split(',').map(tag => tag.trim()),
            upload_notes: uploadNotes
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
            document_type: documentType,
            domain: domain,
            tags: tags,
            upload_notes: uploadNotes
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

  const updateDocument = async (
    documentId: string,
    updates: {
      title?: string;
      domain?: string;
      tags?: string;
      upload_notes?: string;
      document_type?: AIDocument['document_type'];
      change_reason?: string;
    }
  ): Promise<boolean> => {
    try {
      const { data: currentDoc } = await supabase
        .from('ai_documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (!currentDoc) throw new Error('Document not found');

      const { error: updateError } = await supabase
        .from('ai_documents')
        .update({
          title: updates.title,
          domain: updates.domain,
          tags: updates.tags,
          upload_notes: updates.upload_notes,
          document_type: updates.document_type,
          updated_at: new Date().toISOString(),
          updated_by: (await supabase.auth.getUser()).data.user?.id || '',
          metadata: {
            ...(typeof currentDoc.metadata === 'object' && currentDoc.metadata !== null ? currentDoc.metadata : {}),
            title: updates.title,
            domain: updates.domain,
            tags: updates.tags?.split(',').map(tag => tag.trim()),
            upload_notes: updates.upload_notes,
            change_reason: updates.change_reason || 'Document updated',
            last_updated: new Date().toISOString()
          }
        })
        .eq('id', documentId);

      if (updateError) throw updateError;

      // Create audit log
      await supabase
        .from('ai_upload_audit')
        .insert({
          organization_id: currentDoc.organization_id,
          document_id: documentId,
          action: 'update',
          user_id: (await supabase.auth.getUser()).data.user?.id || '',
          metadata: {
            updated_fields: Object.keys(updates),
            old_values: {
              title: currentDoc.title,
              domain: currentDoc.domain,
              tags: currentDoc.tags,
              upload_notes: currentDoc.upload_notes,
              document_type: currentDoc.document_type
            },
            new_values: updates
          }
        });

      toast({
        title: "Document updated",
        description: "Document metadata has been successfully updated",
      });

      // Refresh documents list
      await fetchDocuments();
      return true;
    } catch (error: any) {
      console.error('Update error:', error);
      toast({
        title: "Update failed",
        description: error.message || "Failed to update document",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteDocument = async (documentId: string) => {
    try {
      console.log('Starting document deletion for ID:', documentId);
      
      // Get document info first
      const { data: doc, error: fetchError } = await supabase
        .from('ai_documents')
        .select('file_path, organization_id, title, file_name')
        .eq('id', documentId)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching document for deletion:', fetchError);
        throw fetchError;
      }

      if (!doc) {
        console.error('Document not found:', documentId);
        throw new Error('Document not found');
      }

      console.log('Found document to delete:', doc);

      // Create audit log BEFORE deleting (to avoid foreign key constraint violation)
      const { error: auditError } = await supabase
        .from('ai_upload_audit')
        .insert({
          organization_id: doc.organization_id,
          document_id: documentId,
          action: 'delete',
          user_id: (await supabase.auth.getUser()).data.user?.id || '',
          metadata: { 
            deleted_at: new Date().toISOString(),
            deleted_file: doc.file_name,
            deleted_title: doc.title 
          }
        });

      if (auditError) {
        console.warn('Audit log creation failed:', auditError);
        // Continue with deletion even if audit logging fails
      } else {
        console.log('Audit log created successfully');
      }

      // Delete from storage first
      const { error: storageError } = await supabase.storage
        .from('ai-documents')
        .remove([doc.file_path]);

      if (storageError) {
        console.warn('Storage deletion warning:', storageError);
        // Continue with database deletion even if storage fails
      } else {
        console.log('Storage file deleted successfully');
      }

      // Delete document record (chunks will be deleted via CASCADE)
      const { error: deleteError } = await supabase
        .from('ai_documents')
        .delete()
        .eq('id', documentId);

      if (deleteError) {
        console.error('Database deletion error:', deleteError);
        throw deleteError;
      }

      console.log('Document deleted from database successfully');

      toast({
        title: "Document deleted",
        description: `${doc.title || doc.file_name} has been removed`,
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
    updateDocument,
    deleteDocument,
    refreshDocuments: fetchDocuments
  };
};