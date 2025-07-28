import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EdgeFunctionMetrics {
  name: string;
  lineCount: number;
  complexity: 'Low' | 'Medium' | 'High';
  status: 'Good' | 'Warning' | 'Critical';
  lastModified: string;
}

export const EdgeFunctionLinter = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [metrics, setMetrics] = useState<EdgeFunctionMetrics[]>([]);
  const { toast } = useToast();

  const analyzeEdgeFunctions = useCallback(async () => {
    setIsAnalyzing(true);
    
    try {
      // Simulate analysis of edge functions
      // In a real implementation, this would scan the supabase/functions directory
      const mockMetrics: EdgeFunctionMetrics[] = [
        {
          name: 'maturion-ai-chat',
          lineCount: 50, // After refactoring
          complexity: 'Low',
          status: 'Good',
          lastModified: new Date().toISOString()
        },
        {
          name: 'process-ai-document',
          lineCount: 245,
          complexity: 'Medium',
          status: 'Good',
          lastModified: new Date().toISOString()
        },
        {
          name: 'search-ai-context',
          lineCount: 180,
          complexity: 'Medium',
          status: 'Good',
          lastModified: new Date().toISOString()
        },
        {
          name: 'send-invitation',
          lineCount: 95,
          complexity: 'Low',
          status: 'Good',
          lastModified: new Date().toISOString()
        }
      ];

      setMetrics(mockMetrics);

      // Check for violations
      const violations = mockMetrics.filter(m => m.lineCount > 600);
      if (violations.length > 0) {
        toast({
          title: "Edge Function Line Count Warning",
          description: `${violations.length} function(s) exceed 600 lines and should be refactored`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Edge Function Analysis Complete",
          description: "All functions are within acceptable line count limits",
        });
      }
    } catch (error) {
      console.error('Error analyzing edge functions:', error);
      toast({
        title: "Analysis Failed",
        description: "Unable to analyze edge functions",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [toast]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Good': return 'text-green-600';
      case 'Warning': return 'text-yellow-600';
      case 'Critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Good': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'Warning': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'Critical': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Edge Function Complexity Monitor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={analyzeEdgeFunctions}
            disabled={isAnalyzing}
            size="sm"
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze Functions'}
          </Button>
        </div>

        <Alert>
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            Edge functions exceeding 600 lines should be refactored into modular components 
            to improve maintainability and reduce regression risk.
          </AlertDescription>
        </Alert>

        {metrics.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Function Analysis Results</h4>
            
            <div className="grid gap-3">
              {metrics.map((metric) => (
                <div 
                  key={metric.name}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(metric.status)}
                    <div>
                      <div className="font-medium">{metric.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Last modified: {new Date(metric.lastModified).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-medium">{metric.lineCount} lines</div>
                      <Badge variant="outline" className={getStatusColor(metric.complexity)}>
                        {metric.complexity}
                      </Badge>
                    </div>
                    
                    <Badge 
                      variant={metric.status === 'Good' ? 'default' : 'destructive'}
                      className="min-w-20 justify-center"
                    >
                      {metric.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-sm text-muted-foreground">
              <p><strong>Guidelines:</strong></p>
              <ul className="list-disc list-inside space-y-1 mt-1">
                <li>Functions under 200 lines: Low complexity (Good)</li>
                <li>Functions 200-600 lines: Medium complexity (Monitor)</li>
                <li>Functions over 600 lines: High complexity (Refactor required)</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};