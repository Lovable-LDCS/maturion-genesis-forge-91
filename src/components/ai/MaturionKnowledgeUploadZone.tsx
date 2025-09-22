import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button as ClearButton } from '@/components/ui/button';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Trash2, CheckCircle, AlertCircle, Clock, Tag, FolderOpen, X, Edit3, Save, XCircle, History, Download, Eye } from 'lucide-react';
import { useMaturionDocuments, MaturionDocument } from '@/hooks/useMaturionDocuments';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useDocumentVersions } from '@/hooks/useDocumentVersions';
import { DocumentProcessingVerificationBlock } from './DocumentProcessingVerificationBlock';
import { DocumentContentViewer } from './DocumentContentViewer';
import { DocumentPreviewPane } from './DocumentPreviewPane';
import { UnifiedDocumentMetadataDialog, type DocumentMetadata } from './UnifiedDocumentMetadataDialog';
import { DOCUMENT_TYPE_OPTIONS, DOMAIN_OPTIONS, getDocumentTypeLabel } from '@/lib/documentConstants';

const documentTypeLabels: Record<string, string> = {
  guidance_document: 'Guidance Document',
  mps_document: 'MPS Document',
  best_practice: 'Best Practice',
  case_study: 'Case Study',
  template: 'Template',
  checklist: 'Checklist',
  governance_reasoning_manifest: 'Governance Reasoning',
  scoring_logic: 'Scoring Logic',
  assessment_framework_component: 'Assessment Framework',
  ai_logic_rule_global: 'AI Logic Rule',
  threat_intelligence_profile: 'Threat Intelligence',
  policy_model: 'Policy Model',
  sop_procedure: 'SOP (Standard Operating Procedure)',
  policy_statement: 'Policy Statement',
  evidence_sample: 'Evidence Sample',
  training_module: 'Training Module',
  awareness_material: 'Awareness Material',
  implementation_guide: 'Implementation Guide',
  tool_reference: 'Tool Reference',
  audit_template: 'Audit Template',
  use_case_scenario: 'Use Case / Scenario',
  evaluation_rubric: 'Evaluation Rubric',
  data_model: 'Data Model',
  decision_tree_logic: 'Decision Tree / Logic Map',
  general: 'General Knowledge',
  maturity_model: 'Maturity Model'
};

// Special domain scope for governance documents
const getDocumentTypeScope = (documentType: string) => {
  if (documentType === 'governance_reasoning_manifest') {
    return 'Global Platform Logic – applies to all AI components, MPS logic, user pages, and guidance systems';
  }
  return null;
};

const statusIcons = {
  pending: <Clock className="h-4 w-4 text-yellow-500" />,
  processing: <AlertCircle className="h-4 w-4 text-blue-500" />,
  completed: <CheckCircle className="h-4 w-4 text-green-500" />,
  failed: <AlertCircle className="h-4 w-4 text-red-500" />
};

interface MaturionKnowledgeUploadZoneProps {
  filteredDocuments?: MaturionDocument[];
  onDocumentChange?: () => Promise<void>;
  enableUploads?: boolean; // New prop to control upload functionality
}

export const MaturionKnowledgeUploadZone: React.FC<MaturionKnowledgeUploadZoneProps> = ({ 
  filteredDocuments, 
  onDocumentChange, 
  enableUploads = false // Default to disabled for secure workflow
}) => {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { documents, loading, uploading, uploadDocument, updateDocument, deleteDocument } = useMaturionDocuments();
  const { toast } = useToast();

  // Use filtered documents if provided, otherwise use all documents
  const displayDocuments = filteredDocuments || documents;
  
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>('guidance_document');
  const [title, setTitle] = useState<string>('');
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [tags, setTags] = useState<string>('');
  const [uploadNotes, setUploadNotes] = useState<string>('');
  
  // Edit dialog state
  const [editingDocument, setEditingDocument] = useState<MaturionDocument | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Version history dialog state
  const [versionDialogDocument, setVersionDialogDocument] = useState<MaturionDocument | null>(null);
  const [showVersionDialog, setShowVersionDialog] = useState(false);
  
  // Content viewer dialog state
  const [contentViewerDocument, setContentViewerDocument] = useState<MaturionDocument | null>(null);
  const [showContentViewer, setShowContentViewer] = useState(false);

  // 🚀 ROOT CAUSE FIX: Preview pane state
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Check if user is admin
  const isAdmin = currentOrganization?.user_role === 'admin' || currentOrganization?.user_role === 'owner';

  // 🚀 ROOT CAUSE FIX: Modified onDrop to show preview for .docx files
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!user || !currentOrganization || !isAdmin) {
      toast({
        title: "Access denied",
        description: "Only administrators can upload Maturion documents",
        variant: "destructive",
      });
      return;
    }

    // For .docx files, show preview first (fail fast approach)
    const file = acceptedFiles[0];
    if (file && (file.name.endsWith('.docx') || file.type.includes('wordprocessingml'))) {
      console.log(`🔍 .docx file detected: ${file.name}, showing preview for quality validation`);
      setPreviewFile(file);
      setShowPreview(true);
      return; // Stop here and wait for preview completion
    }

    // For other file types, proceed with direct upload
    await processFileUploads(acceptedFiles);
  }, [user, currentOrganization, isAdmin, selectedDocumentType, selectedDomain, tags, uploadNotes, uploadDocument, toast, onDocumentChange]);

  // Separated file upload logic for reuse
  const processFileUploads = async (files: File[]) => {
    for (const file of files) {
      // Auto-populate title from first file if empty
      const fileTitle = title || file.name.replace(/\.[^/.]+$/, '');
      
      // Auto-assign domain for governance documents
      const finalDomain = selectedDocumentType === 'governance_reasoning_manifest' 
        ? 'Global Platform Logic – applies to all AI components, MPS logic, user pages, and guidance systems'
        : selectedDomain || undefined;
      
      // Use legacy function for backward compatibility
      await (uploadDocument as any)(
        file, 
        selectedDocumentType as any, 
        currentOrganization!.id, 
        user!.id,
        fileTitle,
        finalDomain,
        tags || undefined,
        uploadNotes || undefined
      );
      
      // Set title from first file for subsequent uploads in the same session
      if (!title) {
        setTitle(fileTitle);
      }
    }
    
    // Trigger parent refresh if callback provided
    if (onDocumentChange) {
      await onDocumentChange();
    }
  };

  // Handle preview completion
  const handlePreviewComplete = async (isValid: boolean, preview: string) => {
    if (!previewFile) return;

    if (!isValid) {
      toast({
        title: "Document Quality Issues Detected",
        description: "The document contains quality issues that may affect AI processing. Please review the preview and consider uploading a clean version.",
        variant: "destructive",
      });
    } else {
      console.log(`✅ Document quality validated: ${previewFile.name}`);
      toast({
        title: "Document Quality Validated",
        description: `${previewFile.name} passed quality checks and will be processed cleanly.`,
      });
    }

    // Proceed with upload regardless of quality (user choice)
    await processFileUploads([previewFile]);
    
    // Clean up preview state
    setShowPreview(false);
    setPreviewFile(null);
  };

  const handlePreviewCancel = () => {
    setShowPreview(false);
    setPreviewFile(null);
    toast({
      title: "Upload Cancelled",
      description: "File upload was cancelled. You can try again with a different file.",
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      // Documents
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'text/html': ['.html'],
      'text/xml': ['.xml'],
      'application/rtf': ['.rtf'],
      
      // Data files
      'application/json': ['.json'],
      'text/yaml': ['.yaml', '.yml'], 
      'text/csv': ['.csv'],
      'application/sql': ['.sql'],
      
      // Code files
      'text/javascript': ['.js'],
      'text/typescript': ['.ts'],
      'text/css': ['.css'],
      'text/python': ['.py'],
      
      // Images
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/svg+xml': ['.svg'],
      'image/webp': ['.webp']
    },
    multiple: true,
    disabled: !isAdmin || uploading
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleEditDocument = (doc: MaturionDocument) => {
    setEditingDocument(doc);
  };

  const handleSaveEdit = async (metadata: DocumentMetadata) => {
    if (!editingDocument) return;
    
    setIsSaving(true);
    try {
      // First, update the document using the existing updateDocument function
      const success = await updateDocument(editingDocument.id, {
        title: metadata.title,
        domain: metadata.domain || undefined,
        tags: metadata.tags || undefined,
        upload_notes: metadata.description || undefined, // Map AI Backoffice Description to upload_notes
        document_type: metadata.documentType as any,
        change_reason: metadata.changeReason || 'Document metadata updated'
      });
      
      if (success) {
        // Then update the metadata field separately if needed
        try {
          const { error: metadataError } = await supabase
            .from('ai_documents')
            .update({
              metadata: {
                ...editingDocument.metadata,
                visibility: metadata.visibility,
                ai_backoffice_description: metadata.description
              }
            })
            .eq('id', editingDocument.id);
            
          if (metadataError) {
            console.warn('Warning: Failed to update metadata field:', metadataError);
          }
        } catch (metadataUpdateError) {
          console.warn('Warning: Failed to update metadata field:', metadataUpdateError);
        }
        
        setEditingDocument(null);
        // Trigger parent refresh if callback provided
        if (onDocumentChange) {
          await onDocumentChange();
        }
      }
    } catch (error) {
      console.error('Error saving document metadata:', error);
      toast({
        title: "Error",
        description: "Failed to save document metadata",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingDocument(null);
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (window.confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      await deleteDocument(documentId);
      // Trigger parent refresh if callback provided
      if (onDocumentChange) {
        await onDocumentChange();
      }
    }
  };

  const handleShowVersionHistory = (doc: MaturionDocument) => {
    setVersionDialogDocument(doc);
    setShowVersionDialog(true);
  };

  const handleVersionDialogClose = () => {
    setShowVersionDialog(false);
    setVersionDialogDocument(null);
  };

  const handleShowContent = (doc: MaturionDocument) => {
    setContentViewerDocument(doc);
    setShowContentViewer(true);
  };

  const handleContentViewerClose = () => {
    setShowContentViewer(false);
    setContentViewerDocument(null);
  };

  const handleDownloadDocument = async (doc: MaturionDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('ai-documents')
        .download(doc.file_path);

      if (error) {
        toast({
          title: "Download failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download started",
        description: `${doc.file_name} is being downloaded`,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download failed",
        description: "An error occurred while downloading the file",
        variant: "destructive",
      });
    }
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Maturion Knowledge Base</CardTitle>
          <CardDescription>Access restricted to administrators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>You don't have permission to access the Maturion Knowledge Base.</p>
            <p className="text-sm mt-2">Contact your organization administrator for access.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Section - Only show when uploads are enabled */}
      {enableUploads && (
        <Card>
          <CardHeader>
            <CardTitle>Maturion Knowledge Base Upload</CardTitle>
            <CardDescription>
              Upload documents to train Maturion with your organization's specific knowledge, 
              maturity models, and sector context.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Document Type Selection */}
            <div className="space-y-2">
              <Label htmlFor="document-type" className="text-sm font-medium">Document Type</Label>
              <Select
                value={selectedDocumentType}
                onValueChange={(value: string) => setSelectedDocumentType(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(documentTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Title Field */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Enter document title (will auto-fill from filename)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                This title will be used for display and AI referencing. Leave blank to auto-populate from filename.
              </p>
            </div>

            {/* Domain Selection (optional, but highlighted for MPS docs) */}
            <div className="space-y-2">
              <Label htmlFor="domain" className="text-sm font-medium">
                Domain
                <span className="text-muted-foreground ml-1">(optional)</span>
                {selectedDocumentType === 'mps_document' && (
                  <span className="text-primary ml-1">- Recommended for MPS</span>
                )}
                {selectedDocumentType === 'governance_reasoning_manifest' && (
                  <span className="text-primary ml-1">- Auto-assigned global scope</span>
                )}
              </Label>
              <div className="flex gap-2">
                {selectedDocumentType === 'governance_reasoning_manifest' ? (
                  <div className="flex-1 p-3 bg-primary/10 rounded-md border">
                    <span className="text-sm font-medium text-primary">
                      Global Platform Logic – applies to all AI components, MPS logic, user pages, and guidance systems
                    </span>
                  </div>
                ) : (
                  <Select
                    value={selectedDomain}
                    onValueChange={setSelectedDomain}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a domain..." />
                    </SelectTrigger>
                    <SelectContent>
                      {DOMAIN_OPTIONS.map((domain) => (
                        <SelectItem key={domain} value={domain}>
                          {domain}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {selectedDomain && selectedDocumentType !== 'governance_reasoning_manifest' && (
                  <ClearButton
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setSelectedDomain('')}
                    className="shrink-0"
                    title="Clear domain selection"
                  >
                    <X className="h-4 w-4" />
                  </ClearButton>
                )}
              </div>
            </div>

            {/* Tags Field */}
            <div className="space-y-2">
              <Label htmlFor="tags" className="text-sm font-medium">
                Tags
                <span className="text-muted-foreground ml-1">(optional)</span>
              </Label>
              <Input
                id="tags"
                placeholder="e.g. security, compliance, risk-management"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Enter comma-separated tags to improve search and categorization
              </p>
            </div>

            {/* Upload Notes */}
            <div className="space-y-2">
              <Label htmlFor="upload-notes" className="text-sm font-medium">
                Upload Notes
                <span className="text-muted-foreground ml-1">(optional, admin-only)</span>
              </Label>
              <Textarea
                id="upload-notes"
                placeholder="Internal notes about this document, context for AI processing, or special instructions..."
                value={uploadNotes}
                onChange={(e) => setUploadNotes(e.target.value)}
                rows={3}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                These notes help provide context to the AI for better processing and retrieval
              </p>
            </div>

            {/* Upload Zone */}
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              } ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <input {...getInputProps()} />
              <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
              {isDragActive ? (
                <p className="text-lg font-medium">Drop the files here...</p>
              ) : (
                <>
                  <p className="text-lg font-medium mb-2">
                    Drag & drop files here, or click to select
                  </p>
                  <p className="text-sm text-muted-foreground mb-1">
                    <strong>Documents:</strong> PDF, Word (.doc, .docx), Text (.txt), Markdown (.md), HTML, XML, RTF
                  </p>
                  <p className="text-sm text-muted-foreground mb-1">
                    <strong>Data:</strong> JSON, YAML, CSV, SQL
                  </p>
                  <p className="text-sm text-muted-foreground mb-1">
                    <strong>Code:</strong> JavaScript, TypeScript, CSS, Python
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>Images:</strong> JPG, PNG, SVG, WebP
                  </p>
                </>
              )}
              {uploading && (
                <div className="mt-4">
                  <Progress value={undefined} className="w-full" />
                  <p className="text-sm text-muted-foreground mt-2">Processing upload...</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document Management Section - Always visible to admins */}
      <Card>
        <CardHeader>
          <CardTitle>Uploaded Documents</CardTitle>
          <CardDescription>
            Manage your organization's Maturion knowledge base documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <Progress value={undefined} className="w-full max-w-xs mx-auto" />
              <p className="text-sm text-muted-foreground mt-2">Loading documents...</p>
            </div>
          ) : displayDocuments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No documents uploaded yet.</p>
              <p className="text-sm mt-2">Upload your first document to get started.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {displayDocuments.map((doc) => (
                <div key={doc.id} className="space-y-3">
                  {/* Main Document Info Card */}
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">{doc.title || doc.file_name}</span>
                        <Badge variant="secondary">
                          {documentTypeLabels[doc.document_type]}
                        </Badge>
                        <div className="flex items-center gap-1">
                          {statusIcons[doc.processing_status]}
                          <span className="text-sm capitalize">{doc.processing_status}</span>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>File: {doc.file_name} • Size: {formatFileSize(doc.file_size)} • Type: {doc.mime_type}</p>
                        {doc.domain && (
                          <p className="flex items-center gap-1">
                            <FolderOpen className="h-3 w-3" />
                            Domain: <span className="font-medium">{doc.domain}</span>
                          </p>
                        )}
                        {doc.tags && (
                          <p className="flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            Tags: <span className="font-medium">{doc.tags}</span>
                          </p>
                        )}
                        <p>Uploaded: {formatDate(doc.created_at)}</p>
                        {doc.total_chunks > 0 && (
                          <p>Processed into {doc.total_chunks} searchable chunks</p>
                        )}
                        {doc.upload_notes && (
                          <p className="text-xs italic border-l-2 border-muted pl-2 mt-2">
                            Notes: {doc.upload_notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleShowContent(doc)}
                        className="text-blue-600 hover:text-blue-600"
                        title="View document content"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadDocument(doc)}
                        className="text-green-600 hover:text-green-600"
                        title="Download document"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleShowVersionHistory(doc)}
                        className="text-blue-600 hover:text-blue-600"
                        title="View version history"
                      >
                        <History className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditDocument(doc)}
                        className="text-primary hover:text-primary"
                        title="Edit document"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="text-destructive hover:text-destructive"
                        title="Delete document"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Document Processing Verification Block */}
                  <DocumentProcessingVerificationBlock 
                    document={doc}
                    onReprocess={() => {
                      // Refresh the documents list after reprocessing
                      window.location.reload();
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unified Edit Document Dialog */}
      <UnifiedDocumentMetadataDialog
        open={!!editingDocument}
        onClose={handleCancelEdit}
        onSave={handleSaveEdit}
        initialMetadata={{
          title: editingDocument?.title || editingDocument?.file_name || '',
          documentType: editingDocument?.document_type || 'guidance_document',
          domain: editingDocument?.domain || '',
          tags: Array.isArray(editingDocument?.tags) ? editingDocument.tags.join(', ') : (editingDocument?.tags || ''),
          visibility: (editingDocument?.metadata as any)?.visibility || 'all_users',
          description: (editingDocument?.metadata as any)?.ai_backoffice_description || editingDocument?.upload_notes || ''
        }}
        isPreApproved={(editingDocument?.metadata as any)?.approved_via_tester === true}
        isSaving={isSaving}
        mode="edit"
      />

      {/* Version History - Removed for now */}

      {/* Content Viewer Dialog */}
      <DocumentContentViewer
        document={contentViewerDocument}
        open={showContentViewer}
        onClose={handleContentViewerClose}
      />

      {/* 🚀 ROOT CAUSE FIX: Document Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={() => setShowPreview(false)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Document Quality Preview</DialogTitle>
            <DialogDescription>
              Review document content quality before uploading to prevent corruption issues.
            </DialogDescription>
          </DialogHeader>
          
          {previewFile && (
            <DocumentPreviewPane
              file={previewFile}
              onPreviewComplete={handlePreviewComplete}
              onCancel={handlePreviewCancel}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};