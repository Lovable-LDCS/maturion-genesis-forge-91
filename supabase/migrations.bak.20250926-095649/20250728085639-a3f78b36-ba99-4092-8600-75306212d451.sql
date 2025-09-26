-- Create missing domains for MPS document mapping with manual audit handling
-- Using a system UUID for created_by/updated_by since auth.uid() is not available in migration context

DO $$
DECLARE
    system_user_id uuid := '00000000-0000-0000-0000-000000000001';
    org_id uuid := '2f122a62-ca59-4c8e-adf6-796aa7011c5d';
    domain_id_1 uuid := gen_random_uuid();
    domain_id_2 uuid := gen_random_uuid();
    domain_id_3 uuid := gen_random_uuid();
    domain_id_4 uuid := gen_random_uuid();
BEGIN
    -- Insert domains one by one with manual audit trail
    
    -- Process Integrity
    INSERT INTO public.domains (
        id, name, display_order, organization_id, status, created_by, updated_by
    ) VALUES (
        domain_id_1, 'Process Integrity', 2, org_id, 'not_started', system_user_id, system_user_id
    );
    
    INSERT INTO public.audit_trail (
        organization_id, table_name, record_id, action, changed_by, change_reason
    ) VALUES (
        org_id, 'domains', domain_id_1, 'INSERT', system_user_id, 'System migration: Created missing domain'
    );
    
    -- People & Culture
    INSERT INTO public.domains (
        id, name, display_order, organization_id, status, created_by, updated_by
    ) VALUES (
        domain_id_2, 'People & Culture', 3, org_id, 'not_started', system_user_id, system_user_id
    );
    
    INSERT INTO public.audit_trail (
        organization_id, table_name, record_id, action, changed_by, change_reason
    ) VALUES (
        org_id, 'domains', domain_id_2, 'INSERT', system_user_id, 'System migration: Created missing domain'
    );
    
    -- Protection
    INSERT INTO public.domains (
        id, name, display_order, organization_id, status, created_by, updated_by
    ) VALUES (
        domain_id_3, 'Protection', 4, org_id, 'not_started', system_user_id, system_user_id
    );
    
    INSERT INTO public.audit_trail (
        organization_id, table_name, record_id, action, changed_by, change_reason
    ) VALUES (
        org_id, 'domains', domain_id_3, 'INSERT', system_user_id, 'System migration: Created missing domain'
    );
    
    -- Proof it Works
    INSERT INTO public.domains (
        id, name, display_order, organization_id, status, created_by, updated_by
    ) VALUES (
        domain_id_4, 'Proof it Works', 5, org_id, 'not_started', system_user_id, system_user_id
    );
    
    INSERT INTO public.audit_trail (
        organization_id, table_name, record_id, action, changed_by, change_reason
    ) VALUES (
        org_id, 'domains', domain_id_4, 'INSERT', system_user_id, 'System migration: Created missing domain'
    );
    
END $$;