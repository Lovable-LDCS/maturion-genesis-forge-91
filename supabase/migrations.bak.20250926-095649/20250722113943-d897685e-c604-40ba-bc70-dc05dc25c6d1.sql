-- Create external_insights table for Maturion's External Awareness Layer (Tier 3)
-- Supports real-time threat intelligence and situational awareness

-- Create enums for external insights
CREATE TYPE risk_level AS ENUM ('Low', 'Medium', 'High');
CREATE TYPE source_type AS ENUM ('RSS', 'API', 'Manual');
CREATE TYPE visibility_scope AS ENUM ('global', 'region', 'industry-specific', 'private');

-- Create external_insights table
CREATE TABLE public.external_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_url TEXT,
  title TEXT NOT NULL,
  summary TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  retrieved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  industry_tags TEXT[] DEFAULT '{}',
  region_tags TEXT[] DEFAULT '{}',
  threat_tags TEXT[] DEFAULT '{}',
  risk_level risk_level DEFAULT 'Medium',
  source_type source_type NOT NULL DEFAULT 'Manual',
  is_verified BOOLEAN NOT NULL DEFAULT false,
  matched_orgs UUID[],
  visibility_scope visibility_scope NOT NULL DEFAULT 'global',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

-- Enable Row Level Security
ALTER TABLE public.external_insights ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for external insights access
-- Admins can manage all insights
CREATE POLICY "Admin users can manage all external insights"
ON public.external_insights
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.email = ANY(ARRAY['johan.ras@apginc.ca', 'jorrie.jordaan@apginc.ca'])
  )
);

-- Organizations can view insights that match their profile or are global
CREATE POLICY "Organizations can view relevant external insights"
ON public.external_insights
FOR SELECT
USING (
  -- Global insights are visible to all authenticated users
  visibility_scope = 'global'
  OR
  -- User's organization matches the matched_orgs array
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = auth.uid()
    AND om.organization_id = ANY(matched_orgs)
  )
  OR
  -- Insights match user's organizational profile
  EXISTS (
    SELECT 1 FROM organization_members om
    JOIN organizations o ON om.organization_id = o.id
    WHERE om.user_id = auth.uid()
    AND (
      -- Industry match
      (industry_tags && o.industry_tags)
      OR
      -- Region match  
      (region_tags @> ARRAY[o.region_operating] AND o.region_operating IS NOT NULL)
      OR
      -- Threat/risk concern match
      (threat_tags && o.risk_concerns)
    )
  )
);

-- Create indexes for efficient filtering and AI queries
CREATE INDEX idx_external_insights_industry_tags ON public.external_insights USING GIN(industry_tags);
CREATE INDEX idx_external_insights_region_tags ON public.external_insights USING GIN(region_tags);
CREATE INDEX idx_external_insights_threat_tags ON public.external_insights USING GIN(threat_tags);
CREATE INDEX idx_external_insights_matched_orgs ON public.external_insights USING GIN(matched_orgs);
CREATE INDEX idx_external_insights_published_at ON public.external_insights (published_at DESC);
CREATE INDEX idx_external_insights_risk_level ON public.external_insights (risk_level);
CREATE INDEX idx_external_insights_visibility_scope ON public.external_insights (visibility_scope);
CREATE INDEX idx_external_insights_verified ON public.external_insights (is_verified);

-- Create compound index for AI filtering by profile match
CREATE INDEX idx_external_insights_profile_match ON public.external_insights 
USING GIN(industry_tags, region_tags, threat_tags);

-- Add trigger for updated_at timestamp
CREATE TRIGGER update_external_insights_updated_at
  BEFORE UPDATE ON public.external_insights
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE public.external_insights IS 'External threat intelligence and situational awareness data for Maturion AI Tier 3 knowledge layer';
COMMENT ON COLUMN public.external_insights.source_url IS 'Original link to the article/feed/API source';
COMMENT ON COLUMN public.external_insights.title IS 'Headline or alert title';
COMMENT ON COLUMN public.external_insights.summary IS 'AI-parsed or manually added summary of the event/threat';
COMMENT ON COLUMN public.external_insights.published_at IS 'Date/time of the original report publication';
COMMENT ON COLUMN public.external_insights.retrieved_at IS 'When the system pulled it into Supabase';
COMMENT ON COLUMN public.external_insights.industry_tags IS 'Mapped industries (e.g., Diamond Mining, Gold, Energy)';
COMMENT ON COLUMN public.external_insights.region_tags IS 'Mapped region(s) affected (e.g., Southern Africa, Global, Canada)';
COMMENT ON COLUMN public.external_insights.threat_tags IS 'Tagged threats (e.g., Insider Theft, Cyberattack, Export Ban)';
COMMENT ON COLUMN public.external_insights.risk_level IS 'Risk indicator based on AI/curator assessment';
COMMENT ON COLUMN public.external_insights.source_type IS 'Origin classification (RSS, API, Manual)';
COMMENT ON COLUMN public.external_insights.is_verified IS 'Whether this source has been vetted/curated by APGI or user';
COMMENT ON COLUMN public.external_insights.matched_orgs IS 'Pre-linked organizations based on profile filters';
COMMENT ON COLUMN public.external_insights.visibility_scope IS 'Controls scope of display (global, region, industry-specific, private)';

-- Insert some seed data for testing
INSERT INTO public.external_insights (
  title, 
  summary, 
  industry_tags, 
  region_tags, 
  threat_tags, 
  risk_level,
  source_type,
  is_verified,
  visibility_scope,
  published_at
) VALUES 
(
  'Diamond Industry Insider Threat Detected in Botswana Operations',
  'Security breach involving unauthorized access to high-value diamond storage areas. Investigation reveals potential insider involvement in systematic theft operations.',
  ARRAY['Diamond Mining', 'Security Services'],
  ARRAY['Botswana', 'Sub-Saharan Africa'],
  ARRAY['Insider Threat', 'Theft', 'Physical Security'],
  'High',
  'RSS',
  true,
  'industry-specific',
  now() - interval '2 days'
),
(
  'Cyber Fraud Targeting Mining Sector Payment Systems',
  'Sophisticated phishing campaign specifically targeting mining companies payment and procurement systems. Multiple organizations across Southern Africa affected.',
  ARRAY['Diamond Mining', 'Platinum Mining', 'Gold Mining'],
  ARRAY['Southern Africa', 'Botswana', 'South Africa'],
  ARRAY['Cyber Fraud', 'Financial Crime', 'Data Breach'],
  'High',
  'API',
  true,
  'region',
  now() - interval '1 day'
),
(
  'New Kimberley Process Compliance Requirements for 2025',
  'Updated compliance standards for diamond certification and tracking. Organizations must implement enhanced due diligence procedures by Q2 2025.',
  ARRAY['Diamond Mining'],
  ARRAY['Global'],
  ARRAY['Regulatory Compliance'],
  'Medium',
  'Manual',
  true,
  'industry-specific',
  now() - interval '3 hours'
),
(
  'Supply Chain Disruptions Affecting Mining Equipment',
  'Global shipping delays and equipment shortages impacting mining operations. Recommended to review supply chain risk management procedures.',
  ARRAY['Diamond Mining', 'Platinum Mining', 'Gold Mining', 'Manufacturing'],
  ARRAY['Global'],
  ARRAY['Supply Chain Risk', 'Operational Risk'],
  'Medium',
  'RSS',
  true,
  'global',
  now() - interval '6 hours'
),
(
  'Enhanced Security Measures for Critical Infrastructure',
  'Government advisory recommending increased physical and cyber security measures for critical infrastructure sectors including mining and energy.',
  ARRAY['Security Services', 'Energy', 'Government'],
  ARRAY['Canada', 'United States'],
  ARRAY['Physical Security', 'Cyber Fraud', 'Regulatory Compliance'],
  'Medium',
  'API',
  true,
  'region',
  now() - interval '12 hours'
);