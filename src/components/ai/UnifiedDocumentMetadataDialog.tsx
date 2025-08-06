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
import { Save, XCircle, Shield, AlertTriangle } from 'lucide-react';

export interface DocumentMetadata {
  title: string;
  documentType: string;
  domain: string;
  tags: string;
  visibility: string;
  description: string;
  changeReason?: string;
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

const documentTypeOptions = [
  { value: 'ai_logic_rule_global', label: 'AI Logic Rule' },
  { value: 'assessment_framework_component', label: 'Assessment Framework' },
  { value: 'audit_template', label: 'Audit Template' },
  { value: 'awareness_material', label: 'Awareness Material' },
  { value: 'best_practice', label: 'Best Practice' },
  { value: 'case_study', label: 'Case Study' },
  { value: 'checklist', label: 'Checklist' },
  { value: 'data_model', label: 'Data Model' },
  { value: 'decision_tree_logic', label: 'Decision Tree / Logic Map' },
  { value: 'evaluation_rubric', label: 'Evaluation Rubric' },
  { value: 'evidence_sample', label: 'Evidence Sample' },
  { value: 'general', label: 'General' },
  { value: 'governance_reasoning_manifest', label: 'Governance Reasoning' },
  { value: 'guidance_document', label: 'Guidance Document' },
  { value: 'implementation_guide', label: 'Implementation Guide' },
  { value: 'maturity_model', label: 'Maturity Model' },
  { value: 'mps_document', label: 'MPS Document' },
  { value: 'policy_model', label: 'Policy Model' },
  { value: 'policy_statement', label: 'Policy Statement' },
  { value: 'scoring_logic', label: 'Scoring Logic' },
  { value: 'sop_procedure', label: 'SOP (Standard Operating Procedure)' },
  { value: 'template', label: 'Template' },
  { value: 'threat_intelligence_profile', label: 'Threat Intelligence' },
  { value: 'tool_reference', label: 'Tool Reference' },
  { value: 'training_module', label: 'Training Module' },
  { value: 'use_case_scenario', label: 'Use Case / Scenario' }
];

const domainOptions = [
  'AI Governance',
  'Analytics & Reporting',
  'Assessment & Evidence Logic',
  'Control Environment',
  'Global Instruction',
  'Global Platform Logic',
  'Incident Management',
  'Leadership & Governance',
  'Legal & Compliance',
  'Maturion Engine Logic',
  'People & Culture',
  'Process Integrity',
  'Proof it Works',
  'Protection',
  'Surveillance & Monitoring',
  'System Integrity & Infrastructure',
  'Third-Party Risk',
  'Threat Environment',
  'Training & Awareness'
];

const visibilityOptions = [
  { value: 'all_users', label: 'All Users' },
  { value: 'superusers_only', label: 'Superusers Only' },
  { value: 'ai_only', label: 'Maturion AI only' }
];

const UnifiedDocumentMetadataDialog: React.FC<UnifiedDocumentMetadataDialogProps> = ({
  open,
  onClose,
  onSave,
  initialMetadata,
  isPreApproved = false,
  isSaving = false,
  mode = 'edit'
}) => {
  const [metadata, setMetadata] = useState<DocumentMetadata>({
    title: '',
    documentType: 'guidance_document',
    domain: '',
    tags: '',
    visibility: 'all_users',
    description: '',
    changeReason: ''
  });

  const [hasChanges, setHasChanges] = useState(false);

  // Initialize metadata when dialog opens
  useEffect(() => {
    if (open && initialMetadata) {
      const newMetadata = {
        title: initialMetadata.title || '',
        documentType: initialMetadata.documentType || 'guidance_document',
        domain: initialMetadata.domain || '',
        tags: initialMetadata.tags || '',
        visibility: initialMetadata.visibility || 'all_users',
        description: initialMetadata.description || '',
        changeReason: initialMetadata.changeReason || ''
      };
      setMetadata(newMetadata);
      setHasChanges(false);
    }
  }, [open, initialMetadata]);

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
              <Label htmlFor="documentType">Document Type *</Label>
              <Select
                value={metadata.documentType}
                onValueChange={(value) => setMetadata(prev => ({ ...prev, documentType: value }))}
                disabled={isPreApproved && mode === 'edit'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {documentTypeOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Domain */}
            <div className="space-y-2">
              <Label htmlFor="domain">Domain *</Label>
              <Select
                value={metadata.domain}
                onValueChange={(value) => setMetadata(prev => ({ ...prev, domain: value }))}
                disabled={isPreApproved && mode === 'edit'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select domain" />
                </SelectTrigger>
                <SelectContent>
                  {domainOptions.map(domain => (
                    <SelectItem key={domain} value={domain}>
                      {domain}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Visibility */}
            <div className="space-y-2">
              <Label htmlFor="visibility">Visibility *</Label>
              <Select
                value={metadata.visibility}
                onValueChange={(value) => setMetadata(prev => ({ ...prev, visibility: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select visibility" />
                </SelectTrigger>
                <SelectContent>
                  {visibilityOptions.map(option => (
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
            <Label htmlFor="tags">Tags *</Label>
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
            <Label htmlFor="description">AI Backoffice Description</Label>
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
  );
};

export { UnifiedDocumentMetadataDialog };
export default UnifiedDocumentMetadataDialog;