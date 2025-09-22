import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Save, XCircle, Shield, AlertTriangle, HelpCircle, Building2 } from 'lucide-react';
import { DOCUMENT_TYPE_OPTIONS, DOMAIN_OPTIONS, VISIBILITY_OPTIONS, FIELD_DESCRIPTIONS } from '@/lib/documentConstants';
import { useOrganizationHierarchy } from '@/hooks/useOrganizationHierarchy';

export interface DocumentMetadata {
  title: string;
  documentType: string;
  domain: string;
  tags: string;
  visibility: string;
  description: string;
  changeReason?: string;
  contextLevel?: 'global' | 'organization' | 'subsidiary';
  targetOrganizationId?: string;
}

interface UnifiedDocumentMetadataDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (metadata: DocumentMetadata) => Promise<void>;
  initialMetadata: Partial<DocumentMetadata>;
  isPreApproved?: boolean;
  isSaving?: boolean;
  mode?: 'create' | 'edit';
}

const UnifiedDocumentMetadataDialog: React.FC<UnifiedDocumentMetadataDialogProps> = ({
  open,
  onClose,
  onSave,
  initialMetadata,
  isPreApproved = false,
  isSaving = false,
  mode = 'edit'
}) => {
  const { availableContexts, loading: contextsLoading, getDefaultContext } = useOrganizationHierarchy();
  const [metadata, setMetadata] = useState<DocumentMetadata>({
    title: '',
    documentType: 'guidance_document',
    domain: '',
    tags: '',
    visibility: 'all_users',
    description: '',
    changeReason: '',
    contextLevel: 'organization',
    targetOrganizationId: ''
  });

  const [hasChanges, setHasChanges] = useState(false);

  // Initialize metadata when dialog opens
  useEffect(() => {
    const initializeMetadata = async () => {
      if (open) {
        const defaultContext = initialMetadata?.contextLevel || 
          (mode === 'create' ? await getDefaultContext() : 'organization');
        
        const newMetadata = {
          title: initialMetadata?.title || '',
          documentType: initialMetadata?.documentType || 'guidance_document',
          domain: initialMetadata?.domain || '',
          tags: initialMetadata?.tags || '',
          visibility: initialMetadata?.visibility || 'all_users',
          description: initialMetadata?.description || '',
          changeReason: initialMetadata?.changeReason || '',
          contextLevel: (defaultContext === 'global' ? 'global' : 'organization') as 'global' | 'organization' | 'subsidiary',
          targetOrganizationId: initialMetadata?.targetOrganizationId || (defaultContext !== 'global' ? defaultContext : '')
        };
        setMetadata(newMetadata);
        setHasChanges(false);
      }
    };

    if (!contextsLoading) {
      initializeMetadata();
    }
  }, [open, initialMetadata, contextsLoading, getDefaultContext, mode]);

  // Track changes
  useEffect(() => {
    if (initialMetadata) {
      const changed = 
        metadata.title !== (initialMetadata.title || '') ||
        metadata.documentType !== (initialMetadata.documentType || 'guidance_document') ||
        metadata.domain !== (initialMetadata.domain || '') ||
        metadata.tags !== (initialMetadata.tags || '') ||
        metadata.visibility !== (initialMetadata.visibility || 'all_users') ||
        metadata.description !== (initialMetadata.description || '');
      setHasChanges(changed);
    }
  }, [metadata, initialMetadata]);

  const handleSave = async () => {
    if (!metadata.title.trim()) return;
    
    try {
      await onSave(metadata);
    } catch (error) {
      console.error('Error saving metadata:', error);
    }
  };

  const isValid = metadata.title.trim() && metadata.documentType && metadata.domain && metadata.tags.trim();

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {mode === 'edit' ? 'Edit Document Metadata' : 'Document Metadata'}
              {isPreApproved && (
                <Shield className="h-4 w-4 text-green-600" />
              )}
            </DialogTitle>
            <DialogDescription>
              {mode === 'edit' 
                ? 'Update the document metadata and categorization' 
                : 'Provide metadata for this document before testing'
              }
            </DialogDescription>
          </DialogHeader>

          {/* Pre-approved warning */}
          {isPreApproved && mode === 'edit' && (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>Smart Chunk Reuse Document:</strong> This document was pre-approved via the Chunk Tester. 
                Modifying critical metadata may affect its Smart Upload eligibility.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            {/* Document Context Selection */}
            <div className="space-y-2 mb-6 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                <Label htmlFor="context">Document Context *</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Select the organizational context for this document. Global documents serve as best practices for all organizations.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Select
                value={metadata.contextLevel === 'global' ? 'global' : metadata.targetOrganizationId}
                onValueChange={(value) => {
                  if (value === 'global') {
                    setMetadata(prev => ({ 
                      ...prev, 
                      contextLevel: 'global', 
                      targetOrganizationId: undefined 
                    }));
                  } else {
                    const context = availableContexts.find(c => c.id === value);
                    setMetadata(prev => ({ 
                      ...prev, 
                      contextLevel: context?.organization_level === 'subsidiary' ? 'subsidiary' : 'organization',
                      targetOrganizationId: value 
                    }));
                  }
                }}
                disabled={isPreApproved && mode === 'edit'}
              >
                <SelectTrigger className="bg-white dark:bg-gray-950">
                  <SelectValue placeholder="Select document context" />
                </SelectTrigger>
                <SelectContent>
                  {availableContexts.map(context => (
                    <SelectItem key={context.id} value={context.id}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          context.organization_level === 'backoffice' ? 'bg-blue-500' :
                          context.organization_level === 'subsidiary' ? 'bg-gray-500' :
                          'bg-green-500'
                        }`} />
                        {context.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {metadata.contextLevel === 'global' 
                  ? 'This document will be available as best practice guidance for all organizations'
                  : 'This document will be specific to the selected organization/subsidiary'
                }
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Document Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Document Title *</Label>
                <Input
                  id="title"
                  value={metadata.title}
                  onChange={(e) => setMetadata(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter document title"
                  required
                  disabled={isPreApproved && mode === 'edit'}
                />
              </div>

              {/* Document Type */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="documentType">Document Type *</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">{FIELD_DESCRIPTIONS.documentType}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Select
                  value={metadata.documentType}
                  onValueChange={(value) => {
                    const newMetadata = { ...metadata, documentType: value };
                    // Auto-suggest tags for Diamond Knowledge Pack
                    if (value === 'diamond_knowledge_pack') {
                      const existingTags = metadata.tags.split(',').map(t => t.trim()).filter(t => t);
                      const suggestedTags = ['dkp:v1', 'industry:diamond'];
                      const newTags = Array.from(new Set([...existingTags, ...suggestedTags])).join(', ');
                      newMetadata.tags = newTags;
                    }
                    setMetadata(prev => newMetadata);
                  }}
                  disabled={isPreApproved && mode === 'edit'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPE_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Domain */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="domain">Domain *</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">{FIELD_DESCRIPTIONS.domain}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Select
                  value={metadata.domain}
                  onValueChange={(value) => setMetadata(prev => ({ ...prev, domain: value }))}
                  disabled={isPreApproved && mode === 'edit'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select domain" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOMAIN_OPTIONS.map(domain => (
                      <SelectItem key={domain} value={domain}>
                        {domain}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Visibility */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="visibility">Visibility *</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">{FIELD_DESCRIPTIONS.visibility}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Select
                  value={metadata.visibility}
                  onValueChange={(value) => setMetadata(prev => ({ ...prev, visibility: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select visibility" />
                  </SelectTrigger>
                  <SelectContent>
                    {VISIBILITY_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="tags">Tags *</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">{FIELD_DESCRIPTIONS.tags}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id="tags"
                value={metadata.tags}
                onChange={(e) => setMetadata(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="Enter tags separated by commas (e.g., iso27001, risk-management, audit)"
                required
                disabled={isPreApproved && mode === 'edit'}
              />
              <p className="text-xs text-muted-foreground">
                Use comma-separated tags for better searchability and filtering
              </p>
            </div>

            {/* AI Backoffice Description */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="description">AI Backoffice Description</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">{FIELD_DESCRIPTIONS.description}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Textarea
                id="description"
                value={metadata.description}
                onChange={(e) => setMetadata(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional: Provide context or notes about this document for AI processing"
                rows={3}
              />
            </div>

            {/* Change Reason (Edit mode only) */}
            {mode === 'edit' && (
              <div className="space-y-2">
                <Label htmlFor="changeReason">Change Reason</Label>
                <Input
                  id="changeReason"
                  value={metadata.changeReason}
                  onChange={(e) => setMetadata(prev => ({ ...prev, changeReason: e.target.value }))}
                  placeholder="Brief description of changes made..."
                />
                <p className="text-xs text-muted-foreground">
                  This will be logged for audit and compliance purposes
                </p>
              </div>
            )}
          </div>

          {/* Protected field warning */}
          {isPreApproved && mode === 'edit' && hasChanges && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Warning:</strong> Modifying critical metadata fields on pre-approved documents 
                may cause Smart Chunk Reuse to fail during processing.
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !isValid}
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Save Metadata'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};

export { UnifiedDocumentMetadataDialog };
export default UnifiedDocumentMetadataDialog;