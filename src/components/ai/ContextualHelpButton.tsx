import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HelpCircle, Send, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { sanitizeInput, detectPromptInjection } from '@/lib/security';

interface ContextualHelpButtonProps {
  /**
   * The label/name of the field or section this help button is for
   */
  fieldLabel: string;
  /**
   * Optional additional context about the field
   */
  fieldContext?: string;
  /**
   * Optional className for positioning
   */
  className?: string;
  /**
   * Size of the help icon button
   */
  size?: 'sm' | 'default' | 'lg';
}

/**
 * ContextualHelpButton - A small "?" icon that provides AI-powered contextual help
 * 
 * When clicked, it opens a popover and automatically sends a question to the AI
 * asking for an explanation of the specific field or section.
 */
export const ContextualHelpButton: React.FC<ContextualHelpButtonProps> = ({
  fieldLabel,
  fieldContext,
  className,
  size = 'sm'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { currentOrganization } = useOrganization();

  const iconSizeClass = {
    sm: 'h-4 w-4',
    default: 'h-5 w-5',
    lg: 'h-6 w-6'
  }[size];

  const buttonSizeClass = {
    sm: 'h-6 w-6',
    default: 'h-8 w-8',
    lg: 'h-10 w-10'
  }[size];

  const fetchHelp = async () => {
    setIsLoading(true);
    setError(null);
    setResponse(null);

    const question = `Explain this field/section: ${fieldLabel}${fieldContext ? `. Context: ${fieldContext}` : ''}`;
    
    // Security validation
    const sanitizedQuestion = sanitizeInput(question);
    if (detectPromptInjection(sanitizedQuestion)) {
      setError('Unable to process this request.');
      setIsLoading(false);
      return;
    }

    try {
      const { data, error: apiError } = await supabase.functions.invoke('maturion-ai-chat', {
        body: {
          prompt: sanitizedQuestion,
          context: `Contextual help for field: ${fieldLabel}. Provide a brief, helpful explanation suitable for a tooltip or quick reference.`,
          currentDomain: 'Contextual Help',
          organizationId: currentOrganization?.id,
          orgId: currentOrganization?.id
        }
      });

      if (apiError) throw apiError;

      let responseContent = data.content || data.response || 'No explanation available.';
      // Clean up the response for contextual display
      responseContent = responseContent.replace(/📚.*$/gm, '');
      responseContent = responseContent.replace(/\*Response based on.*\*/gi, '');
      responseContent = responseContent.trim();
      
      setResponse(responseContent);
    } catch (err) {
      console.error('Contextual help error:', err);
      setError('Unable to fetch help at this time. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && !response && !isLoading) {
      fetchHelp();
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`${buttonSizeClass} rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors ${className}`}
          aria-label={`Help for ${fieldLabel}`}
          title={`Get help for: ${fieldLabel}`}
        >
          <HelpCircle className={iconSizeClass} />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-4" 
        side="top" 
        align="center"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm text-foreground">
              {fieldLabel}
            </h4>
            {!isLoading && response && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={fetchHelp}
                title="Refresh explanation"
              >
                <Send className="h-3 w-3" />
              </Button>
            )}
          </div>
          
          <div className="text-sm text-muted-foreground">
            {isLoading && (
              <div className="flex items-center space-x-2 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Getting explanation...</span>
              </div>
            )}
            
            {error && (
              <div className="text-destructive py-2">
                {error}
              </div>
            )}
            
            {response && !isLoading && (
              <p className="whitespace-pre-wrap leading-relaxed">
                {response}
              </p>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
