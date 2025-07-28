import { supabase } from './utils.ts';

// Function to get relevant external insights based on organizational profile
export async function getExternalInsights(organizationId: string, context: string): Promise<string> {
  try {
    console.log('Fetching external insights for organization:', organizationId);
    
    // Get organization profile for filtering
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('industry_tags, region_operating, risk_concerns, threat_sensitivity_level')
      .eq('id', organizationId)
      .single();
    
    if (orgError || !org) {
      console.log('No organizational profile found for external insights');
      return '';
    }
    
    // Fetch external threat intelligence
    const { data: insights, error: insightsError } = await supabase
      .from('external_threat_intelligence')
      .select('*')
      .eq('is_verified', true)
      .order('published_at', { ascending: false })
      .limit(50);
    
    if (insightsError || !insights?.length) {
      console.log('No external threat intelligence available');
      return '';
    }
    
    // Filter insights based on organizational profile
    const relevantInsights = insights.filter(insight => {
      // Check industry match
      const industryMatch = org.industry_tags?.some(tag => 
        insight.industry_tags?.includes(tag)
      );
      
      // Check region match
      const regionMatch = org.region_operating && 
        insight.region_tags?.includes(org.region_operating);
      
      // Check threat/risk concern match
      const threatMatch = org.risk_concerns?.some(concern => 
        insight.threat_tags?.includes(concern)
      );
      
      // Include global insights and profile matches
      return insight.industry_tags?.includes('Global') || 
             insight.region_tags?.includes('Global') ||
             industryMatch || regionMatch || threatMatch;
    });
    
    if (relevantInsights.length === 0) {
      console.log('No insights match organizational profile');
      return '';
    }
    
    console.log(`Found ${relevantInsights.length} relevant external insights`);
    
    // Format insights for AI context
    let insightsContext = '=== EXTERNAL THREAT INTELLIGENCE (ADVISORY ONLY) ===\n';
    insightsContext += `Matched to your risk profile: ${org.industry_tags?.join(', ')} | ${org.region_operating} | ${org.risk_concerns?.join(', ')}\n\n`;
    
    relevantInsights.forEach(insight => {
      insightsContext += `THREAT ALERT [${insight.risk_level} Risk]: ${insight.title}\n`;
      insightsContext += `Published: ${new Date(insight.published_at).toLocaleDateString()}\n`;
      insightsContext += `Summary: ${insight.summary}\n`;
      insightsContext += `Tags: Industry [${insight.industry_tags?.join(', ')}] | Region [${insight.region_tags?.join(', ')}] | Threats [${insight.threat_tags?.join(', ')}]\n`;
      insightsContext += `Source: ${insight.source_type} | Verified: ${insight.is_verified ? 'Yes' : 'No'}\n\n`;
    });
    
    insightsContext += 'NOTE: This external intelligence is ADVISORY ONLY and does not impact maturity scores or evidence decisions.\n';
    
    return insightsContext;
  } catch (error) {
    console.error('Error getting external insights:', error);
    return '';
  }
}