/**
 * Structured error logging utilities
 * CLEAN LOGGING: Minimal, key information only
 */

export interface DebugContext {
  mpsNumber: number;
  mpsTitle: string;
  organizationId: string;
  documentFound: boolean;
  aiDecisionPath: string[];
  fallbackTriggered?: {
    reason: string;
    source: string;
  };
}

/**
 * Clean, minimal debug logging for key decisions only
 */
export function logKeyDecision(context: string, data: DebugContext, isDebugMode: boolean = false): void {
  if (!isDebugMode) return;
  
  console.group(`🔧 ${context}`);
  console.log(`MPS: ${data.mpsNumber} - ${data.mpsTitle}`);
  console.log(`Document Found: ${data.documentFound ? '✅' : '❌'}`);
  console.log(`Decision Path: ${data.aiDecisionPath.join(' → ')}`);
  if (data.fallbackTriggered) {
    console.warn(`⚠️ Fallback: ${data.fallbackTriggered.reason} (Source: ${data.fallbackTriggered.source})`);
  }
  console.groupEnd();
}

/**
 * Critical error logging with context for debugging
 */
export function logCriticalError(context: string, error: any): void {
  console.error(`🚨 CRITICAL: ${context}`, {
    message: error.message || error,
    timestamp: new Date().toISOString()
  });
}

/**
 * Security violation logging
 */
export function logSecurityViolation(violation: string, details: any): void {
  console.error(`🔒 SECURITY VIOLATION: ${violation}`, details);
}