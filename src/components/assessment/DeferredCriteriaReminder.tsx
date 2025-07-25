import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, ArrowRight, CheckCircle, Edit, Trash2, Eye } from 'lucide-react';

interface DeferredCriterion {
  id: string;
  criteriaId: string;
  originalStatement: string;
  originalSummary: string;
  sourceDomain: string;
  sourceMPS: string;
  targetDomain: string;
  targetMPS: string;
  deferralReason: string;
  deferralType: 'correct_domain' | 'review';
  status: 'pending' | 'reviewed' | 'approved' | 'discarded';
  organizationId: string;
  createdAt: string;
  deferredBy: string;
}

interface DeferredCriteriaReminderProps {
  isOpen: boolean;
  onClose: () => void;
  targetDomain: string;
  targetMPS: string;
  deferrals: DeferredCriterion[];
  onView: (deferral: DeferredCriterion) => void;
  onApprove: (deferral: DeferredCriterion) => void;
  onEdit: (deferral: DeferredCriterion) => void;
  onDiscard: (deferral: DeferredCriterion) => void;
}

export const DeferredCriteriaReminder: React.FC<DeferredCriteriaReminderProps> = ({
  isOpen,
  onClose,
  targetDomain,
  targetMPS,
  deferrals,
  onView,
  onApprove,
  onEdit,
  onDiscard
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSourceDisplay = (deferral: DeferredCriterion) => {
    return deferral.sourceDomain || `MPS ${deferral.sourceMPS}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            Deferred Criteria Reminder
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert className="border-blue-200 bg-blue-50">
            <Clock className="h-4 w-4" />
            <AlertDescription>
              <strong>👉 You have {deferrals.length} deferred criterion{deferrals.length !== 1 ? 'a' : ''}</strong> from previous sessions waiting for review in <strong>{targetDomain} - MPS {targetMPS}</strong>.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            {deferrals.map((deferral, index) => (
              <Card key={deferral.id} className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        Criterion #{index + 1}
                        <Badge variant="secondary" className="text-xs">
                          {deferral.deferralType === 'correct_domain' ? 'Domain Placement' : 'Review Required'}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <span>From: {getSourceDisplay(deferral)}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span>To: {targetDomain} - MPS {targetMPS}</span>
                        <span className="text-xs text-muted-foreground">
                          • Deferred {formatDate(deferral.createdAt)}
                        </span>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {deferral.deferralReason && (
                    <div className="bg-amber-50 p-3 rounded-md border border-amber-200">
                      <p className="text-sm font-medium text-amber-800 mb-1">Reason for Deferral:</p>
                      <p className="text-sm text-amber-700">{deferral.deferralReason}</p>
                    </div>
                  )}

                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="text-sm font-medium text-gray-900 mb-2">Deferred Statement:</p>
                    <p className="text-sm text-gray-700 mb-2">
                      <strong>Statement:</strong> {deferral.originalStatement || 'Statement will be loaded...'}
                    </p>
                    {deferral.originalSummary && (
                      <p className="text-sm text-gray-600">
                        <strong>Summary:</strong> {deferral.originalSummary}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end space-x-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onView(deferral)}
                      className="flex items-center gap-1"
                    >
                      <Eye className="h-3 w-3" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(deferral)}
                      className="flex items-center gap-1"
                    >
                      <Edit className="h-3 w-3" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => onApprove(deferral)}
                      className="bg-green-600 hover:bg-green-700 flex items-center gap-1"
                    >
                      <CheckCircle className="h-3 w-3" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDiscard(deferral)}
                      className="text-red-600 hover:text-red-700 flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      Discard
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Review each deferred criterion and choose the appropriate action.
            </p>
            <Button variant="outline" onClick={onClose}>
              Close Reminder
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};