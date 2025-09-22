import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface DocumentFileReplacementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: {
    id: string;
    title?: string;
    file_name: string;
    document_type: string;
    domain?: string;
    file_size: number;
    created_at: string;
  };
  onSuccess: () => void;
}

export const DocumentFileReplacementDialog: React.FC<DocumentFileReplacementDialogProps> = ({
  open,
  onOpenChange,
  document,
  onSuccess
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isReplacing, setIsReplacing] = useState(false);
  const { uploadFile, uploading } = useFileUpload();
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleReplace = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to replace the document",
        variant: "destructive"
      });
      return;
    }

    setIsReplacing(true);
    try {
      if (!currentOrganization || !user) {
        throw new Error('Missing organization or user context for replacement');
      }

      // Generate a session ID for the replacement upload and record it for RLS
      const sessionId = crypto.randomUUID();

      // Log context validation (audit)
      await supabase.rpc('log_upload_context_validation', {
        session_id_param: sessionId,
        organization_id_param: currentOrganization.id,
        user_id_param: user.id,
        validation_result_param: true,
        error_details_param: 'Upload authorized for document replacement'
      });

      // Start upload session log (unified flow used by storage RLS)
      await supabase.from('upload_session_log').insert({
        session_id: sessionId,
        organization_id: currentOrganization.id,
        user_id: user.id,
        document_count: 1,
        total_size_bytes: selectedFile.size,
        session_data: { processing_version: 2, schema_version: 2, unified_upload: true, mode: 'replace' }
      });

      // Use the same bucket and path structure as regular uploads
      const newFilePath = `unified-uploads/${currentOrganization.id}/${sessionId}/${selectedFile.name}`;
      const uploadUrl = await uploadFile(selectedFile, 'ai-documents', newFilePath);
      
      if (uploadUrl) {
        // Call the reprocess endpoint to trigger document replacement
        const response = await fetch(`/supabase/functions/v1/reprocess-document`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            documentId: document.id,
            organizationId: currentOrganization.id,
            forceReprocess: true,
            newFilePath: newFilePath,
            newFileName: selectedFile.name,
            newFileSize: selectedFile.size,
            newMimeType: selectedFile.type
          })
        });

        if (response.ok) {
          toast({
            title: "Document replaced successfully",
            description: `${document.title} has been replaced with ${selectedFile.name}`,
          });
          onSuccess();
          onOpenChange(false);
          setSelectedFile(null);
        } else {
          throw new Error('Failed to replace document');
        }
      }
    } catch (error: any) {
      console.error('Document replacement error:', error);
      toast({
        title: "Replacement failed",
        description: error.message || "Failed to replace document",
        variant: "destructive"
      });
    } finally {
      setIsReplacing(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Replace Document
          </DialogTitle>
          <DialogDescription>
            Upload a new file to replace the existing document. The document will be reprocessed automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Document Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Current Document</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-3">
                <FileText className="h-8 w-8 text-muted-foreground mt-1" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{document.title || document.file_name}</p>
                  <p className="text-xs text-muted-foreground">{document.file_name}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>{document.document_type}</span>
                    <span>{formatFileSize(document.file_size)}</span>
                    <span>{document.domain}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* File Upload Section */}
          <div className="space-y-3">
            <Label htmlFor="replacement-file">Select Replacement File</Label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Choose a file to replace the current document
                </p>
                <Input
                  id="replacement-file"
                  type="file"
                  onChange={handleFileSelect}
                  accept=".pdf,.docx,.doc,.txt,.md,.csv,.xlsx,.xls,.pptx,.ppt,.pptm"
                  className="max-w-xs mx-auto"
                />
              </div>
            </div>
          </div>

          {/* Selected File Preview */}
          {selectedFile && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">New Document</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-3">
                  <FileText className="h-8 w-8 text-primary mt-1" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{selectedFile.name}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>{selectedFile.type}</span>
                      <span>{formatFileSize(selectedFile.size)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Warning */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Warning:</strong> This action will permanently replace the current document file. 
              The document will be reprocessed and all existing chunks will be replaced. 
              Document metadata and audit history will be preserved.
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isReplacing || uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReplace}
              disabled={!selectedFile || isReplacing || uploading}
              className="min-w-[120px]"
            >
              {isReplacing || uploading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Replacing...
                </div>
              ) : (
                'Replace Document'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};