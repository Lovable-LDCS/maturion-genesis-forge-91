import { supabase } from './utils.ts';

interface ConversationContext {
  responseId?: string;
  organizationId: string;
  userId?: string;
  conversationHistory: Array<{
    id: string;
    prompt: string;
    response: string;
    timestamp: string;
  }>;
}

export class ConversationStateManager {
  private context: ConversationContext;

  constructor(organizationId: string, userId?: string) {
    this.context = {
      organizationId,
      userId,
      conversationHistory: []
    };
  }

  // Store conversation turn in Supabase
  async storeConversationTurn(prompt: string, response: string, responseId?: string): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('conversation_history')
        .insert({
          organization_id: this.context.organizationId,
          user_id: this.context.userId,
          prompt: prompt,
          response: response,
          openai_response_id: responseId,
          metadata: {
            previous_response_id: this.context.responseId,
            session_context: 'maturion_chat'
          }
        })
        .select('id')
        .single();

      if (error) throw error;

      // Update local context
      this.context.responseId = responseId;
      this.context.conversationHistory.push({
        id: data.id,
        prompt,
        response,
        timestamp: new Date().toISOString()
      });

      return data.id;
    } catch (error) {
      console.error('Failed to store conversation turn:', error);
      throw error;
    }
  }

  // Get recent conversation context for multi-turn responses
  async getRecentContext(limit: number = 3): Promise<Array<{role: string, content: string}>> {
    try {
      const { data, error } = await supabase
        .from('conversation_history')
        .select('prompt, response')
        .eq('organization_id', this.context.organizationId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const context: Array<{role: string, content: string}> = [];
      
      // Add conversation history in chronological order
      data.reverse().forEach(turn => {
        context.push({ role: 'user', content: turn.prompt });
        context.push({ role: 'assistant', content: turn.response });
      });

      return context;
    } catch (error) {
      console.error('Failed to get conversation context:', error);
      return [];
    }
  }

  // Get the last response ID for chaining
  getLastResponseId(): string | undefined {
    return this.context.responseId;
  }

  // Build input with conversation context
  async buildContextualInput(currentPrompt: string): Promise<any> {
    const recentContext = await this.getRecentContext(2); // Last 2 exchanges
    
    if (recentContext.length === 0) {
      return currentPrompt;
    }

    // For Responses API, we can pass the conversation as an array
    return [
      ...recentContext,
      { role: 'user', content: currentPrompt }
    ];
  }
}