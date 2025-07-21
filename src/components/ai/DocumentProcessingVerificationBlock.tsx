import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  XCircle, 
  ChevronDown, 
  ChevronRight,
  Database,
  FileText,
  Zap,
  AlertTriangle,
  Info,
  RefreshCw
} from 'lucide-react';
import { AIDocument } from '@/hooks/useAIDocuments';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DocumentProcessingVerificationBlockProps {
  document: AIDocument;
  onReprocess?: (documentId: string) => void;
}

export const DocumentProcessingVerificationBlock: React.FC<DocumentProcessingVerificationBlockProps> = ({ 
  document, 
  onReprocess 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [chunkDetails, setChunkDetails] = useState<any[]>([]);
  const [showChunkDetails, setShowChunkDetails] = useState(false);
  const { toast } = useToast();

  const getStatusConfig = () => {
    switch (document.processing_status) {
      case 'completed':
        return {
          icon: <CheckCircle className="h-4 w-4 text-green-500" />,
          variant: 'default' as const,
          color: 'text-green-700',
          bgColor: 'bg-green-50 border-green-200',
          title: 'Processing Complete',
          description: 'Document successfully processed and available for AI queries'
        };
      case 'processing':
        return {
          icon: <Clock className="h-4 w-4 text-blue-500 animate-spin" />,
          variant: 'secondary' as const,
          color: 'text-blue-700',
          bgColor: 'bg-blue-50 border-blue-200',
          title: 'Processing in Progress',
          description: 'Document is being chunked and vectorized for AI search'
        };
      case 'failed':
        return {
          icon: <XCircle className="h-4 w-4 text-red-500" />,
          variant: 'destructive' as const,
          color: 'text-red-700',
          bgColor: 'bg-red-50 border-red-200',
          title: 'Processing Failed',
          description: 'Document processing encountered an error - manual intervention required'
        };
      case 'pending':
        return {
          icon: <Clock className="h-4 w-4 text-yellow-500" />,
          variant: 'outline' as const,
          color: 'text-yellow-700',
          bgColor: 'bg-yellow-50 border-yellow-200',
          title: 'Pending Processing',
          description: 'Document uploaded but not yet processed for AI search'
        };
      default:
        return {
          icon: <AlertCircle className="h-4 w-4 text-gray-500" />,
          variant: 'outline' as const,
          color: 'text-gray-700',
          bgColor: 'bg-gray-50 border-gray-200',
          title: 'Unknown Status',
          description: 'Processing status unclear'
        };
    }
  };

  const statusConfig = getStatusConfig();

  const handleReprocess = async () => {
    setIsReprocessing(true);
    try {
      // Call the process-ai-document function
      const { data, error } = await supabase.functions.invoke('process-ai-document', {
        body: { documentId: document.id }
      });

      if (error) throw error;

      toast({
        title: "Reprocessing Started",
        description: `Document "${document.title || document.file_name}" has been queued for reprocessing.`,
      });

      if (onReprocess) {
        onReprocess(document.id);
      }
    } catch (error) {
      console.error('Reprocessing error:', error);
      toast({
        title: "Reprocessing Failed",
        description: "Failed to start document reprocessing. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsReprocessing(false);
    }
  };

  const loadChunkDetails = async () => {
    if (showChunkDetails || document.processing_status !== 'completed') return;
    
    try {
      const { data, error } = await supabase
        .from('ai_document_chunks')
        .select('chunk_index, content, metadata')
        .eq('document_id', document.id)
        .order('chunk_index')
        .limit(5); // Show first 5 chunks as sample

      if (error) throw error;
      setChunkDetails(data || []);
      setShowChunkDetails(true);
    } catch (error) {
      console.error('Error loading chunk details:', error);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not available';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getProgressValue = () => {
    switch (document.processing_status) {
      case 'completed': return 100;
      case 'processing': return 60;
      case 'failed': return 25;
      case 'pending': return 10;
      default: return 0;
    }
  };

  return (
    <Card className={`transition-all duration-200 ${statusConfig.bgColor}`}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-white/50 transition-colors pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {statusConfig.icon}
                <div>
                  <CardTitle className="text-sm font-medium">
                    Document Processing Verification
                  </CardTitle>
                  <p className={`text-xs ${statusConfig.color} font-medium`}>
                    {statusConfig.title}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={statusConfig.variant} className="text-xs">
                  {document.processing_status.toUpperCase()}
                </Badge>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
            <Progress value={getProgressValue()} className="h-2 mt-2" />
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Status Description */}
            <div className="flex items-start gap-2 p-3 bg-white/50 rounded-md">
              <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-gray-900">{statusConfig.description}</p>
                {document.processing_status === 'failed' && (
                  <p className="text-red-600 mt-1">
                    Common causes: Memory limits, unsupported format, or corrupted file. 
                    Try reprocessing or contact support.
                  </p>
                )}
              </div>
            </div>

            {/* Processing Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Content Analysis
                </h4>
                <div className="text-xs space-y-1 text-muted-foreground">
                  <p>Total Chunks: <span className="font-medium">{document.total_chunks || 0}</span></p>
                  <p>File Size: <span className="font-medium">{Math.round((document.file_size || 0) / 1024)} KB</span></p>
                  <p>Format: <span className="font-medium">{document.mime_type}</span></p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Processing Timeline
                </h4>
                <div className="text-xs space-y-1 text-muted-foreground">
                  <p>Uploaded: <span className="font-medium">{formatDate(document.created_at)}</span></p>
                  <p>Last Updated: <span className="font-medium">{formatDate(document.updated_at)}</span></p>
                  <p>Processed: <span className="font-medium">{formatDate(document.processed_at)}</span></p>
                </div>
              </div>
            </div>

            {/* AI Searchability Status */}
            <div className="p-3 bg-white/50 rounded-md">
              <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4" />
                AI Search Readiness
              </h4>
              {document.processing_status === 'completed' ? (
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">✅ Ready for AI queries and MPS generation</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-orange-700">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">⚠️ Not yet available for AI queries</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              {(document.processing_status === 'failed' || document.processing_status === 'pending') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReprocess}
                  disabled={isReprocessing}
                  className="text-xs"
                >
                  {isReprocessing ? (
                    <>
                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                      Reprocessing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Reprocess Document
                    </>
                  )}
                </Button>
              )}

              {document.processing_status === 'completed' && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={loadChunkDetails}
                  className="text-xs"
                >
                  <Database className="h-3 w-3 mr-1" />
                  View Content Chunks
                </Button>
              )}
            </div>

            {/* Chunk Preview (if loaded) */}
            {showChunkDetails && chunkDetails.length > 0 && (
              <div className="mt-4 p-3 bg-gray-50 rounded-md">
                <h4 className="text-sm font-medium mb-2">Content Chunks Sample (First 5)</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {chunkDetails.map((chunk, index) => (
                    <div key={index} className="text-xs p-2 bg-white rounded border">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">Chunk {chunk.chunk_index + 1}</span>
                        <span className="text-muted-foreground">
                          {chunk.content.length} chars
                        </span>
                      </div>
                      <p className="text-gray-600 truncate">
                        {chunk.content.substring(0, 150)}...
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};