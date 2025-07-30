import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  RefreshCw,
  HelpCircle,
  Timer
} from 'lucide-react';
import { MaturionDocument } from '@/hooks/useMaturionDocuments';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

interface DocumentProcessingVerificationBlockProps {
  document: MaturionDocument;
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
  const { currentOrganization } = useOrganization();

  // Check if user has superuser permissions
  const isSuperuser = currentOrganization?.user_role === 'admin' || currentOrganization?.user_role === 'owner';

  const getStatusConfig = () => {
    const baseConfig = {
      pending: {
        icon: <Clock className="h-4 w-4 text-yellow-500" />,
        variant: 'outline' as const,
        color: 'text-yellow-700',
        bgColor: 'bg-yellow-50 border-yellow-200',
        title: 'Pending Processing',
        description: 'Document uploaded but not yet processed for AI search',
        tooltip: '🟡 Pending = Waiting in queue for processing'
      },
      processing: {
        icon: <Clock className="h-4 w-4 text-blue-500 animate-spin" />,
        variant: 'secondary' as const,
        color: 'text-blue-700',
        bgColor: 'bg-blue-50 border-blue-200',
        title: 'Processing in Progress',
        description: 'Document is being chunked and vectorized for AI search',
        tooltip: '🔵 Processing = Being chunked and indexed'
      },
      completed: {
        icon: <CheckCircle className="h-4 w-4 text-green-500" />,
        variant: 'default' as const,
        color: 'text-green-700',
        bgColor: 'bg-green-50 border-green-200',
        title: 'Processing Complete',
        description: 'Document successfully processed and available for AI queries',
        tooltip: '✅ Processed = Ready for AI queries and MPS generation'
      },
      failed: {
        icon: <XCircle className="h-4 w-4 text-red-500" />,
        variant: 'destructive' as const,
        color: 'text-red-700',
        bgColor: 'bg-red-50 border-red-200',
        title: 'Processing Failed',
        description: 'Document processing encountered an error - manual intervention required',
        tooltip: '🔴 Failed = Processing error, needs retry or support'
      },
      reprocessing: {
        icon: <RefreshCw className="h-4 w-4 text-orange-500 animate-spin" />,
        variant: 'secondary' as const,
        color: 'text-orange-700',
        bgColor: 'bg-orange-50 border-orange-200',
        title: 'Queued for Reprocessing',
        description: 'Document has been queued for reprocessing',
        tooltip: '🟠 Queued = Reprocessing request registered'
      }
    };

    // Check if we're in a reprocessing state
    if (isReprocessing) {
      return baseConfig.reprocessing;
    }

    return baseConfig[document.processing_status] || baseConfig.pending;
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

      // Keep the reprocessing state for a few seconds to show feedback
      setTimeout(() => {
        setIsReprocessing(false);
      }, 3000);
    } catch (error) {
      console.error('Reprocessing error:', error);
      toast({
        title: "Reprocessing Failed",
        description: "Failed to start document reprocessing. Please try again.",
        variant: "destructive"
      });
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
        .limit(10); // Show up to 10 chunks

      if (error) throw error;
      setChunkDetails(data || []);
      setShowChunkDetails(true);
    } catch (error) {
      console.error('Error loading chunk details:', error);
    }
  };

  // Check if this document has poor extraction quality or emergency chunks
  const hasEmergencyChunks = chunkDetails.some(chunk => 
    chunk.metadata?.extraction_method === 'fallback_pdf_emergency' ||
    chunk.metadata?.extraction_quality === 'poor' ||
    chunk.metadata?.forced_override === true
  );

  const isEmergencyDocument = document.processing_status === 'completed' && 
    (document.total_chunks === 0 || hasEmergencyChunks);

  const formatDate = (dateString: string | null, includeTime: boolean = true) => {
    if (!dateString) return 'Not available';
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...(includeTime && {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
    return date.toLocaleDateString('en-US', options);
  };

  const getProgressValue = () => {
    if (isReprocessing) return 75;
    switch (document.processing_status) {
      case 'completed': return 100;
      case 'processing': return 60;
      case 'failed': return 25;
      case 'pending': return 10;
      default: return 0;
    }
  };

  return (
    <TooltipProvider>
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
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1">
                        <Badge variant={statusConfig.variant} className="text-xs">
                          {isReprocessing ? 'QUEUED' : document.processing_status.toUpperCase()}
                        </Badge>
                        <HelpCircle className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-sm">{statusConfig.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
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
                  {isSuperuser && (
                    <p>
                      <span className="font-medium">Chunks: </span>
                      {document.total_chunks || 0}
                      {document.processing_status === 'completed' && document.total_chunks > 0 && 
                        <span className="text-green-600 ml-1">indexed</span>
                      }
                    </p>
                  )}
                  <p>File Size: <span className="font-medium">{Math.round((document.file_size || 0) / 1024)} KB</span></p>
                  <p>Format: <span className="font-medium">{document.mime_type}</span></p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Timer className="h-4 w-4" />
                  Processing Timeline
                </h4>
                <div className="text-xs space-y-1 text-muted-foreground">
                  <p>Uploaded: <span className="font-medium">{formatDate(document.created_at)}</span></p>
                  <p>Last Updated: <span className="font-medium">{formatDate(document.updated_at)}</span></p>
                  {document.processing_status === 'completed' && document.processed_at && (
                    <p className="text-green-600">
                      <span className="font-medium">Processed: </span>
                      {formatDate(document.processed_at)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* AI Searchability Status */}
            <div className="p-3 bg-white/50 rounded-md">
              <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4" />
                AI Search Readiness
              </h4>
              {document.processing_status === 'completed' && document.total_chunks > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">✅ Ready for AI queries and MPS generation</span>
                  </div>
                  
                  {/* Emergency Warning Badge */}
                  {isEmergencyDocument && (
                    <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <span className="text-xs text-yellow-700">
                        ⚠️ Chunked with emergency override due to poor extractable content
                      </span>
                    </div>
                  )}
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
              {(document.processing_status === 'failed' || 
                document.processing_status === 'pending' || 
                (document.processing_status === 'completed' && document.total_chunks === 0)) && (
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
                      {document.processing_status === 'completed' && document.total_chunks === 0 
                        ? 'Fix Missing Chunks' 
                        : 'Reprocess Document'}
                    </>
                  )}
                </Button>
              )}

              {document.processing_status === 'completed' && document.total_chunks > 0 && (
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
                <h4 className="text-sm font-medium mb-2">
                  Content Chunks {isEmergencyDocument ? '(Emergency Fallback)' : `(${chunkDetails.length} shown)`}
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {chunkDetails.map((chunk, index) => (
                    <div key={index} className="text-xs p-2 bg-white rounded border">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">Chunk {chunk.chunk_index + 1}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">
                            {chunk.content.length} chars
                          </span>
                          {chunk.metadata?.forced_override && (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                              Forced
                            </Badge>
                          )}
                          {chunk.metadata?.has_embedding === false && (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                              No Embedding
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-gray-600 text-xs leading-relaxed">
                        {chunk.content.substring(0, 300)}{chunk.content.length > 300 ? '...' : ''}
                      </p>
                      {chunk.metadata && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Method: {chunk.metadata.extraction_method} | Quality: {chunk.metadata.extraction_quality}
                          {chunk.metadata.reason && ` | Reason: ${chunk.metadata.reason}`}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
    </TooltipProvider>
  );
};