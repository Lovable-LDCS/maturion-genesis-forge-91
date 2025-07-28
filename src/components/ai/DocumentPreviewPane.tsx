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
  };
  error?: string;
}

export const DocumentPreviewPane: React.FC<DocumentPreviewPaneProps> = ({
  file,
  onPreviewComplete,
  onCancel
}) => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);

  const extractPreview = async () => {
    setIsExtracting(true);

    try {
      console.log(`🔍 Extracting preview from ${file.name}`);

      // Only handle .docx files for now (can extend to other types)
      if (!file.name.endsWith('.docx') && !file.type.includes('wordprocessingml')) {
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

      // Apply the same cleaning logic as the server
      cleanText = cleanText
        .replace(/<[^>]*>/g, ' ')
        .replace(/[A-Z]:\\[^\\s]*/g, ' ')
        .replace(/\/_rels\/[^\s]*/g, ' ')
        .replace(/\/customXml\/[^\s]*/g, ' ')
        .replace(/\/word\/[^\s]*/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // Quality analysis
      const wordCount = cleanText.split(/\s+/).filter(w => w.length > 0).length;
      const characterCount = cleanText.length;

      const qualityMetrics = {
        binaryRatio: (cleanText.match(/[\x00-\x08\x0E-\x1F\x7F-\xFF]/g) || []).length / cleanText.length,
        xmlArtifacts: cleanText.includes('_rels/') || cleanText.includes('customXml/') || cleanText.includes('word/_rels'),
        alphabeticRatio: (cleanText.match(/[a-zA-Z]/g) || []).length / cleanText.length
      };

      const hasStructure = {
        bullets: /[•\-\*]\s+/.test(cleanText) || /^\s*[\-\*•]\s+/m.test(cleanText),
        headings: /^#+\s+/m.test(cleanText) || /^[A-Z][^.]*:$/m.test(cleanText),
        paragraphs: cleanText.split(/\n\s*\n/).length > 2
      };

      // Generate preview (first 800 characters as requested)
      const preview = cleanText.substring(0, 800);

      // Validation checks
      const isValid = wordCount >= 50 && 
                     characterCount >= 100 && 
                     !qualityMetrics.xmlArtifacts && 
                     qualityMetrics.binaryRatio < 0.1 && 
                     qualityMetrics.alphabeticRatio > 0.25;

      const previewResult: PreviewResult = {
        success: true,
        preview,
        wordCount,
        characterCount,
        hasStructure,
        qualityMetrics,
      };

      if (!isValid) {
        previewResult.error = `Content quality issues detected: ${
          wordCount < 50 ? 'insufficient words, ' : ''
        }${qualityMetrics.xmlArtifacts ? 'XML artifacts present, ' : ''
        }${qualityMetrics.binaryRatio >= 0.1 ? 'high binary content, ' : ''
        }${qualityMetrics.alphabeticRatio <= 0.25 ? 'low alphabetic content' : ''
        }`.replace(/, $/, '');
      }

      setPreviewResult(previewResult);

    } catch (error: any) {
      console.error('Preview extraction failed:', error);
      setPreviewResult({
        success: false,
        preview: '',
        wordCount: 0,
        characterCount: 0,
        hasStructure: { bullets: false, headings: false, paragraphs: false },
        qualityMetrics: { binaryRatio: 0, xmlArtifacts: false, alphabeticRatio: 0 },
        error: error.message
      });
    } finally {
      setIsExtracting(false);
    }
  };

  React.useEffect(() => {
    extractPreview();
  }, [file]);

  const handleProceed = () => {
    if (previewResult) {
      onPreviewComplete(
        previewResult.success && !previewResult.error,
        previewResult.preview
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
                <Button onClick={handleProceed}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Proceed with Upload
                </Button>
              ) : (
                <>
                  <Button variant="secondary" onClick={handleProceed}>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Upload Anyway (Not Recommended)
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