import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks
 */
export const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: []
  });
};

/**
 * Sanitizes user input for database storage
 */
export const sanitizeInput = (input: string): string => {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .slice(0, 1000); // Limit length
};

/**
 * Validates email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates password strength
 */
export const isValidPassword = (password: string): boolean => {
  return password.length >= 8 && 
         /[A-Z]/.test(password) && 
         /[a-z]/.test(password) && 
         /\d/.test(password);
};

/**
 * Detects potential prompt injection attempts
 */
export const detectPromptInjection = (input: string): boolean => {
  const suspiciousPatterns = [
    /ignore\s+previous\s+instructions/i,
    /system\s*:\s*/i,
    /forget\s+everything/i,
    /you\s+are\s+now/i,
    /assistant\s*:\s*/i,
    /human\s*:\s*/i
  ];
  
  return suspiciousPatterns.some(pattern => pattern.test(input));
};

/**
 * Enhanced input validation with security checks
 */
export const validateSecureInput = (input: string, maxLength: number = 1000): { isValid: boolean; sanitized: string; errors: string[] } => {
  const errors: string[] = [];
  
  if (!input || typeof input !== 'string') {
    errors.push('Input must be a valid string');
    return { isValid: false, sanitized: '', errors };
  }

  // Check for prompt injection
  if (detectPromptInjection(input)) {
    errors.push('Input contains potentially malicious content');
    logSecurityEvent('PROMPT_INJECTION_ATTEMPT', { input: input.substring(0, 100) });
    return { isValid: false, sanitized: '', errors };
  }

  // Additional XSS pattern detection
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe[^>]*>/gi,
    /<object[^>]*>/gi,
    /<embed[^>]*>/gi,
    /data:text\/html/gi,
    /vbscript:/gi
  ];

  const hasXSS = xssPatterns.some(pattern => pattern.test(input));
  if (hasXSS) {
    errors.push('Input contains potentially malicious code');
    logSecurityEvent('XSS_ATTEMPT', { input: input.substring(0, 100) });
    return { isValid: false, sanitized: '', errors };
  }

  // Sanitize and validate length
  const sanitized = sanitizeInput(input);
  if (sanitized.length > maxLength) {
    errors.push(`Input exceeds maximum length of ${maxLength} characters`);
    return { isValid: false, sanitized: sanitized.slice(0, maxLength), errors };
  }

  return { isValid: errors.length === 0, sanitized, errors };
};

/**
 * Role hierarchy validation
 */
export const validateRoleHierarchy = (currentUserRole: string, targetRole: string): boolean => {
  const roleHierarchy = {
    'super_admin': 3,
    'admin': 2,
    'moderator': 1,
    'user': 0
  };

  const currentLevel = roleHierarchy[currentUserRole as keyof typeof roleHierarchy] || 0;
  const targetLevel = roleHierarchy[targetRole as keyof typeof roleHierarchy] || 0;

  return currentLevel > targetLevel;
};

/**
 * Security audit logger for client-side events
 */
export const logSecurityEvent = (eventType: string, details: Record<string, any>) => {
  const event = {
    timestamp: new Date().toISOString(),
    type: eventType,
    user_agent: navigator.userAgent,
    url: window.location.href,
    details
  };
  
  // Log to console for development
  console.warn('SECURITY EVENT:', event);
  
  // In production, this would send to a security monitoring service
  return event;
};

/**
 * Rate limiting helper for client-side
 */
export const createRateLimiter = (maxRequests: number, windowMs: number) => {
  const requests = new Map<string, number[]>();
  
  return (identifier: string): boolean => {
    const now = Date.now();
    const userRequests = requests.get(identifier) || [];
    
    // Remove old requests outside the window
    const validRequests = userRequests.filter(time => now - time < windowMs);
    
    if (validRequests.length >= maxRequests) {
      logSecurityEvent('RATE_LIMIT_EXCEEDED', {
        identifier,
        requestCount: validRequests.length,
        maxRequests,
        windowMs
      });
      return false; // Rate limit exceeded
    }
    
    validRequests.push(now);
    requests.set(identifier, validRequests);
    return true; // Request allowed
  };
};