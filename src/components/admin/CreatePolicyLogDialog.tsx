import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';
import { CreatePolicyLogData } from '@/hooks/usePolicyChangeLog';

interface CreatePolicyLogDialogProps {
  onCreateLog: (data: CreatePolicyLogData) => Promise<boolean>;
  availableDocuments?: Array<{ id: string; title: string; file_name: string }>;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const POLICY_TYPES = [
  'AI Logic Policy',
  'Validation Rules',
  'Risk Model',
  'Security Policy',
  'Compliance Rule',
  'Assessment Logic',
  'Data Processing',
  'User Interface',
  'System Configuration',
  'Other'
];

const DOMAIN_SCOPES = [
  'Global',
  'Global Platform Logic – applies to all AI components, MPS logic, user pages, and guidance systems',
  'Leadership & Governance',
  'Process Integrity',
  'People & Culture',
  'Protection',
  'Proof it Works',
  'MPS-specific',
  'Assessment-specific',
  'Organization-specific'
];

const IMPORTANCE_LEVELS = [
  'Low',
  'Medium',
  'High',
  'Critical'
];

const CreatePolicyLogDialog: React.FC<CreatePolicyLogDialogProps> = ({
  onCreateLog,
  availableDocuments = [],
  isOpen,
  onOpenChange
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreatePolicyLogData>({
    title: '',
    type: '',
    domain_scope: '',
    summary: '',
    linked_document_id: '',
    tags: [],
    metadata: {}
  });
  const [newTag, setNewTag] = useState('');
  const [importanceLevel, setImportanceLevel] = useState('Medium');

  const handleOpenChange = (newOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(newOpen);
    } else {
      setOpen(newOpen);
    }
    
    if (!newOpen) {
      resetForm();
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      type: '',
      domain_scope: '',
      summary: '',
      linked_document_id: '',
      tags: [],
      metadata: {}
    });
    setNewTag('');
    setImportanceLevel('Medium');
    setLoading(false);
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags?.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.type || !formData.domain_scope || !formData.summary) {
      return;
    }

    setLoading(true);
    
    const dataToSubmit = {
      ...formData,
      metadata: {
        importance_level: importanceLevel,
        ...formData.metadata
      }
    };

    const success = await onCreateLog(dataToSubmit);
    
    if (success) {
      handleOpenChange(false);
    }
    
    setLoading(false);
  };

  const currentOpen = isOpen !== undefined ? isOpen : open;

  return (
    <Dialog open={currentOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Log New Policy
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Policy Change Log</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Policy change title"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="type">Type *</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select policy type" />
                </SelectTrigger>
                <SelectContent>
                  {POLICY_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="domain_scope">Domain Scope *</Label>
              <Select value={formData.domain_scope} onValueChange={(value) => setFormData(prev => ({ ...prev, domain_scope: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select scope" />
                </SelectTrigger>
                <SelectContent>
                  {DOMAIN_SCOPES.map(scope => (
                    <SelectItem key={scope} value={scope}>{scope}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="importance">Importance Level</Label>
              <Select value={importanceLevel} onValueChange={setImportanceLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMPORTANCE_LEVELS.map(level => (
                    <SelectItem key={level} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {availableDocuments.length > 0 && (
            <div>
              <Label htmlFor="linked_document">Linked Document (Optional)</Label>
              <Select 
                value={formData.linked_document_id || 'none'} 
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  linked_document_id: value === 'none' ? null : value 
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a document" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No linked document</SelectItem>
                  {availableDocuments.map(doc => (
                    <SelectItem key={doc.id} value={doc.id}>
                      {doc.title || doc.file_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="summary">Summary *</Label>
            <Textarea
              id="summary"
              value={formData.summary}
              onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
              placeholder="Describe the policy change, its impact, and rationale..."
              rows={4}
              required
            />
          </div>

          <div>
            <Label htmlFor="tags">Tags</Label>
            <div className="flex gap-2 mb-2">
              <Input
                id="tags"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add a tag"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <Button type="button" onClick={addTag} variant="outline" size="sm">
                Add
              </Button>
            </div>
            {formData.tags && formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {formData.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => removeTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Policy Log'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePolicyLogDialog;