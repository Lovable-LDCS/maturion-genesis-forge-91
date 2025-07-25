import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Brain, TrendingDown, AlertTriangle, Filter, RefreshCw } from 'lucide-react';
import { useAILearningFeedback } from '@/hooks/useAILearningFeedback';
import { useToast } from '@/hooks/use-toast';

interface LearningInsight {
  pattern: string;
  frequency: number;
  sectors: string[];
  domains: string[];
  trend: 'increasing' | 'decreasing' | 'stable';
  confidence: number;
  lastSeen: string;
}

interface RejectionHeatmap {
  domain: string;
  sector: string;
  rejectionCount: number;
  rejectionRate: number;
  commonReasons: string[];
}

export const SuperuserLearningDashboard = () => {
  const [learningInsights, setLearningInsights] = useState<LearningInsight[]>([]);
  const [rejectionHeatmap, setRejectionHeatmap] = useState<RejectionHeatmap[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState('30d');
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  
  const { analyzeLearningPatterns, isLoading: analysisLoading } = useAILearningFeedback();
  const { toast } = useToast();

  useEffect(() => {
    loadLearningDashboard();
  }, [selectedTimeframe, selectedDomain]);

  const loadLearningDashboard = async () => {
    setIsLoading(true);
    try {
      // Load learning patterns
      const patterns = await analyzeLearningPatterns();
      
      // Transform patterns to insights
      const insights: LearningInsight[] = patterns.map(pattern => ({
        pattern: pattern.rejected_phrase,
        frequency: pattern.frequency,
        sectors: ['Heavy Equipment', 'Mining'], // Would come from actual data
        domains: ['Leadership & Governance', 'Protection'],
        trend: 'increasing' as const,
        confidence: 0.85,
        lastSeen: new Date().toISOString()
      }));
      
      setLearningInsights(insights);
      
      // Generate heatmap data
      const heatmapData = generateRejectionHeatmap(patterns);
      setRejectionHeatmap(heatmapData);
      
    } catch (error) {
      console.error('Error loading learning dashboard:', error);
      toast({
        title: "Dashboard Load Failed",
        description: "Unable to load learning insights",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateRejectionHeatmap = (patterns: any[]): RejectionHeatmap[] => {
    // Mock heatmap data - would be calculated from actual rejection patterns
    return [
      {
        domain: 'Leadership & Governance',
        sector: 'Heavy Equipment',
        rejectionCount: 15,
        rejectionRate: 0.3,
        commonReasons: ['Not applicable to our industry', 'Too prescriptive']
      },
      {
        domain: 'Protection',
        sector: 'Mining',
        rejectionCount: 12,
        rejectionRate: 0.25,
        commonReasons: ['Regulatory constraints', 'Cost prohibitive']
      },
      {
        domain: 'Process Integrity',
        sector: 'Manufacturing',
        rejectionCount: 8,
        rejectionRate: 0.2,
        commonReasons: ['Cultural mismatch', 'Already covered']
      }
    ];
  };

  const getHeatmapColor = (rejectionRate: number) => {
    if (rejectionRate >= 0.3) return 'bg-red-500';
    if (rejectionRate >= 0.2) return 'bg-orange-500';
    if (rejectionRate >= 0.1) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const refreshLearningModel = async () => {
    toast({
      title: "Learning Model Refresh",
      description: "Reprocessing rejection patterns and updating AI suggestions...",
    });
    await loadLearningDashboard();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-6 h-6" />
          <h2 className="text-2xl font-bold">AI Learning Dashboard</h2>
          <Badge variant="secondary">Superuser Access</Badge>
        </div>
        
        <div className="flex gap-2">
          <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={refreshLearningModel} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh Model
          </Button>
        </div>
      </div>

      <Tabs defaultValue="patterns" className="space-y-4">
        <TabsList>
          <TabsTrigger value="patterns">Learning Patterns</TabsTrigger>
          <TabsTrigger value="heatmap">Rejection Heatmap</TabsTrigger>
          <TabsTrigger value="insights">Sector Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="patterns" className="space-y-4">
          <div className="grid gap-4">
            {learningInsights.length === 0 && !isLoading ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">No learning patterns detected yet.</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Patterns will appear as users provide feedback on AI suggestions.
                  </p>
                </CardContent>
              </Card>
            ) : (
              learningInsights.map((insight, index) => (
                <Card key={index}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{insight.pattern}</CardTitle>
                      <div className="flex gap-2">
                        <Badge variant="outline">{insight.frequency}x rejected</Badge>
                        <Badge variant={insight.trend === 'increasing' ? 'destructive' : 'secondary'}>
                          {insight.trend}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">AFFECTED SECTORS</label>
                        <div className="flex gap-1 mt-1">
                          {insight.sectors.map(sector => (
                            <Badge key={sector} variant="secondary" className="text-xs">
                              {sector}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">DOMAINS</label>
                        <div className="flex gap-1 mt-1">
                          {insight.domains.map(domain => (
                            <Badge key={domain} variant="outline" className="text-xs">
                              {domain}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">CONFIDENCE</label>
                          <Progress value={insight.confidence * 100} className="w-20 mt-1" />
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Last seen: {new Date(insight.lastSeen).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="heatmap" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5" />
                Rejection Heatmap by Sector & Domain
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {rejectionHeatmap.map((cell, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className={`w-4 h-4 rounded ${getHeatmapColor(cell.rejectionRate)}`} />
                      <div>
                        <div className="font-medium">{cell.domain}</div>
                        <div className="text-sm text-muted-foreground">{cell.sector}</div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="font-medium">{Math.round(cell.rejectionRate * 100)}% rejection rate</div>
                      <div className="text-sm text-muted-foreground">{cell.rejectionCount} rejections</div>
                    </div>
                    
                    <div className="max-w-xs">
                      <div className="text-xs font-medium mb-1">Common Reasons:</div>
                      <div className="flex flex-wrap gap-1">
                        {cell.commonReasons.slice(0, 2).map(reason => (
                          <Badge key={reason} variant="outline" className="text-xs">
                            {reason}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Heavy Equipment Sector Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    <span>High rejection rate for "third-party vendor" criteria</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <span>Consistently rejects "cloud security" standards</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Recommendation: Focus on operational security and physical asset protection
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Mining Sector Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    <span>Prefers "regulatory compliance" over "best practice"</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    <span>Rejects criteria requiring "real-time monitoring"</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Recommendation: Emphasize compliance-first language and established frameworks
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};