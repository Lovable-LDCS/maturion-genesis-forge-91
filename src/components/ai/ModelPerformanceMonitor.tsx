import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, TrendingDown, Activity, Target, AlertCircle, BarChart3 } from 'lucide-react';

export const ModelPerformanceMonitor = () => {
  const [selectedMetric, setSelectedMetric] = useState('pattern_accuracy');
  const [timeframe, setTimeframe] = useState('7d');

  // Mock data for simulation - in real implementation, this would come from adaptive_learning_metrics table
  const mockPerformanceData = [
    { date: '2025-01-29', pattern_accuracy: 78, feedback_reduction: 45, content_quality: 82, user_satisfaction: 75 },
    { date: '2025-01-30', pattern_accuracy: 80, feedback_reduction: 48, content_quality: 84, user_satisfaction: 77 },
    { date: '2025-01-31', pattern_accuracy: 83, feedback_reduction: 52, content_quality: 86, user_satisfaction: 80 },
    { date: '2025-02-01', pattern_accuracy: 85, feedback_reduction: 55, content_quality: 88, user_satisfaction: 82 },
    { date: '2025-02-02', pattern_accuracy: 87, feedback_reduction: 58, content_quality: 90, user_satisfaction: 84 },
    { date: '2025-02-03', pattern_accuracy: 89, feedback_reduction: 62, content_quality: 91, user_satisfaction: 86 },
    { date: '2025-02-04', pattern_accuracy: 91, feedback_reduction: 65, content_quality: 93, user_satisfaction: 88 }
  ];

  const mockComparisonData = [
    { category: 'Pattern Detection', baseline: 75, current: 91, improvement: 21.3 },
    { category: 'Content Quality', baseline: 80, current: 93, improvement: 16.3 },
    { category: 'User Satisfaction', baseline: 70, current: 88, improvement: 25.7 },
    { category: 'Feedback Reduction', baseline: 40, current: 65, improvement: 62.5 }
  ];

  const mockTrendData = [
    { week: 'Week 1', patterns_detected: 12, validated: 8, rejected: 3, auto_applied: 0 },
    { week: 'Week 2', patterns_detected: 18, validated: 14, rejected: 2, auto_applied: 0 },
    { week: 'Week 3', patterns_detected: 25, validated: 20, rejected: 3, auto_applied: 0 },
    { week: 'Week 4', patterns_detected: 31, validated: 26, rejected: 2, auto_applied: 0 }
  ];

  const metricDefinitions = {
    pattern_accuracy: {
      title: 'Pattern Accuracy',
      description: 'Percentage of AI-detected patterns validated by humans',
      unit: '%',
      target: 85,
      current: 91
    },
    feedback_reduction: {
      title: 'Feedback Reduction',
      description: 'Reduction in user feedback due to improved AI content',
      unit: '%',
      target: 60,
      current: 65
    },
    content_quality: {
      title: 'Content Quality Score',
      description: 'Overall quality rating of AI-generated content',
      unit: '%',
      target: 90,
      current: 93
    },
    user_satisfaction: {
      title: 'User Satisfaction',
      description: 'User satisfaction with AI-generated content',
      unit: '%',
      target: 80,
      current: 88
    }
  };

  const currentMetric = metricDefinitions[selectedMetric as keyof typeof metricDefinitions];

  const getTrendIcon = (current: number, target: number) => {
    if (current >= target) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (current >= target * 0.8) return <Activity className="h-4 w-4 text-yellow-500" />;
    return <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  const getTrendColor = (current: number, target: number) => {
    if (current >= target) return 'text-green-600';
    if (current >= target * 0.8) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Model Performance Monitor</h2>
          <p className="text-muted-foreground">
            Track AI learning effectiveness and performance metrics
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-blue-50">
            <BarChart3 className="h-3 w-3 mr-1" />
            Performance Analytics
          </Badge>
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        {Object.entries(metricDefinitions).map(([key, metric]) => (
          <Card key={key} className={selectedMetric === key ? 'ring-2 ring-primary' : ''}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
              {getTrendIcon(metric.current, metric.target)}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getTrendColor(metric.current, metric.target)}`}>
                {metric.current}{metric.unit}
              </div>
              <p className="text-xs text-muted-foreground">
                Target: {metric.target}{metric.unit}
              </p>
              <div className="mt-2">
                <Progress 
                  value={(metric.current / metric.target) * 100} 
                  className="h-2"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 p-0 h-auto text-xs"
                onClick={() => setSelectedMetric(key)}
              >
                View Details
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Performance Trends</TabsTrigger>
          <TabsTrigger value="comparison">Baseline Comparison</TabsTrigger>
          <TabsTrigger value="patterns">Pattern Analytics</TabsTrigger>
          <TabsTrigger value="simulation">Simulation Results</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Trend: {currentMetric.title}</CardTitle>
              <CardDescription>
                {currentMetric.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mockPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      labelFormatter={(date) => new Date(date).toLocaleDateString()}
                      formatter={(value: number) => [`${value}${currentMetric.unit}`, currentMetric.title]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey={selectedMetric} 
                      stroke="#2563eb" 
                      strokeWidth={2}
                      dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey={() => currentMetric.target}
                      stroke="#dc2626" 
                      strokeDasharray="5 5"
                      name="Target"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Baseline vs Current Performance</CardTitle>
              <CardDescription>
                Comparison of current performance against initial baseline measurements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mockComparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value: number) => [`${value}%`, '']} />
                    <Bar dataKey="baseline" fill="#94a3b8" name="Baseline" />
                    <Bar dataKey="current" fill="#2563eb" name="Current" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {mockComparisonData.map((item) => (
                  <Card key={item.category}>
                    <CardContent className="pt-4">
                      <div className="text-sm font-medium mb-2">{item.category}</div>
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        <span className="text-lg font-bold text-green-600">
                          +{item.improvement.toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {item.baseline}% → {item.current}%
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pattern Detection Analytics</CardTitle>
              <CardDescription>
                Analysis of pattern detection and validation over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mockTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="patterns_detected" 
                      stackId="1" 
                      stroke="#2563eb" 
                      fill="#3b82f6" 
                      name="Detected"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="validated" 
                      stackId="2" 
                      stroke="#059669" 
                      fill="#10b981" 
                      name="Validated"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="rejected" 
                      stackId="3" 
                      stroke="#dc2626" 
                      fill="#ef4444" 
                      name="Rejected"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">Detection Rate</div>
                      <Target className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="text-2xl font-bold text-blue-600 mt-2">
                      7.8/week
                    </div>
                    <p className="text-xs text-muted-foreground">
                      +158% from baseline
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">Validation Rate</div>
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="text-2xl font-bold text-green-600 mt-2">
                      84%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Above 80% target
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">Auto-Applied</div>
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                    </div>
                    <div className="text-2xl font-bold text-yellow-600 mt-2">
                      0
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Simulation mode only
                    </p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="simulation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Phase 5 Simulation Results</CardTitle>
              <CardDescription>
                Results from learning simulation tests and performance projections
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg border">
                  <div className="flex items-center space-x-2 mb-2">
                    <Activity className="h-5 w-5 text-blue-600" />
                    <h3 className="font-medium text-blue-900">Simulation Status</h3>
                  </div>
                  <p className="text-sm text-blue-700">
                    All performance metrics are based on simulation data. No actual learning 
                    modifications have been applied to production content.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Projected Impact</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm">Content Quality</span>
                          <span className="text-sm font-medium text-green-600">+16% improvement</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Feedback Volume</span>
                          <span className="text-sm font-medium text-green-600">-65% reduction</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Pattern Accuracy</span>
                          <span className="text-sm font-medium text-green-600">91% validation rate</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Activation Readiness</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Pattern Confidence</span>
                          <Badge variant="default">Ready</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Rule Validation</span>
                          <Badge variant="default">Ready</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Human Oversight</span>
                          <Badge variant="secondary">Pending</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <h3 className="font-medium text-yellow-900">Next Steps</h3>
                  </div>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• Complete Phase 4 feedback collection with sufficient data volume</li>
                    <li>• Validate all detected patterns through human oversight</li>
                    <li>• Establish baseline model snapshot for rollback capability</li>
                    <li>• Conduct final QA audit before activation approval</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};