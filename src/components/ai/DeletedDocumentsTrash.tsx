import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, RotateCcw, Info } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MaturionDocument } from '@/hooks/useMaturionDocuments';
import { useOrganization } from '@/hooks/useOrganization';

interface DeletedDocumentsTrashProps {
  onRestore?: () => void;
}

export const DeletedDocumentsTrash: React.FC<DeletedDocumentsTrashProps> = ({
  onRestore
}) => {
  const [deletedDocuments, setDeletedDocuments] = useState<MaturionDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [isSuperuser, setIsSuperuser] = useState(false);
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();

  // Check superuser status
  useEffect(() => {
    const checkSuperuser = async () => {
      try {
        const { data } = await supabase.rpc('is_superuser');
        setIsSuperuser(data || false);
      } catch (error) {
        console.error('Error checking superuser status:', error);
        setIsSuperuser(false);
      }
    };
    checkSuperuser();
  }, []);

  const fetchDeletedDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_documents')
        .select('*')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (error) throw error;

      setDeletedDocuments((data || []) as MaturionDocument[]);
    } catch (error: any) {
      console.error('Error fetching deleted documents:', error);
      toast({
        title: "Error",
        description: "Failed to fetch deleted documents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const restoreDocument = async (documentId: string) => {
    try {
      // Get document info first for organization check
      const { data: doc, error: fetchError } = await supabase
        .from('ai_documents')
        .select('organization_id, title, file_name')
        .eq('id', documentId)
        .single();

      if (fetchError) throw fetchError;
      if (!doc) throw new Error('Document not found');

      // Check permissions - superuser bypass or organization match
      if (!isSuperuser && currentOrganization?.id && doc.organization_id !== currentOrganization.id) {
        toast({
          title: 'Cannot restore document',
          description: `This document belongs to a different organization. Switch org to manage it.`,
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase
        .from('ai_documents')
        .update({ 
          deleted_at: null,
          updated_by: (await supabase.auth.getUser()).data.user?.id || ''
        })
        .eq('id', documentId);

      if (error) throw error;

      toast({
        title: "Document restored",
        description: "Document has been restored from trash",
      });

      await fetchDeletedDocuments();
      onRestore?.();
    } catch (error: any) {
      toast({
        title: "Restore failed",
        description: error.message || "Failed to restore document",
        variant: "destructive",
      });
    }
  };

  const permanentlyDeleteDocument = async (documentId: string) => {
    try {
      // Get document info for storage cleanup and organization check
      const { data: doc, error: fetchError } = await supabase
        .from('ai_documents')
        .select('file_path, title, file_name, organization_id')
        .eq('id', documentId)
        .single();

      if (fetchError) throw fetchError;
      if (!doc) throw new Error('Document not found');

      // Check permissions - superuser bypass or organization match
      if (!isSuperuser && currentOrganization?.id && doc.organization_id !== currentOrganization.id) {
        toast({
          title: 'Cannot delete document',
          description: `This document belongs to a different organization. Switch org to manage it.`,
          variant: 'destructive',
        });
        return;
      }

      // Delete from storage
      if (doc?.file_path) {
        await supabase.storage
          .from('ai-documents')
          .remove([doc.file_path]);
      }

      // Hard delete from database
      const { error } = await supabase
        .from('ai_documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;

      toast({
        title: "Document permanently deleted",
        description: "Document has been permanently removed",
      });

      await fetchDeletedDocuments();
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to permanently delete document",
        variant: "destructive",
      });
    }
  };

  const toggleSelection = (docId: string) => {
    const newSelection = new Set(selectedDocs);
    if (newSelection.has(docId)) {
      newSelection.delete(docId);
    } else {
      newSelection.add(docId);
    }
    setSelectedDocs(newSelection);
  };

  const bulkRestore = async () => {
    const docIds = Array.from(selectedDocs);
    try {
      // Check permissions for all selected documents if not superuser
      if (!isSuperuser && currentOrganization?.id) {
        const { data: docs, error: fetchError } = await supabase
          .from('ai_documents')
          .select('id, organization_id')
          .in('id', docIds);

        if (fetchError) throw fetchError;
        
        const wrongOrgDocs = docs?.filter(doc => doc.organization_id !== currentOrganization.id);
        if (wrongOrgDocs && wrongOrgDocs.length > 0) {
          toast({
            title: 'Cannot restore documents',
            description: `Some documents belong to different organizations. Switch org or select only your documents.`,
            variant: 'destructive',
          });
          return;
        }
      }

      const { error } = await supabase
        .from('ai_documents')
        .update({ 
          deleted_at: null,
          updated_by: (await supabase.auth.getUser()).data.user?.id || ''
        })
        .in('id', docIds);

      if (error) throw error;

      toast({
        title: "Documents restored",
        description: `${docIds.length} documents have been restored from trash`,
      });

      setSelectedDocs(new Set());
      await fetchDeletedDocuments();
      onRestore?.();
    } catch (error: any) {
      toast({
        title: "Bulk restore failed",
        description: error.message || "Failed to restore documents",
        variant: "destructive",
      });
    }
  };

  const bulkPermanentDelete = async () => {
    const docIds = Array.from(selectedDocs);
    try {
      // Get documents for storage cleanup and permission check
      const { data: docs, error: fetchError } = await supabase
        .from('ai_documents')
        .select('file_path, organization_id')
        .in('id', docIds);

      if (fetchError) throw fetchError;

      // Check permissions for all selected documents if not superuser
      if (!isSuperuser && currentOrganization?.id) {
        const wrongOrgDocs = docs?.filter(doc => doc.organization_id !== currentOrganization.id);
        if (wrongOrgDocs && wrongOrgDocs.length > 0) {
          toast({
            title: 'Cannot delete documents',
            description: `Some documents belong to different organizations. Switch org or select only your documents.`,
            variant: 'destructive',
          });
          return;
        }
      }

      // Delete from storage
      if (docs && docs.length > 0) {
        const filePaths = docs.map(doc => doc.file_path).filter(Boolean);
        if (filePaths.length > 0) {
          await supabase.storage
            .from('ai-documents')
            .remove(filePaths);
        }
      }

      // Hard delete from database
      const { error } = await supabase
        .from('ai_documents')
        .delete()
        .in('id', docIds);

      if (error) throw error;

      toast({
        title: "Documents permanently deleted",
        description: `${docIds.length} documents have been permanently removed`,
      });

      setSelectedDocs(new Set());
      await fetchDeletedDocuments();
    } catch (error: any) {
      toast({
        title: "Bulk delete failed",
        description: error.message || "Failed to permanently delete documents",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchDeletedDocuments();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            Loading deleted documents...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (deletedDocuments.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <Trash2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <div>Trash is empty</div>
            <div className="text-sm mt-2">No deleted documents found</div>
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
              <Trash2 className="h-5 w-5" />
              Deleted Documents
              <Badge variant="secondary">{deletedDocuments.length}</Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Documents in trash - restore or permanently delete
            </p>
          </div>
          {selectedDocs.size > 0 && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={bulkRestore}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Restore ({selectedDocs.size})
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete Forever ({selectedDocs.size})
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Permanently Delete Documents</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to permanently delete {selectedDocs.size} document(s)? 
                      This action cannot be undone and will remove all associated data.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={bulkPermanentDelete} className="bg-destructive text-destructive-foreground">
                      Delete Forever
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {deletedDocuments.map((doc) => (
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
                      <Badge variant="outline" className="text-xs">
                        {doc.processing_status}
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
                        <strong>Deleted:</strong> {doc.deleted_at ? formatDistanceToNow(new Date(doc.deleted_at), { addSuffix: true }) : 'Unknown'}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => restoreDocument(doc.id)}
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Restore
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Permanently Delete Document</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to permanently delete "{doc.title || doc.file_name}"? 
                          This action cannot be undone and will remove all associated data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => permanentlyDeleteDocument(doc.id)} 
                          className="bg-destructive text-destructive-foreground"
                        >
                          Delete Forever
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