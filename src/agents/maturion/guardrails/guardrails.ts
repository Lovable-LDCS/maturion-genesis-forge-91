/**
 * Maturion Guardrails
 * Security and safety constraints for AI agent behavior
 */

import type { MaturionContext } from '../context/contextProvider';

export interface GuardrailViolation {
  rule: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
}

/**
 * Checks if an action is allowed based on guardrails
 */
export function checkGuardrails(
  action: string,
  args: Record<string, unknown>,
  context: MaturionContext
): { allowed: boolean; violations: GuardrailViolation[] } {
  const violations: GuardrailViolation[] = [];

  // Rule 1: Organization isolation
  if (!context.organizationId) {
    violations.push({
      rule: 'organization_required',
      severity: 'critical',
      message: 'All actions must be scoped to an organization',
    });
  }

  // Rule 2: User authentication
  if (!context.userId) {
    violations.push({
      rule: 'authentication_required',
      severity: 'critical',
      message: 'User must be authenticated to perform actions',
    });
  }

  // Rule 3: No arbitrary URL calls
  if (action.toLowerCase().includes('fetch') || action.toLowerCase().includes('http')) {
    violations.push({
      rule: 'no_arbitrary_urls',
      severity: 'high',
      message: 'Direct URL fetching is not allowed. Use approved web proxy tool.',
    });
  }

  // Rule 4: No autonomous scanning
  if (
    action.toLowerCase().includes('scan') ||
    action.toLowerCase().includes('crawl') ||
    action.toLowerCase().includes('spider')
  ) {
    violations.push({
      rule: 'no_autonomous_scanning',
      severity: 'high',
      message: 'Autonomous scanning is not allowed. Request scan through approved tools.',
    });
  }

  // Rule 5: Data modification requires admin access
  const modificationActions = ['delete', 'update', 'modify', 'remove'];
  if (modificationActions.some((a) => action.toLowerCase().includes(a))) {
    if (context.userRole !== 'admin') {
      violations.push({
        rule: 'admin_required_for_modification',
        severity: 'high',
        message: 'Data modification requires admin privileges',
      });
    }
  }

  // Rule 6: Cross-organization access prohibited
  if (args.organization_id && args.organization_id !== context.organizationId) {
    violations.push({
      rule: 'cross_org_access_prohibited',
      severity: 'critical',
      message: 'Cannot access data from other organizations',
    });
  }

  // Rule 7: Sensitive data handling
  const sensitiveFields = ['password', 'secret', 'key', 'token', 'credential'];
  const argsString = JSON.stringify(args).toLowerCase();
  if (sensitiveFields.some((field) => argsString.includes(field))) {
    violations.push({
      rule: 'sensitive_data_detected',
      severity: 'high',
      message: 'Sensitive data detected. Ensure proper encryption and access controls.',
    });
  }

  const allowed = violations.filter((v) => v.severity === 'critical').length === 0;

  return { allowed, violations };
}

/**
 * Filters AI response to remove sensitive information
 */
export function sanitizeResponse(response: string): string {
  // Remove potential credentials
  let sanitized = response.replace(
    /\b(password|secret|key|token)\s*[:=]\s*[\w\-\.]+/gi,
    '$1: [REDACTED]'
  );

  // Remove potential email addresses in certain contexts
  sanitized = sanitized.replace(/\b[\w\.-]+@[\w\.-]+\.\w+\b/g, (match) => {
    // Keep emails if they're part of proper documentation
    if (match.includes('example.com') || match.includes('@organization.')) {
      return match;
    }
    return '[EMAIL_REDACTED]';
  });

  // Remove potential IP addresses
  sanitized = sanitized.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP_REDACTED]');

  return sanitized;
}

/**
 * Validates tool arguments for security
 */
export function validateToolArguments(
  toolName: string,
  args: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for SQL injection attempts
  const sqlKeywords = ['DROP', 'DELETE', 'INSERT', 'UPDATE', 'EXEC', 'EXECUTE', '--', ';'];
  const argsString = JSON.stringify(args);
  if (sqlKeywords.some((keyword) => argsString.toUpperCase().includes(keyword))) {
    errors.push('Potential SQL injection detected in arguments');
  }

  // Check for command injection attempts
  const commandChars = ['|', '&&', '||', ';', '`', '$(', '${'];
  if (commandChars.some((char) => argsString.includes(char))) {
    errors.push('Potential command injection detected in arguments');
  }

  // Check for path traversal attempts
  if (argsString.includes('../') || argsString.includes('..\\')) {
    errors.push('Path traversal attempt detected');
  }

  // Check argument length (prevent DoS)
  if (argsString.length > 100000) {
    errors.push('Arguments exceed maximum allowed size');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Rate limiting check for tool execution
 */
const toolExecutionCounts = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  userId: string,
  toolName: string,
  limits: { maxCalls: number; windowMs: number }
): { allowed: boolean; resetIn?: number } {
  const key = `${userId}:${toolName}`;
  const now = Date.now();

  const existing = toolExecutionCounts.get(key);

  if (!existing || now > existing.resetTime) {
    // Reset or initialize
    toolExecutionCounts.set(key, {
      count: 1,
      resetTime: now + limits.windowMs,
    });
    return { allowed: true };
  }

  if (existing.count >= limits.maxCalls) {
    return {
      allowed: false,
      resetIn: existing.resetTime - now,
    };
  }

  existing.count++;
  return { allowed: true };
}

/**
 * Logs security events
 */
export async function logSecurityEvent(
  event: {
    type: 'guardrail_violation' | 'rate_limit' | 'suspicious_activity';
    severity: 'low' | 'medium' | 'high' | 'critical';
    details: string;
    userId?: string;
    organizationId?: string;
  }
): Promise<void> {
  console.warn('[Maturion Security]', event);

  // In production, store in security_logs table
  // await supabase.from('security_logs').insert({
  //   event_type: event.type,
  //   severity: event.severity,
  //   details: event.details,
  //   user_id: event.userId,
  //   organization_id: event.organizationId,
  // });
}
