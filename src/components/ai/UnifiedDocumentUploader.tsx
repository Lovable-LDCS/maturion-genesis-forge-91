import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, CheckCircle, AlertTriangle, Clock, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UnifiedDocumentMetadataDialog, type DocumentMetadata } from './UnifiedDocumentMetadataDialog';

interface UploadFile {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  metadata?: DocumentMetadata;
}

interface UploadSession {
  sessionId: string;
  organizationId: string;
  userId: string;
  files: UploadFile[];
  startedAt: Date;
  totalFiles: number;
  successCount: number;
  failureCount: number;
}

interface UnifiedDocumentUploaderProps {
  onUploadComplete?: (sessionId: string, results: UploadFile[]) => void;
  onFileStatusChange?: (fileId: string, status: string) => void;
  maxFiles?: number;
  allowedFileTypes?: string[];
}

export const UnifiedDocumentUploader: React.FC<UnifiedDocumentUploaderProps> = ({
  onUploadComplete,
  onFileStatusChange,
  maxFiles = 10,
  allowedFileTypes = ['.docx', '.pdf', '.txt', '.md']
}) => {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();

  const [uploadSession, setUploadSession] = useState<UploadSession | null>(null);
  const [metadataDialogFile, setMetadataDialogFile] = useState<UploadFile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Check if user has admin/owner permissions
  const isAdmin = currentOrganization?.user_role === 'admin' || currentOrganization?.user_role === 'owner';

  // Create new upload session
  const createUploadSession = useCallback((): UploadSession => {
    const sessionId = crypto.randomUUID();
    return {
      sessionId,
      organizationId: currentOrganization!.id,
      userId: user!.id,
      files: [],
      startedAt: new Date(),
      totalFiles: 0,
      successCount: 0,
      failureCount: 0
    };
  }, [currentOrganization, user]);

  // Validate file before adding to session
  const validateFile = useCallback((file: File): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // File size check (50MB limit)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      errors.push(`File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds 50MB limit`);
    }

    if (file.size < 100) {
      errors.push('File is too small (minimum 100 bytes)');
    }

    // File type check
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/pdf',
      'text/plain',
      'text/markdown'
    ];

    const hasValidExtension = allowedFileTypes.some(ext => 
      file.name.toLowerCase().endsWith(ext.toLowerCase())
    );

    if (!allowedMimeTypes.includes(file.type) && !hasValidExtension) {
      errors.push(`Unsupported file type: ${file.type || 'unknown'}`);
    }

    // File name validation
    if (file.name.length > 255) {
      errors.push('File name is too long (maximum 255 characters)');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, [allowedFileTypes]);

  // Handle file drop/selection
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!user || !currentOrganization || !isAdmin) {
      toast({
        title: "Access denied",
        description: "Only administrators can upload documents",
        variant: "destructive",
      });
      return;
    }

    // Check max files limit
    const currentFileCount = uploadSession?.files.length || 0;
    if (currentFileCount + acceptedFiles.length > maxFiles) {
      toast({
        title: "Too many files",
        description: `Maximum ${maxFiles} files allowed per session`,
        variant: "destructive",
      });
      return;
    }

    // Create session if none exists
    let session = uploadSession;
    if (!session) {
      session = createUploadSession();
      setUploadSession(session);
    }

    // Validate and add files to session
    const newFiles: UploadFile[] = [];
    for (const file of acceptedFiles) {
      const validation = validateFile(file);
      
      if (!validation.isValid) {
        toast({
          title: `Invalid file: ${file.name}`,
          description: validation.errors.join(', '),
          variant: "destructive",
        });
        continue;
      }

      const uploadFile: UploadFile = {
        id: crypto.randomUUID(),
        file,
        status: 'pending',
        progress: 0
      };

      newFiles.push(uploadFile);
    }

    if (newFiles.length > 0) {
      const updatedSession = {
        ...session,
        files: [...session.files, ...newFiles],
        totalFiles: session.totalFiles + newFiles.length
      };

      setUploadSession(updatedSession);

      // Start metadata collection for first file
      if (newFiles.length > 0) {
        setMetadataDialogFile(newFiles[0]);
      }

      toast({
        title: "Files added",
        description: `${newFiles.length} file(s) added to upload queue`,
      });
    }
  }, [user, currentOrganization, isAdmin, uploadSession, maxFiles, createUploadSession, validateFile, toast]);

  // Handle metadata save
  const handleMetadataSave = useCallback(async (metadata: DocumentMetadata) => {
    if (!metadataDialogFile || !uploadSession) return;

    // Update file with metadata
    const updatedFiles = uploadSession.files.map(file => 
      file.id === metadataDialogFile.id 
        ? { ...file, metadata }
        : file
    );

    const updatedSession = {
      ...uploadSession,
      files: updatedFiles
    };

    setUploadSession(updatedSession);
    setMetadataDialogFile(null);

    // Find next file without metadata
    const nextFile = updatedFiles.find(file => 
      file.status === 'pending' && !file.metadata && file.id !== metadataDialogFile.id
    );

    if (nextFile) {
      setMetadataDialogFile(nextFile);
    } else {
      // All files have metadata, start upload process
      await startUploadProcess(updatedSession);
    }
  }, [metadataDialogFile, uploadSession]);

  // Start upload process
  const startUploadProcess = useCallback(async (session: UploadSession) => {
    setIsProcessing(true);

    try {
      // Log upload session start
      await supabase.from('upload_session_log').insert({
        session_id: session.sessionId,
        organization_id: session.organizationId,
        user_id: session.userId,
        document_count: session.files.length,
        total_size_bytes: session.files.reduce((sum, file) => sum + file.file.size, 0),
        session_data: {
          processing_version: 2,
          schema_version: 2,
          unified_upload: true
        }
      });

      // Process files sequentially to avoid overwhelming the system
      for (const file of session.files) {
        if (file.status !== 'pending' || !file.metadata) continue;

        try {
          await processFile(file, session);
        } catch (error) {
          console.error(`Error processing file ${file.file.name}:`, error);
          updateFileStatus(file.id, 'failed', 0, error instanceof Error ? error.message : 'Unknown error');
        }
      }

      // Update session completion
      const finalSession = uploadSession!;
      await supabase.from('upload_session_log')
        .update({
          completed_at: new Date().toISOString(),
          success_count: finalSession.successCount,
          failure_count: finalSession.failureCount
        })
        .eq('session_id', session.sessionId);

      // Notify completion
      if (onUploadComplete) {
        onUploadComplete(session.sessionId, finalSession.files);
      }

      toast({
        title: "Upload completed",
        description: `${finalSession.successCount} files uploaded successfully, ${finalSession.failureCount} failed`,
        variant: finalSession.failureCount > 0 ? "destructive" : "default"
      });

    } catch (error) {
      console.error('Upload session error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [uploadSession, onUploadComplete, toast]);

  // Process individual file
  const processFile = useCallback(async (uploadFile: UploadFile, session: UploadSession) => {
    updateFileStatus(uploadFile.id, 'processing', 10);

    try {
      // Upload to storage
      const filePath = `unified-uploads/${session.organizationId}/${session.sessionId}/${uploadFile.file.name}`;
      
      updateFileStatus(uploadFile.id, 'processing', 30);

      const { error: storageError } = await supabase.storage
        .from('ai-documents')
        .upload(filePath, uploadFile.file, {
          cacheControl: '3600',
          upsert: false
        });

      if (storageError) {
        throw new Error(`Storage upload failed: ${storageError.message}`);
      }

      updateFileStatus(uploadFile.id, 'processing', 60);

      // Create document record
      const documentPayload = {
        title: uploadFile.metadata!.title,
        file_name: uploadFile.file.name,
        file_path: filePath,
        file_size: uploadFile.file.size,
        mime_type: uploadFile.file.type,
        document_type: uploadFile.metadata!.documentType,
        domain: uploadFile.metadata!.domain || undefined,
        tags: uploadFile.metadata!.tags || undefined,
        upload_notes: uploadFile.metadata!.description || undefined,
        processing_status: 'pending',
        processing_version: 2,
        schema_version: 2,
        unified_upload_metadata: {
          session_id: session.sessionId,
          upload_method: 'unified_uploader',
          visibility: uploadFile.metadata!.visibility
        },
        organization_id: session.organizationId,
        uploaded_by: session.userId,
        updated_by: session.userId
      };

      const { data: document, error: docError } = await supabase
        .from('ai_documents')
        .insert(documentPayload)
        .select()
        .single();

      if (docError) {
        throw new Error(`Document creation failed: ${docError.message}`);
      }

      updateFileStatus(uploadFile.id, 'processing', 80);

      // Process document through edge function
      const { data: processResult, error: processError } = await supabase.functions.invoke('process-document-v2', {
        body: {
          documentId: document.id,
          sessionId: session.sessionId,
          processingOptions: {
            enableSmartChunkReuse: true,
            priority: 'normal'
          }
        }
      });

      if (processError) {
        throw new Error(`Document processing failed: ${processError.message}`);
      }

      updateFileStatus(uploadFile.id, 'completed', 100);

      // Update session success count
      setUploadSession(prev => prev ? {
        ...prev,
        successCount: prev.successCount + 1
      } : prev);

      // Notify status change
      if (onFileStatusChange) {
        onFileStatusChange(uploadFile.id, 'completed');
      }

    } catch (error) {
      updateFileStatus(uploadFile.id, 'failed', 0, error instanceof Error ? error.message : 'Processing failed');
      
      // Update session failure count
      setUploadSession(prev => prev ? {
        ...prev,
        failureCount: prev.failureCount + 1
      } : prev);

      if (onFileStatusChange) {
        onFileStatusChange(uploadFile.id, 'failed');
      }
    }
  }, [onFileStatusChange]);

  // Update file status helper
  const updateFileStatus = useCallback((fileId: string, status: UploadFile['status'], progress: number, error?: string) => {
    setUploadSession(prev => {
      if (!prev) return prev;
      
      return {
        ...prev,
        files: prev.files.map(file => 
          file.id === fileId 
            ? { ...file, status, progress, error }
            : file
        )
      };
    });
  }, []);

  // Remove file from session
  const removeFile = useCallback((fileId: string) => {
    if (isProcessing) return;

    setUploadSession(prev => {
      if (!prev) return prev;
      
      const updatedFiles = prev.files.filter(file => file.id !== fileId);
      
      if (updatedFiles.length === 0) {
        return null; // Clear session if no files
      }
      
      return {
        ...prev,
        files: updatedFiles,
        totalFiles: updatedFiles.length
      };
    });
  }, [isProcessing]);

  // Cancel metadata dialog
  const handleMetadataCancel = useCallback(() => {
    setMetadataDialogFile(null);
  }, []);

  // Dropzone configuration
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md']
    },
    multiple: true,
    disabled: !isAdmin || isProcessing,
    maxFiles
  });

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Unified Document Upload</CardTitle>
          <CardDescription>Access restricted to administrators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>You don't have permission to upload documents.</p>
            <p className="text-sm mt-2">Contact your organization administrator for access.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Unified Document Upload Engine</CardTitle>
          <CardDescription>
            Phase 1: Clean, standardized document upload with metadata validation and processing pipeline
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Upload Zone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            } ${(isProcessing || !isAdmin) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <div className="text-lg font-medium mb-2">
              {isDragActive ? 'Drop files here...' : 'Drop files here or click to browse'}
            </div>
            <div className="text-sm text-muted-foreground">
              Supports: DOCX, PDF, TXT, MD (max {maxFiles} files, 50MB each)
            </div>
            {uploadSession && (
              <div className="mt-4 text-sm">
                <Badge variant="outline">
                  {uploadSession.files.length} files in session
                </Badge>
              </div>
            )}
          </div>

          {/* Session Status */}
          {uploadSession && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Upload Session: {uploadSession.sessionId.slice(0, 8)}</h4>
                <div className="flex gap-2">
                  <Badge variant="outline">
                    {uploadSession.successCount} completed
                  </Badge>
                  {uploadSession.failureCount > 0 && (
                    <Badge variant="destructive">
                      {uploadSession.failureCount} failed
                    </Badge>
                  )}
                </div>
              </div>

              {/* File List */}
              <div className="space-y-2">
                {uploadSession.files.map((file) => (
                  <div key={file.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <FileText className="h-4 w-4 flex-shrink-0" />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">{file.file.name}</span>
                        <div className="flex items-center gap-2">
                          {file.status === 'pending' && <Clock className="h-4 w-4 text-muted-foreground" />}
                          {file.status === 'processing' && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>}
                          {file.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-500" />}
                          {file.status === 'failed' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                          {!isProcessing && file.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(file.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {file.status === 'processing' && (
                        <Progress value={file.progress} className="mt-2" />
                      )}
                      
                      {file.error && (
                        <Alert className="mt-2">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>{file.error}</AlertDescription>
                        </Alert>
                      )}
                      
                      <div className="text-xs text-muted-foreground mt-1">
                        {(file.file.size / 1024).toFixed(1)} KB
                        {file.metadata && ` • ${file.metadata.documentType}`}
                        {file.metadata?.domain && ` • ${file.metadata.domain}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metadata Dialog */}
      <UnifiedDocumentMetadataDialog
        open={!!metadataDialogFile}
        onClose={handleMetadataCancel}
        onSave={handleMetadataSave}
        initialMetadata={{
          title: metadataDialogFile?.file.name.replace(/\.[^/.]+$/, '') || '',
          documentType: 'guidance_document',
          domain: '',
          tags: '',
          description: '',
          visibility: 'all_users'
        }}
        mode="create"
      />
    </div>
  );
};

export default UnifiedDocumentUploader;