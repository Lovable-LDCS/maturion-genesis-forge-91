import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, AlertTriangle, User, Users, Shield } from 'lucide-react';
import { useHumanApprovalWorkflows } from '@/hooks/useHumanApprovalWorkflows';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface CreateWorkflowFormProps {
  onWorkflowCreated: () => void;
}

const CreateWorkflowForm = ({ onWorkflowCreated }: CreateWorkflowFormProps) => {
  const { createWorkflow, isLoading } = useHumanApprovalWorkflows();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    entityType: '',
    entityId: '',
    requiresDualSignoff: false,
    primaryReviewerId: '',
    secondaryReviewerId: '',
  });

  const handleSubmit = async () => {
    if (!formData.entityType || !formData.entityId) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const workflowId = await createWorkflow({
      entityType: formData.entityType as any,
      entityId: formData.entityId,
      requiresDualSignoff: formData.requiresDualSignoff,
      primaryReviewerId: formData.primaryReviewerId || undefined,
      secondaryReviewerId: formData.secondaryReviewerId || undefined,
    });

    if (workflowId) {
      setFormData({
        entityType: '',
        entityId: '',
        requiresDualSignoff: false,
        primaryReviewerId: '',
        secondaryReviewerId: '',
      });
      onWorkflowCreated();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Create New Approval Workflow</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="entity-type">Content Type</Label>
            <Select onValueChange={(value) => setFormData({ ...formData, entityType: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select content type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="criteria">Criteria</SelectItem>
                <SelectItem value="evidence">Evidence</SelectItem>
                <SelectItem value="intent">Intent Statement</SelectItem>
                <SelectItem value="mps">MPS Document</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="entity-id">Entity ID</Label>
            <input
              id="entity-id"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={formData.entityId}
              onChange={(e) => setFormData({ ...formData, entityId: e.target.value })}
              placeholder="Enter the entity ID..."
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="dual-signoff"
            checked={formData.requiresDualSignoff}
            onCheckedChange={(checked) => setFormData({ ...formData, requiresDualSignoff: checked })}
          />
          <Label htmlFor="dual-signoff">Require Dual Sign-off</Label>
        </div>

        <Button onClick={handleSubmit} disabled={isLoading} className="w-full">
          Create Workflow
        </Button>
      </CardContent>
    </Card>
  );
};

interface ReviewFormProps {
  workflow: any;
  reviewType: 'primary' | 'secondary';
  onReviewSubmitted: () => void;
}

const ReviewForm = ({ workflow, reviewType, onReviewSubmitted }: ReviewFormProps) => {
  const { submitPrimaryReview, submitSecondaryReview, isLoading } = useHumanApprovalWorkflows();
  const { toast } = useToast();
  
  const [reviewData, setReviewData] = useState({
    decision: '',
    comments: '',
    finalApprovedContent: '',
    rejectedReason: '',
    escalationReason: '',
  });

  const handleSubmit = async () => {
    if (!reviewData.decision) {
      toast({
        title: "Decision Required",
        description: "Please select a review decision",
        variant: "destructive",
      });
      return;
    }

    const submitFunction = reviewType === 'primary' ? submitPrimaryReview : submitSecondaryReview;
    const success = await submitFunction({
      workflowId: workflow.id,
      decision: reviewData.decision as any,
      comments: reviewData.comments || undefined,
      finalApprovedContent: reviewData.finalApprovedContent || undefined,
      rejectedReason: reviewData.rejectedReason || undefined,
      escalationReason: reviewData.escalationReason || undefined,
    });

    if (success) {
      onReviewSubmitted();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {reviewType === 'primary' ? 'Primary Review' : 'Secondary Review'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="decision">Review Decision</Label>
          <Select onValueChange={(value) => setReviewData({ ...reviewData, decision: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select decision..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="approved">Approve</SelectItem>
              <SelectItem value="rejected">Reject</SelectItem>
              <SelectItem value="escalated">Escalate</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="comments">Review Comments</Label>
          <Textarea
            id="comments"
            value={reviewData.comments}
            onChange={(e) => setReviewData({ ...reviewData, comments: e.target.value })}
            placeholder="Provide your review comments..."
            rows={3}
          />
        </div>

        {reviewData.decision === 'approved' && (
          <div>
            <Label htmlFor="approved-content">Final Approved Content (Optional)</Label>
            <Textarea
              id="approved-content"
              value={reviewData.finalApprovedContent}
              onChange={(e) => setReviewData({ ...reviewData, finalApprovedContent: e.target.value })}
              placeholder="Enter final approved content..."
              rows={4}
            />
          </div>
        )}

        {reviewData.decision === 'rejected' && (
          <div>
            <Label htmlFor="rejected-reason">Rejection Reason</Label>
            <Textarea
              id="rejected-reason"
              value={reviewData.rejectedReason}
              onChange={(e) => setReviewData({ ...reviewData, rejectedReason: e.target.value })}
              placeholder="Explain why this content is being rejected..."
              rows={3}
            />
          </div>
        )}

        {reviewData.decision === 'escalated' && (
          <div>
            <Label htmlFor="escalation-reason">Escalation Reason</Label>
            <Textarea
              id="escalation-reason"
              value={reviewData.escalationReason}
              onChange={(e) => setReviewData({ ...reviewData, escalationReason: e.target.value })}
              placeholder="Explain why this requires escalation..."
              rows={3}
            />
          </div>
        )}

        <Button onClick={handleSubmit} disabled={isLoading} className="w-full">
          Submit {reviewType === 'primary' ? 'Primary' : 'Secondary'} Review
        </Button>
      </CardContent>
    </Card>
  );
};

export const HumanApprovalWorkflowManager = () => {
  const { workflows, getWorkflowStats, applySuperuserOverride, isLoading } = useHumanApprovalWorkflows();
  const { toast } = useToast();
  
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null);
  const [superuserOverride, setSuperuserOverride] = useState({
    overrideReason: '',
    finalApprovedContent: '',
  });

  const stats = getWorkflowStats();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'escalated':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'superuser_override':
        return <Shield className="w-4 h-4 text-purple-600" />;
      case 'pending_primary_review':
        return <User className="w-4 h-4 text-blue-600" />;
      case 'pending_secondary_review':
        return <Users className="w-4 h-4 text-blue-600" />;
      default:
        return <User className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'escalated':
        return 'bg-yellow-100 text-yellow-800';
      case 'superuser_override':
        return 'bg-purple-100 text-purple-800';
      case 'pending_primary_review':
      case 'pending_secondary_review':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSuperuserOverride = async (workflowId: string) => {
    if (!superuserOverride.overrideReason.trim()) {
      toast({
        title: "Override Reason Required",
        description: "Please provide a reason for the superuser override",
        variant: "destructive",
      });
      return;
    }

    const success = await applySuperuserOverride({
      workflowId,
      overrideReason: superuserOverride.overrideReason,
      finalApprovedContent: superuserOverride.finalApprovedContent || undefined,
    });

    if (success) {
      setSuperuserOverride({ overrideReason: '', finalApprovedContent: '' });
      setSelectedWorkflow(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Human Approval Workflow Manager</h2>
          <p className="text-muted-foreground">
            Manage dual-review workflows and approval processes for AI-generated content
          </p>
        </div>
      </div>

      {/* Workflow Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total Workflows</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.pending}</p>
            <p className="text-sm text-muted-foreground">Pending Review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
            <p className="text-sm text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            <p className="text-sm text-muted-foreground">Rejected</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.escalated}</p>
            <p className="text-sm text-muted-foreground">Escalated</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active Workflows</TabsTrigger>
          <TabsTrigger value="completed">Completed Workflows</TabsTrigger>
          <TabsTrigger value="create">Create New</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {workflows.filter(w => w.workflow_status.includes('pending') || w.workflow_status === 'escalated').length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No active workflows requiring attention
              </CardContent>
            </Card>
          ) : (
            workflows
              .filter(w => w.workflow_status.includes('pending') || w.workflow_status === 'escalated')
              .map((workflow) => (
                <Card key={workflow.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {getStatusIcon(workflow.workflow_status)}
                        {workflow.entity_type} Workflow
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(workflow.workflow_status)}>
                          {workflow.workflow_status.replace(/_/g, ' ')}
                        </Badge>
                        {workflow.requires_dual_signoff && (
                          <Badge variant="outline">Dual Sign-off Required</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">Entity ID:</p>
                        <p className="text-sm text-muted-foreground">{workflow.entity_id}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Created:</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(workflow.created_at), 'PPp')}
                        </p>
                      </div>
                    </div>

                    {workflow.workflow_status === 'pending_primary_review' && (
                      <ReviewForm
                        workflow={workflow}
                        reviewType="primary"
                        onReviewSubmitted={() => window.location.reload()}
                      />
                    )}

                    {workflow.workflow_status === 'pending_secondary_review' && (
                      <ReviewForm
                        workflow={workflow}
                        reviewType="secondary"
                        onReviewSubmitted={() => window.location.reload()}
                      />
                    )}

                    {workflow.workflow_status === 'escalated' && (
                      <Card className="border-yellow-200 bg-yellow-50">
                        <CardHeader>
                          <CardTitle className="text-sm text-yellow-800">Superuser Override</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <Label htmlFor="override-reason">Override Reason</Label>
                            <Textarea
                              id="override-reason"
                              value={superuserOverride.overrideReason}
                              onChange={(e) => setSuperuserOverride({ 
                                ...superuserOverride, 
                                overrideReason: e.target.value 
                              })}
                              placeholder="Provide justification for superuser override..."
                              rows={3}
                            />
                          </div>
                          <div>
                            <Label htmlFor="override-content">Final Approved Content (Optional)</Label>
                            <Textarea
                              id="override-content"
                              value={superuserOverride.finalApprovedContent}
                              onChange={(e) => setSuperuserOverride({ 
                                ...superuserOverride, 
                                finalApprovedContent: e.target.value 
                              })}
                              placeholder="Enter final approved content..."
                              rows={4}
                            />
                          </div>
                          <Button 
                            onClick={() => handleSuperuserOverride(workflow.id)}
                            disabled={isLoading}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            Apply Superuser Override
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </CardContent>
                </Card>
              ))
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {workflows.filter(w => ['approved', 'rejected', 'superuser_override'].includes(w.workflow_status)).length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No completed workflows
              </CardContent>
            </Card>
          ) : (
            workflows
              .filter(w => ['approved', 'rejected', 'superuser_override'].includes(w.workflow_status))
              .map((workflow) => (
                <Card key={workflow.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {getStatusIcon(workflow.workflow_status)}
                        {workflow.entity_type} Workflow
                      </CardTitle>
                      <Badge className={getStatusColor(workflow.workflow_status)}>
                        {workflow.workflow_status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm font-medium">Entity ID:</p>
                        <p className="text-sm text-muted-foreground">{workflow.entity_id}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Completed:</p>
                        <p className="text-sm text-muted-foreground">
                          {workflow.final_decision_at 
                            ? format(new Date(workflow.final_decision_at), 'PPp')
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Final Decision:</p>
                        <p className="text-sm text-muted-foreground">
                          {workflow.workflow_status.replace(/_/g, ' ')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
          )}
        </TabsContent>

        <TabsContent value="create">
          <CreateWorkflowForm onWorkflowCreated={() => window.location.reload()} />
        </TabsContent>
      </Tabs>
    </div>
  );
};