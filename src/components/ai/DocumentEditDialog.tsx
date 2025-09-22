import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Calendar, FileText, Tag, User, Database, Clock, Building2, HelpCircle } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { MaturionDocument } from '@/hooks/useMaturionDocuments';
import { DOCUMENT_TYPE_OPTIONS, DOMAIN_OPTIONS } from '@/lib/documentConstants';
import { useOrganizationHierarchy } from '@/hooks/useOrganizationHierarchy';

interface DocumentEditDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (updates: DocumentUpdateData) => Promise<boolean>;
  document: MaturionDocument | null;
  saving?: boolean;
}

export interface DocumentUpdateData {
  title?: string;
  domain?: string;
  tags?: string;
  upload_notes?: string;
  document_type?: MaturionDocument['document_type'];
  change_reason?: string;
  context_level?: 'global' | 'organization' | 'subsidiary';
  target_organization_id?: string | null;
}

export const DocumentEditDialog: React.FC<DocumentEditDialogProps> = ({
  open,
  onClose,
  onSave,
  document,
  saving = false
}) => {
  const { availableContexts } = useOrganizationHierarchy();
  
  const [formData, setFormData] = useState<DocumentUpdateData>({
    title: '',
    domain: '',
    tags: '',
    upload_notes: '',
    document_type: 'general',
    change_reason: '',
    context_level: 'organization',
    target_organization_id: null
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

// Initialize form data when document changes
useEffect(() => {
  if (document) {
    setFormData({
      title: document.title || '',
      domain: document.domain || 'none', // Default to "none" if empty
      tags: Array.isArray(document.tags) ? document.tags.join(', ') : (document.tags || ''),
      upload_notes: document.upload_notes || '',
      document_type: document.document_type,
      change_reason: '',
      context_level: (document.context_level as any) || 'organization',
      target_organization_id: (document.context_level === 'global') ? null : (document.target_organization_id || document.organization_id || null)
    });
    setErrors({});
  }
}, [document]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title?.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length > 255) {
      newErrors.title = 'Title must be less than 255 characters';
    }

    if (formData.tags && formData.tags.length > 500) {
      newErrors.tags = 'Tags must be less than 500 characters';
    }

    if (formData.upload_notes && formData.upload_notes.length > 1000) {
      newErrors.upload_notes = 'Notes must be less than 1000 characters';
    }

    if (!formData.change_reason?.trim()) {
      newErrors.change_reason = 'Please provide a reason for this change';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

const handleSave = async () => {
  if (!validateForm()) return;

  // Convert values and include context fields
  const saveData = {
    ...formData,
    domain: formData.domain === "none" ? "" : formData.domain,
    context_level: formData.context_level,
    target_organization_id: formData.context_level === 'global' ? null : formData.target_organization_id
  };

  const success = await onSave(saveData);
  if (success) {
    onClose();
  }
};

  const handleClose = () => {
    setFormData({
      title: '',
      domain: '',
      tags: '',
      upload_notes: '',
      document_type: 'general',
      change_reason: ''
    });
    setErrors({});
    onClose();
  };

  if (!document) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Edit Document Metadata
          </DialogTitle>
          <DialogDescription>
            Update the metadata for this document. Changes will be tracked in the audit log.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Document Info Card */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Database className="h-4 w-4" />
              Document Information
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">File Name:</span>
                <div className="font-mono">{document.file_name}</div>
              </div>
              <div>
                <span className="text-muted-foreground">File Size:</span>
                <div>{(document.file_size / 1024 / 1024).toFixed(2)} MB</div>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={document.processing_status === 'completed' ? 'default' : 'secondary'}>
                  {document.processing_status}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Chunks:</span>
                <span className="font-mono">{document.total_chunks || 0}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Uploaded:</span>
                <div>{format(new Date(document.created_at), 'MMM d, yyyy HH:mm')}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Last Updated:</span>
                <div>{formatDistanceToNow(new Date(document.updated_at), { addSuffix: true })}</div>
              </div>
            </div>
          </div>

<Separator />

          {/* Organization / Context Selector */}
          <div className="space-y-2 mb-2 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              <Label>Document Context *</Label>
            </div>
            <Select
              value={formData.context_level === 'global' ? 'global' : (formData.target_organization_id || 'global')}
              onValueChange={(value) => {
                if (value === 'global') {
                  setFormData(prev => ({ ...prev, context_level: 'global', target_organization_id: null }));
                } else {
                  setFormData(prev => ({ ...prev, context_level: 'organization', target_organization_id: value }));
                }
              }}
            >
              <SelectTrigger className="bg-white dark:bg-gray-950">
                <SelectValue placeholder="Select document context" />
              </SelectTrigger>
              <SelectContent>
                {availableContexts.map((context) => (
                  <SelectItem key={context.id} value={context.id}>
                    {context.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {formData.context_level === 'global' ? 'This document will be available across all organizations' : 'This document will be scoped to the selected organization/subsidiary'}
            </p>
          </div>

          <Separator />

          {/* Edit Form */}
          <div className="space-y-4">
            {/* Title */}
            <div>
              <Label htmlFor="title" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Document Title *
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter a descriptive title"
                className={errors.title ? 'border-destructive' : ''}
              />
              {errors.title && (
                <p className="text-sm text-destructive mt-1">{errors.title}</p>
              )}
            </div>

            {/* Document Type */}
            <div>
              <Label>Document Type</Label>
              <Select 
                value={formData.document_type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, document_type: value as MaturionDocument['document_type'] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPE_OPTIONS.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Domain */}
            <div>
              <Label htmlFor="domain" className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Domain
              </Label>
              <Select 
                value={formData.domain} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, domain: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a domain (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Domain</SelectItem>
                  {DOMAIN_OPTIONS.map(domain => (
                    <SelectItem key={domain} value={domain}>
                      {domain}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tags */}
            <div>
              <Label htmlFor="tags" className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Tags
              </Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="Comma-separated tags (e.g., security, compliance, risk)"
                className={errors.tags ? 'border-destructive' : ''}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Separate multiple tags with commas
              </p>
              {errors.tags && (
                <p className="text-sm text-destructive mt-1">{errors.tags}</p>
              )}
            </div>

            {/* Upload Notes */}
            <div>
              <Label htmlFor="upload_notes">Upload Notes</Label>
              <Textarea
                id="upload_notes"
                value={formData.upload_notes}
                onChange={(e) => setFormData(prev => ({ ...prev, upload_notes: e.target.value }))}
                placeholder="Additional notes about this document..."
                rows={3}
                className={errors.upload_notes ? 'border-destructive' : ''}
              />
              {errors.upload_notes && (
                <p className="text-sm text-destructive mt-1">{errors.upload_notes}</p>
              )}
            </div>

            {/* Change Reason */}
            <div>
              <Label htmlFor="change_reason" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Reason for Change *
              </Label>
              <Textarea
                id="change_reason"
                value={formData.change_reason}
                onChange={(e) => setFormData(prev => ({ ...prev, change_reason: e.target.value }))}
                placeholder="Describe why you're making these changes..."
                rows={2}
                className={errors.change_reason ? 'border-destructive' : ''}
              />
              {errors.change_reason && (
                <p className="text-sm text-destructive mt-1">{errors.change_reason}</p>
              )}
            </div>
          </div>

          {/* Audit Notice */}
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              All changes will be logged in the audit trail with your user ID, timestamp, and reason for change.
              This action creates a document version for rollback purposes.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};