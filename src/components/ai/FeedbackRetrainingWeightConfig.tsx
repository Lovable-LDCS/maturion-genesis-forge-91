import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, RotateCcw, AlertTriangle } from 'lucide-react';
import { useFeedbackRetrainingWeights } from '@/hooks/useFeedbackRetrainingWeights';
import { useToast } from '@/hooks/use-toast';

export const FeedbackRetrainingWeightConfig = () => {
  const { weights, isLoading, updateWeight, deleteWeight, resetToDefaults, getCriticalWeights } = useFeedbackRetrainingWeights();
  const { toast } = useToast();
  
  const [newWeight, setNewWeight] = useState({
    feedbackType: '',
    feedbackCategory: '',
    weightMultiplier: 1.0,
    isCritical: false,
    appliesToContentTypes: [] as string[],
  });

  const feedbackTypes = [
    { value: 'approved', label: 'Approved' },
    { value: 'needs_correction', label: 'Needs Correction' },
    { value: 'rejected', label: 'Rejected' },
  ];

  const feedbackCategories = [
    { value: 'accuracy', label: 'Accuracy Issues' },
    { value: 'grammar', label: 'Grammar/Language' },
    { value: 'hallucination', label: 'Hallucination/False Info' },
    { value: 'relevance', label: 'Relevance/Context' },
    { value: 'completeness', label: 'Completeness' },
    { value: 'clarity', label: 'Clarity/Understanding' },
    { value: 'other', label: 'Other' },
  ];

  const contentTypes = ['criteria', 'evidence', 'intent', 'mps'];

  const handleAddWeight = async () => {
    if (!newWeight.feedbackType || !newWeight.feedbackCategory) {
      toast({
        title: "Missing Information",
        description: "Please select both feedback type and category",
        variant: "destructive",
      });
      return;
    }

    const success = await updateWeight(newWeight);
    if (success) {
      setNewWeight({
        feedbackType: '',
        feedbackCategory: '',
        weightMultiplier: 1.0,
        isCritical: false,
        appliesToContentTypes: [],
      });
    }
  };

  const handleWeightChange = async (weightId: string, newMultiplier: number) => {
    const weight = weights.find(w => w.id === weightId);
    if (!weight) return;

    await updateWeight({
      feedbackType: weight.feedback_type,
      feedbackCategory: weight.feedback_category,
      weightMultiplier: newMultiplier,
      isCritical: weight.is_critical,
      appliesToContentTypes: weight.applies_to_content_types,
    });
  };

  const handleCriticalChange = async (weightId: string, isCritical: boolean) => {
    const weight = weights.find(w => w.id === weightId);
    if (!weight) return;

    await updateWeight({
      feedbackType: weight.feedback_type,
      feedbackCategory: weight.feedback_category,
      weightMultiplier: weight.weight_multiplier,
      isCritical,
      appliesToContentTypes: weight.applies_to_content_types,
    });
  };

  const getWeightImpactLevel = (multiplier: number) => {
    if (multiplier >= 3.0) return { level: 'High', color: 'destructive' };
    if (multiplier >= 2.0) return { level: 'Medium', color: 'secondary' };
    if (multiplier >= 1.0) return { level: 'Low', color: 'outline' };
    return { level: 'Minimal', color: 'outline' };
  };

  const criticalWeights = getCriticalWeights();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI Feedback Weight Configuration</h2>
          <p className="text-muted-foreground">
            Configure how different types of feedback influence AI learning priorities
          </p>
        </div>
        <Button
          variant="outline"
          onClick={resetToDefaults}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Reset to Defaults
        </Button>
      </div>

      {/* Critical Weights Alert */}
      {criticalWeights.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-800">
              <AlertTriangle className="w-4 h-4" />
              Critical Learning Weights Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-700 mb-2">
              The following feedback types have critical learning weights and will heavily influence AI behavior:
            </p>
            <div className="flex flex-wrap gap-2">
              {criticalWeights.map((weight) => (
                <Badge key={weight.id} variant="secondary" className="text-xs">
                  {weight.feedback_type} / {weight.feedback_category} ({weight.weight_multiplier}x)
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add New Weight Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add New Weight Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="feedback-type">Feedback Type</Label>
              <Select onValueChange={(value) => setNewWeight({ ...newWeight, feedbackType: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select feedback type..." />
                </SelectTrigger>
                <SelectContent>
                  {feedbackTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="feedback-category">Feedback Category</Label>
              <Select onValueChange={(value) => setNewWeight({ ...newWeight, feedbackCategory: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {feedbackCategories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="weight-multiplier">Weight Multiplier</Label>
              <Input
                id="weight-multiplier"
                type="number"
                step="0.1"
                min="0.1"
                max="10.0"
                value={newWeight.weightMultiplier}
                onChange={(e) => setNewWeight({ ...newWeight, weightMultiplier: parseFloat(e.target.value) || 1.0 })}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is-critical"
                checked={newWeight.isCritical}
                onCheckedChange={(checked) => setNewWeight({ ...newWeight, isCritical: checked })}
              />
              <Label htmlFor="is-critical">Critical Learning Weight</Label>
            </div>
          </div>

          <Button onClick={handleAddWeight} disabled={isLoading} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Weight Configuration
          </Button>
        </CardContent>
      </Card>

      {/* Existing Weight Configurations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Weight Configurations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {weights.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No weight configurations found. Add some configurations to get started.
              </p>
            ) : (
              weights.map((weight) => {
                const impact = getWeightImpactLevel(weight.weight_multiplier);
                return (
                  <div key={weight.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{weight.feedback_type}</Badge>
                            <Badge variant="secondary">{weight.feedback_category}</Badge>
                            {weight.is_critical && (
                              <Badge variant="destructive" className="text-xs">Critical</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Learning impact: <Badge variant={impact.color as any}>{impact.level}</Badge>
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteWeight(weight.id)}
                        disabled={isLoading}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`weight-${weight.id}`}>Weight Multiplier</Label>
                        <Input
                          id={`weight-${weight.id}`}
                          type="number"
                          step="0.1"
                          min="0.1"
                          max="10.0"
                          value={weight.weight_multiplier}
                          onChange={(e) => handleWeightChange(weight.id, parseFloat(e.target.value) || 1.0)}
                          disabled={isLoading}
                        />
                      </div>

                      <div className="flex items-end space-x-2">
                        <Switch
                          id={`critical-${weight.id}`}
                          checked={weight.is_critical}
                          onCheckedChange={(checked) => handleCriticalChange(weight.id, checked)}
                          disabled={isLoading}
                        />
                        <Label htmlFor={`critical-${weight.id}`}>Critical Learning Weight</Label>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Learning Impact Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Learning Impact Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {weights.filter(w => w.feedback_type === 'approved').length}
              </p>
              <p className="text-sm text-muted-foreground">Positive Reinforcement Rules</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {weights.filter(w => w.feedback_type === 'needs_correction').length}
              </p>
              <p className="text-sm text-muted-foreground">Correction Learning Rules</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">
                {weights.filter(w => w.feedback_type === 'rejected').length}
              </p>
              <p className="text-sm text-muted-foreground">Rejection Learning Rules</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
