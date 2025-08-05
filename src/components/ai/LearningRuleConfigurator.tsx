import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Settings, Plus, Trash2, AlertTriangle, Save, RotateCcw } from 'lucide-react';
import { useLearningRuleConfigurations } from '@/hooks/useLearningRuleConfigurations';
import { useToast } from '@/hooks/use-toast';

export const LearningRuleConfigurator = () => {
  const { rules, createRule, updateRule, deleteRule, toggleRuleEnabled, loadDefaultRules, getRuleStats } = useLearningRuleConfigurations();
  const { toast } = useToast();
  const [showNewRuleForm, setShowNewRuleForm] = useState(false);
  const [newRule, setNewRule] = useState({
    rule_name: '',
    rule_type: '',
    rule_category: '',
    rule_parameters: {},
    threshold_values: {},
    is_enabled: true,
    applies_to_content_types: [] as string[],
    applies_to_domains: [] as string[],
    priority_level: 5,
    auto_activation_enabled: false
  });

  const ruleStats = getRuleStats();

  const ruleTypes = [
    { value: 'pattern_detection', label: 'Pattern Detection' },
    { value: 'confidence_threshold', label: 'Confidence Threshold' },
    { value: 'auto_validation', label: 'Auto Validation' },
    { value: 'suppression_trigger', label: 'Suppression Trigger' }
  ];

  const ruleCategories = [
    { value: 'content_quality', label: 'Content Quality' },
    { value: 'sector_alignment', label: 'Sector Alignment' },
    { value: 'compliance_accuracy', label: 'Compliance Accuracy' },
    { value: 'user_preference', label: 'User Preference' }
  ];

  const contentTypes = [
    { value: 'criteria', label: 'Criteria' },
    { value: 'evidence', label: 'Evidence' },
    { value: 'mps_statement', label: 'MPS Statement' },
    { value: 'intent', label: 'Intent' }
  ];

  const handleCreateRule = async () => {
    if (!newRule.rule_name || !newRule.rule_type || !newRule.rule_category) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const success = await createRule(newRule);
    if (success) {
      toast({
        title: "Success",
        description: "Learning rule created successfully"
      });
      setShowNewRuleForm(false);
      setNewRule({
        rule_name: '',
        rule_type: '',
        rule_category: '',
        rule_parameters: {},
        threshold_values: {},
        is_enabled: true,
        applies_to_content_types: [],
        applies_to_domains: [],
        priority_level: 5,
        auto_activation_enabled: false
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to create learning rule",
        variant: "destructive"
      });
    }
  };

  const handleToggleEnabled = async (ruleId: string, isEnabled: boolean) => {
    const success = await toggleRuleEnabled(ruleId, isEnabled);
    if (success) {
      toast({
        title: "Success",
        description: `Rule ${isEnabled ? 'enabled' : 'disabled'} successfully`
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to update rule status",
        variant: "destructive"
      });
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    const success = await deleteRule(ruleId);
    if (success) {
      toast({
        title: "Success",
        description: "Learning rule deleted successfully"
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to delete learning rule",
        variant: "destructive"
      });
    }
  };

  const handleLoadDefaults = async () => {
    const success = await loadDefaultRules();
    if (success) {
      toast({
        title: "Success",
        description: "Default learning rules loaded successfully"
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to load default rules",
        variant: "destructive"
      });
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return 'bg-red-500';
    if (priority >= 6) return 'bg-orange-500';
    if (priority >= 4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Learning Rule Configurator</h2>
          <p className="text-muted-foreground">
            Configure thresholds and rules that govern AI learning behavior
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-blue-50">
            <Settings className="h-3 w-3 mr-1" />
            Phase 5 Configuration
          </Badge>
          <Button onClick={handleLoadDefaults} variant="outline" size="sm">
            <RotateCcw className="h-4 w-4 mr-2" />
            Load Defaults
          </Button>
          <Button onClick={() => setShowNewRuleForm(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Rule
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ruleStats.total}</div>
            <p className="text-xs text-muted-foreground">
              {ruleStats.enabled} enabled, {ruleStats.disabled} disabled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Auto-Activation Ready</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{ruleStats.autoActivationReady}</div>
            <p className="text-xs text-muted-foreground">
              Rules ready for Phase 5 activation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{ruleStats.highPriority}</div>
            <p className="text-xs text-muted-foreground">
              Priority level 8+ rules
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pattern Detection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ruleStats.patternDetection}</div>
            <p className="text-xs text-muted-foreground">
              Pattern recognition rules
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Warning Alert */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Phase 5 Notice:</strong> All auto-activation settings are currently disabled. 
          Rules will only be used for simulation and testing until Phase 5 is fully activated.
        </AlertDescription>
      </Alert>

      {/* New Rule Form */}
      {showNewRuleForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Learning Rule</CardTitle>
            <CardDescription>
              Define a new rule to govern AI learning behavior
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="rule_name">Rule Name *</Label>
                <Input
                  id="rule_name"
                  value={newRule.rule_name}
                  onChange={(e) => setNewRule({ ...newRule, rule_name: e.target.value })}
                  placeholder="e.g., High Confidence Pattern Detection"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rule_type">Rule Type *</Label>
                <Select
                  value={newRule.rule_type}
                  onValueChange={(value) => setNewRule({ ...newRule, rule_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select rule type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ruleTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rule_category">Rule Category *</Label>
                <Select
                  value={newRule.rule_category}
                  onValueChange={(value) => setNewRule({ ...newRule, rule_category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {ruleCategories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority_level">Priority Level: {newRule.priority_level}</Label>
                <Slider
                  id="priority_level"
                  min={1}
                  max={10}
                  step={1}
                  value={[newRule.priority_level]}
                  onValueChange={(value) => setNewRule({ ...newRule, priority_level: value[0] })}
                  className="mt-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Low</span>
                  <span>Medium</span>
                  <span>High</span>
                  <span>Critical</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Applies to Content Types</Label>
              <div className="flex flex-wrap gap-2">
                {contentTypes.map((type) => (
                  <Button
                    key={type.value}
                    variant={newRule.applies_to_content_types.includes(type.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      const updated = newRule.applies_to_content_types.includes(type.value)
                        ? newRule.applies_to_content_types.filter(t => t !== type.value)
                        : [...newRule.applies_to_content_types, type.value];
                      setNewRule({ ...newRule, applies_to_content_types: updated });
                    }}
                  >
                    {type.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_enabled"
                  checked={newRule.is_enabled}
                  onCheckedChange={(checked) => setNewRule({ ...newRule, is_enabled: checked })}
                />
                <Label htmlFor="is_enabled">Enable Rule</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="auto_activation"
                  checked={newRule.auto_activation_enabled}
                  onCheckedChange={(checked) => setNewRule({ ...newRule, auto_activation_enabled: checked })}
                  disabled
                />
                <Label htmlFor="auto_activation" className="text-muted-foreground">
                  Auto-Activation (Phase 5 only)
                </Label>
              </div>
            </div>

            <div className="flex space-x-2">
              <Button onClick={handleCreateRule}>
                <Save className="h-4 w-4 mr-2" />
                Create Rule
              </Button>
              <Button variant="outline" onClick={() => setShowNewRuleForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Configured Learning Rules</CardTitle>
          <CardDescription>
            Manage existing learning rules and their configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No learning rules configured yet. Create your first rule to begin.
            </div>
          ) : (
            <div className="space-y-4">
              {rules.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-medium">{rule.rule_name}</h4>
                      <Badge variant="outline">{rule.rule_type}</Badge>
                      <Badge variant="secondary">{rule.rule_category}</Badge>
                      <Badge 
                        variant="outline" 
                        className={`${getPriorityColor(rule.priority_level)} text-white`}
                      >
                        Priority {rule.priority_level}
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-muted-foreground mb-2">
                      Triggered: {rule.trigger_count} times
                      {rule.last_triggered_at && (
                        <span> • Last: {new Date(rule.last_triggered_at).toLocaleDateString()}</span>
                      )}
                      {rule.effectiveness_score && (
                        <span> • Effectiveness: {rule.effectiveness_score}%</span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {rule.applies_to_content_types.map((type) => (
                        <Badge key={type} variant="secondary" className="text-xs">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={rule.is_enabled}
                      onCheckedChange={(checked) => handleToggleEnabled(rule.id, checked)}
                    />
                    <Badge variant={rule.auto_activation_enabled ? "destructive" : "secondary"}>
                      {rule.auto_activation_enabled ? 'Auto-Ready' : 'Manual'}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteRule(rule.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
