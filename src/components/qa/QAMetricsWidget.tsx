import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, TrendingUp, TrendingDown, Clock, Upload, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

interface QAMetric {
  id: string;
  metric_type: string;
  metric_value: number;
  metric_data: any;
  recorded_at: string;
}

interface QAMetricsWidgetProps {
  timeRange?: 'hour' | 'day' | 'week';
}

export const QAMetricsWidget: React.FC<QAMetricsWidgetProps> = ({ 
  timeRange = 'hour' 
}) => {
  const [metrics, setMetrics] = useState<QAMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentOrganization } = useOrganization();
  
  const [uploadSuccessRate, setUploadSuccessRate] = useState(0);
  const [avgProcessingTime, setAvgProcessingTime] = useState(0);
  const [validationGaps, setValidationGaps] = useState(0);
  const [rlsErrors, setRlsErrors] = useState(0);

  useEffect(() => {
    if (!currentOrganization?.id) return;
    
    fetchQAMetrics();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('qa-metrics-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'qa_metrics',
          filter: `organization_id=eq.${currentOrganization.id}`
        },
        () => {
          fetchQAMetrics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentOrganization?.id, timeRange]);

  const fetchQAMetrics = async () => {
    if (!currentOrganization?.id) return;
    
    setLoading(true);
    try {
      const now = new Date();
      const timeRanges = {
        hour: new Date(now.getTime() - 60 * 60 * 1000),
        day: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      };

      const { data, error } = await supabase
        .from('qa_metrics')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .gte('recorded_at', timeRanges[timeRange].toISOString())
        .order('recorded_at', { ascending: false });

      if (error) {
        console.error('Error fetching QA metrics:', error);
        return;
      }

      setMetrics(data || []);
      calculateMetrics(data || []);
      
    } catch (error) {
      console.error('Error in fetchQAMetrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (metricsData: QAMetric[]) => {
    // Upload Success Rate
    const uploadMetrics = metricsData.filter(m => 
      m.metric_type === 'upload_session_completed' || 
      m.metric_type === 'upload_session_failed'
    );
    
    const totalSessions = uploadMetrics.length;
    const successfulSessions = uploadMetrics.filter(m => 
      m.metric_type === 'upload_session_completed'
    ).length;
    
    const successRate = totalSessions > 0 ? (successfulSessions / totalSessions) * 100 : 100;
    setUploadSuccessRate(Math.round(successRate));

    // Average Processing Time
    const processingMetrics = metricsData.filter(m => 
      m.metric_type === 'document_processing_time'
    );
    
    const avgTime = processingMetrics.length > 0
      ? processingMetrics.reduce((sum, m) => sum + m.metric_value, 0) / processingMetrics.length
      : 0;
    setAvgProcessingTime(Math.round(avgTime * 100) / 100);

    // Validation Gaps
    const validationMetrics = metricsData.filter(m => 
      m.metric_type === 'validation_error' || 
      m.metric_type === 'metadata_validation_failed'
    );
    setValidationGaps(validationMetrics.length);

    // RLS Errors
    const rlsMetrics = metricsData.filter(m => 
      m.metric_type === 'rls_error' || 
      m.metric_type === 'permission_denied'
    );
    setRlsErrors(rlsMetrics.length);
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600';
    if (rate >= 85) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProcessingTimeColor = (time: number) => {
    if (time <= 5) return 'text-green-600';
    if (time <= 10) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Real-time QA Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <Upload className="h-8 w-8 mx-auto mb-2 text-primary" />
            <div className={`text-2xl font-bold ${getSuccessRateColor(uploadSuccessRate)}`}>
              {uploadSuccessRate}%
            </div>
            <div className="text-sm text-muted-foreground">Upload Success Rate</div>
            <Progress value={uploadSuccessRate} className="mt-2 h-2" />
            {uploadSuccessRate < 95 && (
              <Badge variant="destructive" className="mt-2 text-xs">
                Below Threshold
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <Clock className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <div className={`text-2xl font-bold ${getProcessingTimeColor(avgProcessingTime)}`}>
              {avgProcessingTime}s
            </div>
            <div className="text-sm text-muted-foreground">Avg Processing Time</div>
            <div className="flex items-center justify-center mt-2">
              {avgProcessingTime <= 5 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <span className="text-xs ml-1">
                {avgProcessingTime <= 5 ? 'Optimal' : 'Needs Attention'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
            <div className={`text-2xl font-bold ${validationGaps > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {validationGaps}
            </div>
            <div className="text-sm text-muted-foreground">Validation Gaps</div>
            {validationGaps > 0 && (
              <Badge variant="destructive" className="mt-2 text-xs">
                Action Required
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <Shield className="h-8 w-8 mx-auto mb-2 text-red-600" />
            <div className={`text-2xl font-bold ${rlsErrors > 5 ? 'text-red-600' : 'text-green-600'}`}>
              {rlsErrors}
            </div>
            <div className="text-sm text-muted-foreground">RLS Errors</div>
            {rlsErrors > 5 && (
              <Badge variant="destructive" className="mt-2 text-xs">
                Spike Detected
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alert Summary */}
      {(uploadSuccessRate < 95 || avgProcessingTime > 10 || validationGaps > 0 || rlsErrors > 5) && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium mb-2">QA Alerts Detected</div>
            <div className="space-y-1 text-sm">
              {uploadSuccessRate < 95 && (
                <div>⚠️ Upload success rate ({uploadSuccessRate}%) below 95% threshold</div>
              )}
              {avgProcessingTime > 10 && (
                <div>⚠️ Average processing time ({avgProcessingTime}s) exceeds 10s threshold</div>
              )}
              {validationGaps > 0 && (
                <div>⚠️ {validationGaps} validation gaps detected</div>
              )}
              {rlsErrors > 5 && (
                <div>🚨 RLS error spike detected: {rlsErrors} errors in {timeRange}</div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};