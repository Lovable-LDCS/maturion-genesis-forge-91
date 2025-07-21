import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './useOrganization';

export const useIntentGeneration = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentOrganization } = useOrganization();

  const generateIntent = async (prompt: string): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('maturion-ai-chat', {
        body: {
          prompt,
          context: 'Intent statement generation',
          organizationId: currentOrganization?.id,
        }
      });

      if (functionError) throw functionError;

      if (data.success) {
        return data.response || '';
      } else {
        throw new Error(data.error || 'Failed to generate intent');
      }
    } catch (err) {
      console.error('Error generating intent:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate intent';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    generateIntent,
    isLoading,
    error
  };
};