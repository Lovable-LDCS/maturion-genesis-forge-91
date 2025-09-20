import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Eye, FileText, Image, Video, Music, Link, Database, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/useOrganization';
import { useFileUpload } from '@/hooks/useFileUpload';

interface EvidenceSubmission {
  id: string;
  title: string;
  description: string;
  evidence_type: string;
  evaluation_status: string;
  submission_method: string;
  ai_confidence_score: number | null;
  submitted_at: string;
  data_sources?: {
    source_name: string;
    source_type: string;
  };
}

interface DataSource {
  id: string;
  source_name: string;
  source_type: string;
  is_active: boolean;
}

const EVIDENCE_TYPE_OPTIONS = [
  { value: 'document', label: 'Document', icon: FileText },
  { value: 'image', label: 'Image', icon: Image },
  { value: 'video', label: 'Video', icon: Video },
  { value: 'audio', label: 'Audio', icon: Music },
  { value: 'link', label: 'Link/URL', icon: Link },
  { value: 'api_data', label: 'API Data', icon: Database },
  { value: 'structured_data', label: 'Structured Data', icon: Database },
  { value: 'other', label: 'Other', icon: FileText }
];

export const EvidenceSubmissionInterface: React.FC = () => {
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const { uploadFile, uploading } = useFileUpload();
  const [evidence, setEvidence] = useState<EvidenceSubmission[]>([]);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    evidence_type: '',
    data_source_id: '',
    file_url: '',
    structured_data: ''
  });

  useEffect(() => {
    if (currentOrganization?.id) {
      fetchEvidence();
      fetchDataSources();
    }
  }, [currentOrganization?.id]);

  const fetchEvidence = async () => {
    if (!currentOrganization?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('evidence_submissions')
        .select(`
          *,
          data_sources(source_name, source_type)
        `)
        .eq('organization_id', currentOrganization.id)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setEvidence(data || []);
    } catch (error) {
      console.error('Error fetching evidence:', error);
      toast({
        title: "Error",
        description: "Failed to fetch evidence submissions",
        variant: "destructive",
      });
    }
  };

  const fetchDataSources = async () => {
    if (!currentOrganization?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('data_sources')
        .select('id, source_name, source_type, is_active')
        .eq('organization_id', currentOrganization.id)
        .eq('is_active', true);

      if (error) throw error;
      setDataSources(data || []);
    } catch (error) {
      console.error('Error fetching data sources:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setFormData(prev => ({
        ...prev,
        title: prev.title || file.name
      }));
    }
  };

  const handleSubmitEvidence = async () => {
    if (!currentOrganization?.id) return;

    try {
      let fileUrl = formData.file_url;
      let evidenceData: any = {};

      // Handle file upload if file is selected
      if (selectedFile) {
        const uploadPath = `evidence/${currentOrganization.id}/${Date.now()}-${selectedFile.name}`;
        fileUrl = await uploadFile(selectedFile, 'evidence', uploadPath);
        
        if (!fileUrl) {
          throw new Error('File upload failed');
        }

        evidenceData = {
          file_name: selectedFile.name,
          file_size: selectedFile.size,
          mime_type: selectedFile.type
        };
      }

      // Handle structured data
      if (formData.structured_data) {
        try {
          evidenceData.structured_content = JSON.parse(formData.structured_data);
        } catch {
          evidenceData.structured_content = formData.structured_data;
        }
      }

      const { data, error } = await supabase.functions.invoke('test-data-sources-api?action=evidence', {
        body: {
          organization_id: currentOrganization.id,
          data_source_id: formData.data_source_id || null,
          evidence_type: formData.evidence_type,
          title: formData.title,
          description: formData.description,
          file_url: fileUrl,
          evidence_data: evidenceData,
          submission_method: selectedFile ? 'manual' : 'api',
          submitted_by: currentOrganization.owner_id
        }
      });

      if (error || !data.success) {
        throw new Error(error?.message || data?.error || 'Failed to submit evidence');
      }

      toast({
        title: "Success",
        description: "Evidence submitted successfully",
      });

      setIsSubmitDialogOpen(false);
      resetForm();
      fetchEvidence();
    } catch (error) {
      console.error('Error submitting evidence:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to submit evidence',
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      evidence_type: '',
      data_source_id: '',
      file_url: '',
      structured_data: ''
    });
    setSelectedFile(null);
  };

  const getEvidenceIcon = (type: string) => {
    const evidenceType = EVIDENCE_TYPE_OPTIONS.find(opt => opt.value === type);
    const Icon = evidenceType?.icon || FileText;
    return <Icon className="h-4 w-4" />;
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      rejected: 'bg-gray-100 text-gray-800'
    };
    
    return (
      <Badge className={variants[status as keyof typeof variants] || variants.pending}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const getConfidenceDisplay = (score: number | null) => {
    if (score === null) return null;
    
    const percentage = Math.round(score);
    const color = percentage >= 80 ? 'text-green-600' : percentage >= 60 ? 'text-yellow-600' : 'text-red-600';
    
    return (
      <div className={`flex items-center ${color}`}>
        <Star className="h-3 w-3 mr-1" />
        {percentage}%
      </div>
    );
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Evidence Submissions
            <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Upload className="h-4 w-4 mr-2" />
                  Submit Evidence
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Submit New Evidence</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="title">Evidence Title</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        placeholder="Evidence title"
                      />
                    </div>
                    <div>
                      <Label htmlFor="evidence_type">Evidence Type</Label>
                      <Select value={formData.evidence_type} onValueChange={(value) => 
                        setFormData({...formData, evidence_type: value})
                      }>
                        <SelectTrigger>
                          <SelectValue placeholder="Select evidence type" />
                        </SelectTrigger>
                        <SelectContent>
                          {EVIDENCE_TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center">
                                <option.icon className="h-4 w-4 mr-2" />
                                {option.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="data_source">Data Source (Optional)</Label>
                    <Select value={formData.data_source_id} onValueChange={(value) => 
                      setFormData({...formData, data_source_id: value})
                    }>
                      <SelectTrigger>
                        <SelectValue placeholder="Select data source" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No specific source</SelectItem>
                        {dataSources.map((source) => (
                          <SelectItem key={source.id} value={source.id}>
                            {source.source_name} ({source.source_type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Evidence description"
                    />
                  </div>

                  <div>
                    <Label htmlFor="file">Upload File (Optional)</Label>
                    <Input
                      id="file"
                      type="file"
                      onChange={handleFileSelect}
                      disabled={uploading}
                      accept="*/*"
                    />
                    {selectedFile && (
                      <p className="text-sm text-gray-500 mt-1">
                        Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="file_url">Or Enter URL</Label>
                    <Input
                      id="file_url"
                      value={formData.file_url}
                      onChange={(e) => setFormData({...formData, file_url: e.target.value})}
                      placeholder="https://example.com/document.pdf"
                    />
                  </div>

                  {formData.evidence_type === 'structured_data' && (
                    <div>
                      <Label htmlFor="structured_data">Structured Data (JSON)</Label>
                      <Textarea
                        id="structured_data"
                        value={formData.structured_data}
                        onChange={(e) => setFormData({...formData, structured_data: e.target.value})}
                        placeholder='{"key": "value", "data": "content"}'
                        className="font-mono text-sm"
                      />
                    </div>
                  )}

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsSubmitDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSubmitEvidence} 
                      disabled={!formData.title || !formData.evidence_type || uploading}
                    >
                      {uploading ? 'Uploading...' : 'Submit Evidence'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {evidence.length === 0 ? (
            <div className="text-center py-8">
              <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No evidence submissions yet</p>
              <p className="text-sm text-gray-400">Submit your first evidence to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title & Type</TableHead>
                  <TableHead>Data Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evidence.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getEvidenceIcon(item.evidence_type)}
                        <div>
                          <div className="font-medium">{item.title}</div>
                          <div className="text-sm text-gray-500 capitalize">
                            {item.evidence_type.replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.data_sources ? (
                        <div>
                          <div className="font-medium">{item.data_sources.source_name}</div>
                          <div className="text-sm text-gray-500 capitalize">
                            {item.data_sources.source_type.replace('_', ' ')}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">Direct upload</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(item.evaluation_status)}
                    </TableCell>
                    <TableCell>
                      {getConfidenceDisplay(item.ai_confidence_score)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(item.submitted_at).toLocaleDateString()}
                        <div className="text-xs text-gray-500">
                          {new Date(item.submitted_at).toLocaleTimeString()}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline">
                        <Eye className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EvidenceSubmissionInterface;