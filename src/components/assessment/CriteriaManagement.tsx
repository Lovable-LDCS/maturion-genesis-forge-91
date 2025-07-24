import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Plus, Sparkles } from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CriterionModal } from './CriterionModal';
import { PlacementModal } from './PlacementModal';

interface MPS {
  id: string;
  name: string;
  mps_number: number;
  intent_statement?: string;
  summary?: string;
  status: string;
}

interface Criteria {
  id: string;
  mps_id: string;
  criteria_number: string;
  statement: string;
  summary?: string;
  status: string;
  ai_suggested_statement?: string;
  ai_suggested_summary?: string;
  statement_approved_by?: string;
  statement_approved_at?: string;
  deferral_status?: string | null;
}

interface CriteriaManagementProps {
  isOpen: boolean;
  onClose: () => void;
  domainName: string;
  onCriteriaFinalized: (approvedCriteria: Criteria[]) => void;
}

export const CriteriaManagement: React.FC<CriteriaManagementProps> = ({
  isOpen,
  onClose,
  domainName,
  onCriteriaFinalized
}) => {
  const [mpsList, setMPSList] = useState<MPS[]>([]);
  const [criteriaList, setCriteriaList] = useState<Criteria[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCriterionModal, setShowCriterionModal] = useState<string | null>(null);
  const [showPlacementModal, setShowPlacementModal] = useState(false);
  const [placementData, setPlacementData] = useState<any>(null);
  
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();

  const fetchMPSsAndCriteria = async () => {
    if (!currentOrganization?.id) return;

    setIsLoading(true);
    try {
      // Fetch MPSs for the domain - using any to avoid TypeScript complexity
      const result: any = await supabase
        .from('maturity_practice_statements')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('domain_name', domainName)
        .order('mps_number');
      
      const { data: mpsData, error: mpsError } = result;
      if (mpsError) throw mpsError;

      // Fetch criteria for these MPSs
      const mpsIds = mpsData?.map((mps: any) => mps.id) || [];
      let criteriaData: any[] = [];
      if (mpsIds.length > 0) {
        const criteriaResult: any = await supabase
          .from('criteria')
          .select('*')
          .in('mps_id', mpsIds)
          .order('criteria_number');
        
        if (criteriaResult.error) throw criteriaResult.error;
        criteriaData = criteriaResult.data || [];
      }

      setMPSList(mpsData || []);
      setCriteriaList(criteriaData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load criteria data.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch MPSs and criteria on modal open
  useEffect(() => {
    if (isOpen && currentOrganization?.id) {
      fetchMPSsAndCriteria();
    }
  }, [isOpen, currentOrganization?.id, domainName]); // eslint-disable-line react-hooks/exhaustive-deps

  const getCriteriaForMPS = (mpsId: string): Criteria[] => {
    return criteriaList.filter(criteria => criteria.mps_id === mpsId);
  };

  const getApprovedCriteriaCount = (): number => {
    return criteriaList.filter(criteria => criteria.status === 'approved_locked').length;
  };

  const handlePlacementData = (data: any) => {
    setPlacementData(data);
    setShowPlacementModal(true);
  };

  const handleFinalizeCriteria = () => {
    const approvedCriteria = criteriaList.filter(criteria => criteria.status === 'approved_locked');
    onCriteriaFinalized(approvedCriteria);
    onClose();
  };

  const progressPercentage = mpsList.length > 0 
    ? Math.round((getApprovedCriteriaCount() / criteriaList.length) * 100) 
    : 0;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Criteria Management - {domainName}
            </DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <Sparkles className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                <p>Loading criteria data...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Progress Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Progress Overview
                    <Badge variant="outline">
                      {getApprovedCriteriaCount()} / {criteriaList.length} Approved
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Progress value={progressPercentage} className="w-full" />
                  <p className="text-sm text-muted-foreground mt-2">
                    {progressPercentage}% of criteria approved
                  </p>
                </CardContent>
              </Card>

              {/* MPSs Section */}
              <div className="space-y-4">
                {mpsList.map((mps) => {
                  const mpscriteria = getCriteriaForMPS(mps.id);
                  const approvedCount = mpscriteria.filter(c => c.status === 'approved_locked').length;
                  
                  return (
                    <Card key={mps.id}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>MPS {mps.mps_number}: {mps.name}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant={approvedCount === mpscriteria.length ? "default" : "secondary"}>
                              {approvedCount} / {mpscriteria.length} criteria
                            </Badge>
                            <Button
                              size="sm"
                              onClick={() => setShowCriterionModal(mps.id)}
                              className="flex items-center gap-1"
                            >
                              <Plus className="h-4 w-4" />
                              Add Criterion
                            </Button>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {mpscriteria.length > 0 ? (
                          <div className="space-y-2">
                            {mpscriteria.map((criteria) => (
                              <div key={criteria.id} className="flex items-center justify-between p-3 border rounded">
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{criteria.statement}</p>
                                  {criteria.summary && (
                                    <p className="text-xs text-muted-foreground">{criteria.summary}</p>
                                  )}
                                </div>
                                <Badge variant={criteria.status === 'approved_locked' ? "default" : "secondary"}>
                                  {criteria.status}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted-foreground">No criteria yet. Add some to get started.</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
                <Button 
                  onClick={handleFinalizeCriteria}
                  disabled={getApprovedCriteriaCount() === 0}
                >
                  Finalize Criteria ({getApprovedCriteriaCount()})
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modals */}
      <CriterionModal
        isOpen={!!showCriterionModal}
        onClose={() => setShowCriterionModal(null)}
        mpsId={showCriterionModal || ''}
        onSuccess={fetchMPSsAndCriteria}
        onShowPlacementModal={handlePlacementData}
      />

      <PlacementModal
        isOpen={showPlacementModal}
        onClose={() => setShowPlacementModal(false)}
        placementData={placementData}
        onApprove={(data) => {
          console.log('Approved placement:', data);
          setShowPlacementModal(false);
        }}
        onDefer={(data) => {
          console.log('Deferred placement:', data);
          setShowPlacementModal(false);
        }}
      />
    </>
  );
};