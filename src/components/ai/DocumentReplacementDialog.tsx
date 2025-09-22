import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, FileText } from 'lucide-react';

interface DocumentReplacementDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (replaceDocumentId?: string) => Promise<void>;
  newDocumentTitle: string;
  newDocumentType: string;
  newDocumentDomain: string;
}

export const DocumentReplacementDialog: React.FC<DocumentReplacementDialogProps> = ({
  open,
  onClose,
  onConfirm,
  newDocumentTitle,
  newDocumentType,
  newDocumentDomain
}) => {

  const handleUploadAsNew = async () => {
    await onConfirm();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Document Version Conflict
          </DialogTitle>
          <DialogDescription>
            A similar document may already exist. How would you like to proceed?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{newDocumentTitle}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span>{newDocumentType}</span>
                  {newDocumentDomain && (
                    <>
                      <span>•</span>
                      <span>{newDocumentDomain}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              This document may be similar to existing content. You can upload it as a new document 
              or cancel to review existing documents first.
            </AlertDescription>
          </Alert>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUploadAsNew}
            >
              Upload as New Document
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};