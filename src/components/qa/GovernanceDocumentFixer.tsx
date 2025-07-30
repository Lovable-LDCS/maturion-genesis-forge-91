import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function GovernanceDocumentFixer() {
  const [isFixing, setIsFixing] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const { toast } = useToast();

  const handleFix = async () => {
    setIsFixing(true);
    setResults([]);
    
    try {
      console.log('🔧 Triggering governance document fix...');
      
      const { data, error } = await supabase.functions.invoke('fix-governance-documents', {
        body: {}
      });

      if (error) {
        throw new Error(error.message);
      }

      console.log('🔧 Fix results:', data);
      setResults(data.results || []);
      
      toast({
        title: "Fix Applied",
        description: `Updated ${data.results?.filter((r: any) => r.success).length || 0} governance documents`,
      });
      
    } catch (error: any) {
      console.error('❌ Fix failed:', error);
      toast({
        title: "Fix Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>🚨 Governance Document Emergency Fix</CardTitle>
        <CardDescription>
          Fix governance documents that have chunks but are stuck in pending status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={handleFix} 
          disabled={isFixing}
          className="w-full"
        >
          {isFixing ? 'Fixing Documents...' : 'Fix Governance Documents'}
        </Button>
        
        {results.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Fix Results:</h3>
            {results.map((result, index) => (
              <div key={index} className={`p-2 rounded text-sm ${
                result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                <div className="font-medium">{result.title}</div>
                {result.success ? (
                  <div>✅ Updated to completed with {result.chunks} chunks</div>
                ) : (
                  <div>❌ {result.error}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}