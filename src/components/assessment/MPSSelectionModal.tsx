import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, HelpCircle, Check, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useAIMPSGeneration } from '@/hooks/useAIMPSGeneration';
import { useToast } from '@/hooks/use-toast';

interface MPS {
  id: string;
  number: string;
  title: string;
  intent: string;
  criteriaCount: number;
  selected: boolean;
  rationale?: string;
}

interface MPSSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  domainName: string;
  onAcceptMPSs: (selectedMPSs: MPS[]) => void;
}

export const MPSSelectionModal: React.FC<MPSSelectionModalProps> = ({
  isOpen,
  onClose,
  domainName,
  onAcceptMPSs
}) => {
  const { generatedMPSs, isLoading, error, generateMPSsForDomain } = useAIMPSGeneration();
  const { toast } = useToast();
  const [mpsList, setMpsList] = useState<MPS[]>([]);

  // Generate MPSs when modal opens
  useEffect(() => {
    if (isOpen && domainName) {
      generateMPSsForDomain(domainName);
    }
  }, [isOpen, domainName]);

  // Update local state when AI generation completes
  useEffect(() => {
    if (generatedMPSs.length > 0) {
      setMpsList(generatedMPSs);
    }
  }, [generatedMPSs]);

  // Show error toast if generation fails
  useEffect(() => {
    if (error) {
      toast({
        title: "AI Generation Notice",
        description: error + " Using fallback MPSs for now.",
        variant: "default"
      });
    }
  }, [error, toast]);

  const [expandedMPS, setExpandedMPS] = useState<Set<string>>(new Set());

  const toggleMPSExpansion = (mpsId: string) => {
    const newExpanded = new Set(expandedMPS);
    if (newExpanded.has(mpsId)) {
      newExpanded.delete(mpsId);
    } else {
      newExpanded.add(mpsId);
    }
    setExpandedMPS(newExpanded);
  };

  const toggleMPSSelection = (mpsId: string) => {
    setMpsList(prev => prev.map(mps => 
      mps.id === mpsId ? { ...mps, selected: !mps.selected } : mps
    ));
  };

  const handleAcceptAll = () => {
    const allSelected = mpsList.map(mps => ({ ...mps, selected: true }));
    setMpsList(allSelected);
  };

  const handleConfirmSelection = () => {
    const selectedMPSs = mpsList.filter(mps => mps.selected);
    onAcceptMPSs(selectedMPSs);
    onClose();
  };

  const selectedCount = mpsList.filter(mps => mps.selected).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold mb-2">
                {domainName} – MPS Creator
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Select AI-Proposed MPSs
              </p>
            </div>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Information Section */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <h3 className="font-semibold text-blue-900 mb-2">
                {domainName} – MPS Selection
              </h3>
              <p className="text-sm text-blue-800">
                Mini Performance Standards (MPSs) describe specific expectations and measurable goals within this audit domain. 
                The following MPSs are proposed for inclusion in the <span className="font-semibold text-blue-900">{domainName}</span> domain. 
                These represent common best practices across various industries. Please review the list, 
                select those you wish to include in your maturity model, and then confirm. After selecting your MPSs for this domain, 
                you'll define the audit criteria you will use to evaluate your maturity level.
              </p>
            </CardContent>
          </Card>

          {/* MPS Selection Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Select MPSs for {domainName}</h3>
              <Button 
                onClick={handleAcceptAll}
                variant="outline"
                className="text-primary hover:bg-primary hover:text-primary-foreground"
              >
                <Check className="h-4 w-4 mr-2" />
                Accept All MPSs
              </Button>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">
                  Maturion is generating tailored MPSs for {domainName}...
                </span>
              </div>
            )}

            {/* MPS List */}
            {!isLoading && (
              <div className="space-y-4">
                {mpsList.map((mps) => (
                  <Card 
                    key={mps.id} 
                    className={`transition-all ${
                      mps.selected 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-muted hover:border-muted-foreground/50'
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={mps.id}
                          checked={mps.selected}
                          onCheckedChange={() => toggleMPSSelection(mps.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <Badge variant="outline" className="mr-2">
                                {mps.number}
                              </Badge>
                              <span className="font-medium">{mps.title}</span>
                            </div>
                            {mps.rationale && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleMPSExpansion(mps.id)}
                                className="text-amber-600 hover:text-amber-700"
                              >
                                <HelpCircle className="h-4 w-4 mr-1" />
                                Why this MPS?
                                {expandedMPS.has(mps.id) ? (
                                  <ChevronUp className="h-4 w-4 ml-1" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 ml-1" />
                                )}
                              </Button>
                            )}
                          </div>

                          <Collapsible open={expandedMPS.has(mps.id)}>
                            <CollapsibleContent className="space-y-2">
                              <div className="pt-2 border-t border-muted">
                                <p className="text-sm font-medium text-muted-foreground mb-1">
                                  Intent & Objective:
                                </p>
                                <p className="text-sm">{mps.intent}</p>
                                
                                {mps.rationale && (
                                  <>
                                    <p className="text-sm font-medium text-muted-foreground mb-1 mt-3">
                                      Why this MPS is important:
                                    </p>
                                    <p className="text-sm text-amber-700 bg-amber-50 p-2 rounded">
                                      {mps.rationale}
                                    </p>
                                  </>
                                )}
                                
                                <p className="text-xs text-muted-foreground mt-2">
                                  {mps.criteriaCount} assessment criteria included
                                </p>
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Selection Summary */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-2">Selection Summary</h3>
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">{selectedCount}</span> of {mpsList.length} MPSs selected
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleConfirmSelection}
                    disabled={selectedCount === 0}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Confirm Selection ({selectedCount})
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};