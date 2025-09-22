import { useState } from 'react';
import { Link } from 'react-router-dom';
import { UnifiedDocumentUploader } from "@/components/ai";
import { SecurityDashboard } from "@/components/security/SecurityDashboard";
import { DocumentManagementTable } from "@/components/ai/DocumentManagementTable";
import { DocumentEditDialog, DocumentUpdateData } from "@/components/ai/DocumentEditDialog";
import { DocumentPlaceholderMerger } from "@/components/ai/DocumentPlaceholderMerger";
import { EmbeddingProgressDialog } from "@/components/ai/EmbeddingProgressDialog";
import { DocumentAuditLogDialog } from "@/components/ai/DocumentAuditLogDialog";
import { ResponsesAPIMigrationStatus } from "@/components/admin/ResponsesAPIMigrationStatus";
import { FailedDocumentsCleanup } from "@/components/ai/FailedDocumentsCleanup";
import { DeletedDocumentsTrash } from "@/components/ai/DeletedDocumentsTrash";
import { DocumentEditingGuide, FeatureExplanation } from "@/components/ui/FeatureGuide";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMaturionDocuments, MaturionDocument } from "@/hooks/useMaturionDocuments";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { SecurityGuard } from "@/components/security/SecurityGuard";
import { Eye } from "lucide-react";
export default function MaturionUploads() {
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const { 
    documents, 
    loading, 
    uploading, 
    updateDocument, 
    deleteDocument, 
    bulkDeleteDocuments, 
    refreshDocuments 
  } = useMaturionDocuments();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [embeddingDialogOpen, setEmbeddingDialogOpen] = useState(false);
  const [auditLogDialog, setAuditLogDialog] = useState<{
    open: boolean;
    documentId: string | null;
    documentTitle?: string;
  }>({
    open: false,
    documentId: null,
    documentTitle: undefined
  });

  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    document: MaturionDocument | null;
    saving: boolean;
  }>({
    open: false,
    document: null,
    saving: false
  });

  const handleEdit = (document: MaturionDocument) => {
    setEditDialog({ open: true, document, saving: false });
  };

  const handleSaveEdit = async (updates: DocumentUpdateData): Promise<boolean> => {
    if (!editDialog.document) return false;

    setEditDialog(prev => ({ ...prev, saving: true }));
    try {
      const success = await updateDocument(editDialog.document.id, updates);
      if (success) {
        setEditDialog({ open: false, document: null, saving: false });
        await refreshDocuments();
      }
      return success;
    } catch (error) {
      console.error('Edit save error:', error);
      return false;
    } finally {
      setEditDialog(prev => ({ ...prev, saving: false }));
    }
  };

  const handleDelete = async (documentId: string) => {
    await deleteDocument(documentId);
  };

  const handleReprocess = async (documentId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('reprocess-document', {
        body: { 
          documentId,
          organizationId: currentOrganization?.id,
          forceReprocess: true 
        }
      });

      if (error) throw error;

      toast({
        title: "Reprocessing started",
        description: "Document is being reprocessed",
      });

      await refreshDocuments();
    } catch (error: any) {
      toast({
        title: "Reprocessing failed",
        description: error.message || "Failed to reprocess document",
        variant: "destructive",
      });
    }
  };

  const handleBulkDelete = async (documentIds: string[]) => {
    await bulkDeleteDocuments(documentIds);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshDocuments();
    setIsRefreshing(false);
  };

  const handleReprocessPending = async () => {
    if (!currentOrganization?.id) return;
    
    setIsRefreshing(true);
    const pendingDocs = documents?.filter(doc => doc.processing_status === 'pending') || [];
    
    for (const doc of pendingDocs) {
      try {
        console.log(`Reprocessing pending document: ${doc.title}`);
        
        const { error } = await supabase.functions.invoke('reprocess-document', {
          body: {
            documentId: doc.id,
            organizationId: currentOrganization.id,
            forceReprocess: true
          }
        });
        
        if (error) {
          console.error(`Failed to reprocess ${doc.title}:`, error);
        } else {
          console.log(`Successfully triggered reprocessing for ${doc.title}`);
        }
      } catch (error) {
        console.error(`Error reprocessing ${doc.title}:`, error);
      }
    }
    
    // Wait a moment then refresh
    setTimeout(async () => {
      await refreshDocuments();
      setIsRefreshing(false);
    }, 2000);
  };

  const handleRegenerateEmbeddings = () => {
    setEmbeddingDialogOpen(true);
  };

  const handleReplace = (document: MaturionDocument) => {
    // Open edit dialog with replace mode
    setEditDialog({ open: true, document, saving: false });
    toast({
      title: "Replace Document",
      description: "Upload a new version to replace this document",
    });
  };

  const handleViewAuditLog = (documentId: string) => {
    const document = documents.find(doc => doc.id === documentId);
    setAuditLogDialog({
      open: true,
      documentId,
      documentTitle: document?.title || document?.file_name
    });
  };

  return (
    <SecurityGuard
      requiredRole="admin"
      fallback={
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Document Intelligence System</h1>
            <p className="text-muted-foreground">Access denied. Admin privileges required.</p>
          </div>
          <div className="rounded-2xl border p-6">
            <p className="mb-4">You don't have permission to view this content.</p>
            <Button asChild variant="outline">
              <Link to="/organization/settings">Request Access</Link>
            </Button>
          </div>
        </div>
      }
    >
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Document Intelligence System</h1>
          <p className="text-muted-foreground">
            Unified document ingestion with enhanced security monitoring and quality assurance
          </p>
        </div>
        
        <Tabs defaultValue="upload" className="space-y-6">
            <TabsList>
              <TabsTrigger value="upload">Document Upload</TabsTrigger>
              <TabsTrigger value="manage">Manage Documents</TabsTrigger>
              <TabsTrigger value="failed">Failed Documents</TabsTrigger>
              <TabsTrigger value="trash">Trash</TabsTrigger>
              <TabsTrigger value="merge">Merge Placeholders</TabsTrigger>
              <TabsTrigger value="migration">API Migration</TabsTrigger>
              <TabsTrigger value="security">Security Dashboard</TabsTrigger>
            </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <UnifiedDocumentUploader 
              onUploadComplete={(sessionId, results) => {
                console.log('Upload completed:', { sessionId, results });
                refreshDocuments();
              }}
              maxFiles={10}
              allowedFileTypes={['pdf', 'docx', 'txt', 'md']}
            />
          </TabsContent>

          <TabsContent value="manage" className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <Eye className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                </div>
                <div>
                  <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                    How to Edit Documents
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-200 mb-2">
                    Click the <strong>⋯ button</strong> in the "Actions" column of any document row to access:
                  </p>
                  <ul className="text-sm text-blue-700 dark:text-blue-200 space-y-1">
                    <li>• <strong>Edit Metadata</strong> - Update title, tags, domain, etc.</li>
                    <li>• <strong>Replace Document</strong> - Upload a new version</li>
                    <li>• <strong>View Audit Log</strong> - See all changes made</li>
                    <li>• <strong>Reprocess</strong> - Retry failed documents</li>
                    <li>• <strong>Delete</strong> - Remove documents permanently</li>
                  </ul>
                </div>
              </div>
            </div>
            <DocumentEditingGuide />
            <DocumentManagementTable
              documents={documents}
              loading={loading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onReprocess={handleReprocess}
              onBulkDelete={handleBulkDelete}
              onRefresh={handleRefresh}
              onReplace={handleReplace}
              onViewAuditLog={handleViewAuditLog}
              onRegenerateEmbeddings={handleRegenerateEmbeddings}
            />
          </TabsContent>

          <TabsContent value="failed" className="space-y-6">
            <FailedDocumentsCleanup
              failedDocuments={documents.filter(doc => 
                doc.processing_status === 'failed' || 
                (doc.processing_status === 'pending' && 
                 (Date.now() - new Date(doc.created_at).getTime()) / (1000 * 60 * 60) > 24)
              )}
              onDelete={(docId) => handleDelete(docId)}
              onReprocess={handleReprocess}
              onBulkDelete={handleBulkDelete}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="trash" className="space-y-6">
            <DeletedDocumentsTrash onRestore={handleRefresh} />
          </TabsContent>

          <TabsContent value="merge" className="space-y-6">
            <DocumentPlaceholderMerger />
          </TabsContent>

          <TabsContent value="migration" className="space-y-6">
            <FeatureExplanation
              title="OpenAI Responses API Migration (Annex 3)"
              description="AI reasoning engine migration status and testing interface"
              purpose="This shows the migration from OpenAI's Chat Completions to Responses API with GPT-5, which powers Maturion's enhanced reasoning over your documents. It ensures the AI can provide industry-specific insights aligned with your organization's context."
              howToUse={[
                'Review the Migration Checklist to see completed features',
                'Use API Testing to verify the reasoning engine is working properly',  
                'Check Benefits Realized to understand performance improvements',
                'Run tests if you experience issues with AI document analysis'
              ]}
              status="ready"
            />
            <ResponsesAPIMigrationStatus />
          </TabsContent>

          <TabsContent value="security">
            <SecurityDashboard />
          </TabsContent>
        </Tabs>

        <DocumentEditDialog
          open={editDialog.open}
          onClose={() => setEditDialog({ open: false, document: null, saving: false })}
          onSave={handleSaveEdit}
          document={editDialog.document}
          saving={editDialog.saving}
        />

        <EmbeddingProgressDialog
          open={embeddingDialogOpen}
          onClose={() => setEmbeddingDialogOpen(false)}
        />

        <DocumentAuditLogDialog
          open={auditLogDialog.open}
          onClose={() => setAuditLogDialog({ open: false, documentId: null })}
          documentId={auditLogDialog.documentId}
          documentTitle={auditLogDialog.documentTitle}
        />
      </div>
    </SecurityGuard>
  );
}