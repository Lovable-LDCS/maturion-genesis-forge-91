import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, Edit3, Eye, EyeOff } from 'lucide-react';
import { useAIFeedbackSubmissions } from '@/hooks/useAIFeedbackSubmissions';
import { format } from 'date-fns';

export const FeedbackDashboard = () => {
  const { submissions, isLoading, markAsReviewed, getFeedbackStats } = useAIFeedbackSubmissions();
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);

  const stats = getFeedbackStats();

  const getFeedbackTypeIcon = (type: string) => {
    switch (type) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'needs_correction':
        return <Edit3 className="w-4 h-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getFeedbackTypeColor = (type: string) => {
    switch (type) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'needs_correction':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'accuracy':
        return 'bg-red-100 text-red-800';
      case 'hallucination':
        return 'bg-purple-100 text-purple-800';
      case 'relevance':
        return 'bg-blue-100 text-blue-800';
      case 'grammar':
        return 'bg-orange-100 text-orange-800';
      case 'clarity':
        return 'bg-cyan-100 text-cyan-800';
      case 'completeness':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleMarkAsReviewed = async (submissionId: string) => {
    const success = await markAsReviewed(submissionId);
    if (success) {
      setSelectedSubmission(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI Feedback Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor and review human feedback on AI-generated content
          </p>
        </div>
      </div>

      {/* Feedback Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total Feedback</p>
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
            <p className="text-2xl font-bold text-yellow-600">{stats.needsCorrection}</p>
            <p className="text-sm text-muted-foreground">Needs Correction</p>
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
            <p className="text-2xl font-bold text-blue-600">{stats.reviewed}</p>
            <p className="text-sm text-muted-foreground">Reviewed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{stats.pendingReview}</p>
            <p className="text-sm text-muted-foreground">Pending Review</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Feedback</TabsTrigger>
          <TabsTrigger value="pending">Pending Review</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="corrections">Needs Correction</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <FeedbackList 
            submissions={submissions} 
            onSubmissionSelect={setSelectedSubmission}
            onMarkAsReviewed={handleMarkAsReviewed}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <FeedbackList 
            submissions={submissions.filter(s => !s.reviewed_by)} 
            onSubmissionSelect={setSelectedSubmission}
            onMarkAsReviewed={handleMarkAsReviewed}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          <FeedbackList 
            submissions={submissions.filter(s => s.feedback_type === 'approved')} 
            onSubmissionSelect={setSelectedSubmission}
            onMarkAsReviewed={handleMarkAsReviewed}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          <FeedbackList 
            submissions={submissions.filter(s => s.feedback_type === 'rejected')} 
            onSubmissionSelect={setSelectedSubmission}
            onMarkAsReviewed={handleMarkAsReviewed}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="corrections" className="space-y-4">
          <FeedbackList 
            submissions={submissions.filter(s => s.feedback_type === 'needs_correction')} 
            onSubmissionSelect={setSelectedSubmission}
            onMarkAsReviewed={handleMarkAsReviewed}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>

      {/* Detailed View Modal-like Component */}
      {selectedSubmission && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Feedback Details</CardTitle>
              <Button 
                variant="outline" 
                onClick={() => setSelectedSubmission(null)}
                size="sm"
              >
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Feedback Type:</p>
                <div className="flex items-center gap-2 mt-1">
                  {getFeedbackTypeIcon(selectedSubmission.feedback_type)}
                  <Badge className={getFeedbackTypeColor(selectedSubmission.feedback_type)}>
                    {selectedSubmission.feedback_type}
                  </Badge>
                </div>
              </div>
              {selectedSubmission.feedback_category && (
                <div>
                  <p className="text-sm font-medium">Category:</p>
                  <Badge className={getCategoryColor(selectedSubmission.feedback_category)} variant="outline">
                    {selectedSubmission.feedback_category}
                  </Badge>
                </div>
              )}
              <div>
                <p className="text-sm font-medium">Confidence Rating:</p>
                <p className="text-sm text-muted-foreground">
                  {selectedSubmission.confidence_rating}/5
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Submitted:</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(selectedSubmission.created_at), 'PPp')}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium">Original AI Content:</p>
              <div className="mt-1 p-3 bg-muted rounded-md text-sm">
                {selectedSubmission.ai_generated_content}
              </div>
            </div>

            {selectedSubmission.user_comments && (
              <div>
                <p className="text-sm font-medium">User Comments:</p>
                <div className="mt-1 p-3 bg-muted rounded-md text-sm">
                  {selectedSubmission.user_comments}
                </div>
              </div>
            )}

            {selectedSubmission.revision_instructions && (
              <div>
                <p className="text-sm font-medium">Revision Instructions:</p>
                <div className="mt-1 p-3 bg-muted rounded-md text-sm">
                  {selectedSubmission.revision_instructions}
                </div>
              </div>
            )}

            {selectedSubmission.human_override_content && (
              <div>
                <p className="text-sm font-medium">Human Override Content:</p>
                <div className="mt-1 p-3 bg-muted rounded-md text-sm">
                  {selectedSubmission.human_override_content}
                </div>
              </div>
            )}

            {selectedSubmission.justification && (
              <div>
                <p className="text-sm font-medium">Justification:</p>
                <div className="mt-1 p-3 bg-muted rounded-md text-sm">
                  {selectedSubmission.justification}
                </div>
              </div>
            )}

            {!selectedSubmission.reviewed_by && (
              <Button 
                onClick={() => handleMarkAsReviewed(selectedSubmission.id)}
                disabled={isLoading}
                className="w-full"
              >
                Mark as Reviewed
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

interface FeedbackListProps {
  submissions: any[];
  onSubmissionSelect: (submission: any) => void;
  onMarkAsReviewed: (submissionId: string) => void;
  isLoading: boolean;
}

const FeedbackList = ({ submissions, onSubmissionSelect, onMarkAsReviewed, isLoading }: FeedbackListProps) => {
  const getFeedbackTypeIcon = (type: string) => {
    switch (type) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'needs_correction':
        return <Edit3 className="w-4 h-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getFeedbackTypeColor = (type: string) => {
    switch (type) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'needs_correction':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (submissions.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          No feedback submissions found
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {submissions.map((submission) => (
        <Card key={submission.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getFeedbackTypeIcon(submission.feedback_type)}
                <div>
                  <div className="flex items-center gap-2">
                    <Badge className={getFeedbackTypeColor(submission.feedback_type)}>
                      {submission.feedback_type}
                    </Badge>
                    {submission.feedback_category && (
                      <Badge variant="outline">{submission.feedback_category}</Badge>
                    )}
                    {submission.reviewed_by ? (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        Reviewed
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <EyeOff className="w-3 h-3" />
                        Pending Review
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {format(new Date(submission.created_at), 'PPp')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSubmissionSelect(submission)}
                >
                  View Details
                </Button>
                {!submission.reviewed_by && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onMarkAsReviewed(submission.id)}
                    disabled={isLoading}
                  >
                    Mark Reviewed
                  </Button>
                )}
              </div>
            </div>
            <div className="mt-3">
              <p className="text-sm line-clamp-2">
                {submission.ai_generated_content}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};