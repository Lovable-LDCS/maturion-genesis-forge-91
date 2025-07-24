import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CriterionFormData {
  statement: string;
  summary: string;
}

interface EnhancedCriterionModalProps {
  isOpen: boolean;
  onClose: () => void;
  mpsId: string;
  mpsName: string;
  mpsNumber: number;
  onSubmitCriterion: (criterion: CriterionFormData) => Promise<{ success: boolean; placementModalTriggered?: boolean }>;
  isProcessing: boolean;
}

export const EnhancedCriterionModal: React.FC<EnhancedCriterionModalProps> = ({
  isOpen,
  onClose,
  mpsId,
  mpsName,
  mpsNumber,
  onSubmitCriterion,
  isProcessing
}) => {
  const [formData, setFormData] = useState<CriterionFormData>({
    statement: '',
    summary: ''
  });
  const [showAnotherPrompt, setShowAnotherPrompt] = useState(false);
  const [submissionCount, setSubmissionCount] = useState(0);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!formData.statement.trim() || !formData.summary.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both a criterion statement and summary.",
        variant: "destructive"
      });
      return;
    }

    const result = await onSubmitCriterion(formData);
    
    if (result.success) {
      setSubmissionCount(prev => prev + 1);
      
      // Reset form
      setFormData({ statement: '', summary: '' });
      
      // Show "add another?" prompt unless placement modal was triggered
      if (!result.placementModalTriggered) {
        setShowAnotherPrompt(true);
      } else {
        // If placement modal was triggered, just close this modal
        handleClose();
      }
    }
  };

  const handleAddAnother = () => {
    setShowAnotherPrompt(false);
    // Modal stays open with fresh form
  };

  const handleFinishAdding = () => {
    setShowAnotherPrompt(false);
    handleClose();
  };

  const handleClose = () => {
    setFormData({ statement: '', summary: '' });
    setShowAnotherPrompt(false);
    setSubmissionCount(0);
    onClose();
  };

  if (showAnotherPrompt) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Criterion Added Successfully!
            </DialogTitle>
          </DialogHeader>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Continue Adding Criteria?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="default">{submissionCount}</Badge>
                  <span className="text-sm">criteria added to MPS {mpsNumber}</span>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  Would you like to propose another criterion for this MPS?
                </p>
                
                <div className="flex gap-2">
                  <Button onClick={handleAddAnother} className="flex items-center gap-1">
                    <Plus className="h-4 w-4" />
                    Add Another
                  </Button>
                  <Button variant="outline" onClick={handleFinishAdding}>
                    Done Adding
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Add Custom Criterion - MPS {mpsNumber}: {mpsName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {submissionCount > 0 && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-700">
                    {submissionCount} criteria already added to this MPS
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
          
          <div>
            <Label htmlFor="criterion-statement">
              Criterion Statement
            </Label>
            <Textarea
              id="criterion-statement"
              placeholder="Enter the criterion statement..."
              value={formData.statement}
              onChange={(e) => setFormData(prev => ({ ...prev, statement: e.target.value }))}
              className="mt-1"
              rows={4}
              disabled={isProcessing}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Describe what specific requirement or control needs to be assessed
            </p>
          </div>
          
          <div>
            <Label htmlFor="criterion-summary">
              Summary
            </Label>
            <Input
              id="criterion-summary"
              placeholder="Brief summary of the criterion..."
              value={formData.summary}
              onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
              className="mt-1"
              disabled={isProcessing}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Concise explanation of what this criterion measures
            </p>
          </div>
          
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-4">
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">🧠 AI Enhancement</p>
                <p>
                  Maturion will analyze your criterion for proper placement, suggest improvements, 
                  and ensure it aligns with domain standards and best practices.
                </p>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.statement.trim() || !formData.summary.trim() || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Add Criterion'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};