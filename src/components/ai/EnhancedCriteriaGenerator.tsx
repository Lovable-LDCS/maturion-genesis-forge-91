import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, AlertTriangle } from 'lucide-react';
import { AIFeedbackInterface } from './AIFeedbackInterface';
import { FallbackTraceabilityPanel } from './FallbackTraceabilityPanel';
import { useBestPracticeComparator } from '@/hooks/useBestPracticeComparator';
import { useSmartFeedbackLoop } from '@/hooks/useSmartFeedbackLoop';
import { useToast } from '@/hooks/use-toast';

interface EnhancedCriteriaGeneratorProps {
  domainId: string;
  mpsId: string;
  onCriteriaGenerated: (criteria: string, sourceType: 'internal' | 'best_practice' | 'smart_feedback') => void;
}

export const EnhancedCriteriaGenerator = ({
  domainId,
  mpsId,
  onCriteriaGenerated
}: EnhancedCriteriaGeneratorProps) => {
  const [userInput, setUserInput] = useState('');
  const [generatedCriteria, setGeneratedCriteria] = useState<string | null>(null);
  const [sourceType, setSourceType] = useState<'internal' | 'best_practice' | 'smart_feedback'>('internal');
  const [standardSource, setStandardSource] = useState<string | null>(null);
  const [fallbackPath, setFallbackPath] = useState<string[]>([]);
  const [modifications, setModifications] = useState<string[]>([]);
  const [confidence, setConfidence] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const { compareAgainstBestPractices, isAnalyzing } = useBestPracticeComparator();
  const { applySmartFeedback } = useSmartFeedbackLoop();
  const { toast } = useToast();

  const generateCriteria = useCallback(async () => {
    if (!userInput.trim()) {
      toast({
        title: "Input Required",
        description: "Please describe the criteria you want to generate",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Step 1: Apply smart feedback learning to input
      const feedbackResult = await applySmartFeedback(userInput, domainId);
      
      if (feedbackResult.suppressionApplied) {
        toast({
          title: "Content Suppressed",
          description: "Similar content was previously rejected. Please try a different approach.",
          variant: "destructive",
        });
        setIsGenerating(false);
        return;
      }

      // Step 2: Use improved input with fallback traceability
      const improvedInput = feedbackResult.modifiedContent;

      // Step 3: Check for best practice comparison
      const bestPracticeResult = await compareAgainstBestPractices(improvedInput, domainId);

      let criteria: string;
      let source: 'internal' | 'best_practice' | 'smart_feedback' = 'internal';
      let standardRef: string | null = null;
      let finalFallbackPath: string[] = [...feedbackResult.fallbackTraceability];
      let finalModifications: string[] = [...feedbackResult.modificationsApplied];

      if (bestPracticeResult.fallbackUsed && bestPracticeResult.matches.length > 0) {
        // Use best practice recommendation
        criteria = bestPracticeResult.recommendation;
        source = 'best_practice';
        standardRef = bestPracticeResult.matches[0]?.source || 'International Standards';
        finalFallbackPath.push('Applied international standards fallback');
      } else if (feedbackResult.modificationsApplied.length > 0) {
        // Smart feedback was applied
        criteria = bestPracticeResult.recommendation || await generateFromInternal(improvedInput);
        source = 'smart_feedback';
      } else {
        // Generate from internal knowledge or basic AI
        criteria = bestPracticeResult.recommendation || await generateFromInternal(improvedInput);
      }

      setGeneratedCriteria(criteria);
      setSourceType(source);
      setStandardSource(standardRef);
      setFallbackPath(finalFallbackPath);
      setModifications(finalModifications);
      setConfidence(bestPracticeResult.matches[0]?.similarity_score || 0.75);

    } catch (error) {
      console.error('Error generating criteria:', error);
      toast({
        title: "Generation Failed",
        description: "Unable to generate criteria. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [userInput, domainId, compareAgainstBestPractices, applySmartFeedback, toast]);

  const generateFromInternal = async (input: string): Promise<string> => {
    // This would typically call an AI service or use internal knowledge
    // For now, return a sample criteria
    return `Based on your input "${input}", here is a suggested criteria that aligns with your organization's practices and requirements. This should be measurable, achievable, and directly related to your security maturity objectives.`;
  };

  const handleContentUpdate = (updatedContent: string) => {
    setGeneratedCriteria(updatedContent);
  };

  const handleAcceptCriteria = () => {
    if (generatedCriteria) {
      onCriteriaGenerated(generatedCriteria, sourceType);
      setGeneratedCriteria(null);
      setUserInput('');
      setFallbackPath([]);
      setModifications([]);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Enhanced Criteria Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Describe the criteria you need:</label>
            <Textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="e.g., Our organization needs criteria for monitoring third-party vendor security compliance..."
              className="mt-1"
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={generateCriteria}
              disabled={isGenerating || isAnalyzing}
              className="flex items-center gap-2"
            >
              {(isGenerating || isAnalyzing) && <Loader2 className="w-4 h-4 animate-spin" />}
              Generate Criteria
            </Button>
            
            {isAnalyzing && (
              <Badge variant="outline" className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Checking best practices...
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {generatedCriteria && (
        <div className="space-y-4">
          <AIFeedbackInterface
            aiGeneratedContent={generatedCriteria}
            contentType="criteria"
            domainId={domainId}
            onContentUpdate={handleContentUpdate}
            sourceType={sourceType}
            standardSource={standardSource}
          />
          
          <FallbackTraceabilityPanel
            fallbackPath={fallbackPath}
            modifications={modifications}
            sourceType={sourceType}
            confidence={confidence}
            timestamp={new Date().toISOString()}
          />
          
          <div className="flex gap-2">
            <Button onClick={handleAcceptCriteria}>
              Accept & Add Criteria
            </Button>
            <Button variant="outline" onClick={() => setGeneratedCriteria(null)}>
              Discard
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};