import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThumbsDown, Edit3, AlertTriangle } from 'lucide-react';
import { useAIFeedbackSubmissions } from '@/hooks/useAIFeedbackSubmissions';
import { useToast } from '@/hooks/use-toast';

interface AIFeedbackInterfaceProps {
  aiGeneratedContent: string;
  contentType: 'criteria' | 'evidence' | 'intent';
  domainId?: string;
  onContentUpdate?: (updatedContent: string) => void;
  sourceType?: 'internal' | 'best_practice' | 'smart_feedback';
  standardSource?: string;
}

export const AIFeedbackInterface = ({
  aiGeneratedContent,
  contentType,
  domainId,
  onContentUpdate,
  sourceType = 'internal',
  standardSource
}: AIFeedbackInterfaceProps) => {
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'approved' | 'needs_correction' | 'rejected'>('rejected');
  const [feedbackCategory, setFeedbackCategory] = useState('');
  const [userComments, setUserComments] = useState('');
  const [revisionInstructions, setRevisionInstructions] = useState('');
  const [modifiedContent, setModifiedContent] = useState(aiGeneratedContent);
  const [justification, setJustification] = useState('');
  const [confidenceRating, setConfidenceRating] = useState<number>(3);
  const { submitFeedback, isLoading } = useAIFeedbackSubmissions();
  const { toast } = useToast();

  const handleSubmitFeedback = async () => {
    if (!feedbackCategory.trim() && feedbackType !== 'approved') {
      toast({
        title: "Category Required",
        description: "Please select a feedback category",
        variant: "destructive",
      });
      return;
    }

    const success = await submitFeedback({
      aiGeneratedContent,
      feedbackType,
      feedbackCategory: feedbackCategory || undefined,
      userComments: userComments || undefined,
      revisionInstructions: feedbackType === 'needs_correction' ? revisionInstructions : undefined,
      humanOverrideContent: feedbackType === 'needs_correction' ? modifiedContent : undefined,
      justification: justification || undefined,
      confidenceRating,
    });

    if (success) {
      setShowFeedback(false);
      if (feedbackType === 'needs_correction' && onContentUpdate) {
        onContentUpdate(modifiedContent);
      }
    }
  };

  const getFeedbackCategories = () => {
    return [
      { value: 'accuracy', label: 'Accuracy Issues' },
      { value: 'grammar', label: 'Grammar/Language' },
      { value: 'hallucination', label: 'Hallucination/False Info' },
      { value: 'relevance', label: 'Relevance/Context' },
      { value: 'completeness', label: 'Completeness' },
      { value: 'clarity', label: 'Clarity/Understanding' },
      { value: 'other', label: 'Other' },
    ];
  };

  const getReasonSuggestions = () => {
    switch (contentType) {
      case 'criteria':
        return [
          'Not applicable to our industry',
          'Too technical for our organization',
          'Already covered in existing criteria',
          'Inconsistent with company policy',
          'Unclear or confusing language'
        ];
      case 'evidence':
        return [
          'Evidence type not available',
          'Too complex for our resources',
          'Not aligned with current practices',
          'Regulatory constraints',
          'Cost prohibitive'
        ];
      case 'intent':
        return [
          'Misaligned with business objectives',
          'Inappropriate scope',
          'Wrong organizational level',
          'Cultural mismatch',
          'Timing issues'
        ];
      default:
        return ['Other'];
    }
  };

  return (
    <div className="space-y-4">
      {/* Source indicator */}
      {sourceType !== 'internal' && (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Best Practice Source Used
          </Badge>
          {standardSource && (
            <Badge variant="secondary" className="text-xs">
              {standardSource}
            </Badge>
          )}
        </div>
      )}

      {/* AI Generated Content Display */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            AI Generated {contentType.charAt(0).toUpperCase() + contentType.slice(1)}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFeedbackType('approved');
                  setShowFeedback(true);
                }}
                className="text-green-600 border-green-200 hover:bg-green-50"
              >
                ✅ Approve
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFeedbackType('needs_correction');
                  setShowFeedback(true);
                }}
              >
                <Edit3 className="w-4 h-4 mr-1" />
                Needs Correction
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFeedbackType('rejected');
                  setShowFeedback(true);
                }}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <ThumbsDown className="w-4 h-4 mr-1" />
                Reject
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{aiGeneratedContent}</p>
          
          {sourceType === 'best_practice' && (
            <p className="text-xs text-muted-foreground mt-2 p-2 bg-muted rounded">
              💡 This criterion is based on international best practices. Please confirm alignment with your organization's context.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Feedback Interface */}
      {showFeedback && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              {feedbackType === 'approved' 
                ? 'Approve AI Content' 
                : feedbackType === 'needs_correction' 
                ? 'Request Content Correction' 
                : 'Reject AI Content'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Feedback Category */}
            {feedbackType !== 'approved' && (
              <div>
                <label className="text-sm font-medium">Feedback Category:</label>
                <Select onValueChange={setFeedbackCategory}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {getFeedbackCategories().map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Modified Content for Corrections */}
            {feedbackType === 'needs_correction' && (
              <div>
                <label className="text-sm font-medium">Corrected Content:</label>
                <Textarea
                  value={modifiedContent}
                  onChange={(e) => setModifiedContent(e.target.value)}
                  placeholder="Enter your corrected version..."
                  className="mt-1"
                  rows={4}
                />
              </div>
            )}

            {/* Revision Instructions */}
            {feedbackType === 'needs_correction' && (
              <div>
                <label className="text-sm font-medium">Revision Instructions:</label>
                <Textarea
                  value={revisionInstructions}
                  onChange={(e) => setRevisionInstructions(e.target.value)}
                  placeholder="Specific instructions for improvement..."
                  className="mt-1"
                  rows={3}
                />
              </div>
            )}

            {/* Comments */}
            <div>
              <label className="text-sm font-medium">
                {feedbackType === 'approved' ? 'Approval Comments (Optional):' : 'Comments:'}
              </label>
              <Textarea
                value={userComments}
                onChange={(e) => setUserComments(e.target.value)}
                placeholder={
                  feedbackType === 'approved' 
                    ? 'Why this content is good...' 
                    : 'Explain the issue or provide context...'
                }
                className="mt-1"
                rows={3}
              />
            </div>

            {/* Quick Reason Suggestions */}
            {feedbackType !== 'approved' && (
              <div>
                <label className="text-sm font-medium">Quick Suggestions:</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {getReasonSuggestions().map((reason) => (
                    <Button
                      key={reason}
                      variant="outline"
                      size="sm"
                      onClick={() => setUserComments(reason)}
                      className="text-xs"
                    >
                      {reason}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Justification for high-impact changes */}
            {feedbackType === 'rejected' && (
              <div>
                <label className="text-sm font-medium">Justification for Rejection:</label>
                <Textarea
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Why this content should be rejected and not used for training..."
                  className="mt-1"
                  rows={2}
                />
              </div>
            )}

            {/* Confidence Rating */}
            <div>
              <label className="text-sm font-medium">
                Confidence Level (1-5): {confidenceRating}
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={confidenceRating}
                onChange={(e) => setConfidenceRating(parseInt(e.target.value))}
                className="w-full mt-1"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Not Confident</span>
                <span>Very Confident</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSubmitFeedback} disabled={isLoading}>
                {isLoading ? 'Submitting...' : 'Submit Feedback'}
              </Button>
              <Button variant="outline" onClick={() => setShowFeedback(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};