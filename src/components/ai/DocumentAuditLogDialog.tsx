import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Clock, User, FileText, Upload, Edit, Trash2, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuditLogEntry {
  id: string;
  action: string;
  created_at: string;
  user_id: string;
  metadata: any;
  document_id: string;
}

interface DocumentAuditLogDialogProps {
  open: boolean;
  onClose: () => void;
  documentId: string | null;
  documentTitle?: string;
}

const getActionIcon = (action: string) => {
  switch (action) {
    case 'upload': return <Upload className="h-4 w-4" />;
    case 'update': return <Edit className="h-4 w-4" />;
    case 'delete': return <Trash2 className="h-4 w-4" />;
    case 'bulk_delete': return <Trash2 className="h-4 w-4" />;
    case 'reprocess': return <RefreshCw className="h-4 w-4" />;
    default: return <FileText className="h-4 w-4" />;
  }
};

const getActionBadgeVariant = (action: string) => {
  switch (action) {
    case 'upload': return 'default';
    case 'update': return 'secondary';
    case 'delete': case 'bulk_delete': return 'destructive';
    case 'reprocess': return 'outline';
    default: return 'outline';
  }
};

const getActionLabel = (action: string) => {
  switch (action) {
    case 'upload': return 'Document Uploaded';
    case 'update': return 'Document Updated';
    case 'delete': return 'Document Deleted';
    case 'bulk_delete': return 'Bulk Deleted';
    case 'reprocess': return 'Reprocessed';
    default: return action.replace(/_/g, ' ').toUpperCase();
  }
};

export const DocumentAuditLogDialog: React.FC<DocumentAuditLogDialogProps> = ({
  open,
  onClose,
  documentId,
  documentTitle
}) => {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchAuditLogs = async () => {
    if (!documentId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_upload_audit')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAuditLogs(data || []);
    } catch (error: any) {
      console.error('Error fetching audit logs:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch audit logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && documentId) {
      fetchAuditLogs();
    }
  }, [open, documentId]);

  const renderMetadataDetails = (metadata: any, action: string) => {
    if (!metadata || typeof metadata !== 'object') return null;

    switch (action) {
      case 'upload':
        return (
          <div className="text-sm text-muted-foreground space-y-1">
            {metadata.file_name && <div><strong>File:</strong> {metadata.file_name}</div>}
            {metadata.file_size && <div><strong>Size:</strong> {(metadata.file_size / 1024 / 1024).toFixed(2)} MB</div>}
            {metadata.document_type && <div><strong>Type:</strong> {metadata.document_type.replace(/_/g, ' ').toUpperCase()}</div>}
            {metadata.domain && <div><strong>Domain:</strong> {metadata.domain}</div>}
            {metadata.tags && <div><strong>Tags:</strong> {metadata.tags}</div>}
            {metadata.upload_notes && <div><strong>Notes:</strong> {metadata.upload_notes}</div>}
          </div>
        );
        
      case 'update':
        return (
          <div className="text-sm text-muted-foreground space-y-2">
            {metadata.updated_fields && (
              <div><strong>Updated fields:</strong> {metadata.updated_fields.join(', ')}</div>
            )}
            {metadata.old_values && metadata.new_values && (
              <div className="space-y-1">
                <div className="font-medium">Changes:</div>
                {Object.keys(metadata.new_values).map(field => (
                  <div key={field} className="ml-2">
                    <strong>{field}:</strong> 
                    <span className="line-through text-red-600 mr-2">{metadata.old_values[field] || 'None'}</span>
                    → <span className="text-green-600">{metadata.new_values[field] || 'None'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
        
      case 'delete':
      case 'bulk_delete':
        return (
          <div className="text-sm text-muted-foreground space-y-1">
            {metadata.deleted_file && <div><strong>File:</strong> {metadata.deleted_file}</div>}
            {metadata.deleted_title && <div><strong>Title:</strong> {metadata.deleted_title}</div>}
            {metadata.deleted_at && <div><strong>Deleted at:</strong> {new Date(metadata.deleted_at).toLocaleString()}</div>}
            {metadata.bulk_operation && <div><strong>Operation:</strong> Bulk deletion</div>}
            {metadata.soft_delete && <div><strong>Type:</strong> Soft delete (recoverable)</div>}
          </div>
        );
        
      default:
        return (
          <div className="text-sm text-muted-foreground">
            <pre className="whitespace-pre-wrap">{JSON.stringify(metadata, null, 2)}</pre>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Change Log
            {documentTitle && <span className="text-muted-foreground">- {documentTitle}</span>}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading audit logs...</div>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <div>No audit logs found for this document</div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {auditLogs.map((log, index) => (
                <Card key={log.id} className="relative">
                  {index < auditLogs.length - 1 && (
                    <div className="absolute left-6 top-16 bottom-0 w-px bg-border" />
                  )}
                  
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background border-2 border-border relative z-10">
                          {getActionIcon(log.action)}
                        </div>
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            {getActionLabel(log.action)}
                            <Badge variant={getActionBadgeVariant(log.action)} className="text-xs">
                              {log.action}
                            </Badge>
                          </CardTitle>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <User className="h-3 w-3" />
                            <span>User ID: {log.user_id}</span>
                            <Separator orientation="vertical" className="h-3" />
                            <Clock className="h-3 w-3" />
                            <span>{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  {log.metadata && (
                    <CardContent className="pt-0">
                      {renderMetadataDetails(log.metadata, log.action)}
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};