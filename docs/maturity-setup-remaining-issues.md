# QA & Prompt Framework Documentation

**Version:** 2025-07-28  
**Tags:** QA, AI Generation, Critical Rules  
**Visibility:** Superusers & Admins  
**Upload Location:** ai_admin_knowledge_base  

## 🔧 Updated QA & Prompt Framework Rules

### 🛡️ Critical Enforcement Rules

#### 1. Evidence-First Format
- All criteria must begin with evidence-type phrasing
- Mandatory structure: "A documented [document_type] that [action_verb]..."
- Example: "A documented policy that defines the organization's information security responsibilities..."

#### 2. No Placeholder Text Allowed
- Any use of generic placeholders (e.g. Criterion A, Criterion [A-Z]) will block generation
- These must be replaced by clear, specific, and evidence-backed criteria

#### 3. Annex 1 / Cross-MPS Content Blocked
- Criteria generation must not fallback to Annex 1 or other MPS domains
- MPS binding is strict: e.g., if generating for MPS 4, only MPS 4 documents may be used

#### 4. Context Must Be Available
- If no document context is found, generation will abort with error: "ERROR: No MPS [x] document context available."
- This protects against AI generating hallucinated or speculative content

### 🚨 QA Rule Summary (7 Active)
✅ Token Limit Check (12,000 max)  
✅ Annex 1 Fallback Detection  
✅ Placeholder Text Detection  
✅ Evidence-First Structure  
✅ Organization Context Validation  
✅ MPS Context Binding  
✅ Domain Context Check  

## 🔍 Recent Bug Fixes

### Fixed: Document Context Retrieval (2025-07-28)
**Issue:** Embedding parsing bug in `search-ai-context` function caused complete failure of AI document context retrieval.

**Impact:** 
- Intent Generation → fallbacks used instead of live data
- Criteria Generation → blocked by placeholder detection  
- QA Validation → critical errors triggered
- Regression Testing → all 25 MPSs failed due to missing context

**Resolution:** Removed faulty JSON.parse() logic for vector embeddings (already arrays in Supabase).

## 🎯 Enforcement Flow
1. **Pre-Generation QA Check** → Validate all 7 rules before AI call
2. **Context Availability** → Ensure document chunks are retrieved  
3. **Prompt Construction** → Evidence-first structure enforced
4. **Generation Block** → Abort if any critical rule violated
5. **Post-Generation Validation** → Final check before storage

## 📊 Success Metrics
- Zero placeholder text in generated criteria
- Zero Annex 1 fallbacks detected
- 100% evidence-first format compliance
- Context availability for all MPS document requests