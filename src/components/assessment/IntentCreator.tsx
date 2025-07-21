import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Edit3, Check, X, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useIntentGeneration } from '@/hooks/useIntentGeneration';
import { AISourceIndicator } from '@/components/ai/AISourceIndicator';

// Helper function to get MPS range for a domain
const getDomainMPSRange = (domainName: string): string => {
  switch (domainName) {
    case 'Leadership & Governance':
      return 'MPS 1-5';
    case 'Process Integrity':
      return 'MPS 6-10';
    case 'People & Culture':
      return 'MPS 11-14';
    case 'Protection':
      return 'MPS 15-20';
    case 'Proof it Works':
      return 'MPS 21-25';
    default:
      return '';
  }
};

interface MPS {
  id: string;
  name?: string;
  title?: string;
  number?: string;
  intent?: string;
  description?: string;
  rationale?: string;
  accepted?: boolean;
  aiSourceType?: 'internal' | 'external';
  hasDocumentContext?: boolean;
}

interface IntentCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  domainName: string;
  acceptedMPSs: MPS[];
  onIntentsFinalized: (mpssWithIntents: MPS[]) => void;
}

export const IntentCreator: React.FC<IntentCreatorProps> = ({
  isOpen,
  onClose,
  domainName,
  acceptedMPSs,
  onIntentsFinalized
}) => {
  const [mpssWithIntents, setMpssWithIntents] = useState<MPS[]>([]);
  const [editingMPS, setEditingMPS] = useState<string | null>(null);
  const [editedIntent, setEditedIntent] = useState('');
  const [expandedReasons, setExpandedReasons] = useState<Set<string>>(new Set());
  const [isGeneratingIntents, setIsGeneratingIntents] = useState(false);
  const [scrollToMPS, setScrollToMPS] = useState<string | null>(null);

  const { generateIntent, isLoading } = useIntentGeneration();

  // Initialize MPSs with AI-generated intents when modal opens
  useEffect(() => {
    if (isOpen && acceptedMPSs.length > 0 && mpssWithIntents.length === 0) {
      generateIntentsForMPSs();
    }
  }, [isOpen, acceptedMPSs]);

  const generateIntentsForMPSs = async () => {
    setIsGeneratingIntents(true);
    
    try {
      // Use the already accepted MPSs and generate all intents in one batch request
      const mpsDataForGeneration = acceptedMPSs.map(mps => ({
        number: mps.number || 'Unknown',
        name: mps.name || mps.title || 'Unknown MPS',
        description: mps.description || '',
        rationale: mps.rationale || ''
      }));

      const prompt = `Generate specific, actionable intent statements for these already-accepted MPSs from the ${domainName} domain. 

ACCEPTED MPSs TO PROCESS:
${mpsDataForGeneration.map(mps => `- MPS ${mps.number}: ${mps.name}${mps.description ? ` - ${mps.description}` : ''}`).join('\n')}

CRITICAL INSTRUCTIONS:
- Use ONLY the MPSs listed above that have already been accepted by the user
- Generate intent statements based on the actual uploaded document content for each MPS
- For "Legal and Regulatory Requirements": Reference compliance frameworks, regulatory obligations, audit requirements, applicable laws
- For "Leadership" MPSs: Focus on governance structures, accountability frameworks, strategic oversight  
- For "Separation of Duties": Focus on role segregation, conflict prevention, access controls, authorization mechanisms
- Each intent should be 1-2 sentences, action-oriented, and auditable

Return a JSON array with this exact format:
[
  {
    "mps_number": "1",
    "intent": "specific intent statement here"
  },
  {
    "mps_number": "2", 
    "intent": "specific intent statement here"
  }
]

Generate intents for ALL ${acceptedMPSs.length} accepted MPSs listed above.`;

      const generatedResponse = await generateIntent(prompt);
      
      // Parse the AI response and map back to the accepted MPSs
      let generatedIntents: Array<{mps_number: string, intent: string}> = [];
      
      try {
        // Try to parse JSON response
        const cleanResponse = generatedResponse.replace(/```json\n?|\n?```/g, '').trim();
        generatedIntents = JSON.parse(cleanResponse);
      } catch (parseError) {
        console.warn('Failed to parse JSON response, using fallback approach');
        // Fallback: create default intents for each accepted MPS
        generatedIntents = acceptedMPSs.map((mps, index) => ({
          mps_number: (mps.number || (index + 1).toString()),
          intent: `Establish ${(mps.name || mps.title)?.toLowerCase() || 'appropriate standards'} to ensure compliance and effective governance within the ${domainName} domain.`
        }));
      }

      // Map generated intents back to the accepted MPSs structure
      const mpssWithGeneratedIntents = acceptedMPSs.map(mps => {
        const mpsNumber = mps.number;
        const generatedIntent = generatedIntents.find(gi => gi.mps_number === mpsNumber);
        
        return {
          ...mps,
          intent: generatedIntent?.intent || `Establish ${(mps.name || mps.title)?.toLowerCase() || 'appropriate standards'} to ensure compliance and effective governance within the ${domainName} domain.`,
          accepted: false
        };
      });

      setMpssWithIntents(mpssWithGeneratedIntents);
    } catch (error) {
      console.error('Error generating intents for accepted MPSs:', error);
      // Create fallback intents for all accepted MPSs
      const fallbackMpss = acceptedMPSs.map(mps => ({
        ...mps,
        intent: `Establish ${mps.name?.toLowerCase() || 'appropriate standards'} to ensure compliance and effective governance within the ${domainName} domain.`,
        accepted: false
      }));
      setMpssWithIntents(fallbackMpss);
    } finally {
      setIsGeneratingIntents(false);
    }
  };

  const handleEditIntent = (mpsId: string, currentIntent: string) => {
    setEditingMPS(mpsId);
    setEditedIntent(currentIntent);
  };

  const handleSaveIntent = (mpsId: string) => {
    setMpssWithIntents(prev => 
      prev.map(mps => 
        mps.id === mpsId 
          ? { ...mps, intent: editedIntent }
          : mps
      )
    );
    setEditingMPS(null);
    setEditedIntent('');
  };

  const handleCancelEdit = () => {
    setEditingMPS(null);
    setEditedIntent('');
  };

  const handleAcceptAndEdit = (mpsId: string) => {
    const mps = mpssWithIntents.find(m => m.id === mpsId);
    if (mps) {
      setEditingMPS(mpsId);
      setEditedIntent(mps.intent || '');
      setMpssWithIntents(prev => 
        prev.map(m => 
          m.id === mpsId 
            ? { ...m, accepted: true }
            : m
        )
      );
    }
  };

  const handleAcceptAllSuggestions = () => {
    setMpssWithIntents(prev => 
      prev.map(mps => ({ ...mps, accepted: true }))
    );
    // Focus on first non-finalized MPS for editing
    const firstUnfinalized = mpssWithIntents.find(mps => !mps.accepted);
    if (firstUnfinalized) {
      setScrollToMPS(firstUnfinalized.id);
    }
  };

  const handleFinalizeIntent = (mpsId: string) => {
    setMpssWithIntents(prev => 
      prev.map(mps => 
        mps.id === mpsId 
          ? { ...mps, intent: editedIntent, accepted: true }
          : mps
      )
    );
    setEditingMPS(null);
    setEditedIntent('');
    
    // Move to next unaccepted MPS
    const currentIndex = mpssWithIntents.findIndex(mps => mps.id === mpsId);
    const nextUnaccepted = mpssWithIntents.slice(currentIndex + 1).find(mps => !mps.accepted);
    if (nextUnaccepted) {
      setScrollToMPS(nextUnaccepted.id);
    }
  };

  const toggleReasonExpansion = (mpsId: string) => {
    setExpandedReasons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(mpsId)) {
        newSet.delete(mpsId);
      } else {
        newSet.add(mpsId);
      }
      return newSet;
    });
  };

  const acceptedCount = mpssWithIntents.filter(mps => mps.accepted).length;
  const totalCount = mpssWithIntents.length;
  const progress = totalCount > 0 ? (acceptedCount / totalCount) * 100 : 0;

  const handleFinalizeIntents = () => {
    onIntentsFinalized(mpssWithIntents);
    onClose();
  };

  const allIntentsAccepted = mpssWithIntents.length > 0 && mpssWithIntents.every(mps => mps.accepted);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-xl font-bold">
            {domainName} – Intent Creator
            <span className="text-sm font-normal text-muted-foreground ml-2">
              ({getDomainMPSRange(domainName)})
            </span>
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Welcome to the Intent Creator. Here you will review and refine the Intent & Objective statements for each accepted MPS in the {domainName} domain. Clear, well-defined intent statements help auditors understand the purpose, scope, and importance of each standard. Maturion will guide you with best-practice wording and suggestions.
          </p>
        </DialogHeader>

        {/* Progress Section */}
        <div className="bg-muted/50 rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Progress: {acceptedCount} of {totalCount} MPSs accepted</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{Math.round(progress)}% complete - {acceptedCount === 0 ? 'Not Started' : acceptedCount === totalCount ? 'Complete' : 'In Progress'}</span>
              <Badge variant="outline" className="text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                Maturion
              </Badge>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Select All Button */}
        {!isGeneratingIntents && mpssWithIntents.length > 0 && (
          <div className="flex justify-center mb-4">
            <Button
              onClick={handleAcceptAllSuggestions}
              variant="outline"
              className="gap-2"
              disabled={allIntentsAccepted}
            >
              <Sparkles className="h-4 w-4" />
              Accept All Suggested Intents
            </Button>
          </div>
        )}

        {/* Loading State */}
        {isGeneratingIntents && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Generating AI intent statements...</p>
            </div>
          </div>
        )}

        {/* MPSs List */}
        <div className="flex-1 overflow-y-auto space-y-4">
          {mpssWithIntents.map((mps, index) => (
            <Card 
              key={mps.id} 
              className={`border transition-all duration-200 ${
                mps.accepted 
                  ? 'border-green-200 bg-green-50/50 ring-1 ring-green-100' 
                  : 'border-border hover:border-green-200'
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-base">MPS {index + 1} – {mps.title || mps.name}</CardTitle>
                    </div>
                    {mps.description && (
                      <CardDescription className="text-sm text-muted-foreground">
                        {mps.description}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {mps.accepted ? (
                      <Badge variant="default" className="bg-green-100 text-green-700 border-green-200">
                        Intent Finalized
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        Pending Review
                      </Badge>
                    )}
                     <div className="flex items-center gap-2">
                       <Badge variant="outline" className="text-xs">
                         <Sparkles className="h-3 w-3 mr-1" />
                         Maturion
                       </Badge>
                       <AISourceIndicator 
                         sourceType={mps.aiSourceType || 'internal'}
                         isInternalOnlyContext={true}
                         hasDocumentContext={mps.hasDocumentContext !== false}
                       />
                     </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Intent & Objective Statement</h4>
                    
                    {editingMPS === mps.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editedIntent}
                          onChange={(e) => setEditedIntent(e.target.value)}
                          placeholder="Enter intent statement..."
                          className="min-h-[80px]"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleFinalizeIntent(mps.id)}
                            disabled={!editedIntent.trim()}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Finalize Intent
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEdit}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-muted/30 rounded-lg p-3 relative">
                        <p className="text-sm mb-2 pr-12">{mps.intent}</p>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditIntent(mps.id, mps.intent || '')}
                            className="text-xs"
                            disabled={mps.accepted}
                          >
                            <Edit3 className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          {!mps.accepted && (
                            <Button
                              size="sm"
                              onClick={() => handleAcceptAndEdit(mps.id)}
                              className="text-xs"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Accept and Edit
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Why this Intent? */}
                  <Collapsible>
                    <CollapsibleTrigger
                      onClick={() => toggleReasonExpansion(mps.id)}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <span className="flex items-center gap-1">
                        ❓ Why this Intent?
                        {expandedReasons.has(mps.id) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </span>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                      <div className="text-xs text-muted-foreground bg-muted/20 rounded p-3">
                        {mps.rationale || `This intent statement provides clear direction for implementing ${mps.name} within the ${domainName} domain. It establishes measurable objectives and aligns with industry best practices for process integrity and compliance.`}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Back to Dashboard
          </Button>
          <Button
            onClick={handleFinalizeIntents}
            disabled={!allIntentsAccepted}
            className="bg-primary hover:bg-primary/90"
          >
            Continue to Step 3 - Create Criteria
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};