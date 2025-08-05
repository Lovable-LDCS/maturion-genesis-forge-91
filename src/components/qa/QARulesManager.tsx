import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Shield, 
  AlertTriangle, 
  Info, 
  Settings,
  Save,
  X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface QARule {
  id: string;
  rule_name: string;
  rule_type: string;
  rule_description: string;
  rule_config: any;
  is_active: boolean;
  severity_level: string;
  created_at: string;
  updated_at: string;
}

interface QARuleFormData {
  rule_name: string;
  rule_type: string;
  rule_description: string;
  rule_config: any;
  severity_level: string;
  is_active: boolean;
}

const defaultRuleConfig = {
  validation: { pattern: '', message: '' },
  threshold: { threshold: 0, metric: '', timeframe: '1h' },
  alert: { conditions: [], actions: [] },
  processing: { max_time: 30, retry_count: 3 }
};

export const QARulesManager: React.FC = () => {
  const [rules, setRules] = useState<QARule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<QARule | null>(null);
  const [formData, setFormData] = useState<QARuleFormData>({
    rule_name: '',
    rule_type: 'validation',
    rule_description: '',
    rule_config: defaultRuleConfig.validation,
    severity_level: 'warning',
    is_active: true
  });

  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (currentOrganization?.id) {
      fetchRules();
    }
  }, [currentOrganization?.id]);

  const fetchRules = async () => {
    if (!currentOrganization?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('qa_rules')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching QA rules:', error);
        return;
      }

      setRules(data || []);
      
    } catch (error) {
      console.error('Error in fetchRules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = () => {
    setEditingRule(null);
    setFormData({
      rule_name: '',
      rule_type: 'validation',
      rule_description: '',
      rule_config: defaultRuleConfig.validation,
      severity_level: 'warning',
      is_active: true
    });
    setIsEditDialogOpen(true);
  };

  const handleEditRule = (rule: QARule) => {
    setEditingRule(rule);
    setFormData({
      rule_name: rule.rule_name,
      rule_type: rule.rule_type,
      rule_description: rule.rule_description,
      rule_config: rule.rule_config,
      severity_level: rule.severity_level,
      is_active: rule.is_active
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      const { error } = await supabase
        .from('qa_rules')
        .delete()
        .eq('id', ruleId);

      if (error) {
        throw error;
      }

      await fetchRules();
      
      toast({
        title: "Rule deleted",
        description: "QA rule has been successfully deleted",
      });
      
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast({
        title: "Delete failed",
        description: "Failed to delete QA rule",
        variant: "destructive",
      });
    }
  };

  const handleSaveRule = async () => {
    if (!currentOrganization?.id || !user?.id) return;

    try {
      const ruleData = {
        organization_id: currentOrganization.id,
        rule_name: formData.rule_name,
        rule_type: formData.rule_type,
        rule_description: formData.rule_description,
        rule_config: formData.rule_config,
        severity_level: formData.severity_level,
        is_active: formData.is_active,
        updated_by: user.id
      };

      if (editingRule) {
        // Update existing rule
        const { error } = await supabase
          .from('qa_rules')
          .update(ruleData)
          .eq('id', editingRule.id);

        if (error) {
          throw error;
        }

        toast({
          title: "Rule updated",
          description: "QA rule has been successfully updated",
        });
      } else {
        // Create new rule
        const { error } = await supabase
          .from('qa_rules')
          .insert({
            ...ruleData,
            created_by: user.id
          });

        if (error) {
          throw error;
        }

        toast({
          title: "Rule created",
          description: "QA rule has been successfully created",
        });
      }

      await fetchRules();
      setIsEditDialogOpen(false);
      
    } catch (error) {
      console.error('Error saving rule:', error);
      toast({
        title: "Save failed",
        description: "Failed to save QA rule",
        variant: "destructive",
      });
    }
  };

  const handleRuleTypeChange = (type: string) => {
    setFormData(prev => ({
      ...prev,
      rule_type: type,
      rule_config: defaultRuleConfig[type as keyof typeof defaultRuleConfig] || {}
    }));
  };

  const updateRuleConfig = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      rule_config: {
        ...prev.rule_config,
        [key]: value
      }
    }));
  };

  const toggleRuleActive = async (ruleId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('qa_rules')
        .update({ is_active: isActive, updated_by: user?.id })
        .eq('id', ruleId);

      if (error) {
        throw error;
      }

      await fetchRules();
      
      toast({
        title: `Rule ${isActive ? 'activated' : 'deactivated'}`,
        description: `QA rule has been ${isActive ? 'activated' : 'deactivated'}`,
      });
      
    } catch (error) {
      console.error('Error toggling rule:', error);
      toast({
        title: "Update failed",
        description: "Failed to update rule status",
        variant: "destructive",
      });
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-600" />;
      default:
        return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'warning':
        return 'secondary';
      case 'info':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const renderRuleConfigForm = () => {
    switch (formData.rule_type) {
      case 'threshold':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="threshold">Threshold Value</Label>
              <Input
                id="threshold"
                type="number"
                value={formData.rule_config.threshold || 0}
                onChange={(e) => updateRuleConfig('threshold', parseFloat(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="metric">Metric</Label>
              <Select 
                value={formData.rule_config.metric || ''} 
                onValueChange={(value) => updateRuleConfig('metric', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select metric" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upload_success_rate">Upload Success Rate</SelectItem>
                  <SelectItem value="avg_processing_time">Average Processing Time</SelectItem>
                  <SelectItem value="rls_errors">RLS Errors</SelectItem>
                  <SelectItem value="validation_failures">Validation Failures</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="timeframe">Timeframe</Label>
              <Select 
                value={formData.rule_config.timeframe || '1h'} 
                onValueChange={(value) => updateRuleConfig('timeframe', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select timeframe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5m">5 minutes</SelectItem>
                  <SelectItem value="1h">1 hour</SelectItem>
                  <SelectItem value="1d">1 day</SelectItem>
                  <SelectItem value="1w">1 week</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
        
      case 'validation':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="pattern">Validation Pattern</Label>
              <Input
                id="pattern"
                value={formData.rule_config.pattern || ''}
                onChange={(e) => updateRuleConfig('pattern', e.target.value)}
                placeholder="e.g., ^A documented.*"
              />
            </div>
            <div>
              <Label htmlFor="message">Error Message</Label>
              <Input
                id="message"
                value={formData.rule_config.message || ''}
                onChange={(e) => updateRuleConfig('message', e.target.value)}
                placeholder="Custom validation error message"
              />
            </div>
          </div>
        );
        
      case 'processing':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="max_time">Max Processing Time (seconds)</Label>
              <Input
                id="max_time"
                type="number"
                value={formData.rule_config.max_time || 30}
                onChange={(e) => updateRuleConfig('max_time', parseInt(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="retry_count">Retry Count</Label>
              <Input
                id="retry_count"
                type="number"
                value={formData.rule_config.retry_count || 3}
                onChange={(e) => updateRuleConfig('retry_count', parseInt(e.target.value))}
              />
            </div>
          </div>
        );
        
      default:
        return (
          <div>
            <Label htmlFor="config">Rule Configuration (JSON)</Label>
            <Textarea
              id="config"
              value={JSON.stringify(formData.rule_config, null, 2)}
              onChange={(e) => {
                try {
                  const config = JSON.parse(e.target.value);
                  setFormData(prev => ({ ...prev, rule_config: config }));
                } catch (error) {
                  // Invalid JSON, ignore
                }
              }}
              rows={8}
            />
          </div>
        );
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">QA Rules Engine</h3>
          <p className="text-sm text-muted-foreground">
            Define and manage enforceable QA logic
          </p>
        </div>
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleCreateRule}>
              <Plus className="h-4 w-4 mr-2" />
              Create Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingRule ? 'Edit QA Rule' : 'Create QA Rule'}
              </DialogTitle>
              <DialogDescription>
                Configure a new quality assurance rule for your organization
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rule_name">Rule Name</Label>
                  <Input
                    id="rule_name"
                    value={formData.rule_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, rule_name: e.target.value }))}
                    placeholder="e.g., Upload Success Rate Threshold"
                  />
                </div>
                <div>
                  <Label htmlFor="rule_type">Rule Type</Label>
                  <Select value={formData.rule_type} onValueChange={handleRuleTypeChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="validation">Validation</SelectItem>
                      <SelectItem value="threshold">Threshold</SelectItem>
                      <SelectItem value="alert">Alert</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="rule_description">Description</Label>
                <Textarea
                  id="rule_description"
                  value={formData.rule_description}
                  onChange={(e) => setFormData(prev => ({ ...prev, rule_description: e.target.value }))}
                  placeholder="Describe what this rule does..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="severity_level">Severity Level</Label>
                  <Select 
                    value={formData.severity_level} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, severity_level: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
              </div>

              <div>
                <Label>Rule Configuration</Label>
                {renderRuleConfigForm()}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSaveRule}>
                  <Save className="h-4 w-4 mr-2" />
                  {editingRule ? 'Update' : 'Create'} Rule
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {rules.length > 0 ? (
          rules.map((rule) => (
            <Card key={rule.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getSeverityIcon(rule.severity_level)}
                      <h4 className="font-semibold">{rule.rule_name}</h4>
                      <Badge variant={getSeverityColor(rule.severity_level)}>
                        {rule.severity_level}
                      </Badge>
                      <Badge variant="outline">
                        {rule.rule_type}
                      </Badge>
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={(checked) => toggleRuleActive(rule.id, checked)}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {rule.rule_description}
                    </p>
                    <div className="text-xs text-muted-foreground">
                      Created: {new Date(rule.created_at).toLocaleDateString()}
                      {rule.updated_at !== rule.created_at && (
                        <span> • Updated: {new Date(rule.updated_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEditRule(rule)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleDeleteRule(rule.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              No QA rules configured. Create your first rule to start enforcing quality standards.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
};