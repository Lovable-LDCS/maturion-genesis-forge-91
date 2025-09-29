# 📘 Maturion AI Self-Learning Feedback Loop Specification (v1)
**Date:** 2025-07-25
**Owner:** APGI / Maturion Development Team
**Version:** 1.0

---

## 🔍 Purpose
To implement a feedback mechanism that enables Maturion’s AI to learn from user corrections, rejected prompts, or unwanted behavior—improving future criteria generation, evidence recommendations, and tone.

---

## 🎯 Objectives
- Capture structured user feedback from Superusers and Admins.
- Adjust prompt generation or suppress rejected logic in future sessions.
- Learn contextual phrasing preferences (e.g. industry-specific jargon).
- Apply feedback with organizational and domain scope sensitivity.

---

## 🔁 Logic Flow
1. **Feedback Triggered:**
   - User clicks “Reject” or modifies AI-suggested criteria.
   - User provides rejection reason (e.g. “Not used in our industry”).

2. **Log & Categorize:**
   - Store entry in `ai_feedback_log` table with:
     - user_id, org_id, domain_id
     - original AI output, rejection reason
     - replacement text (if edited), timestamp

3. **Pattern Recognition:**
   - AI runs weekly batch scan of rejection logs.
   - Identifies frequently rejected phrases, terminology mismatches, or evidence misalignment.

4. **Self-Adaptation:**
   - Suppresses rejected logic in future prompts to same user/org/domain.
   - Highlights preferred phrasing if consistent across org.

---

## 📁 Schema Suggestion: `ai_feedback_log`

| Field             | Type      |
|------------------|-----------|
| id               | UUID      |
| org_id           | UUID      |
| domain_id        | INT       |
| user_id          | UUID      |
| rejected_text    | TEXT      |
| replacement_text | TEXT      |
| reason           | TEXT      |
| created_at       | TIMESTAMP |

---

## ✅ Benefits
- Learns industry-specific rejection patterns.
- Promotes organizational customization of AI tone.
- Improves confidence in AI-generated results.

---

## 🚫 Guardrails
- Only Superuser/Admin feedback modifies long-term memory.
- All changes reviewed by Maturion Oversight Bot weekly.

---

