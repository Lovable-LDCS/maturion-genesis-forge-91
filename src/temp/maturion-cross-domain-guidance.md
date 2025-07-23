# Maturion Knowledge Base Guidance – Cross-Domain Criteria Handling (Extended)

## Purpose
This document provides enhanced universal logic and fallback handling for proposed criteria that may fall outside the domain or MPS currently being configured. It supports better AI reasoning, user guidance, and safeguards against misplacement or omission of valid suggestions.

## Scope
This logic applies globally across **all Domains** and **all MPSs**, and includes additional user behavioral logic to ensure no relevant criteria are lost, misfiled, or skipped.

---

## Logic Rules (Extended)

### ✅ Scenario 1: Proposed Criterion Fits Current MPS
- AI (Maturion) reconstructs and validates the proposed criterion.
- It is immediately inserted into the MPS currently being configured.
- The user can approve or edit it without leaving their current workflow.

### ✅ Scenario 2: Proposed Criterion Fits Same Domain but Different MPS
- Maturion detects better alignment with another MPS within the **same domain**.
- Prompts:
  > "This criterion fits better under MPS Y – [Title]. Would you like to defer it there?"
- If accepted:
  - Criterion is added to MPS Y instantly.
  - User is reminded before exiting the domain to review and approve it.

### ✅ Scenario 3: Proposed Criterion Fits a **Future Domain**
- Maturion detects the criterion belongs to a domain that has not been configured yet.
- Action:
  - Defer the criterion.
  - When the user reaches the future domain:
    > "You proposed a criterion earlier that belongs here. Would you like to add it now?"

### ✅ Scenario 4: Criterion Fits a **Past Domain**
- Maturion identifies a mismatch to a domain already completed.
- Prompts:
  > "This belongs to Domain X – MPS Y. Would you like to return to add it?"
- If declined:
  - A reminder is logged.
  - **Final checkpoint** before Evidence Management (Step 4 of final domain):
    > ⚠️ "You still have unresolved criteria for Domain X. Would you like me to take you there now?"

### ✅ Scenario 5: Dual Evidence in One Sentence
- If a user submits a statement with multiple requirements:
  > e.g., "Must have a formal policy *and* conduct annual simulations."
- Maturion splits it into two criteria with appropriate summaries.
- Prompts:
  > "We've detected more than one requirement. Would you like to split this into two separate criteria?"

### ✅ Scenario 6: Criterion Fits Another MPS in the Same Domain (But That MPS Has Not Been Constructed Yet)
- **Context:** User is working in Domain X, MPS A. They propose a criterion that fits MPS B in the *same domain*, but MPS B has not been constructed yet.
- **Action:**
  - Maturion defers the criterion to MPS B.
  - When the user **constructs MPS B**, Maturion prompts:
    > "You proposed a criterion earlier for MPS B – [Title]. Would you like to add it now?"
- **Fallback:** If the user skips MPS B and reaches the final step of the domain without approving the deferred criterion:
  > ⚠️ "You still have unresolved criteria for MPS B in this domain. Would you like to review them before proceeding?"

---

## Modal Loop Logic
After submitting a custom criterion:
- Always ask:
  > "Would you like to propose another?"
- Modal repeats until the user explicitly confirms they are done.

---

## Upload Instructions
- **Tags:** `cross-domain`, `criteria-placement`, `lesson-learned`, `ai-logic`, `modal-logic`, `split-criteria`
- **Domain:** *(Leave blank for global logic)*
- **Upload Notes:** Replaces previous guidance. Includes enhanced user flow logic and behavioral safeguards for full coverage across domains and intra-domain MPS deferrals.

---

*Generated on 2025-07-23 14:27 UTC – includes 6-scenario logic model and modal loop control.*