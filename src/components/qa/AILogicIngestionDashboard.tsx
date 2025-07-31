import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { 
  Brain, 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  Play, 
  FileText, 
  Search, 
  MessageSquare,
  RefreshCw,
  Settings,
  Database,
  Tag,
  Shield,
  Zap
} from 'lucide-react';

interface AILogicDocument {
  id: string;
  title: string;
  file_name: string;
  processing_status: string;
  total_chunks: number;
  document_type: string;
  tags: string;
  metadata: any;
  created_at: string;
  updated_at: string;
}

interface DiagnosticSummary {
  totalDocuments: number;
  pendingDocuments: number;
  completedDocuments: number;
  failedDocuments: number;
  documentsWithChunks: number;
  averageChunksPerDoc: number;
  metadataCorrectness: number;
  lastProcessingError?: string;
}

interface ProcessingResult {
  documentId: string;
  title: string;
  success: boolean;
  error?: string;
  chunksCreated?: number;
}

export function AILogicIngestionDashboard() {
  const [documents, setDocuments] = useState<AILogicDocument[]>([]);
  const [summary, setSummary] = useState<DiagnosticSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [currentDoc, setCurrentDoc] = useState<string | null>(null);
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();

  const fetchAILogicDocuments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_documents')
        .select('*')
        .eq('document_type', 'ai_logic_rule_global')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const docs = data || [];
      setDocuments(docs);

      // Calculate diagnostic summary
      const totalDocs = docs.length;
      const pending = docs.filter(d => d.processing_status === 'pending').length;
      const completed = docs.filter(d => d.processing_status === 'completed').length;
      const failed = docs.filter(d => d.processing_status === 'failed').length;
      const withChunks = docs.filter(d => d.total_chunks > 0).length;
      const avgChunks = totalDocs > 0 ? docs.reduce((sum, d) => sum + (d.total_chunks || 0), 0) / totalDocs : 0;
      
      // Check metadata correctness
      const correctMetadata = docs.filter(d => 
        d.tags?.includes('AI Core Logic') || 
        d.tags?.includes('Global Platform Logic') ||
        d.tags?.includes('Governance')
      ).length;
      const metadataPercent = totalDocs > 0 ? (correctMetadata / totalDocs) * 100 : 0;

      setSummary({
        totalDocuments: totalDocs,
        pendingDocuments: pending,
        completedDocuments: completed,
        failedDocuments: failed,
        documentsWithChunks: withChunks,
        averageChunksPerDoc: avgChunks,
        metadataCorrectness: metadataPercent
      });

    } catch (error) {
      console.error('Error fetching AI Logic documents:', error);
      toast({
        title: "Error",
        description: "Failed to fetch AI Logic documents",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fixDocumentMetadata = async (documentId: string, title: string) => {
    try {
      const { error } = await supabase
        .from('ai_documents')
        .update({
          tags: 'AI Core Logic, Validation Rules, Emergency Processing, System Reasoning, Governance Anchor',
          metadata: {
            scope: 'Global Platform Logic',
            type: 'AI Logic Policy',
            governance_tier: 'platform_anchor',
            reasoning_priority: 'high',
            emergency_chunking_enabled: true,
            updated_by_diagnostic: true,
            updated_at: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId);

      if (error) throw error;

      toast({
        title: "Metadata Fixed",
        description: `Updated metadata for: ${title}`,
      });

      fetchAILogicDocuments();
    } catch (error) {
      console.error('Error fixing metadata:', error);
      toast({
        title: "Error",
        description: "Failed to fix document metadata",
        variant: "destructive",
      });
    }
  };

  const reprocessDocument = async (doc: AILogicDocument) => {
    setCurrentDoc(doc.id);
    try {
      // First, fix metadata
      await fixDocumentMetadata(doc.id, doc.title);

      // Reset document status
      const { error: resetError } = await supabase
        .from('ai_documents')
        .update({
          processing_status: 'pending',
          processed_at: null,
          total_chunks: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', doc.id);

      if (resetError) throw resetError;

      // Trigger reprocessing with emergency mode
      const { data, error } = await supabase.functions.invoke('process-ai-document', {
        body: { 
          documentId: doc.id,
          forceReprocess: true,
          emergencyChunking: true,
          governanceDocument: true
        }
      });

      if (error) throw error;

      const result: ProcessingResult = {
        documentId: doc.id,
        title: doc.title,
        success: true,
        chunksCreated: data?.chunks || 0
      };

      setResults(prev => [...prev, result]);

      toast({
        title: "Reprocessing Started",
        description: `Document: ${doc.title}`,
      });

    } catch (error) {
      console.error(`Error reprocessing ${doc.title}:`, error);
      
      const result: ProcessingResult = {
        documentId: doc.id,
        title: doc.title,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      setResults(prev => [...prev, result]);

      toast({
        title: "Reprocessing Failed",
        description: `Failed to reprocess: ${doc.title}`,
        variant: "destructive",
      });
    } finally {
      setCurrentDoc(null);
    }
  };

  const reprocessAllPending = async () => {
    const pendingDocs = documents.filter(d => d.processing_status === 'pending' || d.total_chunks === 0);
    
    if (pendingDocs.length === 0) {
      toast({
        title: "No Documents",
        description: "No pending AI Logic documents found",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setResults([]);

    for (const doc of pendingDocs) {
      await reprocessDocument(doc);
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    setIsProcessing(false);
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;

    toast({
      title: "Batch Processing Complete",
      description: `✅ ${successCount} successful, ❌ ${failCount} failed`,
      variant: successCount === results.length ? "default" : "destructive",
    });

    fetchAILogicDocuments();
  };

  const runIntegrationTest = async () => {
    if (!currentOrganization?.id) {
      toast({
        title: "Error",
        description: "No organization selected",
        variant: "destructive",
      });
      return;
    }

    try {
      // Check if any AI Logic documents have 0 chunks - this should fail the test
      const documentsWithZeroChunks = documents.filter(doc => doc.total_chunks === 0);
      const pendingDocuments = documents.filter(doc => doc.processing_status === 'pending');
      
      if (documentsWithZeroChunks.length > 0) {
        toast({
          title: "Integration Test Complete",
          description: `Status: CRITICAL - ${documentsWithZeroChunks.length} documents with 0 chunks detected`,
          variant: "destructive",
        });
        return;
      }

      if (pendingDocuments.length > 0) {
        toast({
          title: "Integration Test Complete", 
          description: `Status: NEEDS_ATTENTION - ${pendingDocuments.length} documents still pending`,
          variant: "destructive",
        });
        return;
      }

      // Run the full integration test if basic checks pass
      const { data, error } = await supabase.functions.invoke('test-ai-reasoning-integration', {
        body: {
          organizationId: currentOrganization.id,
          testQuery: "AI logic policy governance reasoning architecture"
        }
      });

      if (error) throw error;

      toast({
        title: "Integration Test Complete",
        description: `Chunk Generation & Metadata Verification: ${data.status}`,
        variant: data.status === 'HEALTHY' ? 'default' : 'destructive',
      });

    } catch (error) {
      console.error('Error running integration test:', error);
      toast({
        title: "Test Failed",
        description: "Failed to run chunk generation test",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchAILogicDocuments();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'pending': return 'text-yellow-600';
      case 'failed': return 'text-red-600';
      case 'processing': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string, hasChunks: boolean) => {
    if (status === 'completed' && hasChunks) return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (status === 'completed' && !hasChunks) return <XCircle className="w-4 h-4 text-red-600" />;
    if (status === 'pending') return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    if (status === 'failed') return <XCircle className="w-4 h-4 text-red-600" />;
    return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />;
  };

  const isMetadataCorrect = (doc: AILogicDocument) => {
    return doc.tags?.includes('AI Core Logic') || 
           doc.tags?.includes('Global Platform Logic') ||
           doc.tags?.includes('Governance');
  };

  return (
    <div className="space-y-6">
      {/* Diagnostic Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            AI Logic Ingestion Summary
          </CardTitle>
          <CardDescription>
            Comprehensive overview of AI Logic Document processing status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 border rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{summary.totalDocuments}</div>
                <div className="text-sm text-muted-foreground">Total Documents</div>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">{summary.documentsWithChunks}</div>
                <div className="text-sm text-muted-foreground">With Chunks</div>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{summary.pendingDocuments}</div>
                <div className="text-sm text-muted-foreground">Pending</div>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{summary.metadataCorrectness.toFixed(0)}%</div>
                <div className="text-sm text-muted-foreground">Metadata OK</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            AI Logic Processing Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={fetchAILogicDocuments}
              disabled={isLoading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Status
            </Button>
            
            <Button
              onClick={reprocessAllPending}
              disabled={isProcessing || documents.filter(d => d.processing_status === 'pending' || d.total_chunks === 0).length === 0}
              className="flex items-center gap-2"
            >
              <Zap className={`w-4 h-4 ${isProcessing ? 'animate-pulse' : ''}`} />
              {isProcessing ? 'Processing...' : 'Fix All Pending'}
            </Button>

            <Button
              onClick={runIntegrationTest}
              variant="outline"
              className="flex items-center gap-2"
              title="Chunk Generation & Metadata Verification - Checks if documents are properly chunked and tagged"
            >
              <Search className="w-4 h-4" />
              Test Chunk Generation
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Document Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            AI Logic Documents ({documents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(doc.processing_status, doc.total_chunks > 0)}
                    <div className="font-medium">{doc.title}</div>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {doc.file_name} • {doc.total_chunks} chunks
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Badge variant={isMetadataCorrect(doc) ? "default" : "destructive"}>
                      {isMetadataCorrect(doc) ? "✅ Metadata OK" : "❌ Metadata Issue"}
                    </Badge>
                    <Badge variant="outline" className={getStatusColor(doc.processing_status)}>
                      {doc.processing_status}
                    </Badge>
                    {doc.total_chunks === 0 && doc.processing_status === 'completed' && (
                      <Badge variant="destructive">🚨 0 chunks</Badge>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {!isMetadataCorrect(doc) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fixDocumentMetadata(doc.id, doc.title)}
                      className="flex items-center gap-1"
                    >
                      <Tag className="w-3 h-3" />
                      Fix Tags
                    </Button>
                  )}
                  
                  {(doc.processing_status === 'pending' || doc.total_chunks === 0) && (
                    <Button
                      size="sm"
                      onClick={() => reprocessDocument(doc)}
                      disabled={currentDoc === doc.id}
                      className="flex items-center gap-1"
                    >
                      {currentDoc === doc.id ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <Play className="w-3 h-3" />
                      )}
                      {currentDoc === doc.id ? 'Processing...' : 'Reprocess'}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Processing Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Processing Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {results.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{result.title}</div>
                    {result.error && (
                      <div className="text-xs text-red-600">{result.error}</div>
                    )}
                    {result.chunksCreated !== undefined && (
                      <div className="text-xs text-muted-foreground">
                        Created {result.chunksCreated} chunks
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                    <Badge variant={result.success ? "default" : "destructive"}>
                      {result.success ? "Success" : "Failed"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}