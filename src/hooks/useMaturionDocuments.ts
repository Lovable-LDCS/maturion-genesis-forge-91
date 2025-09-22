import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MaturionDocument {
  id: string;
  organization_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  document_type: 'maturity_model' | 'sector_context' | 'scoring_logic' | 'sop_template' | 'general' | 'mps_document' | 'iso_alignment' | 'assessment_framework_component' | 'ai_logic_rule_global' | 'system_instruction' | 'threat_intelligence_profile' | 'governance_reasoning_manifest' | 'best_practice';
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
  tags?: string[] | null;
  upload_notes?: string;
  is_ai_ingested?: boolean;
  deleted_at?: string | null;
}

export const useMaturionDocuments = () => {
  const [documents, setDocuments] = useState<MaturionDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const fetchDocuments = async () => {
    try {
      // Try privileged edge function first (returns all docs if caller is superuser)
      console.log('[Docs] Invoking list-all-documents edge function...')
      const { data: fnData, error: fnError } = await supabase.functions.invoke('list-all-documents')

      if (!fnError && fnData && Array.isArray((fnData as any).documents)) {
        const docs = (fnData as any).documents as MaturionDocument[]
        console.log(`[Docs] Edge function returned ${docs.length} documents (superuser bypass).`)
        setDocuments(docs)
        return
      } else if (fnError) {
        console.warn('[Docs] Edge function not used (likely not superuser). Falling back to RLS query.', fnError)
      }

      // Fallback to RLS-protected direct query (filter out soft-deleted documents)
      const { data, error } = await supabase
        .from('ai_documents')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      console.log(`[Docs] Fallback RLS query returned ${data?.length || 0} documents.`)
      setDocuments((data || []) as any)
    } catch (error: any) {
      console.error('Error fetching Maturion documents:', error)
      toast({
        title: 'Error',
        description: error?.message || 'Failed to fetch documents',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  };
  const uploadDocument = async (
    file: File,
    metadata: {
      title: string;
      documentType: string;
      domain: string;
      tags: string;
      visibility: string;
      description?: string;
      contextLevel?: 'global' | 'organization' | 'subsidiary';
      targetOrganizationId?: string;
      userId?: string;
    },
    organizationId: string
  ): Promise<string | null> => {
    setUploading(true);
    
    try {
      // CHECK FOR DUPLICATE FILES BEFORE UPLOAD
      const { data: existingDocs, error: checkError } = await supabase
        .from('ai_documents')
        .select('id, file_name')
        .eq('organization_id', organizationId)
        .eq('file_name', file.name)
        .eq('uploaded_by', metadata.userId || '');

      if (checkError) {
        console.warn('Error checking for duplicates:', checkError);
        // Continue with upload despite check error
      } else if (existingDocs && existingDocs.length > 0) {
        throw new Error(`Document "${file.name}" already exists in your knowledge base. Please rename the file or delete the existing document first.`);
      }

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${metadata.userId || 'unknown'}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('ai-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Create document record with context fields
      const { data: docData, error: docError } = await supabase
        .from('ai_documents')
        .insert({
          organization_id: organizationId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          document_type: metadata.documentType,
          title: metadata.title,
          domain: metadata.domain,
          tags: metadata.tags.split(',').map(tag => tag.trim()).filter(Boolean),
          visibility: metadata.visibility,
          upload_notes: metadata.description,
          context_level: metadata.contextLevel || 'organization',
          target_organization_id: metadata.targetOrganizationId,
          uploaded_by: metadata.userId || '',
          updated_by: metadata.userId || '',
          metadata: {
            original_name: file.name,
            upload_timestamp: new Date().toISOString(),
            title: metadata.title,
            domain: metadata.domain,
            tags: metadata.tags.split(',').map(tag => tag.trim()).filter(Boolean),
            upload_notes: metadata.description,
            context_level: metadata.contextLevel || 'organization',
            target_organization_id: metadata.targetOrganizationId
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
          user_id: metadata.userId || '',
          metadata: {
            file_name: file.name,
            file_size: file.size,
            document_type: metadata.documentType,
            domain: metadata.domain,
            tags: metadata.tags,
            upload_notes: metadata.description,
            context_level: metadata.contextLevel || 'organization',
            target_organization_id: metadata.targetOrganizationId
          }
        });

      // Trigger processing
      console.log('🔄 About to invoke process-ai-document function...');
      console.log('🔄 Document ID:', docData.id);
      
      const { data: processData, error: processError } = await supabase.functions.invoke('process-ai-document', {
        body: { documentId: docData.id }
      });

      console.log('🔄 Function invocation completed');
      console.log('🔄 Process data:', processData);
      console.log('🔄 Process error:', processError);

      if (processError) {
        console.error('❌ Processing error:', processError);
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

  // Legacy uploadDocument function for backward compatibility
  const uploadDocumentLegacy = async (
    file: File,
    documentType: MaturionDocument['document_type'],
    organizationId: string,
    userId: string,
    title?: string,
    domain?: string,
    tags?: string,
    uploadNotes?: string
  ): Promise<string | null> => {
    return uploadDocument(file, {
      title: title || file.name.replace(/\.[^/.]+$/, ''),
      documentType: documentType,
      domain: domain || '',
      tags: tags || '',
      visibility: 'all_users',
      description: uploadNotes,
      contextLevel: 'organization',
      userId: userId
    }, organizationId);
  };

  const updateDocument = async (
    documentId: string,
    updates: {
      title?: string;
      domain?: string;
      tags?: string;
      upload_notes?: string;
      document_type?: MaturionDocument['document_type'];
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
          tags: updates.tags ? updates.tags.split(',').map(tag => tag.trim()) : [],
          upload_notes: updates.upload_notes,
          document_type: updates.document_type,
          updated_at: new Date().toISOString(),
          updated_by: (await supabase.auth.getUser()).data.user?.id || '',
          metadata: {
            ...(typeof currentDoc.metadata === 'object' && currentDoc.metadata !== null ? currentDoc.metadata : {}),
            title: updates.title,
            domain: updates.domain,
            tags: updates.tags ? updates.tags.split(',').map(tag => tag.trim()) : [],
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

  const deleteDocument = async (documentId: string, hardDelete: boolean = false) => {
    try {
      console.log('Starting document deletion for ID:', documentId, 'Hard delete:', hardDelete);
      
      // Get document info first
      const { data: doc, error: fetchError } = await supabase
        .from('ai_documents')
        .select('file_path, organization_id, title, file_name, deleted_at')
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

      if (hardDelete || doc.deleted_at) {
        // Hard delete or delete already soft-deleted document
        
        // Create audit log BEFORE deleting
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
              deleted_title: doc.title,
              hard_delete: true
            }
          });

        if (auditError) {
          console.warn('Audit log creation failed:', auditError);
        }

        // Delete from storage
        const { error: storageError } = await supabase.storage
          .from('ai-documents')
          .remove([doc.file_path]);

        if (storageError) {
          console.warn('Storage deletion warning:', storageError);
        }

        // Hard delete from database
        const { error: deleteError } = await supabase
          .from('ai_documents')
          .delete()
          .eq('id', documentId);

        if (deleteError) {
          console.error('Database deletion error:', deleteError);
          throw deleteError;
        }

        toast({
          title: "Document permanently deleted",
          description: `${doc.title || doc.file_name} has been permanently removed`,
        });
      } else {
        // Soft delete
        const { error: updateError } = await supabase
          .from('ai_documents')
          .update({ 
            deleted_at: new Date().toISOString(),
            updated_by: (await supabase.auth.getUser()).data.user?.id || ''
          })
          .eq('id', documentId);

        if (updateError) {
          console.error('Soft delete error:', updateError);
          throw updateError;
        }

        // Create audit log
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
              deleted_title: doc.title,
              soft_delete: true
            }
          });

        if (auditError) {
          console.warn('Audit log creation failed:', auditError);
        }

        toast({
          title: "Document deleted",
          description: `${doc.title || doc.file_name} has been moved to trash`,
        });
      }

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

  // BULK DELETE FUNCTION FOR DUPLICATE CLEANUP
  const bulkDeleteDocuments = async (documentIds: string[]) => {
    try {
      console.log(`Starting bulk deletion of ${documentIds.length} documents`);
      
      if (documentIds.length === 0) {
        throw new Error('No documents selected for deletion');
      }

      // Get documents info first for audit logging
      const { data: docs, error: fetchError } = await supabase
        .from('ai_documents')
        .select('id, file_path, organization_id, title, file_name, deleted_at')
        .in('id', documentIds);

      if (fetchError) {
        console.error('Error fetching documents for bulk deletion:', fetchError);
        throw fetchError;
      }

      if (!docs || docs.length === 0) {
        throw new Error('No documents found for deletion');
      }

      console.log(`Found ${docs.length} documents to delete`);

      // Get current user for audit logs
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id || '';

      // Create audit logs for all documents BEFORE deleting
      const auditPromises = docs.map(doc => 
        supabase
          .from('ai_upload_audit')
          .insert({
            organization_id: doc.organization_id,
            document_id: doc.id,
            action: 'bulk_delete',
            user_id: currentUserId,
            metadata: { 
              deleted_at: new Date().toISOString(),
              deleted_file: doc.file_name,
              deleted_title: doc.title,
              bulk_operation: true
            }
          })
      );

      const auditResults = await Promise.allSettled(auditPromises);
      console.log('Audit logs created:', auditResults);

      // Delete from storage (non-blocking if some fail)
      const storagePromises = docs.map(doc => 
        supabase.storage
          .from('ai-documents')
          .remove([doc.file_path])
      );

      const storageResults = await Promise.allSettled(storagePromises);
      console.log('Storage deletion results:', storageResults);

      // Soft delete document records from database
      const { error: deleteError } = await supabase
        .from('ai_documents')
        .update({ 
          deleted_at: new Date().toISOString(),
          updated_by: currentUserId
        })
        .in('id', documentIds)
        .is('deleted_at', null); // Only soft delete non-deleted documents

      if (deleteError) {
        console.error('Bulk soft delete error:', deleteError);
        throw deleteError;
      }

      console.log(`Successfully soft deleted ${docs.length} documents`);

      toast({
        title: "Bulk deletion completed",
        description: `${docs.length} documents have been moved to trash`,
      });

      // Refresh documents list
      await fetchDocuments();
      
      return true;
    } catch (error: any) {
      console.error('Bulk delete error:', error);
      toast({
        title: "Bulk delete failed",
        description: error.message || "Failed to delete documents",
        variant: "destructive",
      });
      return false;
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
    uploadDocumentLegacy, // Export legacy function for backward compatibility
    updateDocument,
    deleteDocument,
    bulkDeleteDocuments,
    refreshDocuments: fetchDocuments
  };
};