import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Check, X, Clock, AlertCircle, Eye } from 'lucide-react';
import { useApprovalRequests } from '@/hooks/useApprovalRequests';
import { useAuth } from '@/contexts/AuthContext';

export const ApprovalWorkflow = () => {
  const { requests, loading, approveRequest, rejectRequest } = useApprovalRequests();
  const { user } = useAuth();
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);

  const handleReject = async (requestId: string) => {
    const success = await rejectRequest(requestId, rejectionReason);
    if (success) {
      setRejectionReason('');
      setSelectedRequest(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'expired': return 'outline';
      default: return 'secondary';
    }
  };

  const getRequestTypeLabel = (type: string) => {
    switch (type) {
      case 'price_change': return 'Price Change';
      case 'discount_code': return 'Discount Code';
      case 'module_activation': return 'Module Status';
      default: return type;
    }
  };

  const formatExpiryDate = (date: string) => {
    const expiry = new Date(date);
    const now = new Date();
    const isExpired = expiry < now;
    const timeUntilExpiry = expiry.getTime() - now.getTime();
    const hoursUntilExpiry = Math.ceil(timeUntilExpiry / (1000 * 60 * 60));

    if (isExpired) {
      return <span className="text-destructive">Expired</span>;
    } else if (hoursUntilExpiry <= 24) {
      return <span className="text-yellow-600">Expires in {hoursUntilExpiry}h</span>;
    } else {
      return `Expires ${expiry.toLocaleDateString()}`;
    }
  };

  const canApprove = (request: any) => {
    return request.status === 'pending' && request.requested_by !== user?.id;
  };

  const renderRequestDetails = (request: any) => {
    const changes = request.requested_changes;
    
    switch (request.request_type) {
      case 'price_change':
        return (
          <div className="space-y-2">
            <div>Monthly Price: ${changes.monthly_price}</div>
            <div>Yearly Discount: {changes.yearly_discount_percentage}%</div>
            <div>Bundle Discount: {changes.bundle_discount_percentage}%</div>
          </div>
        );
      case 'discount_code':
        return (
          <div className="space-y-2">
            <div>Code: {changes.code}</div>
            <div>Type: {changes.type}</div>
            <div>Value: {changes.type === 'percentage' ? `${changes.value}%` : `$${changes.value}`}</div>
            {changes.expiry_date && <div>Expires: {new Date(changes.expiry_date).toLocaleDateString()}</div>}
            {changes.usage_limit && <div>Usage Limit: {changes.usage_limit}</div>}
          </div>
        );
      case 'module_activation':
        return (
          <div>
            Status Change: {changes.is_active ? 'Activate' : 'Deactivate'}
          </div>
        );
      default:
        return <pre className="text-sm">{JSON.stringify(changes, null, 2)}</pre>;
    }
  };

  if (loading) {
    return <div>Loading approval requests...</div>;
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const completedRequests = requests.filter(r => r.status !== 'pending');

  return (
    <div className="space-y-6">
      {/* Pending Approvals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Approvals ({pendingRequests.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pendingRequests.map((request) => (
              <Card key={request.id} className="border-l-4 border-l-yellow-500">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <Badge variant={getStatusColor(request.status)}>
                          {getRequestTypeLabel(request.request_type)}
                        </Badge>
                        <div className="text-sm text-muted-foreground">
                          {formatExpiryDate(request.expires_at)}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium mb-2">Requested Changes:</h4>
                          {renderRequestDetails(request)}
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">
                            Requested: {new Date(request.created_at).toLocaleDateString()}
                          </div>
                          {request.requested_by === user?.id && (
                            <div className="flex items-center gap-1 text-sm text-yellow-600 mt-1">
                              <AlertCircle className="h-4 w-4" />
                              Your request - cannot self-approve
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {canApprove(request) && (
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          size="sm"
                          onClick={() => approveRequest(request.id)}
                          className="flex items-center gap-1"
                        >
                          <Check className="h-4 w-4" />
                          Approve
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedRequest(request.id)}
                            >
                              <X className="h-4 w-4" />
                              Reject
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Reject Request</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm font-medium">Rejection Reason (Optional)</label>
                                <Textarea
                                  value={rejectionReason}
                                  onChange={(e) => setRejectionReason(e.target.value)}
                                  placeholder="Provide a reason for rejection..."
                                  className="mt-1"
                                />
                              </div>
                              <Button
                                onClick={() => handleReject(request.id)}
                                variant="destructive"
                                className="w-full"
                              >
                                Reject Request
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {pendingRequests.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No pending approval requests.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Completed Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Recent Activity ({completedRequests.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {completedRequests.slice(0, 10).map((request) => (
              <Card key={request.id} className="opacity-75">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <Badge variant={getStatusColor(request.status)}>
                          {getRequestTypeLabel(request.request_type)}
                        </Badge>
                        <Badge variant={getStatusColor(request.status)}>
                          {request.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {request.status === 'approved' ? 'Approved' : 'Rejected'}: {new Date(request.updated_at).toLocaleDateString()}
                      </div>
                      {request.rejection_reason && (
                        <div className="text-sm text-destructive">
                          Reason: {request.rejection_reason}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};