import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Upload, FileText, AlertTriangle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import mammoth from 'mammoth';

interface ChunkResult {
  success: boolean;
  textLength: number;
  chunks: string[];
  extractionMethod: string;
  warnings: string[];
  errors: string[];
}

interface FileValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fileSize: number;
  mimeType: string;
}

interface DocumentMetadata {
  title: string;
  type: string;
  tags: string[];
  domain: string;
  visibility: 'private' | 'organization' | 'public';
  description: string;
}

const DocumentUploadProcessor: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ChunkResult | null>(null);
  const [validation, setValidation] = useState<FileValidation | null>(null);
  const [metadata, setMetadata] = useState<DocumentMetadata>({
    title: '',
    type: 'guidance',
    tags: [],
    domain: 'all',
    visibility: 'organization',
    description: ''
  });
  const [showChunks, setShowChunks] = useState(false);
  const [newTag, setNewTag] = useState('');
  
  const { toast } = useToast();
  const { user } = useAuth();

  const validateFile = useCallback((file: File): FileValidation => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // File size check (50MB limit)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      errors.push(`File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds 50MB limit`);
    }
    
    // File type check
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
      'application/pdf'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      errors.push(`Unsupported file type: ${file.type}`);
    }
    
    // File name check
    if (file.name.length > 255) {
      warnings.push('File name is very long and may be truncated');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      fileSize: file.size,
      mimeType: file.type
    };
  }, []);

  const splitTextIntoChunks = useCallback((text: string, chunkSize: number = 1000, overlap: number = 200): string[] => {
    if (!text || text.trim().length === 0) return [];
    
    const chunks: string[] = [];
    let start = 0;
    
    while (start < text.length) {
      let end = start + chunkSize;
      
      if (end < text.length) {
        // Try to find a good breaking point (sentence end, paragraph, or whitespace)
        const breakPoints = [
          text.lastIndexOf('.', end),
          text.lastIndexOf('\n\n', end),
          text.lastIndexOf('\n', end),
          text.lastIndexOf(' ', end)
        ];
        
        const goodBreak = breakPoints.find(bp => bp > start + chunkSize * 0.7);
        if (goodBreak && goodBreak > start) {
          end = goodBreak + 1;
        }
      }
      
      const chunk = text.slice(start, end).trim();
      if (chunk.length > 0) {
        chunks.push(chunk);
      }
      
      start = Math.max(start + 1, end - overlap);
    }
    
    return chunks;
  }, []);

  const extractText = useCallback(async (file: File): Promise<{ text: string; method: string; warnings: string[] }> => {
    const warnings: string[] = [];
    
    try {
      if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          
          if (result.messages.length > 0) {
            warnings.push(`DOCX processing notes: ${result.messages.length} conversion issues detected`);
          }
          
          return {
            text: result.value || '',
            method: 'mammoth (DOCX)',
            warnings
          };
        } catch (docxError) {
          warnings.push('DOCX extraction failed, treating as plain text');
          const text = await file.text();
          return { text, method: 'fallback (plain text)', warnings };
        }
      } else if (file.type === 'text/plain' || file.type === 'text/markdown') {
        const text = await file.text();
        return {
          text,
          method: file.type === 'text/markdown' ? 'markdown' : 'plain text',
          warnings
        };
      } else if (file.type === 'application/pdf') {
        warnings.push('PDF processing not implemented - treating as binary');
        return {
          text: `[PDF FILE: ${file.name} - ${(file.size / 1024).toFixed(1)}KB]`,
          method: 'binary placeholder',
          warnings
        };
      } else {
        warnings.push('Unknown file type - attempting text extraction');
        const text = await file.text();
        return { text, method: 'generic text', warnings };
      }
    } catch (error) {
      throw new Error(`Text extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, []);

  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    setResults(null);
    
    try {
      const { text, method, warnings } = await extractText(file);
      
      if (!text || text.trim().length === 0) {
        setResults({
          success: false,
          textLength: 0,
          chunks: [],
          extractionMethod: method,
          warnings,
          errors: ['No text content extracted from file']
        });
        return;
      }
      
      const chunks = splitTextIntoChunks(text);
      
      if (chunks.length === 0) {
        setResults({
          success: false,
          textLength: text.length,
          chunks: [],
          extractionMethod: method,
          warnings,
          errors: ['No valid chunks created from extracted text']
        });
        return;
      }
      
      setResults({
        success: true,
        textLength: text.length,
        chunks,
        extractionMethod: method,
        warnings,
        errors: []
      });
      
    } catch (error) {
      setResults({
        success: false,
        textLength: 0,
        chunks: [],
        extractionMethod: 'failed',
        warnings: [],
        errors: [error instanceof Error ? error.message : 'Processing failed']
      });
    } finally {
      setIsProcessing(false);
    }
  }, [extractText, splitTextIntoChunks]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setValidation(validateFile(file));
      setMetadata(prev => ({ ...prev, title: file.name.replace(/\.[^/.]+$/, '') }));
      setResults(null);
    }
  }, [validateFile]);

  const handleFileDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
      setValidation(validateFile(file));
      setMetadata(prev => ({ ...prev, title: file.name.replace(/\.[^/.]+$/, '') }));
      setResults(null);
    }
  }, [validateFile]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const saveApprovedChunks = useCallback(async (chunks: string[]) => {
    if (!user || !selectedFile) return;

    try {
      // For now, just show success message and trigger queue event
      // The actual database integration will be handled separately
      toast({
        title: "Chunks approved successfully",
        description: `${chunks.length} chunks ready for smart reuse`,
      });

      // Add to approved queue
      const queueEvent = new CustomEvent('addToApprovedQueue', {
        detail: {
          filename: selectedFile.name,
          chunkCount: chunks.length,
          approvedAt: new Date().toISOString(),
          metadata: {
            title: metadata.title,
            type: metadata.type,
            tags: metadata.tags,
            domain: metadata.domain,
            visibility: metadata.visibility,
            description: metadata.description,
            extraction_method: results?.extractionMethod,
            chunk_count: chunks.length,
            text_length: results?.textLength
          }
        }
      });
      window.dispatchEvent(queueEvent);

    } catch (error) {
      console.error('Error processing approved chunks:', error);
      toast({
        title: "Error processing chunks",
        description: error instanceof Error ? error.message : "Failed to process approved chunks",
        variant: "destructive",
      });
    }
  }, [user, selectedFile, metadata, results, toast]);

  const addTag = useCallback(() => {
    if (newTag.trim() && !metadata.tags.includes(newTag.trim())) {
      setMetadata(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  }, [newTag, metadata.tags]);

  const removeTag = useCallback((tagToRemove: string) => {
    setMetadata(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  }, []);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Document Upload & Processing</CardTitle>
        <CardDescription>
          Upload documents for validation and processing before adding to the knowledge base
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Upload */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Step 1: Select Document</Label>
          <div
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
            onDrop={handleFileDrop}
            onDragOver={handleDragOver}
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <div className="text-lg font-medium mb-2">
              {selectedFile ? selectedFile.name : 'Drop your document here or click to browse'}
            </div>
            <div className="text-sm text-muted-foreground">
              Supports: DOCX, TXT, MD, PDF (up to 50MB)
            </div>
            <input
              id="file-upload"
              type="file"
              className="hidden"
              accept=".docx,.txt,.md,.pdf"
              onChange={handleFileSelect}
            />
          </div>
        </div>

        {/* Validation Results */}
        {validation && (
          <div className="space-y-2">
            {validation.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-1">Validation Errors:</div>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {validation.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            
            {validation.warnings.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-1">Warnings:</div>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {validation.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Metadata Form */}
        {selectedFile && validation?.isValid && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <Label className="text-sm font-medium">Document Information</Label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={metadata.title}
                  onChange={(e) => setMetadata(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Document title"
                />
              </div>
              
              <div>
                <Label htmlFor="type">Type</Label>
                <Select value={metadata.type} onValueChange={(value) => setMetadata(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="guidance">Guidance</SelectItem>
                    <SelectItem value="policy">Policy</SelectItem>
                    <SelectItem value="procedure">Procedure</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="framework">Framework</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={metadata.description}
                onChange={(e) => setMetadata(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the document"
                rows={3}
              />
            </div>

            <div>
              <Label>Tags</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add tag"
                  onKeyPress={(e) => e.key === 'Enter' && addTag()}
                />
                <Button type="button" onClick={addTag} size="sm">Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {metadata.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                    {tag} ×
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Process Button */}
        {selectedFile && validation?.isValid && (
          <Button
            onClick={() => processFile(selectedFile)}
            disabled={isProcessing}
            className="w-full"
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                Processing Document...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Step 1: Validate Document
              </span>
            )}
          </Button>
        )}

        {/* Processing Results */}
        {results && (
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center gap-2">
              {results.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              )}
              <span className="font-medium">
                {results.success ? 'Processing Successful' : 'Processing Failed'}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="font-medium">Text Length</div>
                <div className="text-muted-foreground">{results.textLength.toLocaleString()} chars</div>
              </div>
              <div>
                <div className="font-medium">Chunks Created</div>
                <div className="text-muted-foreground">{results.chunks.length}</div>
              </div>
              <div>
                <div className="font-medium">Extraction Method</div>
                <div className="text-muted-foreground">{results.extractionMethod}</div>
              </div>
              <div>
                <div className="font-medium">Coverage</div>
                <div className="text-muted-foreground">
                  {results.textLength > 0 ? Math.round((results.chunks.join(' ').length / results.textLength) * 100) : 0}%
                </div>
              </div>
            </div>

            {results.warnings.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-1">Processing Warnings:</div>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {results.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {results.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-1">Processing Errors:</div>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {results.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {results.success && results.chunks.length > 0 && (
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowChunks(!showChunks)}
                  className="flex items-center gap-2"
                >
                  {showChunks ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {showChunks ? 'Hide' : 'Show'} Chunk Preview
                </Button>

                {showChunks && (
                  <div className="max-h-64 overflow-y-auto border rounded p-3 bg-muted/50">
                    {results.chunks.slice(0, 3).map((chunk, index) => (
                      <div key={index} className="mb-3 p-2 bg-background rounded text-sm">
                        <div className="font-mono text-xs text-muted-foreground mb-1">
                          Chunk {index + 1} ({chunk.length} chars)
                        </div>
                        <div className="line-clamp-3">{chunk}</div>
                      </div>
                    ))}
                    {results.chunks.length > 3 && (
                      <div className="text-center text-sm text-muted-foreground py-2">
                        ... and {results.chunks.length - 3} more chunks
                      </div>
                    )}
                  </div>
                )}

                <Button
                  onClick={() => saveApprovedChunks(results.chunks)}
                  className="w-full"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Step 2: Approve Upload
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export { DocumentUploadProcessor };
export default DocumentUploadProcessor;