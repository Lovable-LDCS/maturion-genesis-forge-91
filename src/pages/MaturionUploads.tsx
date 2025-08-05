import { useState } from 'react';
import { UnifiedDocumentUploader } from "@/components/ai";
import { SecurityDashboard } from "@/components/security/SecurityDashboard";
import { DocumentManagementTable } from "@/components/ai/DocumentManagementTable";
import { DocumentEditDialog, DocumentUpdateData } from "@/components/ai/DocumentEditDialog";
import { DocumentPlaceholderMerger } from "@/components/ai/DocumentPlaceholderMerger";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useMaturionDocuments, MaturionDocument } from "@/hooks/useMaturionDocuments";
import { supabase } from "@/integrations/supabase/client";

export default function MaturionUploads() {
  const { toast } = useToast();
  const { 
    documents, 
    loading, 
    uploading, 
    updateDocument, 
    deleteDocument, 
    bulkDeleteDocuments, 
    refreshDocuments 
  } = useMaturionDocuments();

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
      const { error } = await supabase.functions.invoke('process-ai-document', {
        body: { documentId }
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

  const handleReplace = (document: MaturionDocument) => {
    // Open edit dialog with replace mode
    setEditDialog({ open: true, document, saving: false });
    toast({
      title: "Replace Document",
      description: "Upload a new version to replace this document",
    });
  };

  const handleViewAuditLog = (documentId: string) => {
    // TODO: Implement audit log viewer
    toast({
      title: "Audit Log",
      description: "Opening audit trail for document",
    });
    console.log('View audit log for document:', documentId);
  };

  return (
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
          <TabsTrigger value="merge">Merge Placeholders</TabsTrigger>
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
          <DocumentManagementTable
            documents={documents}
            loading={loading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onReprocess={handleReprocess}
            onBulkDelete={handleBulkDelete}
            onRefresh={refreshDocuments}
            onReplace={handleReplace}
            onViewAuditLog={handleViewAuditLog}
          />
        </TabsContent>

        <TabsContent value="merge" className="space-y-6">
          <DocumentPlaceholderMerger />
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
    </div>
  );
}