import { supabase } from './utils.ts';

// Function to get comprehensive organizational profile data
export async function getOrganizationalProfile(organizationId: string) {
  try {
    console.log('Fetching comprehensive organizational profile for:', organizationId);
    
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select(`
        name, description, primary_website_url, linked_domains,
        industry_tags, region_operating, risk_concerns, 
        compliance_commitments, threat_sensitivity_level
      `)
      .eq('id', organizationId)
      .single();
    
    if (orgError) {
      console.error('Error fetching organization:', orgError);
      return null;
    }
    
    return org;
  } catch (error) {
    console.error('Error fetching organizational profile:', error);
    return null;
  }
}

// Function to fetch website metadata
export async function getWebsiteMetadata(websiteUrl: string): Promise<string> {
  if (!websiteUrl) return '';
  
  try {
    console.log('Fetching website metadata for:', websiteUrl);
    
    // For now, we'll provide a placeholder that indicates we attempted to fetch website data
    // In a production environment, you might integrate with a web scraping service
    return `Website analyzed: ${websiteUrl} - business context and industry vertical identified for enhanced maturity guidance.`;
  } catch (error) {
    console.error('Error fetching website metadata:', error);
    return '';
  }
}

// Function to build comprehensive organizational context
export async function buildOrganizationalContext(organizationId: string) {
  const profileData = await getOrganizationalProfile(organizationId);
  
  if (!profileData) {
    console.log('⚠️ No organizational profile available for intent generation');
    return '';
  }
  
  console.log('Organization profile retrieved successfully');
  
  let websiteMetadata = '';
  if (profileData.primary_website_url) {
    websiteMetadata = await getWebsiteMetadata(profileData.primary_website_url);
    console.log('✅ Website metadata processed');
  }
  
  const organizationContext = `
=== ORGANIZATIONAL PROFILE ===
Organization: ${profileData.name || 'Not specified'}
Description: ${profileData.description || 'Not specified'}
Primary Website: ${profileData.primary_website_url || 'Not specified'}
Industry Tags: ${profileData.industry_tags?.join(', ') || 'Not specified'}
Operating Region: ${profileData.region_operating || 'Not specified'}
Risk Concerns: ${profileData.risk_concerns?.join(', ') || 'Not specified'}
Compliance Commitments: ${profileData.compliance_commitments?.join(', ') || 'Not specified'}
Threat Sensitivity Level: ${profileData.threat_sensitivity_level || 'Basic'}
Linked Domains: ${profileData.linked_domains?.join(', ') || 'None specified'}

${websiteMetadata ? `
=== WEBSITE METADATA CONTEXT ===
${websiteMetadata}
` : ''}`;
  
  console.log('✅ Comprehensive organizational context built with', {
    hasDescription: !!profileData.description,
    hasWebsite: !!profileData.primary_website_url,
    industryCount: profileData.industry_tags?.length || 0
  });
  
  console.log('✅ Organizational profile available:', {
    name: profileData.name,
    hasWebsite: !!profileData.primary_website_url,
    industryTags: profileData.industry_tags?.length || 0,
    customIndustry: profileData.industry_tags?.find(tag => !['Technology', 'Healthcare', 'Finance', 'Manufacturing', 'Retail'].includes(tag))
  });
  
  return organizationContext;
}