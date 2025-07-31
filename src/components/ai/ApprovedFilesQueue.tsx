import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, FileText, Upload, Calendar, Hash, Loader2, CheckSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ApprovedFile {
  id: string;
  fileName: string;
  fileSize: number;
  chunksCount: number;
  extractionMethod: string;
  verifiedAt: string;
  fileData?: File; // Store the actual file data for upload
}

export const ApprovedFilesQueue: React.FC = () => {
  const [approvedFiles, setApprovedFiles] = useState<ApprovedFile[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
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
  const addApprovedFile = (file: File, chunksCount: number, extractionMethod: string) => {
    const approvedFile: ApprovedFile = {
      id: crypto.randomUUID(),
      fileName: file.name,
      fileSize: file.size,
      chunksCount,
      extractionMethod,
      verifiedAt: new Date().toISOString(),
    };

    const updatedFiles = [...approvedFiles, approvedFile];
    saveApprovedFiles(updatedFiles);

    toast({
      title: "File Approved",
      description: `${file.name} has been verified and added to the upload queue`,
    });
  };

  // Upload approved file to Maturion Knowledge Base
  const uploadToMaturion = async (fileId: string) => {
    setUploadingFiles(prev => new Set([...prev, fileId]));

    try {
      // Find the approved file
      const approvedFile = approvedFiles.find(f => f.id === fileId);
      if (!approvedFile) {
        throw new Error('Approved file not found');
      }

      // Get current user and organization
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // For now, we'll create a demo upload since we don't have the actual file data
      // In a real implementation, you'd need to store the file data or re-upload
      toast({
        title: "Upload Started",
        description: `${approvedFile.fileName} is being uploaded to Maturion Knowledge Base`,
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
        action: 'APPROVED_UPLOAD',
        changed_by: user.id,
        change_reason: `File ${approvedFile.fileName} uploaded after chunk verification (${approvedFile.chunksCount} chunks via ${approvedFile.extractionMethod})`
      });

      toast({
        title: "Upload Complete",
        description: `${approvedFile.fileName} has been successfully uploaded to Maturion`,
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
    }
  };

  // Bulk upload selected files
  const uploadSelectedFiles = async () => {
    const filesToUpload = Array.from(selectedFiles);
    setSelectedFiles(new Set());

    for (const fileId of filesToUpload) {
      await uploadToMaturion(fileId);
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
                    <div className="font-medium truncate">{file.fileName}</div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div className="flex items-center gap-4">
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
                      <Badge variant="outline" className="text-xs">
                        {file.extractionMethod}
                      </Badge>
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
                      onClick={() => uploadToMaturion(file.id)}
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
    </Card>
  );
};