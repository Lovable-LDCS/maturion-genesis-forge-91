import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { AlertTriangle, Trash2, RefreshCw, Info } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { MaturionDocument } from '@/hooks/useMaturionDocuments';

interface FailedDocumentsCleanupProps {
  failedDocuments: MaturionDocument[];
  onDelete: (documentId: string) => void;
  onReprocess: (documentId: string) => void;
  onBulkDelete: (documentIds: string[]) => void;
  loading?: boolean;
}

const STUCK_THRESHOLD_HOURS = 24; // Documents pending for more than 24 hours are considered stuck

export const FailedDocumentsCleanup: React.FC<FailedDocumentsCleanupProps> = ({
  failedDocuments,
  onDelete,
  onReprocess,
  onBulkDelete,
  loading = false
}) => {
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());

  // Include documents that are stuck in pending state for too long
  const stuckPendingDocs = failedDocuments.filter(doc => {
    if (doc.processing_status !== 'pending') return false;
    const hoursSinceCreated = (Date.now() - new Date(doc.created_at).getTime()) / (1000 * 60 * 60);
    return hoursSinceCreated > STUCK_THRESHOLD_HOURS;
  });

  const actualFailedDocs = failedDocuments.filter(doc => doc.processing_status === 'failed');
  const allProblematicDocs = [...actualFailedDocs, ...stuckPendingDocs];

  const toggleSelection = (docId: string) => {
    const newSelection = new Set(selectedDocs);
    if (newSelection.has(docId)) {
      newSelection.delete(docId);
    } else {
      newSelection.add(docId);
    }
    setSelectedDocs(newSelection);
  };

  const selectAll = () => {
    setSelectedDocs(new Set(allProblematicDocs.map(doc => doc.id)));
  };

  const clearSelection = () => {
    setSelectedDocs(new Set());
  };

  const handleBulkDelete = () => {
    onBulkDelete(Array.from(selectedDocs));
    setSelectedDocs(new Set());
  };

  const getErrorReason = (doc: MaturionDocument) => {
    if (doc.processing_status === 'pending') {
      const hoursSinceCreated = (Date.now() - new Date(doc.created_at).getTime()) / (1000 * 60 * 60);
      return `Stuck in pending state for ${Math.floor(hoursSinceCreated)} hours - likely processing failure`;
    }
    if (doc.metadata?.error) {
      return doc.metadata.error;
    }
    if (doc.metadata?.processing_error) {
      return doc.metadata.processing_error;
    }
    return 'Unknown error during processing';
  };

  if (allProblematicDocs.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <Info className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <div>No problematic documents found</div>
            <div className="text-sm mt-2">All documents have been processed successfully</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Failed & Stuck Documents
              <Badge variant="destructive">{actualFailedDocs.length}</Badge>
              {stuckPendingDocs.length > 0 && (
                <Badge variant="outline">{stuckPendingDocs.length} stuck</Badge>
              )}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Documents that failed processing or are stuck pending for over {STUCK_THRESHOLD_HOURS} hours
            </p>
          </div>
          <div className="flex gap-2">
            {selectedDocs.size > 0 && (
              <>
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  Clear ({selectedDocs.size})
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete Selected
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Failed Documents</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to permanently delete {selectedDocs.size} failed document(s)? 
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground">
                        Delete Documents
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
            <Button variant="outline" size="sm" onClick={selectAll} disabled={loading}>
              Select All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {allProblematicDocs.map((doc) => (
            <div 
              key={doc.id}
              className={`border rounded-lg p-4 transition-colors ${
                selectedDocs.has(doc.id) ? 'border-primary bg-muted/50' : 'border-border'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <input
                    type="checkbox"
                    checked={selectedDocs.has(doc.id)}
                    onChange={() => toggleSelection(doc.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium truncate">{doc.title || doc.file_name}</h4>
                      <Badge 
                        variant={doc.processing_status === 'failed' ? 'destructive' : 'outline'} 
                        className="text-xs"
                      >
                        {doc.processing_status === 'failed' ? 'Failed' : 'Stuck Pending'}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>
                        <strong>File:</strong> {doc.file_name} ({(doc.file_size / 1024 / 1024).toFixed(2)} MB)
                      </div>
                      <div>
                        <strong>Type:</strong> {doc.document_type.replace(/_/g, ' ').toUpperCase()}
                      </div>
                      {doc.domain && (
                        <div>
                          <strong>Domain:</strong> {doc.domain}
                        </div>
                      )}
                      <div>
                        <strong>Failed:</strong> {formatDistanceToNow(new Date(doc.updated_at), { addSuffix: true })}
                      </div>
                      <div className="text-destructive">
                        <strong>Error:</strong> {getErrorReason(doc)}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onReprocess(doc.id)}
                    disabled={loading}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Retry
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" disabled={loading}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Failed Document</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to permanently delete "{doc.title || doc.file_name}"? 
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => onDelete(doc.id)} 
                          className="bg-destructive text-destructive-foreground"
                        >
                          Delete Document
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};