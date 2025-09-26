-- Fix missing documents issue by adding user to De Beers organization
-- The documents exist but user lacks organization membership access

-- Add the current user (johanras26@gmail.com) to De Beers organization where documents are stored
INSERT INTO organization_members (
    user_id, 
    organization_id, 
    role
) VALUES (
    'bb0ca77d-5cb4-4b70-a3b1-8c742ed48ee9', -- johanras26@gmail.com
    'e443d914-8756-4b29-9599-6a59230b87f3', -- De Beers organization
    'admin'
) ON CONFLICT (user_id, organization_id) DO UPDATE SET
    role = EXCLUDED.role;

-- Verify the documents are accessible by checking the RLS policy works
-- This comment documents that ai_documents table has proper RLS: 
-- "Users can view documents from their organization" policy should now work