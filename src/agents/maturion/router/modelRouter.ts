/**
 * Maturion Model Router
 * Dynamically selects the appropriate AI model based on task requirements
 */

export type ModelType =
  | 'gpt-5-thinking' // Deep risk reasoning, security analysis, audit interpretation
  | 'gpt-5' // General conversation, professional advisory
  | 'gpt-4.1' // Fast classification, lightweight Q/A
  | 'gpt-4o-mini' // UI responses, metadata formatting
  | 'specialist'; // Future: anomaly detection, code improvement, log analysis

export type TaskCategory =
  | 'deep_reasoning' // Complex security analysis, risk assessment
  | 'general_advisory' // Standard conversational guidance
  | 'quick_classification' // Fast categorization and filtering
  | 'ui_formatting' // Response formatting for display
  | 'code_analysis' // Code review and improvement
  | 'log_analysis' // Security log parsing
  | 'anomaly_detection'; // Threat detection

interface ModelConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  topP?: number;
}

const MODEL_CONFIGURATIONS: Record<ModelType, ModelConfig> = {
  'gpt-5-thinking': {
    model: 'o1-preview', // OpenAI's advanced reasoning model
    temperature: 1, // o1 models use temperature: 1
    maxTokens: 25000,
  },
  'gpt-5': {
    model: 'gpt-4-turbo-preview', // Placeholder for GPT-5 when available
    temperature: 0.7,
    maxTokens: 4096,
    topP: 0.9,
  },
  'gpt-4.1': {
    model: 'gpt-4-turbo-preview',
    temperature: 0.3, // Lower temperature for more deterministic responses
    maxTokens: 2048,
    topP: 0.8,
  },
  'gpt-4o-mini': {
    model: 'gpt-4o-mini',
    temperature: 0.5,
    maxTokens: 1024,
    topP: 0.7,
  },
  'specialist': {
    model: 'gpt-4-turbo-preview', // Default until specialist models are trained
    temperature: 0.4,
    maxTokens: 2048,
    topP: 0.8,
  },
};

/**
 * Routes a task to the appropriate AI model based on task category
 */
export function routeToModel(taskCategory: TaskCategory): ModelConfig {
  const modelTypeMap: Record<TaskCategory, ModelType> = {
    deep_reasoning: 'gpt-5-thinking',
    general_advisory: 'gpt-5',
    quick_classification: 'gpt-4.1',
    ui_formatting: 'gpt-4o-mini',
    code_analysis: 'specialist',
    log_analysis: 'specialist',
    anomaly_detection: 'specialist',
  };

  const modelType = modelTypeMap[taskCategory];
  return MODEL_CONFIGURATIONS[modelType];
}

/**
 * Infers task category from the user's query and context
 */
export function inferTaskCategory(
  query: string,
  context?: { pageType?: string; documentTypes?: string[] }
): TaskCategory {
  const lowerQuery = query.toLowerCase();

  // Deep reasoning indicators
  if (
    lowerQuery.includes('analyze') ||
    lowerQuery.includes('threat') ||
    lowerQuery.includes('risk assessment') ||
    lowerQuery.includes('security audit') ||
    lowerQuery.includes('compliance gap')
  ) {
    return 'deep_reasoning';
  }

  // UI formatting indicators
  if (
    lowerQuery.includes('format') ||
    lowerQuery.includes('display') ||
    lowerQuery.includes('show me') ||
    context?.pageType === 'dashboard'
  ) {
    return 'ui_formatting';
  }

  // Quick classification indicators
  if (
    lowerQuery.includes('classify') ||
    lowerQuery.includes('categorize') ||
    lowerQuery.includes('is this') ||
    lowerQuery.includes('does this')
  ) {
    return 'quick_classification';
  }

  // Code analysis indicators
  if (
    lowerQuery.includes('code') ||
    lowerQuery.includes('function') ||
    lowerQuery.includes('implement')
  ) {
    return 'code_analysis';
  }

  // Log analysis indicators
  if (
    lowerQuery.includes('log') ||
    lowerQuery.includes('event') ||
    lowerQuery.includes('trace')
  ) {
    return 'log_analysis';
  }

  // Anomaly detection indicators
  if (
    lowerQuery.includes('unusual') ||
    lowerQuery.includes('anomaly') ||
    lowerQuery.includes('suspicious')
  ) {
    return 'anomaly_detection';
  }

  // Default to general advisory
  return 'general_advisory';
}

/**
 * Main router function
 * Analyzes query and context, selects appropriate model
 */
export function selectModel(
  query: string,
  context?: { pageType?: string; documentTypes?: string[] }
): { config: ModelConfig; taskCategory: TaskCategory } {
  const taskCategory = inferTaskCategory(query, context);
  const config = routeToModel(taskCategory);

  console.log('[Maturion Router]', {
    query: query.substring(0, 50) + '...',
    taskCategory,
    selectedModel: config.model,
    timestamp: new Date().toISOString(),
  });

  return { config, taskCategory };
}
