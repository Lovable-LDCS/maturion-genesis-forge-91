import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, RotateCcw, User, Calendar, Tag, FolderOpen, FileText, AlertTriangle } from 'lucide-react';
import { useDocumentVersions, DocumentVersion } from '@/hooks/useDocumentVersions';
import { MaturionDocument } from '@/hooks/useMaturionDocuments';

interface DocumentVersionDialogProps {
  document: MaturionDocument | null;
  open: boolean;
  onClose: () => void;
  onDocumentUpdated: () => void;
}

export const DocumentVersionDialog: React.FC<DocumentVersionDialogProps> = ({
  document,
  open,
  onClose,
  onDocumentUpdated
}) => {
  const { versions, loading, rollbackToVersion } = useDocumentVersions(document?.id);
  const [isRollingBack, setIsRollingBack] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleRollback = async (version: DocumentVersion) => {
    if (!document || !window.confirm(`Are you sure you want to rollback to version ${version.version_number}? This will create a new version with the rolled-back data.`)) {
      return;
    }

    setIsRollingBack(true);
    const success = await rollbackToVersion(document.id, version.id);
    if (success) {
      onDocumentUpdated();
      onClose();
    }
    setIsRollingBack(false);
  };

  if (!document) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Version History - {document.title || document.file_name}
          </DialogTitle>
          <DialogDescription>
            View and manage document versions for compliance and audit requirements
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Document Info */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Current Version</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium">{document.title}</p>
                  <p className="text-xs text-muted-foreground">{document.file_name}</p>
                </div>
                
                <div className="space-y-2">
                  <Badge variant="secondary" className="text-xs">
                    {document.document_type.replace('_', ' ').toUpperCase()}
                  </Badge>
                  
                  {document.domain && (
                    <div className="flex items-center gap-1 text-xs">
                      <FolderOpen className="h-3 w-3" />
                      <span>{document.domain}</span>
                    </div>
                  )}
                  
                  {document.tags && (
                    <div className="flex items-center gap-1 text-xs">
                      <Tag className="h-3 w-3" />
                      <span>{document.tags}</span>
                    </div>
                  )}
                </div>

                <Separator />
                
                <div className="text-xs space-y-1">
                  <p><strong>Size:</strong> {formatFileSize(document.file_size)}</p>
                  <p><strong>Updated:</strong> {formatDate(document.updated_at)}</p>
                  <p><strong>Status:</strong> {document.processing_status}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Version History */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Version History</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {versions.length} version{versions.length !== 1 ? 's' : ''} available
                </p>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-8 w-8 mx-auto mb-2 animate-spin" />
                    <p>Loading version history...</p>
                  </div>
                ) : versions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No version history available</p>
                    <p className="text-xs mt-1">Versions are created when documents are edited</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-3">
                      {versions.map((version, index) => (
                        <div
                          key={version.id}
                          className="border rounded-lg p-4 space-y-3"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant={index === 0 ? "default" : "outline"}>
                                v{version.version_number}
                                {index === 0 && " (Latest)"}
                              </Badge>
                              {version.change_reason && (
                                <span className="text-xs text-muted-foreground italic">
                                  {version.change_reason}
                                </span>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRollback(version)}
                              disabled={isRollingBack || index === 0}
                              className="text-xs"
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Rollback
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <p><strong>Title:</strong> {version.title}</p>
                              {version.domain && <p><strong>Domain:</strong> {version.domain}</p>}
                              {version.tags && <p><strong>Tags:</strong> {version.tags}</p>}
                            </div>
                            <div>
                              <p className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(version.created_at)}
                              </p>
                              <p><strong>Type:</strong> {version.document_type}</p>
                              <p><strong>Size:</strong> {formatFileSize(version.file_size)}</p>
                            </div>
                          </div>

                          {version.upload_notes && (
                            <div className="text-xs">
                              <p className="font-medium">Notes:</p>
                              <p className="text-muted-foreground italic border-l-2 border-muted pl-2 mt-1">
                                {version.upload_notes}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Compliance Notice */}
        <div className="bg-muted/50 border border-muted rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
            <div className="text-xs">
              <p className="font-medium">ISO Compliance Notice</p>
              <p className="text-muted-foreground mt-1">
                This version history maintains full audit trails for ISO 9001, ISO 27001, and ISO 37301 compliance. 
                All changes are logged with timestamps, user attribution, and change reasons for regulatory requirements.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};