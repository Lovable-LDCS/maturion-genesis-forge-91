import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, TrendingUp, CheckCircle } from 'lucide-react';

interface FallbackTraceabilityProps {
  fallbackPath: string[];
  modifications: string[];
  sourceType: 'internal' | 'best_practice' | 'smart_feedback';
  confidence: number;
  timestamp: string;
}

export const FallbackTraceabilityPanel = ({
  fallbackPath,
  modifications,
  sourceType,
  confidence,
  timestamp
}: FallbackTraceabilityProps) => {
  const getSourceIcon = () => {
    switch (sourceType) {
      case 'internal':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'best_practice':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'smart_feedback':
        return <TrendingUp className="w-4 h-4 text-blue-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSourceLabel = () => {
    switch (sourceType) {
      case 'internal':
        return 'Internal Knowledge';
      case 'best_practice':
        return 'International Standards';
      case 'smart_feedback':
        return 'AI Learning Applied';
      default:
        return 'Unknown Source';
    }
  };

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          {getSourceIcon()}
          AI Generation Traceability
          <Badge variant="outline" className="text-xs">
            {getSourceLabel()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Fallback Path */}
        {fallbackPath.length > 0 && (
          <div>
            <label className="text-xs font-medium text-muted-foreground">FALLBACK PATH</label>
            <div className="mt-1 space-y-1">
              {fallbackPath.map((step, index) => (
                <div key={index} className="flex items-center gap-2 text-xs">
                  <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">
                    {index + 1}
                  </span>
                  <span className="text-sm">{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modifications Applied */}
        {modifications.length > 0 && (
          <div>
            <label className="text-xs font-medium text-muted-foreground">MODIFICATIONS APPLIED</label>
            <div className="mt-1 space-y-1">
              {modifications.map((mod, index) => (
                <div key={index} className="text-xs bg-muted p-2 rounded">
                  {mod}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Confidence & Metadata */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">Confidence:</span>
            <Badge variant={confidence > 0.8 ? 'default' : confidence > 0.6 ? 'secondary' : 'outline'}>
              {Math.round(confidence * 100)}%
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            Generated: {new Date(timestamp).toLocaleTimeString()}
          </div>
        </div>

        {/* Learning Note */}
        {sourceType === 'smart_feedback' && (
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <div className="flex items-start gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600 mt-0.5" />
              <div className="text-xs">
                <div className="font-medium text-blue-800">AI Learning Applied</div>
                <div className="text-blue-600 mt-1">
                  This suggestion has been modified based on previous user feedback and organizational preferences.
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};