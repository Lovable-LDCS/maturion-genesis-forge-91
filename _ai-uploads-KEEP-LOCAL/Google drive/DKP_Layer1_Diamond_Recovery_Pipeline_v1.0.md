# Diamond Recovery Pipeline — Layer 1: End-to-End Overview & Security Handoffs (v1.0)

**Document Type:** Diamond Knowledge Pack — Process Overview  
**Domains:** Process Integrity (primary), Protection (supporting), Leadership & Governance (supporting)  
**Visibility:** All Users  
**Tags:** industry:diamond, pipeline-layer:1, process-overview, xrt, dms, custody, handoffs, mass-balance, loss-prevention, reconciliation, insider-threat

**AI Backoffice Description:**  
Layer-1 overview of the end-to-end diamond value chain with the **security perspective baked in**. Identifies the objective of each stage, handoffs & custody points, typical modern technologies (XRT-first), major loss/vulnerability modes, and the threats most likely to exploit them. Designed for chunking and as a routing anchor for deeper Layer-2/3 documents.

---

## 1) Purpose & Audience
Provide a **single-page map** of how diamonds move from rock to revenue, so every security officer and supervisor understands **where losses can occur** and **where custody changes**. This is the entry point for Process Integrity and Protection controls.

**Audience:** Security Officers, Control Room Supervisors, Metallurgy/Processing Leads, Compliance/Audit, and Leadership & Governance reviewers.

---

## 2) Scope & Assumptions
- Modern plants are assumed to be **technology-first** (XRT as primary detection; DMS used where ore/size profile requires; grease/pans are legacy and covered in the appendix only).  
- The flow described is **generic** to hard-rock diamond operations; site-specific variants (e.g., alluvial, modular plants, re-treatment) plug in at the noted interfaces.  
- Principle followed: **hands-free by design**, **separation of duties**, **traceable custody**, and **closed-loop reconciliation**.

---

## 3) Pipeline at a Glance (with Security Overlay)
For each stage: **Objective • Key Assets • Typical Systems • Handoffs/Custody • Primary Loss Modes • Threats**

### 3.1 Exploration & Geological Model
- **Objective:** Define diamondiferous ore zones and expected grade/size distribution.  
- **Key Assets:** Geological model, sampling data, grade/valuation forecasts.  
- **Typical Systems:** Core logging, microdiamond analysis, resource modelling.  
- **Handoffs/Custody:** Model sign-off to Mine Planning (formal approval).  
- **Primary Loss Modes:** Expectation gaps leading to mismatched KPIs and undetected losses.  
- **Threats:** Data manipulation; over-optimistic assumptions masking loss.

### 3.2 Mining (drill/blast/load/haul)
- **Objective:** Deliver ore to spec and plan.  
- **Key Assets:** Blasting patterns, ore blocks, truck loads, dispatch logs.  
- **Typical Systems:** Fleet management, weighbridges, blasting controls.  
- **Handoffs/Custody:** Pit → ROM stockpiles (recorded transfer).  
- **Primary Loss Modes:** Bypass/dilution, ore mis-routing, unlogged scavenging, truck spillage.  
- **Threats:** Collusion to divert or downgrade ore; tampering with dispatch/weighbridge data.

### 3.3 Primary Crushing & ROM Stockpiles
- **Objective:** Size reduction and buffered feed to plant.  
- **Assets:** Crushers, feeders, stockpile tonnage.  
- **Systems:** SCADA/PLC, belt scales, CCTV/black-screen.  
- **Handoffs/Custody:** ROM → Plant feed.  
- **Loss Modes:** Spillage not recovered, mis-measurement, off-spec feed.  
- **Threats:** Concealment in spillage handling; manipulation of belt scale readings.

### 3.4 Scrubbing & Screening
- **Objective:** Liberate and size material for concentration.  
- **Assets:** Scrubbers, screens, oversize/undersize streams.  
- **Handoffs:** Sized streams to concentration circuits.  
- **Loss Modes:** Fines to incorrect stream, screen inefficiency, water balance issues.  
- **Threats:** Deliberate mis-configuration to push diamond sizes into tails.

### 3.5 Concentration (Modern Baseline: **XRT-first**)
- **Objective:** Concentrate diamond-bearing particles for recovery with **minimal manual handling**.  
- **Assets:** XRT sorters (primary/secondary), conveyors, bunker/lock-boxes.  
- **Handoffs:** Concentrate → Secure recovery; rejected material → audit/tails.  
- **Loss Modes:** Sensor drift, mis-calibration, occlusion/masking, ejection timing errors, bypass.  
- **Threats:** Parameter tampering, camera blinding, “maintenance” access abuse.

**Complementary/Alternative:** **DMS** (when ore properties/size profile require gravity concentration).  
- **Loss Modes (DMS):** Cut-point errors (SG/Ep), media instability/viscosity issues, screen inefficiency, FeSi losses, spillage.  
- **Threats:** Collusion at media density set-points; poor housekeeping to hide concentrate.

### 3.6 Recovery (Hands-Free)
- **Objective:** Identify and capture diamonds from concentrate with **sealed-path handling**.  
- **Assets:** XRT final sorters, glove boxes/secure chutes, magnets & metal rejection (if present), audit sorters.  
- **Handoffs:** Recovery product → Sort House/Vault under dual custody.  
- **Loss Modes:** Manual touchpoints, bypass chutes, sample switch, equipment downtime creating “windows”.  
- **Threats:** Insider substitution; defeated interlocks; CCTV gaps.

### 3.7 Sort & Valuation
- **Objective:** Clean, sort, weigh, and value stones; assign parcels.  
- **Assets:** Sort tables, balances, imaging/ID, test stones, chain-of-identity marks.  
- **Handoffs:** Sort House → Vault (sealed container) → Dispatch.  
- **Loss Modes:** Counting/weighing errors, substitution, pocketing, parcel mix-ups.  
- **Threats:** Collusion, coercion, weak SoD, poor glove-box discipline.

### 3.8 Storage, Packing & Dispatch
- **Objective:** Secure storage and compliant shipment.  
- **Assets:** Vaults, seals, tamper-evident packaging, shipment registers.  
- **Handoffs:** Vault → Transport → Buyer or Group sales.  
- **Loss Modes:** Seal compromise, unlogged access, escort failures, route ambush.  
- **Threats:** Insider coordination; false paperwork; external attack.

### 3.9 Sales / Aggregation
- **Objective:** Contract sales (GSS) and/or auctions; revenue realization.  
- **Assets:** Parcels, export/import docs, KPC, sales ledgers.  
- **Handoffs:** Operation → Group Sales / NDTC / Auctions as applicable.  
- **Loss Modes:** Documentation gaps; mismatched weights; valuation leakage.  
- **Threats:** Paper fraud; coercion; shipment diversion.

### 3.10 Reconciliation & Assurance (Closed Loop)
- **Objective:** End-to-end mass-balance and variance control; evidence pack.  
- **Assets:** SADAS/plant mass balance, FeSi consumption norms (if DMS), XRT yield metrics, tailings audit data, incident/RCA records.  
- **Loss Modes:** Uninvestigated variances; stale thresholds; missing evidence.  
- **Threats:** “Normalize deviance” culture; metric gaming.

---

## 4) Design Stance — Modern vs Legacy
- **Baseline:** **XRT-first**, hands-free, sealed paths, dual custody, black-screen monitoring, independent assurance.  
- **Complementary:** DMS where ore/size profile requires gravity concentration (with tight SG/Ep control and FeSi loss monitoring).  
- **Legacy:** Pans/grease belts retained only for historical sites; treat as **high-risk** and on a retirement roadmap with compensating controls. (Detailed notes in Layer-3 Appendix document.)

---

## 5) Custody Map (critical handoffs to control)
1. **Pit → ROM stockpile** (dispatch + weighbridge).  
2. **ROM → Plant feed** (belt scale; CCTV seal).  
3. **Sized streams → Concentration** (screen reports; alarms).  
4. **Concentrate → Recovery** (sealed bunkers/lock-boxes; interlocks).  
5. **Recovery → Sort House/Vault** (dual custody; black-screen).  
6. **Vault → Dispatch/Transport** (seals; route plan; GPS/escort).  
7. **Dispatch → Group Sales/Buyer** (KPC/export chain).  
8. **Reconciliation loop** (plant/accounting/sales close).

---

## 6) Oversight Signals (KPIs & Thresholds — site to parameterize)
- **Mass-balance variance:** investigate daily; escalate > configured % over rolling 7-day window.  
- **XRT performance:** FN rate & ejection timing within site limits; periodic test stones.  
- **DMS health (if used):** SG/Ep within limits; FeSi consumption vs plan; magnet/coil checks.  
- **Screen efficiency & fines routing:** exceptions dashboard.  
- **Custody alarms:** any unsealed transfer; access outside roster; CCTV blackout.  
- **Tail audits:** cadence defined; exceptions logged with RCA.  
- **Training & SoD:** roles assigned; rotation and dual-presence enforced.

> **Note:** Exact numbers/owners/cadences are added in Layer-2/3 documents and site standards.

---

## 7) Interfaces to Other Domains
- **Leadership & Governance:** KPIs, RACI, exec attestations, approvals for parameter changes.  
- **People & Culture:** insider-threat program, vetting, job rotation, whistleblowing, monthly access reviews.  
- **Protection:** compartmentalization, biometrics, mantraps, vault/transport controls.  
- **Proof it Works:** incident response, drills, immutable logs, evidence packs, restore tests.

---

## 8) Glossary (selected)
- **XRT:** X-ray transmission sorters detecting atomic density differences for ejection.  
- **DMS:** Dense-Media Separation; gravity concentration using a controlled-density medium.  
- **Ep / Cut-point:** Measures of separation efficiency and specific gravity threshold.  
- **Black-screen monitoring:** Live operator screens recorded/observed by independent assurance.  
- **Hands-free:** Design goal to minimize manual touchpoints and opportunities for substitution.

---

## 9) Change Log
- **v1.0** — Initial Layer-1 overview aligned to Diamond-Ready model.

---

### Upload Notes (Backoffice Metadata)
- **Document Title:** Diamond Recovery Pipeline — Layer 1: End-to-End Overview & Security Handoffs (v1.0)  
- **Document Type:** Guidance Document  
- **Domain:** Process Integrity  
- **Tags:** industry:diamond, pipeline-layer:1, process-overview, xrt, dms, custody, handoffs, mass-balance, loss-prevention, reconciliation  
- **AI Backoffice Description:** Layer-1 end-to-end pipeline overview with security handoffs and modern tech stance (XRT-first). Routing anchor for deeper layers.
