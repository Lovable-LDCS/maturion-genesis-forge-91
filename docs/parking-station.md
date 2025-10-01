# Parking Station (Living Backlog)

Purpose
- Capture ideas and specs that are out-of-scope for the current phase but valuable for future releases.
- Keep each item concise, with enough detail to be actionable when we unpark it.
- We will append new items as we go; this file is the single source of truth for parked concepts.

Usage
- When a new idea emerges, add a section using the template at the end of this file.
- When an item becomes in-scope, move it to an implementation plan (and reference the PR/migrations).

---

## 🅿️ Parking Station Item: Retrieval Balancing Policy (Draft)
- Date created: 2025-09-13
- Created by: Johan Ras (APGI / Maturion Project – Diamond-Ready Demo)
- Status: 🅿️ Parked (to be scheduled for next milestone after DKP E2E verification pack is closed)

Context
- Current retrieval boosts Diamond Knowledge Pack (DKP) and diamond-titled documents to the top. This ensures diamond loss prevention coverage but may eclipse broader insider-threat and business-loss domains (supply chain, payroll, HR, logistics).
- Goal: a balanced retrieval policy where DKP is always honored but contextualized within enterprise-wide maturity.

Proposed Retrieval Policy (to be wired into AI ranking engine)
- General Principles
  - Holistic Loss Prevention — Frame diamonds as one component of broader enterprise risk.
  - Context-Sensitive Weighting — Boost diamond content only when the query is explicitly diamond-focused.
  - Balanced Criteria Generation — For roadmaps/criteria, consider DKP alongside supply chain, payroll, and governance controls.
  - No Eclipsing Rule — DKP must not suppress generic MPS or org-profile content for non-diamond queries.
- Ranking Rules
  - organization_overview intent:
    1) Organization profile (uploads)
    2) Org web ingestion (pages/chunks)
    3) DKP (diamond-specific context)
    4) Generic MPS
  - criteria/controls intent:
    - If query mentions diamonds explicitly → DKP criteria first.
    - Otherwise → Blend diamond docs + generic MPS with insider threat, supply chain, payroll, HR, logistics weighted equally.
  - general maturity/loss prevention queries:
    - Downweight DKP unless directly referenced.
    - Boost broader MPS and org-profile.

QA Tests (to run once implemented)
- Payroll insider threat → Should surface MPS 12 (Reliable People), Process Integrity, and HR controls, not diamond DKP.
- Diamond reconciliation → DKP criteria first, then generic custody/reconciliation controls.
- Supply chain tampering → Logistics & procurement controls, not diamond-only.

Implementation Notes
- Wire as retrieval policy module inside the retrieval/context layer (e.g., functions/maturion-ai-chat/lib/context.ts or equivalent).
- Add meta-tags for content (e.g., diamond-specific, enterprise-wide) to enable boosts/dampening.
- Test against at least 3 queries per category (diamond, payroll, supply chain) before acceptance.

Status & Next Action
- 🅿️ Parked until DKP ingestion + web crawl E2E verification pack is signed off.
- Once E2E passes, flag this item for immediate development.
- Automation (future): Integrate Parking Station with a Supabase "Parking Queue" table (timestamps, owners, milestones). CI can surface upcoming items.

---

## 📌 Parking Station Item: Self-Learning Module
- Title: Maturion Self-Learning Capabilities
- Status: 🚧 Parked — not yet implemented

Scope / Objectives
- Pattern Recognition: Identify trends/anomalies in organizational data (e.g., insider threat signals, irregular workflows).
- Adaptive Criteria: Learn from user feedback (accept/reject of suggested criteria, corrections like “we don’t use this term”) and adapt future outputs.
- Evidence Evolution: Refine evidence suggestions based on prior successful uploads and sector-specific practices.
- Risk Scoring: Enhance analytics by weighting controls and threats based on historical outcomes and detected drift.
- Behavioral Context: Integrate observations from interactions (queries, responses, corrections) to improve organizational maturity guidance.

Entry Criteria (when to activate)
- ✅ Core ingestion pipeline is stable (no blockers on DKP, MPS, or web ingestion).
- ✅ Retrieval balancing rules tested and signed off.
- ✅ QA automation consistently green.
- ✅ Analytics dashboard (Phase 3+) deployed.
- ⚠️ Decision taken on safe storage & replay of user feedback (audit trail + compliance).

Dependencies
- AI Admin Upload Zone fully operational.
- Audit & QA modules (to avoid “black-box” learning).
- Storage strategy for feedback loops (Supabase tables + RLS).

Parking Justification
- Introducing self-learning too early risks unstable or unpredictable outputs. Priority is to stabilize ingestion, retrieval, and ranking before enabling adaptive feedback loops.

Owner / ETA
- Owner: Johan Ras / APGI
- ETA: Post Phase 3 QA (target Q4 2025 or later)

---

## Template — New Parking Item
- Title: <Short, clear name>
- Status: 🅿️ Parked | 🚧 Draft | ⏳ Scheduled
- Context: <Why this matters / what problem it solves>
- Proposal: <How we plan to address it at a high level>
- QA Tests: <Acceptance/verification criteria>
- Implementation Notes: <Where in code / function names / data considerations>
- Owner / ETA: <Who and when>
- Dependencies: <Prereqs>
- Next Action: <What unblocks it>

---

References
- Architecture & Working Principles: docs/rules-architecture.md
- Standards alignment and gap analysis will be defined in the Standards Catalog (future).