/**
 * Structured error logging utilities
 */

/**
 * Logs critical errors with context for debugging
 */
export function logCriticalError(context: string, error: any): void {
  console.error(`🚨 ${context}:`, error.message || error);
}

/**
 * Logs debug information in admin mode
 */
export function logDebugInfo(context: string, info: any, isDebugMode: boolean = false): void {
  if (isDebugMode) {
    console.log(`🔧 DEBUG - ${context}:`, info);
  }
}

/**
 * Logs warnings with context
 */
export function logWarning(context: string, message: string, details?: any): void {
  console.warn(`⚠️ WARNING: ${context} - ${message}`, details || '');
}