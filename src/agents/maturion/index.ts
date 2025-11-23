/**
 * Maturion AI Agent - Main Orchestrator
 * Coordinates all Maturion capabilities: routing, context, RAG, tools, guardrails
 */

import { selectModel, type TaskCategory } from './router/modelRouter';
import { buildMaturionContext, formatContextForPrompt, getRelevantDocuments, type MaturionContext } from './context/contextProvider';
import { retrieveContext } from './rag/documentRetrieval';
import { toolRegistry, parseToolCall, formatToolsForPrompt } from './tools/toolInterface';
import { registerCoreTools } from './tools/coreTools';
import { checkGuardrails, sanitizeResponse, validateToolArguments, logSecurityEvent } from './guardrails/guardrails';
import { recordInteractionFeedback, recordLearningPattern } from './learning/learningLayer';
import { supabase } from '@/integrations/supabase/client';

// Load system prompt
import systemPrompt from './prompts/system.md?raw';

// Register tools on import
registerCoreTools();

export interface MaturionQuery {
  query: string;
  context: MaturionContext;
  includeTools?: boolean;
  maxIterations?: number;
}

export interface MaturionResponse {
  response: string;
  taskCategory: TaskCategory;
  modelUsed: string;
  toolsExecuted: Array<{
    toolName: string;
    args: Record<string, unknown>;
    result: unknown;
  }>;
  documentsReferenced: string[];
  confidenceScore: number;
  interactionId: string;
}

/**
 * Main Maturion query function
 * Orchestrates the entire AI agent workflow
 */
export async function queryMaturion(params: MaturionQuery): Promise<MaturionResponse> {
  const { query, context, includeTools = true, maxIterations = 3 } = params;

  // Generate interaction ID
  const interactionId = `maturion_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  console.log('[Maturion Agent] Processing query:', query.substring(0, 50) + '...');

  // Step 1: Check guardrails
  const guardrailCheck = checkGuardrails('query', { query }, context);
  if (!guardrailCheck.allowed) {
    await logSecurityEvent({
      type: 'guardrail_violation',
      severity: 'high',
      details: guardrailCheck.violations.map((v) => v.message).join('; '),
      userId: context.userId || undefined,
      organizationId: context.organizationId || undefined,
    });

    return {
      response: 'I cannot process this request due to security constraints: ' + 
                guardrailCheck.violations[0].message,
      taskCategory: 'general_advisory',
      modelUsed: 'none',
      toolsExecuted: [],
      documentsReferenced: [],
      confidenceScore: 0,
      interactionId,
    };
  }

  // Step 2: Select appropriate model
  const { config: modelConfig, taskCategory } = selectModel(query, {
    pageType: context.currentPage || undefined,
    documentTypes: context.uploadedDocuments.map((d) => d.fileType),
  });

  // Step 3: Retrieve relevant documents via RAG
  let documentContext = '';
  let documentsReferenced: string[] = [];

  if (context.organizationId) {
    documentContext = await retrieveContext(
      query,
      context.organizationId,
      context.currentDomain || undefined
    );
    
    const relevantDocs = getRelevantDocuments(context);
    documentsReferenced = relevantDocs.map((d) => d.fileName);
  }

  // Step 4: Build full prompt
  const contextPrompt = formatContextForPrompt(context);
  const toolsPrompt = includeTools ? formatToolsForPrompt(toolRegistry.listAll()) : '';

  const fullPrompt = `${systemPrompt}

## Current Context
${contextPrompt}

## Available Documents
${documentContext}

${toolsPrompt ? `## Available Tools\n${toolsPrompt}` : ''}

## User Query
${query}

Please provide a comprehensive response. If you need to use tools, format your tool calls as:
TOOL_CALL: tool_name(param1=value1, param2=value2)
`;

  // Step 5: Execute AI query (this would call OpenAI in production)
  let response = await executeAIQuery(fullPrompt, modelConfig);
  const toolsExecuted: MaturionResponse['toolsExecuted'] = [];

  // Step 6: Handle tool calls (iterative)
  let iteration = 0;
  while (iteration < maxIterations && includeTools) {
    const toolCall = parseToolCall(response);

    if (!toolCall) {
      break; // No tool call found, we're done
    }

    const { toolName, args } = toolCall;

    // Validate tool arguments
    const validation = validateToolArguments(toolName, args);
    if (!validation.valid) {
      response += `\n\n[Tool execution failed: ${validation.errors.join(', ')}]`;
      break;
    }

    // Execute tool
    console.log(`[Maturion Agent] Executing tool: ${toolName}`);
    const toolResult = await toolRegistry.executeTool(toolName, args, context);

    toolsExecuted.push({
      toolName,
      args,
      result: toolResult.data,
    });

    // Append tool result to response
    if (toolResult.success) {
      response += `\n\n[Tool Result: ${toolResult.message || 'Success'}]\n${JSON.stringify(toolResult.data, null, 2)}`;
    } else {
      response += `\n\n[Tool Error: ${toolResult.error || 'Unknown error'}]`;
    }

    iteration++;
  }

  // Step 7: Sanitize response
  response = sanitizeResponse(response);

  // Step 8: Calculate confidence score
  const confidenceScore = calculateConfidenceScore({
    hasDocumentContext: documentContext.length > 100,
    toolsExecuted: toolsExecuted.length,
    taskCategory,
    queryLength: query.length,
  });

  // Step 9: Store interaction
  await storeInteraction({
    interactionId,
    query,
    response,
    taskCategory,
    modelUsed: modelConfig.model,
    toolsExecuted,
    documentsReferenced,
    confidenceScore,
    userId: context.userId,
    organizationId: context.organizationId,
  });

  // Step 10: Record learning patterns
  if (confidenceScore < 0.7) {
    await recordLearningPattern({
      patternType: 'response_quality',
      description: `Low confidence response (${(confidenceScore * 100).toFixed(0)}%) for query: ${query.substring(0, 50)}`,
      suggestedImprovement: 'Review and improve response quality for similar queries',
    });
  }

  return {
    response,
    taskCategory,
    modelUsed: modelConfig.model,
    toolsExecuted,
    documentsReferenced,
    confidenceScore,
    interactionId,
  };
}

/**
 * Executes AI query (placeholder - would call OpenAI in production)
 */
async function executeAIQuery(
  prompt: string,
  config: { model: string; temperature: number; maxTokens: number }
): Promise<string> {
  // In production, this would call the AI model
  // For now, return a placeholder
  console.log('[Maturion Agent] Executing AI query with model:', config.model);

  try {
    // Call Supabase Edge Function that wraps OpenAI
    const { data, error } = await supabase.functions.invoke('maturion-ai-chat', {
      body: {
        messages: [{ role: 'system', content: prompt }],
        model: config.model,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
      },
    });

    if (error) {
      console.error('[Maturion Agent] AI query failed:', error);
      return 'I apologize, but I encountered an error processing your request. Please try again.';
    }

    return data.response || data.message || 'No response generated';
  } catch (error) {
    console.error('[Maturion Agent] AI query error:', error);
    return 'I apologize, but I encountered an error processing your request. Please try again.';
  }
}

/**
 * Calculates confidence score for response
 */
function calculateConfidenceScore(factors: {
  hasDocumentContext: boolean;
  toolsExecuted: number;
  taskCategory: TaskCategory;
  queryLength: number;
}): number {
  let score = 0.5; // Base score

  if (factors.hasDocumentContext) score += 0.2;
  if (factors.toolsExecuted > 0) score += 0.15;
  if (factors.taskCategory === 'deep_reasoning') score += 0.1;
  if (factors.queryLength > 50) score += 0.05;

  return Math.min(score, 1.0);
}

/**
 * Stores interaction for analytics and learning
 */
async function storeInteraction(data: {
  interactionId: string;
  query: string;
  response: string;
  taskCategory: TaskCategory;
  modelUsed: string;
  toolsExecuted: MaturionResponse['toolsExecuted'];
  documentsReferenced: string[];
  confidenceScore: number;
  userId: string | null;
  organizationId: string | null;
}): Promise<void> {
  try {
    await supabase.from('maturion_responses').insert({
      id: data.interactionId,
      organization_id: data.organizationId,
      user_id: data.userId,
      query_text: data.query,
      response_text: data.response,
      context_used: {
        taskCategory: data.taskCategory,
        modelUsed: data.modelUsed,
        toolsExecuted: data.toolsExecuted,
        documentsReferenced: data.documentsReferenced,
        confidenceScore: data.confidenceScore,
      },
    });

    console.log('[Maturion Agent] Interaction stored:', data.interactionId);
  } catch (error) {
    console.error('[Maturion Agent] Failed to store interaction:', error);
  }
}

/**
 * Provides feedback on an interaction
 */
export async function provideFeedback(
  interactionId: string,
  feedback: {
    helpful: boolean;
    rating?: number;
    comment?: string;
    userId: string;
  }
): Promise<void> {
  await recordInteractionFeedback({
    interactionId,
    helpful: feedback.helpful,
    rating: feedback.rating,
    comment: feedback.comment,
    userId: feedback.userId,
    timestamp: new Date(),
  });
}

export { MaturionContext, buildMaturionContext } from './context/contextProvider';
export { toolRegistry } from './tools/toolInterface';
export { getPendingLearningPatterns, approveLearningPattern, rejectLearningPattern } from './learning/learningLayer';
