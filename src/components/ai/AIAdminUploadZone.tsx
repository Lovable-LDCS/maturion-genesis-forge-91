import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button as ClearButton } from '@/components/ui/button';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Trash2, CheckCircle, AlertCircle, Clock, Tag, FolderOpen, X } from 'lucide-react';
import { useAIDocuments, AIDocument } from '@/hooks/useAIDocuments';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { useToast } from '@/hooks/use-toast';

const documentTypeLabels: Record<AIDocument['document_type'], string> = {
  maturity_model: 'Maturity Model',
  sector_context: 'Sector Context',
  scoring_logic: 'Scoring Logic',
  sop_template: 'SOP Template',
  general: 'General Knowledge',
  mps_document: 'MPS Document',
  iso_alignment: 'ISO Alignment',
  assessment_framework_component: 'Assessment Framework Component'
};

// Domain options for MPS documents
const domainOptions = [
  'Protection',
  'Governance', 
  'Risk Management',
  'Business Continuity',
  'Information Security',
  'Operational Security',
  'Physical Security',
  'Personnel Security',
  'Technology Security',
  'Third Party Management',
  'Compliance & Assurance',
  'Performance Management'
];

const statusIcons = {
  pending: <Clock className="h-4 w-4 text-yellow-500" />,
  processing: <AlertCircle className="h-4 w-4 text-blue-500" />,
  completed: <CheckCircle className="h-4 w-4 text-green-500" />,
  failed: <AlertCircle className="h-4 w-4 text-red-500" />
};

export const AIAdminUploadZone: React.FC = () => {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { documents, loading, uploading, uploadDocument, deleteDocument } = useAIDocuments();
  const { toast } = useToast();
  
  const [selectedDocumentType, setSelectedDocumentType] = useState<AIDocument['document_type']>('mps_document');
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [tags, setTags] = useState<string>('');
  const [uploadNotes, setUploadNotes] = useState<string>('');

  // Check if user is admin
  const isAdmin = currentOrganization?.user_role === 'admin' || currentOrganization?.user_role === 'owner';

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!user || !currentOrganization || !isAdmin) {
      toast({
        title: "Access denied",
        description: "Only administrators can upload AI documents",
        variant: "destructive",
      });
      return;
    }

    for (const file of acceptedFiles) {
      await uploadDocument(
        file, 
        selectedDocumentType, 
        currentOrganization.id, 
        user.id,
        selectedDomain || undefined,
        tags || undefined,
        uploadNotes || undefined
      );
    }
  }, [user, currentOrganization, isAdmin, selectedDocumentType, selectedDomain, tags, uploadNotes, uploadDocument, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md']
    },
    multiple: true,
    disabled: !isAdmin || uploading
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Knowledge Base</CardTitle>
          <CardDescription>Access restricted to administrators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>You don't have permission to access the AI Knowledge Base.</p>
            <p className="text-sm mt-2">Contact your organization administrator for access.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Knowledge Base Upload</CardTitle>
          <CardDescription>
            Upload documents to train the AI assistant with your organization's specific knowledge, 
            maturity models, and sector context.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Document Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="document-type" className="text-sm font-medium">Document Type</Label>
            <Select
              value={selectedDocumentType}
              onValueChange={(value: AIDocument['document_type']) => setSelectedDocumentType(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(documentTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Domain Selection (optional, but highlighted for MPS docs) */}
          <div className="space-y-2">
            <Label htmlFor="domain" className="text-sm font-medium">
              Domain
              <span className="text-muted-foreground ml-1">(optional)</span>
              {selectedDocumentType === 'mps_document' && (
                <span className="text-primary ml-1">- Recommended for MPS</span>
              )}
            </Label>
            <div className="flex gap-2">
              <Select
                value={selectedDomain}
                onValueChange={setSelectedDomain}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a domain..." />
                </SelectTrigger>
                <SelectContent>
                  {domainOptions.map((domain) => (
                    <SelectItem key={domain} value={domain}>
                      {domain}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedDomain && (
                <ClearButton
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setSelectedDomain('')}
                  className="shrink-0"
                  title="Clear domain selection"
                >
                  <X className="h-4 w-4" />
                </ClearButton>
              )}
            </div>
          </div>

          {/* Tags Field */}
          <div className="space-y-2">
            <Label htmlFor="tags" className="text-sm font-medium">
              Tags
              <span className="text-muted-foreground ml-1">(optional)</span>
            </Label>
            <Input
              id="tags"
              placeholder="e.g. security, compliance, risk-management"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Enter comma-separated tags to improve search and categorization
            </p>
          </div>

          {/* Upload Notes */}
          <div className="space-y-2">
            <Label htmlFor="upload-notes" className="text-sm font-medium">
              Upload Notes
              <span className="text-muted-foreground ml-1">(optional, admin-only)</span>
            </Label>
            <Textarea
              id="upload-notes"
              placeholder="Internal notes about this document, context for AI processing, or special instructions..."
              value={uploadNotes}
              onChange={(e) => setUploadNotes(e.target.value)}
              rows={3}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              These notes help provide context to the AI for better processing and retrieval
            </p>
          </div>

          {/* Upload Zone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            } ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <input {...getInputProps()} />
            <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-lg font-medium">Drop the files here...</p>
            ) : (
              <>
                <p className="text-lg font-medium mb-2">
                  Drag & drop files here, or click to select
                </p>
                <p className="text-sm text-muted-foreground">
                  Supports PDF, Word documents (.doc, .docx), plain text (.txt), and Markdown (.md)
                </p>
              </>
            )}
            {uploading && (
              <div className="mt-4">
                <Progress value={undefined} className="w-full" />
                <p className="text-sm text-muted-foreground mt-2">Processing upload...</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle>Uploaded Documents</CardTitle>
          <CardDescription>
            Manage your organization's AI knowledge base documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <Progress value={undefined} className="w-full max-w-xs mx-auto" />
              <p className="text-sm text-muted-foreground mt-2">Loading documents...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No documents uploaded yet.</p>
              <p className="text-sm mt-2">Upload your first document to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">{doc.file_name}</span>
                      <Badge variant="secondary">
                        {documentTypeLabels[doc.document_type]}
                      </Badge>
                      <div className="flex items-center gap-1">
                        {statusIcons[doc.processing_status]}
                        <span className="text-sm capitalize">{doc.processing_status}</span>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Size: {formatFileSize(doc.file_size)} • Type: {doc.mime_type}</p>
                      {doc.domain && (
                        <p className="flex items-center gap-1">
                          <FolderOpen className="h-3 w-3" />
                          Domain: <span className="font-medium">{doc.domain}</span>
                        </p>
                      )}
                      {doc.tags && (
                        <p className="flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          Tags: <span className="font-medium">{doc.tags}</span>
                        </p>
                      )}
                      <p>Uploaded: {formatDate(doc.created_at)}</p>
                      {doc.total_chunks > 0 && (
                        <p>Processed into {doc.total_chunks} searchable chunks</p>
                      )}
                      {doc.upload_notes && (
                        <p className="text-xs italic border-l-2 border-muted pl-2 mt-2">
                          Notes: {doc.upload_notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteDocument(doc.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};