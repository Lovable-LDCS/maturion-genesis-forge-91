import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { PlayCircle, CheckCircle, AlertCircle, Clock } from 'lucide-react';

export const EdgeFunctionTester: React.FC = () => {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; documentId?: string } | null>(null);

  const testSingleDocument = async () => {
    setTesting(true);
    setResult(null);
    
    try {
      // Get a pending MPS document
      const { data: pendingDoc, error: fetchError } = await supabase
        .from('ai_documents')
        .select('id, title, processing_status')
        .eq('document_type', 'mps_document')
        .eq('processing_status', 'pending')
        .limit(1)
        .single();

      if (fetchError || !pendingDoc) {
        toast({
          title: "No pending documents",
          description: "All MPS documents have been processed or there are no pending documents",
        });
        return;
      }

      // Test the edge function
      console.log(`Testing edge function with document: ${pendingDoc.title}`);
      
      const response = await supabase.functions.invoke('process-ai-document', {
        body: { documentId: pendingDoc.id }
      });

      if (response.error) {
        setResult({
          success: false,
          message: `Edge function error: ${response.error.message}`,
          documentId: pendingDoc.id
        });
        
        toast({
          title: "Edge Function Failed",
          description: response.error.message,
          variant: "destructive"
        });
      } else {
        setResult({
          success: true,
          message: `✅ Success! Document processed successfully`,
          documentId: pendingDoc.id
        });
        
        toast({
          title: "Edge Function Success",
          description: `Document ${pendingDoc.title} processed successfully`,
        });
      }

    } catch (error: any) {
      setResult({
        success: false,
        message: `Test failed: ${error.message}`
      });
      
      toast({
        title: "Test Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = () => {
    if (testing) return <Clock className="h-5 w-5 text-blue-500 animate-spin" />;
    if (!result) return <PlayCircle className="h-5 w-5 text-gray-500" />;
    return result.success ? 
      <CheckCircle className="h-5 w-5 text-green-500" /> : 
      <AlertCircle className="h-5 w-5 text-red-500" />;
  };

  const getStatusColor = () => {
    if (testing) return "border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800";
    if (!result) return "border-gray-200 bg-gray-50 dark:bg-gray-950 dark:border-gray-800";
    return result.success ? 
      "border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800" : 
      "border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800";
  };

  return (
    <Card className={`${getStatusColor()} transition-colors duration-300`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          Edge Function Tester
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Test the process-ai-document edge function with a single MPS document
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Button 
          onClick={testSingleDocument}
          disabled={testing}
          className="w-full"
          size="lg"
        >
          {testing ? (
            <>
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              Testing Edge Function...
            </>
          ) : (
            <>
              <PlayCircle className="h-4 w-4 mr-2" />
              Test Single Document Processing
            </>
          )}
        </Button>
        
        {result && (
          <div className={`p-4 rounded-lg ${
            result.success ? 
              'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 
              'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
          }`}>
            <p className="font-medium">{result.success ? 'Test Passed' : 'Test Failed'}</p>
            <p className="text-sm mt-1">{result.message}</p>
            {result.documentId && (
              <p className="text-xs mt-2 opacity-75">Document ID: {result.documentId}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};