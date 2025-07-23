import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, AlertCircle, Clock, FileText, Database, Shield, Filter, Trash2, CheckSquare, Square } from 'lucide-react';
import { MaturionKnowledgeUploadZone } from '@/components/ai/MaturionKnowledgeUploadZone';
import { DocumentProcessingDebugger } from '@/components/ai/DocumentProcessingDebugger';

import { useMaturionDocuments } from '@/hooks/useMaturionDocuments';

const MaturionKnowledgeBase: React.FC = () => {
  const { documents, loading, refreshDocuments, bulkDeleteDocuments } = useMaturionDocuments();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  
  // Filter documents based on status
  const filteredDocuments = useMemo(() => {
    if (statusFilter === 'all') return documents;
    return documents.filter(doc => doc.processing_status === statusFilter);
  }, [documents, statusFilter]);
  
  // Calculate statistics from filtered documents
  const stats = useMemo(() => {
    if (loading || documents.length === 0) {
      return {
        total: 0,
        completed: 0,
        processing: 0,
        failed: 0,
        pending: 0,
        totalChunks: 0,
        completionRate: 0
      };
    }

    const completed = documents.filter(d => d.processing_status === 'completed').length;
    const processing = documents.filter(d => d.processing_status === 'processing').length;
    const failed = documents.filter(d => d.processing_status === 'failed').length;
    const pending = documents.filter(d => d.processing_status === 'pending').length;
    const totalChunks = documents.reduce((sum, d) => sum + (d.total_chunks || 0), 0);
    const completionRate = documents.length > 0 ? (completed / documents.length) * 100 : 0;

    return {
      total: documents.length,
      completed,
      processing,
      failed,
      pending,
      totalChunks,
      completionRate
    };
  }, [documents, loading]);

  // Bulk deletion functions
  const toggleDocumentSelection = (documentId: string) => {
    setSelectedDocuments(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(documentId)) {
        newSelection.delete(documentId);
      } else {
        newSelection.add(documentId);
      }
      return newSelection;
    });
  };

  const selectAllDocuments = () => {
    setSelectedDocuments(new Set(filteredDocuments.map(doc => doc.id)));
  };

  const clearSelection = () => {
    setSelectedDocuments(new Set());
  };

  const selectDuplicatesByName = () => {
    const fileNameCounts = new Map<string, string[]>();
    filteredDocuments.forEach(doc => {
      const fileName = doc.file_name;
      if (!fileNameCounts.has(fileName)) {
        fileNameCounts.set(fileName, []);
      }
      fileNameCounts.get(fileName)!.push(doc.id);
    });

    const duplicateIds = new Set<string>();
    fileNameCounts.forEach((ids, fileName) => {
      if (ids.length > 1) {
        // Keep the newest (first in list since sorted by created_at desc), mark rest for deletion
        ids.slice(1).forEach(id => duplicateIds.add(id));
      }
    });

    setSelectedDocuments(duplicateIds);
    
    toast({
      title: "Duplicates Selected",
      description: `Selected ${duplicateIds.size} duplicate documents for deletion`,
    });
  };

  const handleBulkDelete = async () => {
    if (selectedDocuments.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select documents to delete",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    try {
      const success = await bulkDeleteDocuments(Array.from(selectedDocuments));
      if (success) {
        setSelectedDocuments(new Set());
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Maturion Knowledge Base</h1>
          <p className="text-muted-foreground">
            Manage your organization's knowledge documents, semantic context, and vector embeddings for Maturion
          </p>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                Knowledge base entries
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Processing Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(stats.completionRate)}%</div>
              <Progress value={stats.completionRate} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {stats.completed} of {stats.total} completed
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vector Chunks</CardTitle>
              <Database className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalChunks.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Searchable Maturion embeddings
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <Shield className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {stats.processing > 0 && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-yellow-500" />
                    <Badge variant="outline" className="text-xs">
                      {stats.processing} Processing
                    </Badge>
                  </div>
                )}
                {stats.failed > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-3 w-3 text-red-500" />
                    <Badge variant="destructive" className="text-xs">
                      {stats.failed} Failed
                    </Badge>
                  </div>
                )}
                {stats.processing === 0 && stats.failed === 0 && stats.pending === 0 && stats.total > 0 && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <Badge variant="default" className="text-xs">
                      All Processed
                    </Badge>
                  </div>
                  )}
                {stats.pending > 0 && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-yellow-500" />
                    <Badge variant="outline" className="text-xs">
                      {stats.pending} Pending
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Compliance Notice */}
        <Card className="mb-6 border-l-4 border-l-primary">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4" />
              ISO Compliance & Audit Requirements
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              This Maturion Knowledge Base maintains full compliance with <strong>ISO 9001</strong> (quality documentation), 
              <strong>ISO 27001</strong> (information security), and <strong>ISO 37301</strong> (compliance management). 
              All document uploads, edits, and deletions are logged with complete audit trails including timestamps, 
              user attribution, and change reasons for regulatory requirements.
            </p>
          </CardContent>
        </Card>

        {/* Document Management Panel */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Document Management
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Showing {filteredDocuments.length} of {stats.total} documents
                </span>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">✅ Processed</SelectItem>
                    <SelectItem value="processing">🔵 Processing</SelectItem>
                    <SelectItem value="pending">🟡 Pending</SelectItem>
                    <SelectItem value="failed">🔴 Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          
          {/* Bulk Actions Panel */}
          {filteredDocuments.length > 0 && (
            <CardContent className="pt-0">
              <div className="flex items-center justify-between bg-muted/30 p-4 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={selectedDocuments.size === filteredDocuments.length ? clearSelection : selectAllDocuments}
                    >
                      {selectedDocuments.size === filteredDocuments.length ? (
                        <>
                          <CheckSquare className="h-4 w-4 mr-2" />
                          Deselect All
                        </>
                      ) : (
                        <>
                          <Square className="h-4 w-4 mr-2" />
                          Select All ({filteredDocuments.length})
                        </>
                      )}
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={selectDuplicatesByName}
                    >
                      Select Duplicates
                    </Button>
                  </div>
                  
                  {selectedDocuments.size > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {selectedDocuments.size} document{selectedDocuments.size !== 1 ? 's' : ''} selected
                    </span>
                  )}
                </div>
                
                {selectedDocuments.size > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        Deleting...
                      </div>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Selected ({selectedDocuments.size})
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Document List with Selection */}
        {filteredDocuments.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      selectedDocuments.has(doc.id) ? 'bg-muted border-primary' : 'hover:bg-muted/50'
                    }`}
                  >
                    <div
                      className="cursor-pointer"
                      onClick={() => toggleDocumentSelection(doc.id)}
                    >
                      {selectedDocuments.has(doc.id) ? (
                        <CheckSquare className="h-4 w-4 text-primary" />
                      ) : (
                        <Square className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{doc.title || doc.file_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {Math.round(doc.file_size / 1024)} KB • {new Date(doc.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {doc.processing_status === 'completed' && (
                        <Badge variant="default" className="text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Processed
                        </Badge>
                      )}
                      {doc.processing_status === 'processing' && (
                        <Badge variant="outline" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          Processing
                        </Badge>
                      )}
                      {doc.processing_status === 'pending' && (
                        <Badge variant="outline" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                      {doc.processing_status === 'failed' && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Failed
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Admin Tools */}
        <div className="space-y-6">
          <DocumentProcessingDebugger />
          <MaturionKnowledgeUploadZone 
            filteredDocuments={filteredDocuments} 
            onDocumentChange={refreshDocuments}
          />
        </div>
      </div>

    </div>
  );
};

export default MaturionKnowledgeBase;
