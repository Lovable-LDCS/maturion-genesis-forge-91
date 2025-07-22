import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, AlertCircle, Clock, FileText, Database, Shield, Filter } from 'lucide-react';
import { MaturionKnowledgeUploadZone } from '@/components/ai/MaturionKnowledgeUploadZone';
import { DocumentProcessingDebugger } from '@/components/ai/DocumentProcessingDebugger';

import { useMaturionDocuments } from '@/hooks/useMaturionDocuments';

const MaturionKnowledgeBase: React.FC = () => {
  const { documents, loading, refreshDocuments } = useMaturionDocuments();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
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

        {/* Document Status Filter */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Document Status Filter
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
        </Card>

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