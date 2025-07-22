# Maturity Setup Issues – Fix Remaining Save and Upload Bugs

**Tags:** Bug, UI, Save Functionality, Upload  
**Visibility:** Superusers only  
**Upload Location:** ai_admin_knowledge_base  

## Description
Summarizes the remaining UI and data persistence issues in the Maturity Setup page post initial fixes. Uploaded for dev prioritization and traceability.

## Remaining Issues

### 1. Document Uploads Not Persisting
- Uploaded optional documents (company profiles, org charts, etc.) disappear on refresh
- Intent creator displays `❌ Uploaded Docs: No`, despite files being selected and submitted
- **Likely cause:** uploads are not being properly linked to the organization record in the `ai_documents` table or are not triggering metadata save

### 2. Company Logo Missing on Reload
- Uploaded company logo does not display or persist
- **Recommendation:** implement visual preview and confirm storage link in `organization-logos` bucket

### 3. Endless Spinner During Save
- After clicking Save, spinner never stops
- **Recommendation:** explicitly reset spinner state on `204` or `200` response. Use fallback in error state

### 4. Start Building Button Misbehavior
- Button remains active even while saving, risking uncommitted state transitions
- **Recommendation:** fully disable until save completes or fails with user feedback

### 5. Auto-save Error Alerts
- Still getting `Auto-save Failed` popups intermittently
- **Suggestion:** verifying `useOrganization` fallback logic under varying latency and offline scenarios

### 6. No Way to Confirm Success
- Lack of feedback that uploads were successful (no green checkmark, no preview, no toast)
- **Consider adding:**
  - Logo thumbnail
  - Uploaded doc list with remove buttons
  - Green 'Saved' badge after successful persistence

## Priority
Please implement visual indicators, strong validation handling, and finalize document association logic before user is allowed to proceed to intent generation. These are essential for consistent AI behavior and trust in platform functionality.