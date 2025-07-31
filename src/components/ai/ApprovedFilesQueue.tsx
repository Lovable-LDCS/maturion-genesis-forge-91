import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, FileText, Upload, Calendar, Hash, Loader2, CheckSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { DocumentReplacementDialog } from './DocumentReplacementDialog';

interface DocumentMetadata {
  title: string;
  documentType: string;
  tags: string;
  domain: string;
  visibility: string;
  description: string;
}

interface ApprovedFile {
  id: string;
  fileName: string;
  fileSize: number;
  chunksCount: number;
  extractionMethod: string;
  verifiedAt: string;
  metadata: DocumentMetadata;
  fileData?: File; // Store the actual file data for upload
}

export const ApprovedFilesQueue: React.FC = () => {
  const [approvedFiles, setApprovedFiles] = useState<ApprovedFile[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);
  const [currentUploadFile, setCurrentUploadFile] = useState<ApprovedFile | null>(null);
  const { toast } = useToast();

  // Load approved files from localStorage (temporary storage)
  useEffect(() => {
    const stored = localStorage.getItem('maturion_approved_files');
    if (stored) {
      try {
        const files = JSON.parse(stored);
        setApprovedFiles(files);
      } catch (error) {
        console.error('Error loading approved files:', error);
      }
    }
  }, []);

  // Save approved files to localStorage
  const saveApprovedFiles = (files: ApprovedFile[]) => {
    localStorage.setItem('maturion_approved_files', JSON.stringify(files));
    setApprovedFiles(files);
  };

  // Add a file to the approved queue (called from Document Chunk Tester)
  const addApprovedFile = (fileWithMetadata: { file: File; metadata: DocumentMetadata; chunksCount: number; extractionMethod: string }) => {
    const { file, metadata, chunksCount, extractionMethod } = fileWithMetadata;
    
    const approvedFile: ApprovedFile = {
      id: crypto.randomUUID(),
      fileName: file.name,
      fileSize: file.size,
      chunksCount,
      extractionMethod,
      verifiedAt: new Date().toISOString(),
      metadata,
    };

    const updatedFiles = [...approvedFiles, approvedFile];
    saveApprovedFiles(updatedFiles);

    toast({
      title: "File Approved",
      description: `${metadata.title} has been verified and added to the upload queue with metadata`,
    });
  };

  // Start upload with version check
  const initiateUpload = (fileId: string) => {
    const approvedFile = approvedFiles.find(f => f.id === fileId);
    if (!approvedFile) {
      toast({
        title: "Error",
        description: "Approved file not found",
        variant: "destructive",
      });
      return;
    }

    setCurrentUploadFile(approvedFile);
    setVersionDialogOpen(true);
  };

  // Archive existing document
  const archiveDocument = async (documentId: string, reason: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create version before archiving
      const { data: document, error: docError } = await supabase
        .from('ai_documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (docError || !document) throw new Error('Document not found');

      // Store the original processing status for audit trail
      const originalStatus = document.processing_status;

      // Get the next version number for this document
      const { data: maxVersionData } = await supabase
        .from('ai_document_versions')
        .select('version_number')
        .eq('document_id', documentId)
        .order('version_number', { ascending: false })
        .limit(1);

      const nextVersionNumber = (maxVersionData?.[0]?.version_number || 0) + 1;

      // Create version entry
      const { error: versionError } = await supabase
        .from('ai_document_versions')
        .insert({
          document_id: documentId,
          version_number: nextVersionNumber,
          title: document.title,
          file_name: document.file_name,
          file_path: document.file_path,
          file_size: document.file_size,
          document_type: document.document_type,
          domain: document.domain,
          tags: document.tags,
          metadata: document.metadata,
          mime_type: document.mime_type,
          organization_id: document.organization_id,
          created_by: user.id,
          change_reason: reason
        });

      if (versionError) throw versionError;

      // Mark document as archived
      const { error: archiveError } = await supabase
        .from('ai_documents')
        .update({ 
          processing_status: 'archived',
          updated_at: new Date().toISOString(),
          updated_by: user.id
        })
        .eq('id', documentId);

      if (archiveError) throw archiveError;

      // Create audit log with correct original status
      await supabase.from('audit_trail').insert({
        table_name: 'ai_documents',
        record_id: documentId,
        action: 'ARCHIVED',
        field_name: 'processing_status',
        old_value: originalStatus, // Use actual original status instead of hardcoded 'completed'
        new_value: 'archived',
        changed_by: user.id,
        change_reason: reason,
        organization_id: document.organization_id
      });

      return true;
    } catch (error) {
      console.error('Error archiving document:', error);
      return false;
    }
  };

  // Upload approved file to Maturion Knowledge Base
  const uploadToMaturion = async (replaceDocumentId?: string) => {
    if (!currentUploadFile) return;

    const fileId = currentUploadFile.id;
    setUploadingFiles(prev => new Set([...prev, fileId]));

    try {
      // Get current user and organization
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // If replacing, archive the old document first
      if (replaceDocumentId) {
        const archiveSuccess = await archiveDocument(
          replaceDocumentId, 
          `Replaced by new version: "${currentUploadFile.metadata.title}"`
        );
        
        if (!archiveSuccess) {
          throw new Error('Failed to archive existing document');
        }

        toast({
          title: "Document Replaced",
          description: "Previous version has been archived successfully",
        });
      }

      toast({
        title: "Upload Started",
        description: `${currentUploadFile.fileName} is being uploaded to Maturion Knowledge Base`,
      });

      // Simulate upload process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Remove from approved files queue
      const remainingFiles = approvedFiles.filter(f => f.id !== fileId);
      saveApprovedFiles(remainingFiles);

      // Create audit log entry
      await supabase.from('audit_trail').insert({
        organization_id: '00000000-0000-0000-0000-000000000000', // System audit
        table_name: 'approved_files_queue',
        record_id: fileId,
        action: replaceDocumentId ? 'REPLACEMENT_UPLOAD' : 'APPROVED_UPLOAD',
        changed_by: user.id,
        change_reason: `Document "${currentUploadFile.metadata.title}" (${currentUploadFile.metadata.documentType}) uploaded after chunk verification (${currentUploadFile.chunksCount} chunks via ${currentUploadFile.extractionMethod}). Domain: ${currentUploadFile.metadata.domain}, Tags: ${currentUploadFile.metadata.tags}${replaceDocumentId ? `. Replaced document ID: ${replaceDocumentId}` : ''}`
      });

      toast({
        title: "Upload Complete",
        description: `${currentUploadFile.fileName} has been successfully uploaded to Maturion`,
      });

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed", 
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
    } finally {
      setUploadingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });
      setVersionDialogOpen(false);
      setCurrentUploadFile(null);
    }
  };

  // Bulk upload selected files
  const uploadSelectedFiles = async () => {
    const filesToUpload = Array.from(selectedFiles);
    setSelectedFiles(new Set());

    for (const fileId of filesToUpload) {
      initiateUpload(fileId);
      // Wait a bit between uploads to avoid overwhelming the dialog
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  // Remove file from queue
  const removeFromQueue = (fileId: string) => {
    const remainingFiles = approvedFiles.filter(f => f.id !== fileId);
    saveApprovedFiles(remainingFiles);
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      newSet.delete(fileId);
      return newSet;
    });

    toast({
      title: "File Removed",
      description: "File has been removed from the approved queue",
    });
  };

  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

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

  // Expose the addApprovedFile function globally for the Document Chunk Tester
  useEffect(() => {
    (window as any).addApprovedFile = addApprovedFile;
    return () => {
      delete (window as any).addApprovedFile;
    };
  }, [approvedFiles]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          Approved Cleaned Files Queue
        </CardTitle>
        <CardDescription>
          Documents that have passed chunk testing and are ready for Maturion upload
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {approvedFiles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No approved files in queue</p>
            <p className="text-sm mt-2">
              Use the Document Chunk Tester to verify files and add them to this queue
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Bulk Actions */}
            {approvedFiles.length > 1 && (
              <div className="flex items-center justify-between bg-muted/30 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectedFiles.size === approvedFiles.length) {
                        setSelectedFiles(new Set());
                      } else {
                        setSelectedFiles(new Set(approvedFiles.map(f => f.id)));
                      }
                    }}
                  >
                    {selectedFiles.size === approvedFiles.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  {selectedFiles.size > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {selectedFiles.size} file{selectedFiles.size !== 1 ? 's' : ''} selected
                    </span>
                  )}
                </div>
                {selectedFiles.size > 0 && (
                  <Button onClick={uploadSelectedFiles} className="gap-2">
                    <Upload className="h-4 w-4" />
                    Upload Selected ({selectedFiles.size})
                  </Button>
                )}
              </div>
            )}

            {/* File List */}
            <div className="space-y-2">
              {approvedFiles.map((file) => (
                <div
                  key={file.id}
                  className={`flex items-center gap-3 p-4 rounded-lg border ${
                    selectedFiles.has(file.id) ? 'bg-muted border-primary' : 'hover:bg-muted/50'
                  }`}
                >
                  {approvedFiles.length > 1 && (
                    <div
                      className="cursor-pointer"
                      onClick={() => toggleFileSelection(file.id)}
                    >
                      {selectedFiles.has(file.id) ? (
                        <CheckSquare className="h-4 w-4 text-primary" />
                      ) : (
                        <div className="h-4 w-4 border border-muted-foreground rounded" />
                      )}
                    </div>
                  )}
                  
                  <FileText className="h-5 w-5 text-green-500 flex-shrink-0" />
                  
                   <div className="flex-1 min-w-0">
                     <div className="font-medium truncate">{file.metadata.title}</div>
                     <div className="text-sm text-muted-foreground space-y-1">
                       <div className="flex items-center gap-4 flex-wrap">
                         <span className="flex items-center gap-1">
                           <Hash className="h-3 w-3" />
                           {file.chunksCount} chunks
                         </span>
                         <span>{formatFileSize(file.fileSize)}</span>
                         <span className="flex items-center gap-1">
                           <Calendar className="h-3 w-3" />
                           {formatDate(file.verifiedAt)}
                         </span>
                       </div>
                       <div className="flex items-center gap-2 flex-wrap">
                         <Badge variant="outline" className="text-xs">
                           {file.extractionMethod}
                         </Badge>
                         <Badge variant="secondary" className="text-xs">
                           {file.metadata.documentType}
                         </Badge>
                         <Badge variant="outline" className="text-xs">
                           {file.metadata.domain}
                         </Badge>
                       </div>
                       <div className="text-xs">
                         <strong>Tags:</strong> {file.metadata.tags}
                       </div>
                       {file.metadata.description && (
                         <div className="text-xs">
                           <strong>Description:</strong> {file.metadata.description.substring(0, 100)}{file.metadata.description.length > 100 ? '...' : ''}
                         </div>
                       )}
                     </div>
                   </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeFromQueue(file.id)}
                      disabled={uploadingFiles.has(file.id)}
                    >
                      Remove
                    </Button>
                    <Button
                      onClick={() => initiateUpload(file.id)}
                      disabled={uploadingFiles.has(file.id)}
                      className="gap-2"
                    >
                      {uploadingFiles.has(file.id) ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          Approve & Upload
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {/* Version Management Dialog */}
      {currentUploadFile && (
        <DocumentReplacementDialog
          open={versionDialogOpen}
          onClose={() => {
            setVersionDialogOpen(false);
            setCurrentUploadFile(null);
          }}
          onConfirm={uploadToMaturion}
          newDocumentTitle={currentUploadFile.metadata.title}
          newDocumentType={currentUploadFile.metadata.documentType}
          newDocumentDomain={currentUploadFile.metadata.domain}
        />
      )}
    </Card>
  );
};