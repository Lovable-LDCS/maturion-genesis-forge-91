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

// Detect missing specifics in user prompt and AI response
export function detectMissingSpecifics(prompt: string, aiResponse: string): string[] {
  const missingItems: string[] = [];
  
  const specificPatterns = [
    { pattern: /owner|responsible|accountable|supervisor|manager/i, missing: 'role owners and responsible parties' },
    { pattern: /threshold|limit|variance|tolerance|deviation/i, missing: 'KPC thresholds and variance limits' },
    { pattern: /system|platform|tool|software|monitor/i, missing: 'system names and configurations' },
    { pattern: /daily|weekly|monthly|quarterly|cadence|frequency|schedule/i, missing: 'specific operational cadences' },
    { pattern: /local|law|regulation|compliance|jurisdiction|kimberley/i, missing: 'local regulatory requirements' },
    { pattern: /site.*specific|location.*specific|facility|plant|operation/i, missing: 'site-specific diamond procedures' },
    { pattern: /test.*stone|calibrat|verif|validat/i, missing: 'test stone protocols and verification procedures' },
    { pattern: /dual.*custody|access.*control|compartment/i, missing: 'dual custody and access control specifications' },
    { pattern: /vault|security|perimeter|transport/i, missing: 'diamond security infrastructure details' }
  ];
  
  // Check if prompt asks for specifics but response is generic
  specificPatterns.forEach(({ pattern, missing }) => {
    if (pattern.test(prompt) && !hasSpecificDetails(aiResponse, missing)) {
      missingItems.push(missing);
    }
  });
  
  // Check for generic responses that need specifics
  const genericResponses = [
    'appropriate personnel',
    'relevant systems', 
    'regular intervals',
    'applicable regulations',
    'site requirements',
    'as needed',
    'management approval'
  ];
  
  genericResponses.forEach(generic => {
    if (aiResponse.toLowerCase().includes(generic.toLowerCase()) && 
        !missingItems.includes('specific details')) {
      missingItems.push('specific details');
    }
  });
  
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

export function generateCommitmentText(missingSpecifics: string[]): string {
  if (missingSpecifics.length === 0) return '';
  
  const followUpDate = new Date();
  followUpDate.setHours(followUpDate.getHours() + 48);
  
  const dateString = followUpDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
  
  return `\n\nI'll confirm ${missingSpecifics.join(', ')} by ${dateString}.`;
}