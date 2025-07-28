import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, CheckCircle, XCircle, AlertTriangle, Eye } from 'lucide-react';

interface DocumentPreviewPaneProps {
  file: File;
  onPreviewComplete: (isValid: boolean, preview: string) => void;
  onCancel: () => void;
}

interface PreviewResult {
  success: boolean;
  preview: string;
  sanitizedPreview?: string;
  wordCount: number;
  characterCount: number;
  hasStructure: {
    bullets: boolean;
    headings: boolean;
    paragraphs: boolean;
  };
  qualityMetrics: {
    binaryRatio: number;
    xmlArtifacts: boolean;
    alphabeticRatio: number;
    unicodeRatio: number;
    hasNonLatinText: boolean;
  };
  validationHash: string;
  error?: string;
}

export const DocumentPreviewPane: React.FC<DocumentPreviewPaneProps> = ({
  file,
  onPreviewComplete,
  onCancel
}) => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);

  // Sanitization function for mild corruption repair
  const sanitizeBeforeChunking = (text: string): string => {
    return text
      // Remove null bytes and control characters
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Fix common encoding issues
      .replace(/â€™/g, "'")
      .replace(/â€œ/g, '"')
      .replace(/â€/g, '"')
      .replace(/â€¢/g, '•')
      // Normalize whitespace but preserve structure
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  // Generate validation hash
  const generateValidationHash = (content: string): string => {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  };

  // Log upload attempt
  const logUploadAttempt = async (result: PreviewResult, action: string) => {
    try {
      const logEntry = {
        filename: file.name,
        fileSize: file.size,
        action,
        timestamp: new Date().toISOString(),
        validationHash: result.validationHash,
        wordCount: result.wordCount,
        characterCount: result.characterCount,
        qualityMetrics: result.qualityMetrics,
        previewSnippet: result.preview.substring(0, 200),
        hasError: !!result.error
      };
      
      console.log('📋 Document Upload Log:', logEntry);
      
      // Store in localStorage for debugging
      const logs = JSON.parse(localStorage.getItem('document_upload_log') || '[]');
      logs.push(logEntry);
      localStorage.setItem('document_upload_log', JSON.stringify(logs.slice(-50)));
    } catch (err) {
      console.warn('Failed to log upload attempt:', err);
    }
  };

  const extractPreview = async () => {
    setIsExtracting(true);

    try {
      console.log(`🔍 Extracting preview from ${file.name}`);

      // Extended file type support
      if (!file.name.endsWith('.docx') && !file.type.includes('wordprocessingml')) {
        if (file.name.endsWith('.pdf')) {
          throw new Error('PDF files require OCR processing - not yet implemented');
        }
        throw new Error('Only .docx files are supported for preview extraction');
      }

      // Extract text using mammoth.js (client-side)
      const mammoth = await import('mammoth');
      const arrayBuffer = await file.arrayBuffer();
      
      // Type-safe extraction
      const result = await (mammoth as any).extractRawText({
        arrayBuffer: arrayBuffer
      });

      let cleanText = result.value;

      // Apply enhanced cleaning logic
      cleanText = cleanText
        .replace(/<[^>]*>/g, ' ')
        .replace(/[A-Z]:\\[^\\s]*/g, ' ')
        .replace(/\/_rels\/[^\s]*/g, ' ')
        .replace(/\/customXml\/[^\s]*/g, ' ')
        .replace(/\/word\/[^\s]*/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // Apply sanitization
      const sanitizedText = sanitizeBeforeChunking(cleanText);

      // Unicode-aware quality analysis
      const wordCount = sanitizedText.split(/\s+/).filter(w => w.length > 0).length;
      const characterCount = sanitizedText.length;
      
      // Enhanced quality metrics with Unicode awareness
      const unicodeChars = (sanitizedText.match(/[\u0080-\uFFFF]/g) || []).length;
      const nonLatinChars = (sanitizedText.match(/[^\u0000-\u007F\u0080-\u00FF]/g) || []).length;
      
      const qualityMetrics = {
        binaryRatio: (sanitizedText.match(/[\x00-\x08\x0E-\x1F\x7F-\xFF]/g) || []).length / sanitizedText.length,
        xmlArtifacts: sanitizedText.includes('_rels/') || sanitizedText.includes('customXml/') || sanitizedText.includes('word/_rels'),
        alphabeticRatio: (sanitizedText.match(/[a-zA-Z]/g) || []).length / sanitizedText.length,
        unicodeRatio: unicodeChars / sanitizedText.length,
        hasNonLatinText: nonLatinChars > 0
      };

      const hasStructure = {
        bullets: /[•\-\*○◦▪▫‣⁃]\s+/.test(sanitizedText) || /^\s*[\-\*•○◦▪▫‣⁃]\s+/m.test(sanitizedText),
        headings: /^#+\s+/m.test(sanitizedText) || /^[A-Z][^.]*:$/m.test(sanitizedText),
        paragraphs: sanitizedText.split(/\n\s*\n/).length > 2
      };

      // Generate preview and hash
      const preview = sanitizedText.substring(0, 800);
      const validationHash = generateValidationHash(sanitizedText);

      // Enhanced validation checks
      const isValid = wordCount >= 50 && 
                     characterCount >= 100 && 
                     !qualityMetrics.xmlArtifacts && 
                     qualityMetrics.binaryRatio < 0.1 && 
                     (qualityMetrics.alphabeticRatio > 0.25 || qualityMetrics.hasNonLatinText);

      const previewResult: PreviewResult = {
        success: true,
        preview,
        sanitizedPreview: sanitizedText !== cleanText ? sanitizedText.substring(0, 800) : undefined,
        wordCount,
        characterCount,
        hasStructure,
        qualityMetrics,
        validationHash
      };

      if (!isValid) {
        previewResult.error = `Content quality issues detected: ${
          wordCount < 50 ? 'insufficient words, ' : ''
        }${qualityMetrics.xmlArtifacts ? 'XML artifacts present, ' : ''
        }${qualityMetrics.binaryRatio >= 0.1 ? 'high binary content, ' : ''
        }${qualityMetrics.alphabeticRatio <= 0.25 && !qualityMetrics.hasNonLatinText ? 'low readable content' : ''
        }`.replace(/, $/, '');
      }

      // Log the extraction attempt
      await logUploadAttempt(previewResult, 'preview_extracted');

      setPreviewResult(previewResult);

    } catch (error: any) {
      console.error('Preview extraction failed:', error);
      const failedResult: PreviewResult = {
        success: false,
        preview: '',
        wordCount: 0,
        characterCount: 0,
        hasStructure: { bullets: false, headings: false, paragraphs: false },
        qualityMetrics: { binaryRatio: 0, xmlArtifacts: false, alphabeticRatio: 0, unicodeRatio: 0, hasNonLatinText: false },
        validationHash: '0',
        error: error.message
      };
      
      await logUploadAttempt(failedResult, 'preview_failed');
      setPreviewResult(failedResult);
    } finally {
      setIsExtracting(false);
    }
  };

  React.useEffect(() => {
    extractPreview();
  }, [file]);

  const handleProceed = async (forceUAT = false) => {
    if (previewResult) {
      const action = forceUAT ? 'proceed_anyway_uat' : 'proceed_validated';
      await logUploadAttempt(previewResult, action);
      
      onPreviewComplete(
        previewResult.success && (!previewResult.error || forceUAT),
        previewResult.sanitizedPreview || previewResult.preview
      );
    }
  };

  const isValid = previewResult?.success && !previewResult?.error;

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Document Preview: {file.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isExtracting && (
          <Alert>
            <FileText className="h-4 w-4 animate-pulse" />
            <AlertDescription>
              Extracting and analyzing document content for quality validation...
            </AlertDescription>
          </Alert>
        )}

        {previewResult && (
          <>
            {/* Quality Status */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={isValid ? "default" : "destructive"}>
                {isValid ? (
                  <><CheckCircle className="h-3 w-3 mr-1" /> Ready for Upload</>
                ) : (
                  <><XCircle className="h-3 w-3 mr-1" /> Quality Issues Detected</>
                )}
              </Badge>

              <span className="text-sm text-muted-foreground">
                {previewResult.wordCount} words • {previewResult.characterCount} characters
              </span>
            </div>

            {/* Quality Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-lg font-bold">{previewResult.wordCount}</div>
                <div className="text-sm text-muted-foreground">Words</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-lg font-bold">
                  {(previewResult.qualityMetrics.alphabeticRatio * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Text Quality</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-lg font-bold text-green-600">
                  {previewResult.qualityMetrics.xmlArtifacts ? 'NO' : 'YES'}
                </div>
                <div className="text-sm text-muted-foreground">Clean Content</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-lg font-bold">
                  {Object.values(previewResult.hasStructure).filter(Boolean).length}/3
                </div>
                <div className="text-sm text-muted-foreground">Structure</div>
              </div>
            </div>

            {/* Error/Warning Messages */}
            {previewResult.error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Quality Issues:</strong> {previewResult.error}
                  <br />
                  <strong>Recommendation:</strong> Please upload a clean, well-formatted .docx file with substantial text content.
                </AlertDescription>
              </Alert>
            )}

            {!previewResult.error && previewResult.wordCount < 100 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Low Content Warning:</strong> Document contains only {previewResult.wordCount} words. 
                  Consider uploading a more comprehensive document for better AI analysis.
                </AlertDescription>
              </Alert>
            )}

            {/* Content Preview */}
            <div>
              <h4 className="font-medium mb-2">Content Preview (First 800 characters):</h4>
              <div className="bg-muted p-4 rounded-lg border max-h-64 overflow-y-auto">
                <pre className="text-sm whitespace-pre-wrap font-mono">
                  {previewResult.preview || 'No readable content detected'}
                </pre>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={onCancel}>
                Cancel Upload
              </Button>
              
              {isValid ? (
                <Button onClick={() => handleProceed(false)}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Proceed with Upload
                </Button>
              ) : (
                <>
                  <Button variant="secondary" onClick={() => handleProceed(true)}>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Continue Anyway (UAT)
                  </Button>
                </>
              )}
            </div>

            {/* Technical Details */}
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Technical Details
              </summary>
              <div className="mt-2 space-y-1 text-muted-foreground">
                <div>Binary content ratio: {(previewResult.qualityMetrics.binaryRatio * 100).toFixed(2)}%</div>
                <div>Has bullets: {previewResult.hasStructure.bullets ? 'Yes' : 'No'}</div>
                <div>Has headings: {previewResult.hasStructure.headings ? 'Yes' : 'No'}</div>
                <div>Has paragraphs: {previewResult.hasStructure.paragraphs ? 'Yes' : 'No'}</div>
                <div>XML artifacts detected: {previewResult.qualityMetrics.xmlArtifacts ? 'Yes' : 'No'}</div>
              </div>
            </details>
          </>
        )}
      </CardContent>
    </Card>
  );
};