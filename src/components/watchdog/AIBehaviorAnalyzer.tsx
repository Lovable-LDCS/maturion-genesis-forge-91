import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { Brain, AlertTriangle, CheckCircle, X, Eye } from 'lucide-react';

interface AIBehaviorData {
  id: string;
  behavior_type: string;
  confidence_score: number;
  detected_content: string;
  expected_pattern: string;
  severity_level: string;
  auto_flagged: boolean;
  review_status: string;
  created_at: string;
  metadata: any;
}

interface AIBehaviorAnalyzerProps {
  organizationId?: string;
}

export const AIBehaviorAnalyzer: React.FC<AIBehaviorAnalyzerProps> = ({ organizationId }) => {
  const [behaviorData, setBehaviorData] = useState<AIBehaviorData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBehavior, setSelectedBehavior] = useState<AIBehaviorData | null>(null);

  useEffect(() => {
    if (organizationId) {
      loadBehaviorData();
    }
  }, [organizationId]);

  const loadBehaviorData = async () => {
    if (!organizationId) return;

    try {
      const { data } = await supabase
        .from('ai_behavior_monitoring')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(20);

      setBehaviorData(data || []);
    } catch (error) {
      console.error('Error loading AI behavior data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateReviewStatus = async (behaviorId: string, status: string) => {
    try {
      await supabase
        .from('ai_behavior_monitoring')
        .update({ 
          review_status: status,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', behaviorId);

      loadBehaviorData();
    } catch (error) {
      console.error('Error updating review status:', error);
    }
  };

  const getBehaviorIcon = (type: string) => {
    switch (type) {
      case 'hallucination': return <Brain className="h-4 w-4 text-purple-500" />;
      case 'placeholder': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'format_deviation': return <Eye className="h-4 w-4 text-blue-500" />;
      case 'logic_gap': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'memory_loss': return <Brain className="h-4 w-4 text-gray-500" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getReviewStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-red-100 text-red-800';
      case 'false_positive': return 'bg-green-100 text-green-800';
      case 'resolved': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-red-600';
    if (confidence >= 0.6) return 'text-orange-600';
    if (confidence >= 0.4) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Behavior Analyzer</CardTitle>
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
          AI Behavior Analyzer
        </CardTitle>
        <CardDescription>
          Monitor AI-generated content for anomalies and behavioral issues
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Behavior Summary */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {['hallucination', 'placeholder', 'format_deviation', 'logic_gap', 'memory_loss'].map((type) => {
              const count = behaviorData.filter(item => item.behavior_type === type).length;
              const criticalCount = behaviorData.filter(item => 
                item.behavior_type === type && item.severity_level === 'critical'
              ).length;
              
              return (
                <div key={type} className="text-center p-3 border rounded-lg">
                  <div className="flex justify-center mb-1">
                    {getBehaviorIcon(type)}
                  </div>
                  <p className="text-sm font-medium capitalize">
                    {type.replace('_', ' ')}
                  </p>
                  <p className="text-lg font-bold">{count}</p>
                  {criticalCount > 0 && (
                    <p className="text-xs text-red-600">
                      {criticalCount} critical
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {behaviorData.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No AI behavior anomalies detected
            </p>
          ) : (
            behaviorData.map((behavior) => (
              <div key={behavior.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getBehaviorIcon(behavior.behavior_type)}
                    <span className="font-medium capitalize">
                      {behavior.behavior_type.replace('_', ' ')}
                    </span>
                    <Badge className={getSeverityColor(behavior.severity_level)}>
                      {behavior.severity_level}
                    </Badge>
                    <Badge className={getReviewStatusColor(behavior.review_status)}>
                      {behavior.review_status.replace('_', ' ')}
                    </Badge>
                    {behavior.auto_flagged && (
                      <Badge variant="outline">Auto-flagged</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${getConfidenceColor(behavior.confidence_score)}`}>
                      {(behavior.confidence_score * 100).toFixed(0)}% confidence
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(behavior.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-sm font-medium">Detected Content:</span>
                  <p className="text-sm text-muted-foreground bg-muted rounded p-2 mt-1">
                    {behavior.detected_content.length > 200 
                      ? `${behavior.detected_content.substring(0, 200)}...`
                      : behavior.detected_content
                    }
                  </p>
                </div>

                {behavior.expected_pattern && (
                  <div>
                    <span className="text-sm font-medium">Expected Pattern:</span>
                    <p className="text-sm text-muted-foreground">{behavior.expected_pattern}</p>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Confidence:</span>
                    <Progress value={behavior.confidence_score * 100} className="w-32" />
                  </div>

                  {behavior.review_status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => updateReviewStatus(behavior.id, 'confirmed')}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Confirm
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => updateReviewStatus(behavior.id, 'false_positive')}
                      >
                        <X className="h-3 w-3 mr-1" />
                        False Positive
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => updateReviewStatus(behavior.id, 'resolved')}
                      >
                        Resolve
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {behaviorData.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Pending Review:</span>
                <p className="font-medium">
                  {behaviorData.filter(item => item.review_status === 'pending').length}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Confirmed Issues:</span>
                <p className="font-medium">
                  {behaviorData.filter(item => item.review_status === 'confirmed').length}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">False Positives:</span>
                <p className="font-medium">
                  {behaviorData.filter(item => item.review_status === 'false_positive').length}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Auto-flagged:</span>
                <p className="font-medium">
                  {behaviorData.filter(item => item.auto_flagged).length}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};