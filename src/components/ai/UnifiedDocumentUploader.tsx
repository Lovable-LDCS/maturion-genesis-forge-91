import React from 'react';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, CheckCircle, AlertTriangle, Clock, X, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { useOrganizationContext } from '@/hooks/useOrganizationContext';
import { useSecureForm } from '@/hooks/useSecureForm';
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
  const { user, isSessionValid } = useAuth();
  const { currentOrganization } = useOrganization();
  const { currentContext, validateUploadPermission, logContextValidation } = useOrganizationContext();
  const { validateFormData, isValidating } = useSecureForm({
    maxInputLength: 1000,
    requireSessionValidation: true,
    requireOrganizationContext: true,
    organizationId: currentOrganization?.id
  });
  const { toast } = useToast();

  // Backoffice configuration - Auto-set to primary organization for internal uploads
  const [isBackofficeMode, setIsBackofficeMode] = useState(false);
  const [isCheckingBackofficeStatus, setIsCheckingBackofficeStatus] = useState(true);

  // Check if user is a backoffice admin on component mount
  useEffect(() => {
    const checkBackofficeStatus = async () => {
      if (!user?.id) {
        setIsCheckingBackofficeStatus(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('backoffice_admins')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!error && data) {
          setIsBackofficeMode(true);
          toast({
            title: "Backoffice Mode Active",
            description: "You have elevated upload permissions as a backoffice admin",
            variant: "default",
          });
        }
      } catch (error) {
        console.error('Error checking backoffice status:', error);
      } finally {
        setIsCheckingBackofficeStatus(false);
      }
    };

    checkBackofficeStatus();
  }, [user?.id, toast]);

  const [uploadSession, setUploadSession] = useState<UploadSession | null>(null);
  const [metadataDialogFile, setMetadataDialogFile] = useState<UploadFile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Determine effective organization (backoffice bypass or current organization)
  const effectiveOrganization = useMemo(() => {
    if (isBackofficeMode && currentOrganization) {
      // Use the user's primary organization for backoffice operations
      return currentOrganization;
    }
    return currentOrganization;
  }, [isBackofficeMode, currentOrganization]);

  // Check if user has admin/owner permissions (enhanced with backoffice bypass)
  const isAdmin = isBackofficeMode || currentContext?.can_upload || currentOrganization?.user_role === 'admin' || currentOrganization?.user_role === 'owner';

  // Create new upload session with effective organization
  const createUploadSession = useCallback((): UploadSession => {
    if (!effectiveOrganization?.id) {
      throw new Error('No organization context available. Please refresh the page.');
    }
    if (!user?.id) {
      throw new Error('No user context available. Please log in again.');
    }

    const sessionId = crypto.randomUUID();
    return {
      sessionId,
      organizationId: effectiveOrganization.id,
      userId: user.id,
      files: [],
      startedAt: new Date(),
      totalFiles: 0,
      successCount: 0,
      failureCount: 0
    };
  }, [effectiveOrganization?.id, user?.id]);

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

  // Handle file drop/selection with backoffice support
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    // Enhanced security validation
    if (!isSessionValid) {
      toast({
        title: "Session Invalid",
        description: "Please log in again to upload documents",
        variant: "destructive",
      });
      return;
    }

    if (!user || (!isBackofficeMode && !effectiveOrganization) || !isAdmin) {
      const errorMessage = isBackofficeMode 
        ? "Backoffice user validation failed"
        : "Only administrators can upload documents";
      
      toast({
        title: "Access denied",
        description: errorMessage,
        variant: "destructive",
      });
      return;
    }

    if (!currentOrganization.id) {
      toast({
        title: "Organization context missing",
        description: "Please refresh the page and try again",
        variant: "destructive",
      });
      return;
    }

    // Enhanced organizational context validation
    const canUpload = await validateUploadPermission(currentOrganization.id);
    if (!canUpload) {
      toast({
        title: "Upload permission denied",
        description: "You do not have upload permissions for this organization",
        variant: "destructive",
      });
      return;
    }

    console.log('Upload validation context:', {
      userId: user.id,
      organizationId: currentOrganization.id,
      userRole: currentOrganization.user_role,
      contextCanUpload: currentContext?.can_upload,
      isAdmin
    });

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
      try {
        session = createUploadSession();
        setUploadSession(session);
      } catch (error) {
        toast({
          title: "Session creation failed",
          description: error instanceof Error ? error.message : "Unable to create upload session",
          variant: "destructive",
        });
        return;
      }
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
  }, [user, currentOrganization, isAdmin, uploadSession, maxFiles, createUploadSession, validateFile, validateUploadPermission, currentContext, toast]);

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
      // Validate session context before proceeding using new security functions
      if (!session.organizationId || !session.userId) {
        throw new Error('Invalid session context: missing organization or user ID');
      }

      // Use the new organization context validation function
      const { data: orgContext, error: contextError } = await supabase
        .rpc('get_user_organization_context')
        .single();

      if (contextError || !orgContext) {
        console.error('Organization context validation failed:', contextError);
        await supabase.rpc('log_upload_context_validation', {
          session_id_param: session.sessionId,
          organization_id_param: session.organizationId,
          user_id_param: session.userId,
          validation_result_param: false,
          error_details_param: `Context validation failed: ${contextError?.message || 'No context returned'}`
        });
        throw new Error('Unable to validate organization context. Please refresh and try again.');
      }

      // Ensure user has upload permissions for the selected organization
      const { data: canUpload, error: permissionError } = await supabase
        .rpc('user_can_upload_to_organization', {
          org_id: session.organizationId
        });

      if (permissionError || !canUpload) {
        console.error('Upload permission validation failed:', permissionError);
        await supabase.rpc('log_upload_context_validation', {
          session_id_param: session.sessionId,
          organization_id_param: session.organizationId,
          user_id_param: session.userId,
          validation_result_param: false,
          error_details_param: `Permission validation failed: ${permissionError?.message || 'User lacks upload permissions'}`
        });
        throw new Error('You do not have upload permissions for this organization.');
      }

      console.log('Upload session validation successful:', {
        sessionId: session.sessionId,
        organizationId: session.organizationId,
        organizationType: orgContext.organization_type,
        userRole: orgContext.user_role,
        canUpload: orgContext.can_upload,
        fileCount: session.files.length
      });

      // Log successful validation
      await supabase.rpc('log_upload_context_validation', {
        session_id_param: session.sessionId,
        organization_id_param: session.organizationId,
        user_id_param: session.userId,
        validation_result_param: true,
        error_details_param: `Upload authorized for ${orgContext.organization_type} organization with ${orgContext.user_role} role`
      });

      // Log upload session start
      const { error: sessionLogError } = await supabase.from('upload_session_log').insert({
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

      if (sessionLogError) {
        console.error('Session log error:', sessionLogError);
        throw new Error(`Session logging failed: ${sessionLogError.message}`);
      }

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

      // Access current state using a state callback to ensure we get the latest state
      let completedFiles = 0;
      let failedFiles = 0;
      let finalSessionFiles: UploadFile[] = [];
      
      // Get the current state directly from React state
      setUploadSession(currentSessionState => {
        if (currentSessionState) {
          completedFiles = currentSessionState.files.filter(f => f.status === 'completed').length;
          failedFiles = currentSessionState.files.filter(f => f.status === 'failed').length;
          finalSessionFiles = currentSessionState.files;
          
          console.log('Final count calculation from current state:', {
            totalFiles: currentSessionState.files.length,
            completedFiles,
            failedFiles,
            fileStatuses: currentSessionState.files.map(f => ({ name: f.file.name, status: f.status }))
          });
        }
        return currentSessionState; // Don't modify state, just read it
      });
      
      // Update session completion with actual counts
      await supabase.from('upload_session_log')
        .update({
          completed_at: new Date().toISOString(),
          success_count: completedFiles,
          failure_count: failedFiles
        })
        .eq('session_id', session.sessionId);

      // Notify completion
      if (onUploadComplete) {
        onUploadComplete(session.sessionId, finalSessionFiles);
      }

      toast({
        title: "Upload completed",
        description: `${completedFiles} files uploaded successfully, ${failedFiles} failed`,
        variant: failedFiles > 0 ? "destructive" : "default"
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
      // Validate and sanitize filename before upload
      const { data: validation, error: validationError } = await supabase
        .rpc('validate_file_upload', {
          file_name: uploadFile.file.name,
          file_size: uploadFile.file.size,
          mime_type: uploadFile.file.type
        });

      const validationResult = validation as { valid: boolean; error?: string; sanitized_name?: string };

      if (validationError || !validationResult?.valid) {
        throw new Error(validationResult?.error || 'File validation failed');
      }

      // Use sanitized filename from validation
      const sanitizedFileName = validationResult.sanitized_name || uploadFile.file.name;
      const filePath = `unified-uploads/${session.organizationId}/${session.sessionId}/${sanitizedFileName}`;
      
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

      // Validate session data before document creation
      if (!session.organizationId || !session.userId) {
        throw new Error('Session validation failed: missing organization or user ID');
      }

      console.log('Document creation payload:', {
        organizationId: session.organizationId,
        userId: session.userId,
        fileName: uploadFile.file.name,
        documentType: uploadFile.metadata!.documentType
      });

      // Create document record with explicit validation
      const documentPayload = {
        title: uploadFile.metadata!.title,
        file_name: uploadFile.file.name,
        file_path: filePath,
        file_size: uploadFile.file.size,
        mime_type: uploadFile.file.type,
        document_type: uploadFile.metadata!.documentType,
        domain: uploadFile.metadata!.domain || undefined,
        tags: uploadFile.metadata!.tags ? (typeof uploadFile.metadata!.tags === 'string' ? uploadFile.metadata!.tags.split(',').map(t => t.trim()) : uploadFile.metadata!.tags) : [],
        upload_notes: uploadFile.metadata!.description || undefined,
        processing_status: 'pending' as const,
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
    disabled: (!isAdmin || isProcessing || !isSessionValid || isValidating || isCheckingBackofficeStatus) && !isBackofficeMode,
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
          <CardDescription className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-green-500" />
            {isBackofficeMode ? (
              <span className="text-blue-600 font-medium">
                🔧 Backoffice Mode: Enhanced upload permissions active for internal operations
              </span>
            ) : (
              "Secure document upload with enhanced validation and audit trail"
            )}
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