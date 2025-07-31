import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Upload, FileText, AlertTriangle, CheckCircle, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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

export const DocumentChunkTester: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ChunkResult | null>(null);
  const [validation, setValidation] = useState<FileValidation | null>(null);
  const [showChunkPreviews, setShowChunkPreviews] = useState(false);
  const { toast } = useToast();

  // Preflight validation
  const validateFile = useCallback((file: File): FileValidation => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // File size validation
    if (file.size < 1024) { // 1KB minimum
      errors.push(`File too small: ${file.size} bytes (minimum 1KB)`);
    }
    
    if (file.size > 50 * 1024 * 1024) { // 50MB maximum
      warnings.push(`Large file: ${(file.size / (1024 * 1024)).toFixed(1)}MB`);
    }

    // MIME type validation
    const supportedTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
      'application/pdf'
    ];
    
    const supportedExtensions = ['.docx', '.txt', '.md', '.pdf'];
    const hasValidExtension = supportedExtensions.some(ext => 
      file.name.toLowerCase().endsWith(ext)
    );
    
    if (!supportedTypes.includes(file.type) && !hasValidExtension) {
      errors.push(`Unsupported file type: ${file.type || 'unknown'} (${file.name})`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      fileSize: file.size,
      mimeType: file.type || 'unknown'
    };
  }, []);

  // Text chunking function (copied from edge function)
  const splitTextIntoChunks = useCallback((text: string, chunkSize: number = 2000, overlap: number = 200): string[] => {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      const chunk = text.slice(start, end);
      chunks.push(chunk);
      
      if (end === text.length) break;
      start = end - overlap;
    }

    return chunks;
  }, []);

  // Extract text from file
  const extractText = useCallback(async (file: File): Promise<{ text: string; method: string; warnings: string[] }> => {
    const warnings: string[] = [];
    let text = '';
    let method = 'unknown';

    try {
      if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
          file.name.endsWith('.docx')) {
        method = 'mammoth_docx';
        const arrayBuffer = await file.arrayBuffer();
        
        // Check DOCX signature
        const uint8Array = new Uint8Array(arrayBuffer);
        const signature = Array.from(uint8Array.slice(0, 4))
          .map(byte => byte.toString(16).padStart(2, '0'))
          .join('');
        
        if (!signature.startsWith('504b')) {
          warnings.push('File does not have valid DOCX signature');
          method = 'text_fallback';
          text = new TextDecoder().decode(arrayBuffer);
        } else {
          const result = await mammoth.extractRawText({ arrayBuffer });
          text = result.value;
          
          if (result.messages && result.messages.length > 0) {
            warnings.push(`Mammoth messages: ${result.messages.length} warnings/info`);
          }
        }
        
      } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        method = 'plain_text';
        text = await file.text();
        
      } else if (file.type === 'text/markdown' || file.name.endsWith('.md')) {
        method = 'markdown';
        text = await file.text();
        
      } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        method = 'pdf_emergency';
        warnings.push('PDF text extraction is limited (emergency mode)');
        const arrayBuffer = await file.arrayBuffer();
        const rawText = new TextDecoder().decode(arrayBuffer);
        text = rawText.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
        
      } else {
        method = 'unsupported_text_attempt';
        warnings.push('Unsupported file type - attempting text extraction');
        text = await file.text();
      }
      
    } catch (error: any) {
      warnings.push(`Extraction failed: ${error.message}`);
      method = 'extraction_failed';
      text = '';
    }

    return { text, method, warnings };
  }, []);

  // Process file
  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Extract text
      const { text, method, warnings: extractWarnings } = await extractText(file);
      warnings.push(...extractWarnings);

      // Validate extracted text
      if (!text || text.trim().length === 0) {
        errors.push('No text content extracted from file');
      }

      if (text.length < 200) {
        warnings.push(`Text content is short: ${text.length} characters (recommended minimum: 200)`);
      }

      // Generate chunks
      const chunks = splitTextIntoChunks(text);
      
      if (chunks.length === 0) {
        errors.push('No chunks generated from text');
      }

      // Validate chunks
      const emptyChunks = chunks.filter(chunk => chunk.trim().length === 0);
      if (emptyChunks.length > 0) {
        warnings.push(`${emptyChunks.length} empty chunks detected`);
      }

      const shortChunks = chunks.filter(chunk => chunk.length < 100);
      if (shortChunks.length > 0) {
        warnings.push(`${shortChunks.length} short chunks (< 100 chars) detected`);
      }

      setResult({
        success: errors.length === 0,
        textLength: text.length,
        chunks: chunks,
        extractionMethod: method,
        warnings,
        errors
      });

    } catch (error: any) {
      errors.push(`Processing failed: ${error.message}`);
      setResult({
        success: false,
        textLength: 0,
        chunks: [],
        extractionMethod: 'failed',
        warnings,
        errors
      });
    } finally {
      setIsProcessing(false);
    }
  }, [extractText, splitTextIntoChunks]);

  // Handle file selection
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      const fileValidation = validateFile(selectedFile);
      setValidation(fileValidation);
    }
  }, [validateFile]);

  // Handle file drop
  const handleFileDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setResult(null);
      const fileValidation = validateFile(droppedFile);
      setValidation(fileValidation);
    }
  }, [validateFile]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Document Chunk Tester
        </CardTitle>
        <CardDescription>
          Test document processing locally before triggering AI pipeline. 
          Validates file extraction, chunking, and content quality without consuming credits.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* File Upload */}
        <div 
          className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors"
          onDrop={handleFileDrop}
          onDragOver={handleDragOver}
        >
          <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
          <Label htmlFor="file-upload" className="cursor-pointer">
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {file ? file.name : 'Drop file here or click to browse'}
              </p>
              <p className="text-xs text-muted-foreground">
                Supports: .docx, .txt, .md, .pdf
              </p>
            </div>
          </Label>
          <Input
            id="file-upload"
            type="file"
            accept=".docx,.txt,.md,.pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* File Validation */}
        {validation && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {validation.isValid ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm font-medium">
                Preflight Validation {validation.isValid ? 'Passed' : 'Failed'}
              </span>
            </div>
            
            <div className="text-xs text-muted-foreground space-y-1">
              <p>File size: {(validation.fileSize / 1024).toFixed(1)} KB</p>
              <p>MIME type: {validation.mimeType}</p>
            </div>

            {validation.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    {validation.errors.map((error, index) => (
                      <p key={index}>• {error}</p>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {validation.warnings.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    {validation.warnings.map((warning, index) => (
                      <p key={index}>• {warning}</p>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Process Button */}
        {file && validation?.isValid && (
          <Button 
            onClick={() => processFile(file)} 
            disabled={isProcessing}
            className="w-full"
          >
            {isProcessing ? 'Processing...' : 'Test Document Processing'}
          </Button>
        )}

        {/* Approve for Upload Button */}
        {result && result.success && result.chunks.length > 0 && (
          <div className="pt-4 border-t">
            <Button 
              onClick={() => {
                // Add to approved files queue
                if ((window as any).addApprovedFile && file) {
                  (window as any).addApprovedFile(file, result.chunks.length, result.extractionMethod);
                  setFile(null);
                  setResult(null);
                  setValidation(null);
                } else {
                  toast({
                    title: "Feature Unavailable",
                    description: "Approved files queue is not available. Please refresh the page.",
                    variant: "destructive",
                  });
                }
              }}
              className="w-full gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Approve for Upload to Maturion
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              This will add the file to the approved queue for secure upload
            </p>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            <Separator />
            
            <div className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              )}
              <h3 className="text-lg font-semibold">
                Processing {result.success ? 'Successful' : 'Failed'}
              </h3>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{result.textLength}</div>
                <div className="text-xs text-muted-foreground">Characters</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{result.chunks.length}</div>
                <div className="text-xs text-muted-foreground">Chunks</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-xs font-mono">{result.extractionMethod}</div>
                <div className="text-xs text-muted-foreground">Method</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">
                  {result.textLength > 0 ? Math.round(result.chunks.length * 2000 / result.textLength * 100) : 0}%
                </div>
                <div className="text-xs text-muted-foreground">Coverage</div>
              </div>
            </div>

            {/* Errors */}
            {result.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">Errors:</p>
                    {result.errors.map((error, index) => (
                      <p key={index}>• {error}</p>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Warnings */}
            {result.warnings.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">Warnings:</p>
                    {result.warnings.map((warning, index) => (
                      <p key={index}>• {warning}</p>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Chunk Previews */}
            {result.chunks.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-md font-medium">Chunks Generated</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowChunkPreviews(!showChunkPreviews)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {showChunkPreviews ? 'Hide' : 'Show'} Previews
                  </Button>
                </div>

                {showChunkPreviews && (
                  <ScrollArea className="h-96 border rounded-lg p-4">
                    <div className="space-y-4">
                      {result.chunks.slice(0, 5).map((chunk, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              Chunk {index + 1}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {chunk.length} characters
                            </span>
                          </div>
                          <div className="text-sm font-mono bg-muted p-3 rounded text-wrap break-words">
                            {chunk.substring(0, 300)}
                            {chunk.length > 300 && '...'}
                          </div>
                        </div>
                      ))}
                      {result.chunks.length > 5 && (
                        <p className="text-sm text-muted-foreground text-center">
                          ... and {result.chunks.length - 5} more chunks
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};