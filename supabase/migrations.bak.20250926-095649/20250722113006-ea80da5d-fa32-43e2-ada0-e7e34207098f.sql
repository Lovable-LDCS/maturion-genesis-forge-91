-- Add new organizational profile fields to support AI Behavior & Knowledge Source Policy v2.0
-- These fields enable personalized external threat awareness and real-time insights

-- Create enum for threat sensitivity levels
CREATE TYPE threat_sensitivity_level AS ENUM ('Basic', 'Moderate', 'Advanced');

-- Add new columns to organizations table for enhanced AI personalization
ALTER TABLE public.organizations 
ADD COLUMN primary_website_url TEXT,
ADD COLUMN linked_domains TEXT[],
ADD COLUMN industry_tags TEXT[],
ADD COLUMN region_operating TEXT,
ADD COLUMN risk_concerns TEXT[],
ADD COLUMN compliance_commitments TEXT[],
ADD COLUMN threat_sensitivity_level threat_sensitivity_level DEFAULT 'Basic';

-- Add constraints for data validation
ALTER TABLE public.organizations
ADD CONSTRAINT valid_website_url CHECK (
  primary_website_url IS NULL OR 
  primary_website_url ~ '^https?://[^\s/$.?#].[^\s]*$'
);

-- Add indexes for efficient filtering by AI system
CREATE INDEX idx_organizations_industry_tags ON public.organizations USING GIN(industry_tags);
CREATE INDEX idx_organizations_risk_concerns ON public.organizations USING GIN(risk_concerns);
CREATE INDEX idx_organizations_region_operating ON public.organizations (region_operating);
CREATE INDEX idx_organizations_threat_sensitivity ON public.organizations (threat_sensitivity_level);

-- Add comments for documentation
COMMENT ON COLUMN public.organizations.primary_website_url IS 'Main organization website for company reference and feed alignment';
COMMENT ON COLUMN public.organizations.linked_domains IS 'List of relevant external links (ESG site, security intranet, document portals)';
COMMENT ON COLUMN public.organizations.industry_tags IS 'Multi-select industry categories for threat filtering';
COMMENT ON COLUMN public.organizations.region_operating IS 'Primary region/country for localized threat intelligence';
COMMENT ON COLUMN public.organizations.risk_concerns IS 'Key risk areas for personalized threat awareness';
COMMENT ON COLUMN public.organizations.compliance_commitments IS 'Frameworks followed for compliance-specific insights';
COMMENT ON COLUMN public.organizations.threat_sensitivity_level IS 'Controls external threat data surface level';