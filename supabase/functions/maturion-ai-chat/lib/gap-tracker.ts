import { supabase } from './utils.ts';

export interface GapTicket {
  id?: string;
  organization_id: string;
  prompt: string;
  missing_specifics: string[];
  follow_up_date: Date;
  status: 'pending' | 'scheduled' | 'completed';
  email_sent: boolean;
  created_at?: Date;
}

// V2.0 §2: Detect missing specifics for gap tracking (owners/thresholds/system names/cadences/local laws)
export function detectMissingSpecifics(prompt: string, aiResponse: string): string[] {
  const missingItems: string[] = [];
  
  // V2.0 §2: Enhanced patterns for diamond-specific missing details
  const specificPatterns = [
    { pattern: /owner|responsible|accountable|supervisor|manager|chief/i, missing: 'site-specific owners and responsible parties' },
    { pattern: /threshold|limit|variance|tolerance|deviation|kpc/i, missing: 'KPC thresholds and variance limits' },
    { pattern: /system|platform|tool|software|monitor|scada|dcs|mes/i, missing: 'system names and configurations' },
    { pattern: /daily|weekly|monthly|quarterly|cadence|frequency|schedule|interval/i, missing: 'specific operational cadences' },
    { pattern: /local|law|regulation|compliance|jurisdiction|kimberley/i, missing: 'local regulatory requirements' },
    { pattern: /site.*specific|location.*specific|facility|plant|operation/i, missing: 'site-specific diamond procedures' },
    { pattern: /test.*stone|calibrat|verif|validat|black.*screen/i, missing: 'test stone protocols and verification procedures' },
    { pattern: /dual.*custody|access.*control|compartment|biometric/i, missing: 'dual custody and access control specifications' },
    { pattern: /vault|security|perimeter|transport|export|seal/i, missing: 'diamond security infrastructure details' }
  ];
  
  // V2.0 §2: Check if prompt asks for specifics but response is generic
  specificPatterns.forEach(({ pattern, missing }) => {
    if (pattern.test(prompt) && !hasSpecificDetails(aiResponse, missing)) {
      missingItems.push(missing);
    }
  });
  
  // V2.0 §2: Enhanced generic response detection
  const genericResponses = [
    'appropriate personnel',
    'relevant systems', 
    'regular intervals',
    'applicable regulations',
    'site requirements',
    'as needed',
    'management approval',
    'proper procedures',
    'authorized personnel',
    'established protocols',
    'standard practices'
  ];
  
  genericResponses.forEach(generic => {
    if (aiResponse.toLowerCase().includes(generic.toLowerCase()) && 
        !missingItems.includes('specific details and procedures')) {
      missingItems.push('specific details and procedures');
    }
  });
  
  console.log(`🎯 Gap detection: Found ${missingItems.length} missing specifics:`, missingItems);
  return [...new Set(missingItems)]; // Remove duplicates
}

// Check if response has specific details for a category
function hasSpecificDetails(response: string, category: string): boolean {
  const specificIndicators = {
    'role owners': ['Security Manager', 'Plant Supervisor', 'Chief', 'Operations Manager', 'Compliance Officer'],
    'thresholds and limits': ['%', 'ppm', 'carats', 'minutes', 'hours', 'days', 'tolerance'],
    'system names': ['SAP', 'Oracle', 'SCADA', 'DCS', 'MES', 'specific system'],
    'specific cadences': ['daily at', 'weekly on', 'monthly by', 'quarterly in', 'every 8 hours', 'twice daily'],
    'local regulatory requirements': ['Mining Act', 'Export Control', 'specific regulation', 'local law'],
    'site-specific details': ['Plant A', 'Site 1', 'Main Facility', 'Processing Plant', 'specific location']
  };
  
  const indicators = specificIndicators[category] || [];
  return indicators.some(indicator => 
    response.toLowerCase().includes(indicator.toLowerCase())
  );
}

// Create gap ticket with follow-up scheduling
export async function createGapTicket(
  organizationId: string, 
  prompt: string, 
  missingSpecifics: string[]
): Promise<string | null> {
  try {
    if (missingSpecifics.length === 0) return null;
    
    const followUpDate = new Date();
    followUpDate.setHours(followUpDate.getHours() + 48); // T+48h
    
    const gapTicket: GapTicket = {
      organization_id: organizationId,
      prompt: prompt,
      missing_specifics: missingSpecifics,
      follow_up_date: followUpDate,
      status: 'pending',
      email_sent: false
    };
    
    const { data, error } = await supabase
      .from('gap_tickets')
      .insert(gapTicket)
      .select('id')
      .single();
    
    if (error) {
      console.error('Error creating gap ticket:', error);
      return null;
    }
    
    console.log(`✅ Gap ticket created: ${data.id} (Follow-up: ${followUpDate.toISOString()})`);
    
    // Schedule follow-up email
    await scheduleFollowUpEmail(data.id, organizationId, missingSpecifics, followUpDate);
    
    return data.id;
  } catch (error) {
    console.error('Error in createGapTicket:', error);
    return null;
  }
}

// Schedule follow-up email using Supabase cron or immediate send
async function scheduleFollowUpEmail(
  ticketId: string, 
  organizationId: string, 
  missingSpecifics: string[], 
  followUpDate: Date
) {
  try {
    // For immediate implementation, send email right away
    // In production, this would be scheduled via cron job
    const emailPayload = {
      ticketId,
      organizationId,
      missingSpecifics,
      followUpDate: followUpDate.toISOString(),
      templateKey: 'diamond-followup-v1'
    };
    
    console.log('📧 Scheduling follow-up email for gap ticket:', ticketId);
    
    // Invoke email function
    const { data, error } = await supabase.functions.invoke('send-gap-followup', {
      body: emailPayload
    });
    
    if (error) {
      console.error('Error scheduling follow-up email:', error);
    } else {
      console.log('✅ Follow-up email scheduled successfully');
      
      // Mark as scheduled
      await supabase
        .from('gap_tickets')
        .update({ status: 'scheduled' })
        .eq('id', ticketId);
    }
  } catch (error) {
    console.error('Error in scheduleFollowUpEmail:', error);
  }
}

// V2.0 §2: Generate commitment text with exact date format
export function generateCommitmentText(missingSpecifics: string[]): string {
  if (missingSpecifics.length === 0) return '';
  
  const followUpDate = new Date();
  followUpDate.setHours(followUpDate.getHours() + 48); // V2.0 §2: T+48h commitment
  
  const dateString = followUpDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  
  // V2.0 §2: Exact commitment line format
  return `\n\nI'll confirm site-specific owners, thresholds, and system names by ${dateString}.`;
}