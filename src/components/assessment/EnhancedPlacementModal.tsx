import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, FileText, Clock, ArrowRight, Split } from 'lucide-react';

interface PlacementScenario {
  scenario: 'better_placement' | 'split_required' | 'same_domain_different_mps' | 'future_domain' | 'past_domain' | 'duplicate' | 'fits_current';
  suggestion: {
    targetDomain?: string;
    targetMPS?: string;
    rationale?: string;
    action?: string;
    duplicateOf?: string;
    splitSuggestion?: {
      criterion1: string;
      criterion2: string;
      reasoning: string;
    };
  };
  criteriaId?: string;
  originalStatement?: string;
  originalSummary?: string;
}

interface EnhancedPlacementModalProps {
  isOpen: boolean;
  onClose: () => void;
  placementData: PlacementScenario | null;
  onApprove?: (data: PlacementScenario) => void;
  onDefer?: (data: PlacementScenario) => void;
  onReject?: (data: PlacementScenario) => void;
  onSplit?: (data: PlacementScenario) => void;
}

export const EnhancedPlacementModal: React.FC<EnhancedPlacementModalProps> = ({
  isOpen,
  onClose,
  placementData,
  onApprove,
  onDefer,
  onReject,
  onSplit
}) => {
  if (!placementData) return null;

  const getScenarioConfig = (scenario: string) => {
    switch (scenario) {
      case 'better_placement':
        return {
          icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
          title: 'Smart MPS Placement Detected',
          description: 'Maturion detected: This criterion looks like it fits better under:',
          variant: 'warning' as const,
          actions: ['approve', 'defer', 'reject']
        };
      case 'split_required':
        return {
          icon: <Split className="h-5 w-5 text-blue-500" />,
          title: 'Criterion Split Recommended',
          description: 'This criterion covers multiple requirements and should be split.',
          variant: 'info' as const,
          actions: ['split', 'reject']
        };
      case 'same_domain_different_mps':
        return {
          icon: <ArrowRight className="h-5 w-5 text-blue-500" />,
          title: 'Different MPS in Same Domain',
          description: 'This criterion fits better in a different MPS within the current domain.',
          variant: 'info' as const,
          actions: ['approve', 'defer']
        };
      case 'future_domain':
        return {
          icon: <Clock className="h-5 w-5 text-purple-500" />,
          title: 'Future Domain Detected',
          description: 'This criterion belongs to a domain that will be configured later.',
          variant: 'info' as const,
          actions: ['defer', 'reject']
        };
      case 'past_domain':
        return {
          icon: <ArrowRight className="h-5 w-5 text-orange-500" />,
          title: 'Past Domain Detected',
          description: 'This criterion belongs to a domain that was already configured.',
          variant: 'warning' as const,
          actions: ['approve', 'defer']
        };
      case 'duplicate':
        return {
          icon: <FileText className="h-5 w-5 text-red-500" />,
          title: 'Duplicate Criterion Detected',
          description: 'A similar criterion already exists.',
          variant: 'destructive' as const,
          actions: ['replace', 'keep_both', 'reject']
        };
      default:
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          title: 'Placement Analysis',
          description: 'AI analysis of criterion placement.',
          variant: 'default' as const,
          actions: ['approve', 'reject']
        };
    }
  };

  const config = getScenarioConfig(placementData.scenario);

  const handleApprove = () => {
    onApprove?.(placementData);
    onClose();
  };

  const handleDefer = () => {
    onDefer?.(placementData);
    onClose();
  };

  const handleReject = () => {
    onReject?.(placementData);
    onClose();
  };

  const handleSplit = () => {
    onSplit?.(placementData);
    onClose();
  };

  const renderActionButtons = () => {
    const buttons = [];

    if (config.actions.includes('approve')) {
      buttons.push(
        <Button key="approve" onClick={handleApprove} className="bg-blue-500 hover:bg-blue-600">
          Defer to Correct Domain
        </Button>
      );
    }

    if (config.actions.includes('defer')) {
      buttons.push(
        <Button key="defer" variant="secondary" onClick={handleDefer}>
          Defer for Review
        </Button>
      );
    }

    if (config.actions.includes('split')) {
      buttons.push(
        <Button key="split" onClick={handleSplit}>
          Split Criterion
        </Button>
      );
    }

    if (config.actions.includes('replace')) {
      buttons.push(
        <Button key="replace" onClick={handleApprove} className="bg-blue-500 hover:bg-blue-600">
          Replace Existing
        </Button>
      );
    }

    if (config.actions.includes('keep_both')) {
      buttons.push(
        <Button key="keep_both" variant="secondary" onClick={handleDefer}>
          Keep Both
        </Button>
      );
    }

    if (config.actions.includes('reject')) {
      buttons.push(
        <Button key="reject" variant="outline" onClick={handleReject}>
          {placementData.scenario === 'duplicate' ? 'Skip' : 'Keep Here'}
        </Button>
      );
    }

    return buttons;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {config.icon}
            {config.title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {placementData.scenario === 'better_placement' && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-start gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    <strong>Maturion detected:</strong> This criterion looks like it fits better under:
                  </p>
                  {placementData.suggestion.targetDomain && (
                    <div className="space-y-1">
                      <div className="text-lg font-semibold text-blue-600">
                        {placementData.suggestion.targetDomain}
                        {placementData.suggestion.targetMPS && ` - MPS ${placementData.suggestion.targetMPS}`}
                      </div>
                      <p className="text-sm text-gray-600 font-medium">
                        {placementData.suggestion.targetDomain.includes('Risk') ? 'Risk Management' : 
                         placementData.suggestion.targetDomain.includes('Leadership') ? 'Strategic Management' :
                         placementData.suggestion.targetDomain.includes('Process') ? 'Operational Processes' :
                         placementData.suggestion.targetDomain.includes('People') ? 'Human Resources' :
                         placementData.suggestion.targetDomain.includes('Protection') ? 'Security & Compliance' :
                         placementData.suggestion.targetDomain.includes('Proof') ? 'Measurement & Validation' :
                         'Domain Management'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {placementData.scenario === 'duplicate' && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Duplicate Detection:</strong> This criterion appears to be very similar to an existing one. 
                You can replace the existing criterion, skip adding this one, or revise your entry to be more distinct.
              </AlertDescription>
            </Alert>
          )}

          {placementData.suggestion.rationale && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2 text-gray-900">Reason:</h4>
              <p className="text-sm text-gray-700">
                {placementData.suggestion.rationale}
              </p>
            </div>
          )}

          {placementData.suggestion.splitSuggestion && (
            <div>
              <h4 className="font-medium mb-2">Split Suggestion:</h4>
              <div className="space-y-2">
                <Card className="border-blue-200">
                  <CardContent className="pt-3">
                    <p className="text-sm font-medium">Criterion 1:</p>
                    <p className="text-sm text-muted-foreground">
                      {placementData.suggestion.splitSuggestion.criterion1}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-blue-200">
                  <CardContent className="pt-3">
                    <p className="text-sm font-medium">Criterion 2:</p>
                    <p className="text-sm text-muted-foreground">
                      {placementData.suggestion.splitSuggestion.criterion2}
                    </p>
                  </CardContent>
                </Card>
                <p className="text-xs text-muted-foreground">
                  <strong>Reasoning:</strong> {placementData.suggestion.splitSuggestion.reasoning}
                </p>
              </div>
            </div>
          )}

          {placementData.suggestion.duplicateOf && (
            <div>
              <h4 className="font-medium mb-1">Conflicts With:</h4>
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="pt-3">
                  <p className="text-sm">
                    {placementData.suggestion.duplicateOf}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {(placementData.originalStatement || placementData.originalSummary) && (
            <div>
              <h4 className="font-medium mb-1">Current Criterion:</h4>
              <Card className="border-gray-200">
                <CardContent className="pt-3">
                  {placementData.originalStatement && (
                    <p className="text-sm mb-1">
                      <strong>Statement:</strong> {placementData.originalStatement}
                    </p>
                  )}
                  {placementData.originalSummary && (
                    <p className="text-sm text-muted-foreground">
                      <strong>Summary:</strong> {placementData.originalSummary}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
          
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground mb-3">
              I'll hold it there and bring it up when you reach that step. Continue?
            </p>
            <div className="flex justify-end space-x-2">
              {renderActionButtons()}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};