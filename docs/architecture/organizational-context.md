# Organizational Context – APGI Superusers, Parent/Child Orgs, and Journey Flow

Last updated: 2025-09-29
Owner: APGI (superusers: you + Abbot)

High-level model
- Superusers (aka Main Admin): You and Abbot. Full access to all pages and functions; can rebuild/override any flow. Belong to APGI (the backoffice org).
- Tenant organizations (parents): Each subscribing customer creates their own parent organization via the Maturity Setup page.
- Child organizations (subsidiaries/sister/contractors): Invited by a parent org; inherit context where appropriate and maintain their own documents and maturity journey.
- Always-current identity: Maturion must always “know who it’s talking to” (superuser/APGI, a parent org, or a child org) and scope data/AI reasoning accordingly.

Journey flow (for subscribers)
1) Home
   - Journey: Learn the maturity journey
   - Free Assessment: Perform a free assessment, then invite to Subscribe
2) Subscribe
   - Create user profile, handle subscription
3) Maturity Setup
   - Capture organizational context (company profile, URLs, policies/procedures)
   - Documents uploaded here are indexed and embedded per-organization
   - Establish the organization record (parent org)
4) Assessment Framework
   - Shows 5 domains; first is clickable, others locked until prior steps complete
   - Clicking a domain opens “@Domain Name@ – Audit Configuration”
     - Step 1: Create & accept domain MPSs (MPS 1–5 for that domain)
     - Step 2: Create & accept intent statements
     - Step 3: Create & accept criteria
   - Generation must use the organization’s uploaded documents and profile context

Organizational hierarchy requirements
- APGI backoffice (superusers) is the first organization and can access/manage all.
- Each subscriber is a parent org with its own members, documents, and assessment.
- Parent orgs can invite child orgs (sister/subsidiary/contractor). Parent-child links must be modeled in DB.
- Maturion resolves active scope: superuser/APGI vs. parent vs. child organization; all retrieval and AI generation are scoped by active org.

Current test organizations
- De Beers (parent)
- Barloworld (parent)
- SRMS (parent)
- APGI (backoffice superusers; ensure a concrete UUID exists)

Generation principles (used across MPS, intents, criteria)
- Prefer org-provided documents and URLs to ground generation
- Fall back to industry best practices only when org context is insufficient
- Return explainable results with source traceability (document names/IDs)

Domain coverage and generalization (all 5 domains)
- Domains: Leadership & Governance, Process Integrity, People & Culture, Protection, Proof it Works
- MPS generation: For any active domain, generate MPS 1–5 grounded in org documents; if context is thin, still return 1–5 with knowledge_base_used=false
- Intent generation: One intent statement per MPS (1–5) per domain, grounded in org context when available
- Criteria generation: For each MPS, generate as many relevant criteria as found (no hard caps). If only 2 are defensible, return 2; if 50 are relevant, return 50 with clear grouping and deduplication. Include cadence and owner where available from sources.
- Functions (Edge):
  - generate-mps-list: input { organizationId, domainName } -> 5 JSON items with source_document and knowledge_base_used
  - generate-intents-list: input { organizationId, domainName, mpsNumbers?: [1..5] } -> intents for selected MPS
  - generate-criteria-list: input { organizationId, domainName, mpsNumber } -> criteria array with requirement/evidence/action, variable length
- Retrieval scope: RAG filters by organizationId and optional domain tags; boosts documents tagged to that domain
- Traceability: Include top sources per MPS/criterion; store acceptance events per org/domain/MPS with timestamps and users
- Feature flags: diamond.s6.evidence, diamond.s6.alerts, diamond.s6.progress to gate UI surfaces across all domains

Change management
- This file is the authoritative context for architecture and flows
- Update on each architecture change; commit with clear message
- Also upload this document to APGI org in-app so AI retrieval can reference it

