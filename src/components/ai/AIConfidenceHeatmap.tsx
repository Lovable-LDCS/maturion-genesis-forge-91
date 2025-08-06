import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, TrendingDown, Minus, Brain, Database } from 'lucide-react';

interface DomainConfidence {
  domain: string;
  totalDocuments: number;
  processedDocuments: number;
  aiReadyDocuments: number;
  confidenceScore: number;
  trend: 'up' | 'down' | 'stable';
  lastUpdated: string;
}

export const AIConfidenceHeatmap: React.FC = () => {
  const [domainData, setDomainData] = useState<DomainConfidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [overallScore, setOverallScore] = useState(0);
  const { currentOrganization } = useOrganization();

  useEffect(() => {
    if (currentOrganization?.id) {
      fetchConfidenceData();
    }
  }, [currentOrganization?.id]);

  const fetchConfidenceData = async () => {
    try {
      setLoading(true);
      
      // Fetch documents by domain for confidence analysis
      const { data: documents, error } = await supabase
        .from('ai_documents')
        .select('domain, processing_status, is_ai_ingested, total_chunks, created_at')
        .eq('organization_id', currentOrganization!.id);

      if (error) throw error;

      // Group by domain and calculate confidence metrics
      const domainMap = new Map<string, DomainConfidence>();
      
      documents.forEach(doc => {
        const domain = doc.domain || 'General';
        const existing = domainMap.get(domain) || {
          domain,
          totalDocuments: 0,
          processedDocuments: 0,
          aiReadyDocuments: 0,
          confidenceScore: 0,
          trend: 'stable' as const,
          lastUpdated: doc.created_at
        };

        existing.totalDocuments++;
        if (doc.processing_status === 'completed') {
          existing.processedDocuments++;
        }
        if (doc.is_ai_ingested && doc.total_chunks > 0) {
          existing.aiReadyDocuments++;
        }
        
        // Update last updated timestamp
        if (new Date(doc.created_at) > new Date(existing.lastUpdated)) {
          existing.lastUpdated = doc.created_at;
        }

        domainMap.set(domain, existing);
      });

      // Calculate confidence scores and trends
      const domainList = Array.from(domainMap.values()).map(domain => {
        // Confidence formula: (AI Ready / Total) * chunk factor
        const baseScore = domain.totalDocuments > 0 
          ? (domain.aiReadyDocuments / domain.totalDocuments) * 100 
          : 0;
        
        // Bonus for having multiple documents in domain
        const diversityBonus = Math.min(domain.totalDocuments * 5, 20);
        
        domain.confidenceScore = Math.min(baseScore + diversityBonus, 100);
        
        // Simple trend calculation based on recent activity
        const daysSinceUpdate = Math.floor(
          (Date.now() - new Date(domain.lastUpdated).getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysSinceUpdate <= 7 && domain.aiReadyDocuments > 0) {
          domain.trend = 'up';
        } else if (daysSinceUpdate > 30) {
          domain.trend = 'down';
        } else {
          domain.trend = 'stable';
        }

        return domain;
      });

      // Calculate overall confidence
      const totalDocs = domainList.reduce((sum, d) => sum + d.totalDocuments, 0);
      const totalAiReady = domainList.reduce((sum, d) => sum + d.aiReadyDocuments, 0);
      const overall = totalDocs > 0 ? Math.round((totalAiReady / totalDocs) * 100) : 0;

      setDomainData(domainList.sort((a, b) => b.confidenceScore - a.confidenceScore));
      setOverallScore(overall);
    } catch (error) {
      console.error('Error fetching confidence data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getConfidenceLabel = (score: number) => {
    if (score >= 80) return 'High Confidence';
    if (score >= 60) return 'Good Confidence';
    if (score >= 40) return 'Moderate Confidence';
    return 'Low Confidence';
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-3 w-3 text-green-600" />;
      case 'down': return <TrendingDown className="h-3 w-3 text-red-600" />;
      default: return <Minus className="h-3 w-3 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Confidence Heatmap
          </CardTitle>
          <CardDescription>Loading confidence analysis...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
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
          Domain-level confidence in AI reasoning based on document availability and processing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className="text-center p-4 bg-muted rounded-lg">
          <div className="text-2xl font-bold mb-2">{overallScore}%</div>
          <div className="text-sm text-muted-foreground">Overall AI Confidence</div>
          <Progress value={overallScore} className="mt-2" />
        </div>

        {/* Domain Breakdown */}
        <div className="space-y-4">
          <h4 className="font-semibold flex items-center gap-2">
            <Database className="h-4 w-4" />
            Domain Analysis
          </h4>
          
          {domainData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No domain data available</p>
              <p className="text-sm mt-2">Upload and process documents to see confidence analysis</p>
            </div>
          ) : (
            domainData.map((domain) => (
              <div key={domain.domain} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h5 className="font-medium">{domain.domain}</h5>
                    {getTrendIcon(domain.trend)}
                  </div>
                  <Badge 
                    variant="secondary" 
                    className={`text-white ${getConfidenceColor(domain.confidenceScore)}`}
                  >
                    {Math.round(domain.confidenceScore)}%
                  </Badge>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Documents</div>
                    <div className="font-medium">{domain.totalDocuments}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Processed</div>
                    <div className="font-medium">{domain.processedDocuments}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">AI Ready</div>
                    <div className="font-medium text-green-600">{domain.aiReadyDocuments}</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>{getConfidenceLabel(domain.confidenceScore)}</span>
                    <span>{Math.round(domain.confidenceScore)}%</span>
                  </div>
                  <Progress 
                    value={domain.confidenceScore} 
                    className={`h-2 ${getConfidenceColor(domain.confidenceScore)}`}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary Recommendations */}
        {domainData.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h5 className="font-medium text-blue-900 mb-2">Recommendations</h5>
            <ul className="text-sm text-blue-800 space-y-1">
              {overallScore < 50 && (
                <li>• Upload more documents across different domains to improve overall confidence</li>
              )}
              {domainData.some(d => d.confidenceScore < 40) && (
                <li>• Focus on domains with low confidence scores for better AI coverage</li>
              )}
              {domainData.some(d => d.trend === 'down') && (
                <li>• Update documents in declining domains to maintain AI effectiveness</li>
              )}
              {overallScore >= 80 && (
                <li>• Excellent AI confidence! Your knowledge base is well-established</li>
              )}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};