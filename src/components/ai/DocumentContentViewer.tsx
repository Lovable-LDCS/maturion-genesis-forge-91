import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Eye, Copy, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MaturionDocument } from '@/hooks/useMaturionDocuments';

interface DocumentContentViewerProps {
  document: MaturionDocument | null;
  open: boolean;
  onClose: () => void;
}

interface DocumentChunk {
  chunk_index: number;
  content: string;
  metadata?: any;
}

export const DocumentContentViewer: React.FC<DocumentContentViewerProps> = ({
  document,
  open,
  onClose
}) => {
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (document && open) {
      fetchDocumentContent();
    }
  }, [document, open]);

  const fetchDocumentContent = async () => {
    if (!document) return;

    setLoading(true);
    try {
      // First, try to get properly extracted content from chunks
      const { data: chunkData, error: chunkError } = await supabase
        .from('ai_document_chunks')
        .select('chunk_index, content, metadata')
        .eq('document_id', document.id)
        .order('chunk_index');

      if (chunkError) {
        console.error('Error fetching chunks:', chunkError);
        toast({
          title: "Error loading content",
          description: "Could not retrieve document chunks",
          variant: "destructive",
        });
        return;
      }

      // Check if we have meaningful text content (not just binary data)
      const meaningfulChunks = chunkData?.filter(chunk => 
        chunk.content && 
        chunk.content.length > 100 && 
        !chunk.content.startsWith('%PDF') &&
        !/^[0-9\s%<>]+obj/.test(chunk.content.substring(0, 50))
      ) || [];

      if (meaningfulChunks.length > 0) {
        setChunks(meaningfulChunks);
      } else {
        // If no meaningful chunks, show message about document processing
        setChunks([{
          chunk_index: 0,
          content: `This document appears to contain binary data or was not properly processed for text extraction.

Document Details:
- File: ${document.file_name}
- Type: ${document.mime_type}
- Size: ${formatFileSize(document.file_size)}
- Status: ${document.processing_status}

The document can still be downloaded using the download button in the main interface.`,
          metadata: { type: 'system_message' }
        }]);
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to load document content",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const copyToClipboard = async () => {
    const fullContent = chunks.map(chunk => chunk.content).join('\n\n---\n\n');
    try {
      await navigator.clipboard.writeText(fullContent);
      setCopied(true);
      toast({
        title: "Copied to clipboard",
        description: "Document content has been copied",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Could not copy content to clipboard",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Document Content: {document?.title || document?.file_name}
          </DialogTitle>
          <DialogDescription>
            Extracted and processed content from the uploaded document
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={copyToClipboard}
            disabled={loading || chunks.length === 0}
            className="flex items-center gap-2"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Copy All'}
          </Button>
          <Badge variant="secondary">
            {chunks.length} {chunks.length === 1 ? 'section' : 'sections'}
          </Badge>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-center">
                <Progress value={undefined} className="w-64 mx-auto" />
                <p className="text-sm text-muted-foreground mt-2">Loading document content...</p>
              </div>
            </div>
          ) : chunks.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              <p>No content available to display</p>
            </div>
          ) : (
            <div className="space-y-4">
              {chunks.map((chunk, index) => (
                <Card key={index} className="border-l-4 border-l-primary/20">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">
                        Section {chunk.chunk_index + 1}
                      </CardTitle>
                      {chunk.metadata?.type === 'system_message' && (
                        <Badge variant="outline" className="text-xs">
                          System Message
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none">
                      <pre className="whitespace-pre-wrap text-sm font-mono bg-muted/50 p-4 rounded-lg overflow-auto">
                        {chunk.content}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
          >
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};