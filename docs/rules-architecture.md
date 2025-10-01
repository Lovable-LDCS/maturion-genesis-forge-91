# Maturion — App Architecture and Working Principles (Living Document)

Purpose
- Single source of truth for how the app works and how the onboard Agent (Maturion) reasons.
- Non‑hard‑coded: content is produced from organizational context, uploaded documents, and learned patterns.
- Updated continuously as we build. We will append and refine this file whenever behavior, flows, or responsibilities change.

Agent Identity and Mission
- Maturion is an onboard AI Agent (coach + builder):
  - Guides users across the whole app (explains next steps, surfaces relevant context).
  - Drafts tailored MPS, Intent statements, and Criteria per Domain from the org profile + knowledge base (KB) + learned preferences.
  - No hard‑coded domain content; always reasoned from retrieved context and the org’s profile.
  - Human‑in‑the‑loop: every proposal is visible, editable, and learned from (Accept/Edit with audit trail).
  - Proactive and resilient: monitors the system, proposes fixes or improvements, and requests approval for structural changes.

Foundational Principles
- Supabase‑first with RLS on. Privileged writes only via Edge Functions (service role) with least privilege.
- No plaintext secrets in repo; use environment variables and Supabase secrets.
- Feature flags for new capabilities; default safe behaviors.
- Auditability: all proposals, approvals, edits, and automated actions are logged with who/when/why.
- Data‑driven learning loop, not code constants.

International Standards & Principles (Alignment)
- The app is designed to align to strict international standards and principles.
- Examples (to be confirmed/expanded):
  - ISO 31000 (Risk Management)
  - ISO 37301 (Compliance Management Systems)
  - ISO 27001/27002 (Information Security)
  - NIST SP 800‑53 / NIST CSF (Security & Controls)
  - COSO (Governance, Risk, and Compliance)
- Operating approach:
  - Maintain a Standards Catalog (living list) with versions, sections, and mappings to Domains/MPS/Criteria.
  - Maturion references these standards in relevant UI spaces (links/notes/footers) and aligns guidance accordingly.
  - Continuous monitoring: a scheduled job scans the KB + app state; compares with Standards Catalog; performs a gap analysis.
  - Notifications: when gaps or changes are detected, Maturion drafts an email explaining the reason for change and proposing how to address it. You receive that email and can approve actions.
  - Client change requests: users can submit proposals via a UI. Maturion evaluates impact vs. standards; proposes a plan; seeks approval.

High‑Level Architecture
- Frontend (Vite + React + supabase‑js)
  - Maturity Setup: collects person + org profile (sector, size, regulators, risk posture, preferences).
  - Document Management: upload, process, and review documents; forms the knowledge base (ai_documents + ai_document_chunks).
  - Assessment Framework: Domains → MPS → Intent → Criteria with human review and approval.
  - Admin/Backoffice: feature flags, seeds, monitoring, and diagnostics.
- Edge Functions (service role)
  - Retrieval: search‑ai‑context for semantic/text grounding from ai_document_chunks.
  - Generation: generate‑mps‑list, generate‑intents‑list, generate‑criteria‑list.
  - Persistence: save‑mps‑list, (criteria saver) — RLS‑aware with audit.
  - Maintenance & telemetry: seeding, watchdogs, email/webhook notifications.
- Storage & Data
  - ai_documents + ai_document_chunks: the organization’s knowledge base.
  - ai_feedback_submissions: captures edits/accept/reject reasons for learning.
  - ai_learning_patterns: distilled patterns (terminology, tone, cadence, naming) applied in future proposals.

Reasoning & Personalization (No Hard‑Coding)
- Inputs:
  - Org/User profile from Maturity Setup (e.g., mining vs construction, regulators, cadence, languages).
  - Uploaded documents and chunked text (policies, charters, RACI, registers, SOPs, org charts).
  - Learned preferences (from user edits) → ai_learning_patterns.
- Process:
  - Retrieve the most relevant chunks based on the current task and profile cues.
  - Prompt models to return strict JSON only; no free‑text UI contamination.
  - Apply learned patterns (naming, tone, cadence) as adapters in the retrieval/prompt layer.
- Outputs:
  - Proposals for MPS/Intent/Criteria with source references and a confidence signal.
  - If context is thin, safe best‑practice drafts are produced and labeled accordingly.

Self‑Monitoring, Gap Analysis, and Notifications
- Standards tracking: nightly/periodic job checks Standards Catalog version changes.
- Gap engine: compares current KB + approved model (Domains/MPS/Intent/Criteria) against standards deltas; identifies where updates are needed.
- Notification workflow: drafts an email with reason, impacted areas, proposed changes, and a safe plan. Sends to the owner; logs the event.
- Client proposals: similar flow — proposed changes are analyzed against standards; results are emailed + shown in UI for approval.

“Self‑Fix” Philosophy (Guardrails)
- Maturion may:
  - Run diagnostics, identify misconfigurations or missing data, and propose non‑destructive fixes (e.g., reseed domains, requeue processing).
  - Execute non‑structural remedial steps automatically if pre‑approved by policy/feature flag.
- Maturion must:
  - Request explicit approval for structural changes (schema, RLS, destructive operations).
  - Provide a reversible plan and backup note before changes.

Coach Mode (User Guidance)
- Maturion explains current step, what to do next, and why.
- Offers quick mode vs full context mode.
- Surfaces relevant standards and specific doc snippets grounded in the user’s org profile.
- Shows sources and lets users flag incorrect/outdated content to improve retrieval quality.

Core Workflow (End‑to‑End Journey)
1) Landing Page
2) Journey Page (overview of phases and current status)
3) Self‑Assessment Page (optional readiness intake)
4) Subscribe Page (account creation)
5) Create User Profile Page
6) “Tell us more about yourself/organization” Page (Maturity Setup)
7) Create Maturity Model (5 Domains) Page
8) Create MPS step (per Domain)
9) Create Intent step (per MPS/Domain)
10) Create Criteria step (with review UI, sources, accept/edit, audit)
11) Create Level Descriptors per Criteria
12) Publish the Maturity Model
13) Print a signable Minimum Performance Standard (document)
14) Obtain Sign‑off and embed it in the published model (audit link)
15) Create a Maturity Development Pathway (timeline with delivery dates)
16) Invite participating sub‑sectors/subsidiaries to partake
17) Sub‑user role creation and enrollment
18) “Get to know the sub‑organization” (same as parent, scoped to subsidiary)
19) Sub‑user maturity model approval, sign‑off, and editing with audit trail (based on parent model)
20) Evidence Collector Invite
21) Evidence Collector user enrollment
22) Evidence Collector “Get to know” page
23) Evidence Collector interface to upload evidence
24) Maturion evaluates and scores evidence (with human review)
25) External Independent Auditor appointment
26) Auditor “Get to know” page
27) Auditor UI for review and scoring
28) Final evaluation and lock of the current maturity level
29) Plan and switch to the next level; repeat until “Resilient”
30) Maintain the organization at the achieved level (monitoring & continuous improvement)

Development Stages (App Development Pathway)
- Stage 1: Parent organization sets up the maturity model (Domains → MPS → Intent → Criteria → Descriptors).
- Stage 2: Sign‑off approval for the model; invite sub‑users; enable sub‑org setup based on the parent model.
- Stage 3: Evidence collector invite and setup.
- Stage 4: Evidence upload and evaluation (including external auditor role and UI).
- Stage 5: Final evaluation, lock the first maturity level, plan the next level, and transition.
- Loop: Iterate stages to progress from Basic → Reactive → Compliant → Pro‑active → Resilient; then maintain.

Audit & Learning Loop
- Every Accept/Edit includes who/when/why; deltas feed ai_feedback_submissions.
- Pattern extraction produces or updates ai_learning_patterns (with weights and scope: org‑specific vs cross‑org).
- Future proposals incorporate these patterns (no hard‑coding; data‑driven).

Extensibility and Safety
- All model outputs are generated via retrieval‑augmented prompts with strict JSON.
- RLS stays on; service role only inside Edge Functions.
- Structural changes require an explicit approval interaction and a reversible plan.

Parking Station
- See docs/parking-station.md for backlog items that are out of current scope but valuable.

Operating Practice for This File
- Treat this document as the canonical reference.
- Update it daily or as soon as behavior/requirements change.
- Keep it simple and actionable; add links to specific files or functions as needed.
