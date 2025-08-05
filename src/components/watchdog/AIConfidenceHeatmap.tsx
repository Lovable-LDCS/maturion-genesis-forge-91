import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Brain, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

interface ConfidenceData {
  confidence_category: string;
  avg_confidence: number;
  drift_detected: boolean;
  sample_count: number;
}

interface AIConfidenceHeatmapProps {
  organizationId?: string;
}

export const AIConfidenceHeatmap: React.FC<AIConfidenceHeatmapProps> = ({ organizationId }) => {
  const [confidenceData, setConfidenceData] = useState<ConfidenceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (organizationId) {
      loadConfidenceData();
    }
  }, [organizationId]);

  const loadConfidenceData = async () => {
    if (!organizationId) return;

    try {
      const { data } = await supabase
        .from('ai_confidence_scoring')
        .select('confidence_category, adjusted_confidence, drift_detected')
        .eq('organization_id', organizationId);

      if (data) {
        // Group by confidence category and calculate averages
        const grouped = data.reduce((acc: Record<string, any>, item) => {
          if (!acc[item.confidence_category]) {
            acc[item.confidence_category] = {
              confidence_category: item.confidence_category,
              total_confidence: 0,
              sample_count: 0,
              drift_count: 0
            };
          }
          
          acc[item.confidence_category].total_confidence += item.adjusted_confidence || 0;
          acc[item.confidence_category].sample_count += 1;
          if (item.drift_detected) {
            acc[item.confidence_category].drift_count += 1;
          }
          
          return acc;
        }, {});

        const processedData = Object.values(grouped).map((item: any) => ({
          confidence_category: item.confidence_category,
          avg_confidence: item.total_confidence / item.sample_count,
          drift_detected: item.drift_count > 0,
          sample_count: item.sample_count
        }));

        setConfidenceData(processedData as ConfidenceData[]);
      }
    } catch (error) {
      console.error('Error loading confidence data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Confidence Heatmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          AI Confidence Heatmap
        </CardTitle>
        <CardDescription>
          Real-time confidence scoring across AI categories
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {confidenceData.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No confidence data available
            </p>
          ) : (
            confidenceData.map((category) => (
              <div key={category.confidence_category} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium capitalize">
                      {category.confidence_category.replace('_', ' ')}
                    </span>
                    {category.drift_detected && (
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {(category.avg_confidence * 100).toFixed(1)}%
                    </span>
                    <span className={`text-xs px-2 py-1 rounded text-white ${getConfidenceColor(category.avg_confidence)}`}>
                      {getConfidenceText(category.avg_confidence)}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${getConfidenceColor(category.avg_confidence)}`}
                      style={{ width: `${category.avg_confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {category.sample_count} samples
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {confidenceData.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall System Confidence</span>
              <span className="font-medium">
                {(confidenceData.reduce((sum, item) => sum + item.avg_confidence, 0) / confidenceData.length * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};