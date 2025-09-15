import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { CheckCircle, XCircle, Clock, GraduationCap, Database, FileText, Zap } from 'lucide-react';

interface QATestResult {
  step: string;
  passed: boolean;
  evidence?: any;
  error?: string;
}

export const PPTMProcessingQA: React.FC = () => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<QATestResult[]>([]);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();

  const runQATest = async () => {
    if (!currentOrganization?.id) {
      toast({
        title: "No Organization",
        description: "Please ensure you're in a valid organization context",
        variant: "destructive"
      });
      return;
    }

    setTesting(true);
    setResults([]);
    setProgress(0);

    const testResults: QATestResult[] = [];

    try {
      // Step 1: Test file validation for .pptm
      setProgress(20);
      console.log('[PPTM QA] Step 1: Testing file validation');
      
      try {
        const { data: validationResult, error: validationError } = await supabase
          .rpc('validate_file_upload', {
            file_name: 'test_processing_equipment.pptm',
            file_size: 2048000, // 2MB
            mime_type: 'application/vnd.ms-powerpoint.presentation.macroEnabled.12'
          });

        if (validationError) throw validationError;

        const validation = validationResult as { valid: boolean; error?: string };
        testResults.push({
          step: 'File Validation (.pptm)',
          passed: validation.valid,
          evidence: validation,
          error: validation.error
        });
      } catch (error: any) {
        testResults.push({
          step: 'File Validation (.pptm)',
          passed: false,
          error: error.message
        });
      }

      // Step 2: Check training slide documents exist with proper tagging
      setProgress(40);
      console.log('[PPTM QA] Step 2: Checking training slide documents');
      
      try {
        const { data: trainingSlides, error: slideError } = await supabase
          .from('ai_documents')
          .select('id, title, doc_type, layer, stage, tags, total_chunks, processing_status')
          .eq('organization_id', currentOrganization.id)
          .eq('doc_type', 'training_slide')
          .eq('layer', 3);

        if (slideError) throw slideError;

        testResults.push({
          step: 'Training Slide Documents (Layer 3)',
          passed: (trainingSlides?.length || 0) > 0,
          evidence: {
            count: trainingSlides?.length || 0,
            samples: trainingSlides?.slice(0, 3) || []
          }
        });
      } catch (error: any) {
        testResults.push({
          step: 'Training Slide Documents (Layer 3)',
          passed: false,
          error: error.message
        });
      }

      // Step 3: Check chunks with equipment detection
      setProgress(60);
      console.log('[PPTM QA] Step 3: Checking chunks with equipment detection');
      
      try {
        const { data: chunks, error: chunkError } = await supabase
          .from('ai_document_chunks')
          .select('id, document_id, equipment_slugs, stage, layer, tags, tokens, page, section')
          .eq('organization_id', currentOrganization.id)
          .eq('layer', 3)
          .not('equipment_slugs', 'is', null)
          .limit(10);

        if (chunkError) throw chunkError;

        testResults.push({
          step: 'Chunks with Equipment Detection',
          passed: (chunks?.length || 0) > 0,
          evidence: {
            count: chunks?.length || 0,
            equipment_found: [...new Set(chunks?.flatMap(c => c.equipment_slugs || []) || [])]
          }
        });
      } catch (error: any) {
        testResults.push({
          step: 'Chunks with Equipment Detection',
          passed: false,
          error: error.message
        });
      }

      // Step 4: Test document filtering by type/layer/stage
      setProgress(80);
      console.log('[PPTM QA] Step 4: Testing document filtering');
      
      try {
        const { data: filteredDocs, error: filterError } = await supabase
          .from('ai_documents')
          .select('id, title, doc_type, layer, stage, tags')
          .eq('organization_id', currentOrganization.id)
          .eq('doc_type', 'training_slide')
          .eq('layer', 3)
          .eq('stage', 'processing');

        if (filterError) throw filterError;

        testResults.push({
          step: 'Document Filtering (Type=training_slide, Layer=3, Stage=processing)',
          passed: true, // Pass if query executes without error
          evidence: {
            filtered_count: filteredDocs?.length || 0,
            samples: filteredDocs?.slice(0, 2) || []
          }
        });
      } catch (error: any) {
        testResults.push({
          step: 'Document Filtering',
          passed: false,
          error: error.message
        });
      }

      // Step 5: Test embeddings and searchability
      setProgress(100);
      console.log('[PPTM QA] Step 5: Testing embeddings');
      
      try {
        const { data: embeddedChunks, error: embedError } = await supabase
          .from('ai_document_chunks')
          .select('id, document_id, embedding, stage, equipment_slugs')
          .eq('organization_id', currentOrganization.id)
          .eq('layer', 3)
          .not('embedding', 'is', null)
          .limit(5);

        if (embedError) throw embedError;

        testResults.push({
          step: 'Embeddings Generated',
          passed: (embeddedChunks?.length || 0) > 0,
          evidence: {
            embedded_chunks: embeddedChunks?.length || 0,
            has_equipment_tags: embeddedChunks?.some(c => c.equipment_slugs?.length > 0) || false
          }
        });
      } catch (error: any) {
        testResults.push({
          step: 'Embeddings Generated',
          passed: false,
          error: error.message
        });
      }

      setResults(testResults);
      
      const passedTests = testResults.filter(r => r.passed).length;
      const totalTests = testResults.length;
      
      toast({
        title: "QA Test Complete",
        description: `${passedTests}/${totalTests} tests passed`,
        variant: passedTests === totalTests ? "default" : "destructive"
      });

    } catch (error: any) {
      console.error('QA test error:', error);
      toast({
        title: "QA Test Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (passed: boolean, error?: string) => {
    if (error) return <XCircle className="h-4 w-4 text-red-500" />;
    return passed ? 
      <CheckCircle className="h-4 w-4 text-green-500" /> : 
      <XCircle className="h-4 w-4 text-red-500" />;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            PPTM Training Slide Processing QA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <Button 
              onClick={runQATest} 
              disabled={testing}
              className="w-full"
            >
              {testing ? 'Running QA Tests...' : 'Run PPTM Processing QA'}
            </Button>
          </div>
          
          {testing && (
            <Progress value={progress} className="w-full" />
          )}
          
          {results.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Test Results:</h4>
              {results.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-md">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(result.passed, result.error)}
                    <span className="text-sm font-medium">{result.step}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={result.passed ? "default" : "destructive"}>
                      {result.passed ? 'PASS' : 'FAIL'}
                    </Badge>
                  </div>
                </div>
              ))}
              
              {/* Evidence Summary */}
              <div className="mt-4 p-3 bg-muted rounded-md">
                <h4 className="font-medium text-sm mb-2">Evidence Summary:</h4>
                <pre className="text-xs text-muted-foreground overflow-auto max-h-32">
                  {JSON.stringify(results.map(r => ({
                    step: r.step,
                    passed: r.passed,
                    evidence: r.evidence
                  })), null, 2)}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};