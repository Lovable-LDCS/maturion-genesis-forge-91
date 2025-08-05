import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Brain, CheckCircle, XCircle, TrendingUp, Eye, Settings } from 'lucide-react';
import { useAILearningPatterns } from '@/hooks/useAILearningPatterns';
import { useLearningRuleConfigurations } from '@/hooks/useLearningRuleConfigurations';
import { useLearningModelSnapshots } from '@/hooks/useLearningModelSnapshots';

export const PatternRecognitionDashboard = () => {
  const [selectedTimeframe, setSelectedTimeframe] = useState('7d');
  const { patterns, isLoading: patternsLoading, getPatternStats } = useAILearningPatterns();
  const { rules, isLoading: rulesLoading, getRuleStats } = useLearningRuleConfigurations();
  const { snapshots, isLoading: snapshotsLoading, getSnapshotStats } = useLearningModelSnapshots();

  const patternStats = getPatternStats();
  const ruleStats = getRuleStats();
  const snapshotStats = getSnapshotStats();

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'critical': return 'bg-red-500';
      case 'strong': return 'bg-orange-500';
      case 'moderate': return 'bg-yellow-500';
      case 'weak': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getValidationStatusIcon = (status: string) => {
    switch (status) {
      case 'human_approved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'human_rejected': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'unvalidated': return <Eye className="h-4 w-4 text-yellow-500" />;
      default: return <Settings className="h-4 w-4 text-gray-500" />;
    }
  };

  const isLoading = patternsLoading || rulesLoading || snapshotsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-0 pb-2">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/3 mt-2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Pattern Recognition Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor AI learning patterns and self-improvement capabilities
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-blue-50">
            <Brain className="h-3 w-3 mr-1" />
            Phase 5: Learning Simulation
          </Badge>
          <Badge variant="secondary">
            ⚠️ No Auto-Activation
          </Badge>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Learning Patterns</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patternStats.total}</div>
            <p className="text-xs text-muted-foreground">
              +{patternStats.validated} validated, {patternStats.needingValidation} pending
            </p>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span>Critical: {patternStats.critical}</span>
                <span>Strong: {patternStats.strong}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Learning Rules</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ruleStats.total}</div>
            <p className="text-xs text-muted-foreground">
              {ruleStats.enabled} enabled, {ruleStats.autoActivationReady} auto-ready
            </p>
            <div className="mt-2">
              <Progress value={(ruleStats.enabled / ruleStats.total) * 100} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Model Snapshots</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{snapshotStats.total}</div>
            <p className="text-xs text-muted-foreground">
              {snapshotStats.rollbackAvailable} rollback ready
            </p>
            <div className="mt-2 flex items-center space-x-2">
              {snapshotStats.hasBaseline && (
                <Badge variant="outline" className="text-xs">Baseline Set</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">Simulation</div>
            <p className="text-xs text-muted-foreground">
              Learning logic dormant until activation
            </p>
            <div className="mt-2">
              <Badge variant="secondary">Phase 5 Ready</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Views */}
      <Tabs defaultValue="patterns" className="space-y-4">
        <TabsList>
          <TabsTrigger value="patterns">Learning Patterns</TabsTrigger>
          <TabsTrigger value="rules">Learning Rules</TabsTrigger>
          <TabsTrigger value="snapshots">Model Snapshots</TabsTrigger>
          <TabsTrigger value="simulation">Simulation Controls</TabsTrigger>
        </TabsList>

        <TabsContent value="patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detected Learning Patterns</CardTitle>
              <CardDescription>
                AI-identified patterns from user feedback and content analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              {patterns.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No learning patterns detected yet. Upload feedback data to begin pattern recognition.
                </div>
              ) : (
                <div className="space-y-4">
                  {patterns.slice(0, 10).map((pattern) => (
                    <div key={pattern.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium">{pattern.pattern_text}</h4>
                          <Badge 
                            variant="outline" 
                            className={`${getStrengthColor(pattern.pattern_strength)} text-white`}
                          >
                            {pattern.pattern_strength}
                          </Badge>
                          {getValidationStatusIcon(pattern.validation_status)}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {pattern.pattern_category} • Confidence: {pattern.confidence_score}% • 
                          Frequency: {pattern.frequency_count}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {pattern.affected_domains.map((domain) => (
                            <Badge key={domain} variant="secondary" className="text-xs">
                              {domain}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={pattern.is_active ? "default" : "secondary"}>
                          {pattern.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Learning Rule Configurations</CardTitle>
              <CardDescription>
                Configurable thresholds and rules governing AI learning behavior
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No learning rules configured. Set up learning thresholds to control AI behavior.
                </div>
              ) : (
                <div className="space-y-4">
                  {rules.map((rule) => (
                    <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium">{rule.rule_name}</h4>
                          <Badge variant="outline">{rule.rule_type}</Badge>
                          <Badge variant="secondary">Priority: {rule.priority_level}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {rule.rule_category} • Triggered: {rule.trigger_count} times
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {rule.applies_to_content_types.map((type) => (
                            <Badge key={type} variant="secondary" className="text-xs">
                              {type}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={rule.is_enabled ? "default" : "secondary"}>
                          {rule.is_enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                        <Badge variant={rule.auto_activation_enabled ? "destructive" : "secondary"}>
                          {rule.auto_activation_enabled ? 'Auto-Ready' : 'Manual'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="snapshots" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Learning Model Snapshots</CardTitle>
              <CardDescription>
                Saved states of the learning model for rollback and comparison
              </CardDescription>
            </CardHeader>
            <CardContent>
              {snapshots.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No model snapshots created yet. Create snapshots to track learning progress.
                </div>
              ) : (
                <div className="space-y-4">
                  {snapshots.slice(0, 8).map((snapshot) => (
                    <div key={snapshot.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium">{snapshot.snapshot_name}</h4>
                          <Badge variant="outline">{snapshot.snapshot_type}</Badge>
                          {snapshot.is_baseline && (
                            <Badge variant="default">Baseline</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {snapshot.pattern_count} patterns • {snapshot.active_rules_count} active rules • 
                          Created: {new Date(snapshot.created_at).toLocaleDateString()}
                        </p>
                        {snapshot.snapshot_reason && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {snapshot.snapshot_reason}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={snapshot.rollback_available ? "default" : "secondary"}>
                          {snapshot.rollback_available ? 'Rollback Ready' : 'Archived'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="simulation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Phase 5 Simulation Controls</CardTitle>
              <CardDescription>
                Controls for testing and validating learning logic before activation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg border">
                  <div className="flex items-center space-x-2 mb-2">
                    <Brain className="h-5 w-5 text-blue-600" />
                    <h3 className="font-medium text-blue-900">Simulation Mode Active</h3>
                  </div>
                  <p className="text-sm text-blue-700">
                    Phase 5 learning logic is currently in simulation mode. No automated learning, 
                    pattern extraction, or content modification will occur until explicitly activated.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="border-dashed">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Pattern Detection</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground mb-3">
                        Simulate pattern recognition from existing feedback
                      </p>
                      <Button variant="outline" size="sm" disabled>
                        Run Pattern Simulation
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border-dashed">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Rule Testing</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground mb-3">
                        Test learning rules against sample content
                      </p>
                      <Button variant="outline" size="sm" disabled>
                        Test Rules
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <h3 className="font-medium text-yellow-900">Activation Requirements</h3>
                  </div>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• Sufficient feedback data for pattern confidence</li>
                    <li>• Human oversight validation of detected patterns</li>
                    <li>• QA approval for learning rule configurations</li>
                    <li>• Baseline model snapshot established</li>
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