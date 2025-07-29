import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EdgeFunctionComplexityAlertProps {
  functionName: string;
  lineCount: number;
  threshold?: number;
  onDismiss?: () => void;
}

export const EdgeFunctionComplexityAlert: React.FC<EdgeFunctionComplexityAlertProps> = ({
  functionName,
  lineCount,
  threshold = 600,
  onDismiss
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show alert if function exceeds threshold
    if (lineCount > threshold) {
      setIsVisible(true);
    }
  }, [lineCount, threshold]);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <Alert className="border-amber-200 bg-amber-50 text-amber-900">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <div className="flex justify-between items-start w-full">
          <div className="flex-1">
            <AlertDescription className="text-sm">
              <strong>Edge Function Complexity Warning</strong>
              <br />
              Function <code className="bg-amber-100 px-1 rounded text-xs">{functionName}</code> has {lineCount} lines (threshold: {threshold}).
              <br />
              Consider refactoring into modular components to improve maintainability and reduce regression risk.
            </AlertDescription>
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7"
                onClick={() => window.open('/qa-dashboard', '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                View Monitor
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs h-7"
                onClick={handleDismiss}
              >
                Dismiss
              </Button>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 ml-2"
            onClick={handleDismiss}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </Alert>
    </div>
  );
};

// Hook to monitor edge function complexity
export const useEdgeFunctionComplexityMonitor = () => {
  const [alerts, setAlerts] = useState<Array<{
    id: string;
    functionName: string;
    lineCount: number;
  }>>([]);

  const checkFunctionComplexity = (functionName: string, content: string) => {
    const lineCount = content.split('\n').length;
    
    if (lineCount > 600) {
      const alertId = `${functionName}-${Date.now()}`;
      setAlerts(prev => [...prev, { id: alertId, functionName, lineCount }]);
      
      // Auto-dismiss after 30 seconds
      setTimeout(() => {
        setAlerts(prev => prev.filter(alert => alert.id !== alertId));
      }, 30000);
    }
  };

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  return { alerts, checkFunctionComplexity, dismissAlert };
};