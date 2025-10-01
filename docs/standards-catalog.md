# Standards Catalog (Scaffold)

Purpose
- Central registry of external standards and principles Maturion aligns to (versions, sections, tags).
- Used by the future Gap Analysis engine to compare the organization’s approved model (Domains/MPS/Intent/Criteria) and KB against standards.
- This is a living document; we will expand the catalog over time and eventually store it in Supabase tables.

Initial Scope (examples)
- ISO 31000 (Risk Management)
- ISO 37301 (Compliance Management Systems)
- NIST Cybersecurity Framework (CSF 2.0)
- ISO 27001/27002 (Information Security) — to be added later
- COSO — to be added later

Where the current catalog lives
- The bootstrap catalog is bundled with the edge function at:
  - supabase/functions/standards-gap-check/catalog.json
- Future plan: migrate to Supabase tables for dynamic updates and versioning; the function will then query the DB instead of static JSON.

Gap Analysis (future behavior)
- Inputs: standards catalog + org profile + approved model (Domains/MPS/Intent/Criteria) + KB summaries.
- Output: a structured list of potential gaps or updates, referencing specific standard sections and proposed actions.
- Notifications: automatic draft email explaining why a change is needed and suggested remediation steps. Owner approves before changes are applied.

How to update the catalog now
1) Edit supabase/functions/standards-gap-check/catalog.json (add standards or sections).
2) Deploy the function (see commands below) so the new catalog is live.

Test and usage (after deploy)
- From the browser console (logged in):
  - View catalog
    await supabase.functions.invoke('standards-gap-check', { body: { action: 'catalog' } })
  - Run placeholder gap check (by org)
    await supabase.functions.invoke('standards-gap-check', { body: { action: 'gap-check', organizationId: '<org-uuid>' } })

PowerShell (deploy)
- Deploy the edge function (cloud project must be linked or configured)
  START COPY
  supabase functions deploy standards-gap-check
  END COPY

- Optional: View local types regeneration (after DB changes in the future)
  START COPY
  supabase gen types typescript --project-id dmhlxhatogrrrvuruayv > src/types/supabase.ts
  END COPY

Note
- This scaffold returns counts and a placeholder gap summary. As we implement the real analyzer, we will crosswalk each MPS/Criteria to one or more standard sections and compute coverage vs. evidence.
