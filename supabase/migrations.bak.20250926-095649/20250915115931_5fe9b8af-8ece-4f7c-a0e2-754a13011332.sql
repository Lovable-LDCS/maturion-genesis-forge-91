-- Add RLS policies and upsert functions for settings persistence

-- 1. Profiles table policies (if missing)
CREATE POLICY IF NOT EXISTS "Users can view their own profile" ON profiles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own profile" ON profiles  
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own profile" ON profiles
FOR UPDATE USING (auth.uid() = user_id);

-- 2. Org_domains policies for organization members
CREATE POLICY IF NOT EXISTS "Org members can view org domains" ON org_domains
FOR SELECT USING (
  user_can_view_organization(organization_id) OR 
  user_can_view_organization(org_id)
);

CREATE POLICY IF NOT EXISTS "Org members can insert org domains" ON org_domains
FOR INSERT WITH CHECK (
  user_can_view_organization(organization_id) OR 
  user_can_view_organization(org_id)
);

CREATE POLICY IF NOT EXISTS "Org members can update org domains" ON org_domains
FOR UPDATE USING (
  user_can_view_organization(organization_id) OR 
  user_can_view_organization(org_id)
);

-- 3. Create org_branding table if it doesn't exist
CREATE TABLE IF NOT EXISTS org_branding (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  primary_hex VARCHAR(7) DEFAULT '#0066cc',
  secondary_hex VARCHAR(7) DEFAULT '#00cc99', 
  text_hex VARCHAR(7) DEFAULT '#ffffff',
  font_css TEXT,
  header_mode TEXT DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(organization_id)
);

-- Enable RLS on org_branding
ALTER TABLE org_branding ENABLE ROW LEVEL SECURITY;

-- RLS policies for org_branding  
CREATE POLICY IF NOT EXISTS "Org members can view org branding" ON org_branding
FOR SELECT USING (user_can_view_organization(organization_id));

CREATE POLICY IF NOT EXISTS "Org members can insert org branding" ON org_branding
FOR INSERT WITH CHECK (user_can_view_organization(organization_id));

CREATE POLICY IF NOT EXISTS "Org members can update org branding" ON org_branding
FOR UPDATE USING (user_can_view_organization(organization_id));

-- 4. Create maturity_models table if it doesn't exist
CREATE TABLE IF NOT EXISTS maturity_models (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  model_name TEXT NOT NULL,
  description TEXT,
  version VARCHAR(10) DEFAULT '1.0',
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(), 
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(organization_id)
);

-- Enable RLS on maturity_models
ALTER TABLE maturity_models ENABLE ROW LEVEL SECURITY;

-- RLS policies for maturity_models
CREATE POLICY IF NOT EXISTS "Org members can view maturity models" ON maturity_models
FOR SELECT USING (user_can_view_organization(organization_id));

CREATE POLICY IF NOT EXISTS "Org members can insert maturity models" ON maturity_models  
FOR INSERT WITH CHECK (user_can_view_organization(organization_id));

CREATE POLICY IF NOT EXISTS "Org members can update maturity models" ON maturity_models
FOR UPDATE USING (user_can_view_organization(organization_id));

-- 5. Add updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER IF NOT EXISTS update_org_branding_updated_at BEFORE UPDATE ON org_branding
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_maturity_models_updated_at BEFORE UPDATE ON maturity_models  
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();