import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThumbsDown, Edit3, AlertTriangle } from 'lucide-react';
import { useAILearningFeedback } from '@/hooks/useAILearningFeedback';
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
  const [feedbackType, setFeedbackType] = useState<'rejection' | 'modification' | 'sector_misalignment'>('rejection');
  const [rejectionReason, setRejectionReason] = useState('');
  const [modifiedContent, setModifiedContent] = useState(aiGeneratedContent);
  const { captureFeedback, isLoading } = useAILearningFeedback();
  const { toast } = useToast();

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Feedback Required",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      });
      return;
    }

    const success = await captureFeedback(
      aiGeneratedContent,
      feedbackType === 'modification' ? modifiedContent : null,
      rejectionReason,
      domainId,
      feedbackType
    );

    if (success) {
      setShowFeedback(false);
      if (feedbackType === 'modification' && onContentUpdate) {
        onContentUpdate(modifiedContent);
      }
    }
  };

  const getRejectionReasons = () => {
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
                  setFeedbackType('modification');
                  setShowFeedback(true);
                }}
              >
                <Edit3 className="w-4 h-4 mr-1" />
                Modify
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFeedbackType('rejection');
                  setShowFeedback(true);
                }}
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

      {/* Feedback Interface */}
      {showFeedback && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              {feedbackType === 'modification' ? 'Modify Content' : 'Provide Feedback'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {feedbackType === 'modification' && (
              <div>
                <label className="text-sm font-medium">Modified Content:</label>
                <Textarea
                  value={modifiedContent}
                  onChange={(e) => setModifiedContent(e.target.value)}
                  placeholder="Enter your modified version..."
                  className="mt-1"
                />
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Reason for {feedbackType}:</label>
              <Select onValueChange={setRejectionReason}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a reason..." />
                </SelectTrigger>
                <SelectContent>
                  {getRejectionReasons().map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                  <SelectItem value="other">Other (specify below)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {rejectionReason === 'other' && (
              <Textarea
                placeholder="Please specify your reason..."
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            )}

            <div className="flex gap-2">
              <Button onClick={handleReject} disabled={isLoading}>
                Submit Feedback
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