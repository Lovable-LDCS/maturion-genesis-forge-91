import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, FileText } from 'lucide-react';

interface PlacementData {
  scenario: string;
  suggestion: {
    targetMPS?: string;
    rationale?: string;
    action?: string;
  };
  criteriaId?: string;
}

interface PlacementModalProps {
  isOpen: boolean;
  onClose: () => void;
  placementData: PlacementData | null;
  onApprove?: (data: PlacementData) => void;
  onDefer?: (data: PlacementData) => void;
}

export const PlacementModal: React.FC<PlacementModalProps> = ({
  isOpen,
  onClose,
  placementData,
  onApprove,
  onDefer
}) => {
  if (!placementData) return null;

  const getScenarioIcon = (scenario: string) => {
    switch (scenario) {
      case 'better_placement':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'split_required':
        return <FileText className="h-5 w-5 text-blue-500" />;
      default:
        return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
  };

  const getScenarioTitle = (scenario: string) => {
    switch (scenario) {
      case 'better_placement':
        return 'Better Placement Suggested';
      case 'split_required':
        return 'Criterion Split Recommended';
      default:
        return 'Placement Analysis';
    }
  };

  const getScenarioDescription = (scenario: string) => {
    switch (scenario) {
      case 'better_placement':
        return 'AI analysis suggests this criterion would be better placed in a different MPS.';
      case 'split_required':
        return 'This criterion covers multiple requirements and should be split.';
      default:
        return 'AI analysis of criterion placement.';
    }
  };

  const handleApprove = () => {
    onApprove?.(placementData);
    onClose();
  };

  const handleDefer = () => {
    onDefer?.(placementData);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getScenarioIcon(placementData.scenario)}
            {getScenarioTitle(placementData.scenario)}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Analysis Results</CardTitle>
              <CardDescription>
                {getScenarioDescription(placementData.scenario)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {placementData.suggestion.targetMPS && (
                <div>
                  <Badge variant="outline" className="mb-2">
                    Suggested MPS: {placementData.suggestion.targetMPS}
                  </Badge>
                </div>
              )}
              
              {placementData.suggestion.rationale && (
                <div>
                  <h4 className="font-medium mb-1">Rationale:</h4>
                  <p className="text-sm text-muted-foreground">
                    {placementData.suggestion.rationale}
                  </p>
                </div>
              )}
              
              {placementData.suggestion.action && (
                <div>
                  <h4 className="font-medium mb-1">Recommended Action:</h4>
                  <p className="text-sm text-muted-foreground">
                    {placementData.suggestion.action}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {onDefer && (
              <Button variant="secondary" onClick={handleDefer}>
                Defer for Review
              </Button>
            )}
            {onApprove && (
              <Button onClick={handleApprove}>
                Apply Suggestion
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};