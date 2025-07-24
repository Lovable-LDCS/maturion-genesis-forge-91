import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';

interface CriterionModalProps {
  isOpen: boolean;
  onClose: () => void;
  mpsId: string;
  onSuccess: () => void;
  onShowPlacementModal?: (placementData: any) => void;
}

export const CriterionModal: React.FC<CriterionModalProps> = ({
  isOpen,
  onClose,
  mpsId,
  onSuccess,
  onShowPlacementModal
}) => {
  const [statement, setStatement] = useState('');
  const [summary, setSummary] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!statement.trim() || !summary.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both statement and summary.",
        variant: "destructive"
      });
      return;
    }

    if (!currentOrganization?.id) {
      toast({
        title: "Error",
        description: "Organization not found.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Simple implementation - just insert the criterion
      const { data, error } = await supabase
        .from('criteria')
        .insert({
          organization_id: currentOrganization.id,
          mps_id: mpsId,
          statement: statement.trim(),
          summary: summary.trim(),
          status: 'not_started',
          criteria_number: `${Date.now()}`, // Temporary - should be properly generated
          created_by: currentOrganization.id,
          updated_by: currentOrganization.id
        })
        .select()
        .single();

      if (error) throw error;

      setStatement('');
      setSummary('');
      onSuccess();
      onClose();
      
      toast({
        title: "Success",
        description: "Criterion added successfully!",
        variant: "default"
      });
    } catch (error) {
      console.error('Error adding criterion:', error);
      toast({
        title: "Error",
        description: "Failed to add criterion. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setStatement('');
    setSummary('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Custom Criterion</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="statement">Criterion Statement</Label>
            <Textarea
              id="statement"
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="Enter the criterion statement..."
              className="min-h-[100px]"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="summary">Summary</Label>
            <Input
              id="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Brief summary of the criterion..."
              required
            />
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isProcessing || !statement.trim() || !summary.trim()}
            >
              {isProcessing ? 'Processing...' : 'Add Criterion'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};