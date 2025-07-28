import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';
import { supabaseUrl, supabaseServiceKey } from './constants.ts';

export const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Function to determine knowledge tier based on context
export function determineKnowledgeTier(context: string): 'INTERNAL_SECURE' | 'ORGANIZATIONAL_CONTEXT' | 'EXTERNAL_AWARENESS' {
  const contextLower = context.toLowerCase();
  
  // Check for Tier 1 (Internal Secure) contexts first - most restrictive
  if (contextLower.includes('mps') || 
      contextLower.includes('intent') || 
      contextLower.includes('criteria') || 
      contextLower.includes('audit') || 
      contextLower.includes('maturity') ||
      contextLower.includes('compliance') ||
      contextLower.includes('evidence') ||
      contextLower.includes('scoring')) {
    return 'INTERNAL_SECURE';
  }
  
  // Check for Tier 3 (External Awareness) contexts
  if (contextLower.includes('threat') || 
      contextLower.includes('risk') || 
      contextLower.includes('surveillance') || 
      contextLower.includes('awareness') ||
      contextLower.includes('intelligence')) {
    return 'EXTERNAL_AWARENESS';
  }
  
  // Default to Tier 2 (Organizational Context)
  return 'ORGANIZATIONAL_CONTEXT';
}

// Function to sanitize and validate input
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  // Basic sanitization - remove potentially dangerous characters
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
}

// Function to validate MPS number
export function validateMpsNumber(mpsNumber: any): number | undefined {
  if (!mpsNumber) return undefined;
  
  const num = parseInt(mpsNumber.toString());
  return (num >= 1 && num <= 25) ? num : undefined;
}