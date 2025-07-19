import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MaturitySuggestion {
  currentState: string;
  workingToward: string;
  keyRecommendations: string[];
}

interface UseMaturionSuggestionsProps {
  domain: string;
  currentLevel: string;
  context?: string;
}

export const useMaturionSuggestions = ({ 
  domain, 
  currentLevel, 
  context 
}: UseMaturionSuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<MaturitySuggestion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSuggestions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const prompt = `Generate specific, actionable maturity guidance for the ${domain} domain at ${currentLevel} level. 

Context: ${context || 'No specific context provided'}

Please provide:
1. A clear description of the current state characteristics
2. Specific next-level objectives they should work toward
3. 3-4 key actionable recommendations for improvement

Focus on practical, implementable steps that align with moving from ${currentLevel} toward the next maturity level.

Format as a structured response with clear sections.`;

      const { data, error: functionError } = await supabase.functions.invoke('maturion-ai-chat', {
        body: {
          prompt,
          context: `${domain} domain maturity assessment`,
          currentDomain: domain
        }
      });

      if (functionError) throw functionError;

      if (data.success) {
        // Parse the AI response to extract structured information
        const response = data.response;
        
        // For now, we'll use the full response and let the component handle formatting
        // In a more advanced implementation, we could parse this into structured data
        setSuggestions({
          currentState: `Current ${currentLevel} level characteristics for ${domain}`,
          workingToward: `Next level objectives for ${domain}`,
          keyRecommendations: [response] // Store full response as single recommendation for now
        });
      } else {
        throw new Error(data.error || 'Failed to generate suggestions');
      }
    } catch (err) {
      console.error('Error generating suggestions:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (domain && currentLevel) {
      generateSuggestions();
    }
  }, [domain, currentLevel, context]);

  return {
    suggestions,
    isLoading,
    error,
    refreshSuggestions: generateSuggestions
  };
};