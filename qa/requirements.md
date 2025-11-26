# Maturion Genesis Forge - QA Requirements

**Version:** 1.0  
**Date:** 2025-11-25  
**Status:** True North Reference

---

## Table of Contents

1. [Introduction](#introduction)
2. [Validation Rules for Architecture Compliance](#validation-rules-for-architecture-compliance)
3. [QA Gates for UI/UX Consistency](#qa-gates-for-uiux-consistency)
4. [User Feedback Expectations](#user-feedback-expectations)
5. [Component Wiring Checks](#component-wiring-checks)
6. [Workflow Validation and Correctness](#workflow-validation-and-correctness)
7. [Data Integrity Expectations](#data-integrity-expectations)
8. [Deployment Readiness Checks](#deployment-readiness-checks)
9. [Security Expectations](#security-expectations)
10. [Green/Red Evaluation Model](#greenred-evaluation-model)
11. [Build Handover Criteria](#build-handover-criteria)

---

## Introduction

This document defines the QA requirements for the Maturion Genesis Forge platform. It complements the machine-verifiable checks in `qa/requirements.json` with human-readable explanations and extended criteria.

### Purpose

- Define validation rules for architecture compliance
- Establish QA gates for UI/UX consistency
- Set expectations for user feedback mechanisms
- Document component wiring verification procedures
- Specify deployment readiness criteria
- Define the green/red evaluation model

### QA Philosophy

> **True North**: Architecture document is the single source of truth  
> **Validation Approach**: QA validates implementation against architecture  
> **RED/GREEN Cycle**: RED = architecture mismatch, GREEN = full alignment  
> **No Legacy**: All components must be wired or deleted  
> **Strict Wiring**: Static presence + runtime behavior both required

---

## Validation Rules for Architecture Compliance

### Rule 1: Architecture Document Must Be Current

**Requirement**: `ARCHITECTURE.md` must exist and reflect the current state of the system.

**Validation**:
- File exists at project root
- Contains all routes currently in `src/App.tsx`
- Contains all component categories
- Contains all custom hooks
- Version date is within 30 days

**Failure Action**: RED - Cannot proceed with build handover

---

### Rule 2: All Routes Must Be Defined

**Requirement**: Every route in `ARCHITECTURE.md` must have a corresponding entry in `src/App.tsx`.

**Validation**:
- Count routes in architecture: Expected 30
- Count routes in App.tsx: Must match
- Each route must resolve to a valid component

**Failure Action**: RED - Missing routes must be added

---

### Rule 3: All Pages Must Exist

**Requirement**: Every page component referenced in routes must exist in `src/pages/`.

**Validation**:
- For each route, check page file exists
- Page component must export default
- Page must render without errors

**Failure Action**: RED - Missing pages must be created

---

### Rule 4: All Component Categories Must Exist

**Requirement**: All 17 component categories must have corresponding directories.

**Expected Categories**:
```
admin, ai, assessment, auth, checkout, diagnostics, 
layout, milestones, organization, qa, security, 
team, test, ui, watchdog, webhook
```

**Validation**:
- Directory exists in `src/components/`
- Contains at least one component file
- Components are imported somewhere

**Failure Action**: RED - Missing categories must be created or documented

---

### Rule 5: All Hooks Must Exist and Be Used

**Requirement**: All 44 custom hooks must exist and be imported somewhere.

**Validation**:
- Hook file exists in `src/hooks/`
- Hook is imported in at least one component
- Hook does not have TypeScript errors

**Failure Action**: RED for missing hooks, WARN for unused hooks

---

## QA Gates for UI/UX Consistency

### Gate 1: Layout Consistency

**Requirement**: All authenticated pages must use `AppLayout` wrapper.

**Validation**:
- Check route definitions use AppLayout element
- Verify sidebar renders on authenticated pages
- Verify header renders correctly

**Criteria**:
| Element | Requirement |
|---------|-------------|
| AppLayout | Wraps all authenticated routes |
| Sidebar | Visible on all authenticated pages |
| Header | Shows user info and controls |
| Content area | Proper padding and max-width |

---

### Gate 2: Responsive Design

**Requirement**: All pages must be responsive at defined breakpoints.

**Breakpoints**:
| Name | Width | Status |
|------|-------|--------|
| Mobile | 320px - 640px | Must render correctly |
| Tablet | 641px - 1024px | Must render correctly |
| Desktop | 1025px+ | Must render correctly |

**Validation**:
- No horizontal overflow at any breakpoint
- Content readable at all sizes
- Interactive elements accessible

---

### Gate 3: Navigation Consistency

**Requirement**: Sidebar navigation must follow defined structure.

**Structure**:
```
Main Section
  - Dashboard
  - Modules

Pre-subscription (before full subscription)
  - Free Assessment

Maturity Roadmap
  - Audit Structure Setup
  - Assessment
  - Assessment Framework
  - QA Sign-Off
  - Team

Admin Only (visible only to admins)
  Maturion Section
    - Knowledge Base
    - Uploads
  Settings Section
    - Settings
  Admin Section
    - Workflow Dashboard
    - User Matrix
    - Admin Config
    - Health Checker
  Watchdog Section
    - Watchdog
```

**Validation**:
- Items appear in correct sections
- Admin sections hidden for non-admins
- Active item highlighted

---

### Gate 4: Component Styling

**Requirement**: All components must use approved styling patterns.

**Approved Patterns**:
- Button: shadcn/ui Button component
- Input: shadcn/ui Input component
- Forms: React Hook Form + Zod
- Cards: shadcn/ui Card component
- Dialogs: shadcn/ui Dialog component
- Icons: Lucide React only
- Notifications: Sonner toast

**Validation**:
- No custom button implementations
- No inline styles for layout
- Consistent use of Tailwind classes

---

## User Feedback Expectations

### Feedback 1: Saving Indicator

**Requirement**: All save operations must show feedback.

**Implementation**:
```
1. User initiates save
2. Button shows loading state (spinner)
3. On success: Toast notification "Saved successfully"
4. On error: Toast notification with error message
5. Button returns to normal state
```

**Validation**:
- Save buttons have loading prop support
- Toast appears within 500ms of completion
- Error messages are actionable

---

### Feedback 2: Loading States

**Requirement**: All data fetching must show loading states.

**Implementation**:
```
1. Data request initiated
2. Show skeleton or spinner
3. On success: Render data
4. On error: Show error state with retry
5. On empty: Show empty state message
```

**Validation**:
- Loading indicator appears immediately
- No blank screens during load
- Skeleton matches final layout

---

### Feedback 3: Error Handling

**Requirement**: All errors must be communicated clearly.

**Error Types and Display**:
| Type | Display Method |
|------|----------------|
| Validation error | Inline field error |
| Network error | Toast notification |
| Auth error | Redirect to login |
| Server error | Error page or toast |

**Validation**:
- All error scenarios handled
- Error messages are user-friendly
- Recovery action provided when possible

---

### Feedback 4: Success Confirmations

**Requirement**: All successful actions must be confirmed.

**Action Types**:
| Action | Confirmation |
|--------|--------------|
| Form submission | Success toast |
| Item deletion | Confirmation dialog + success toast |
| Settings change | Success toast |
| File upload | Progress bar + success message |

---

## Component Wiring Checks

### Check 1: Static Wiring

**Requirement**: All components must be imported somewhere.

**Validation Method**:
```bash
# For each component file
grep -r "from '[path-to-component]'" src/

# If no results: Component is NOT statically wired
```

**Failure Action**: WARN on first detection, DELETE after 2 cycles

---

### Check 2: Route Wiring

**Requirement**: All page components must be in routes.

**Validation Method**:
```bash
# Check App.tsx for route definitions
grep "element={<ComponentName" src/App.tsx
```

**Failure Action**: RED - Page must be routed or removed

---

### Check 3: Runtime Wiring

**Requirement**: Components must render and function at runtime.

**Validation Method**:
- Start dev server
- Navigate to each route
- Verify component renders
- Verify interactions work

**Failure Action**: RED - Component must be fixed

---

### Check 4: Context Wiring

**Requirement**: Context-dependent components must have providers.

**Critical Contexts**:
| Context | Required By |
|---------|-------------|
| AuthContext | All authenticated components |
| OrganizationContext | Organization-scoped components |
| QueryClientProvider | All data-fetching components |

**Validation**:
- Context providers wrap required routes
- No "Context is undefined" errors

---

## Workflow Validation and Correctness

### Workflow 1: Authentication Flow

**Expected Flow**:
```
1. User visits protected route
2. AuthGuard checks authentication
3. If not authenticated → Redirect to /auth
4. If authenticated → Allow access
5. Session expiry → Redirect to /auth
```

**Validation Points**:
- [ ] Protected routes redirect when unauthenticated
- [ ] Login succeeds with valid credentials
- [ ] Session persists across page refreshes
- [ ] Logout clears session and redirects

---

### Workflow 2: Admin Access Flow

**Expected Flow**:
```
1. User accesses admin route
2. useAdminAccess hook checks role
3. If admin → Show admin content
4. If not admin → Redirect to dashboard
```

**Validation Points**:
- [ ] Admin routes check admin status
- [ ] Non-admins cannot access admin routes
- [ ] Admin sidebar sections hidden for non-admins

---

### Workflow 3: Assessment Flow

**Expected Flow**:
```
1. User starts assessment
2. Select domain
3. Answer criteria questions
4. Submit assessment
5. View results/gap analysis
```

**Validation Points**:
- [ ] Assessment can be started
- [ ] Domain selection works
- [ ] Criteria questions render
- [ ] Submission persists to database
- [ ] Results display correctly

---

### Workflow 4: Document Upload Flow

**Expected Flow**:
```
1. User selects file
2. Upload begins with progress
3. Processing starts (chunking)
4. Embeddings generated
5. Document available for search
```

**Validation Points**:
- [ ] File selection works
- [ ] Upload progress displays
- [ ] Processing status updates
- [ ] Document appears in list

---

## Data Integrity Expectations

### Expectation 1: Database Connectivity

**Requirement**: Application must connect to Supabase.

**Validation**:
- Supabase URL and key configured
- Connection test passes
- Queries return expected data

---

### Expectation 2: RLS Policies Active

**Requirement**: Row Level Security must be enabled on all tables.

**Critical Tables**:
- organizations
- users
- organization_members
- milestones
- documents
- qa_logs
- watchdog_incidents

**Validation**:
- RLS enabled on each table
- Users can only access their org's data
- Cross-org access blocked

---

### Expectation 3: Data Validation

**Requirement**: All user input must be validated.

**Validation Layers**:
| Layer | Tool | Purpose |
|-------|------|---------|
| Client | Zod | Form validation |
| API | TypeScript | Type checking |
| Database | Constraints | Data integrity |

---

### Expectation 4: Migrations Applied

**Requirement**: All migrations must be applied to database.

**Validation**:
- Check migration status
- No pending migrations
- Schema matches expected structure

---

## Deployment Readiness Checks

### Check 1: Build Success

**Requirement**: `npm run build` must succeed.

**Validation**:
```bash
npm run build
# Exit code must be 0
# No errors in output
```

---

### Check 2: TypeScript Compilation

**Requirement**: TypeScript must compile without errors.

**Validation**:
```bash
npx tsc --noEmit
# Exit code must be 0
# No errors in output
```

---

### Check 3: Lint Pass

**Requirement**: ESLint must pass with acceptable warnings.

**Validation**:
```bash
npm run lint
# Exit code must be 0
# Maximum 10 warnings allowed
```

---

### Check 4: Environment Configuration

**Requirement**: Required environment variables must be set.

**Required Variables**:
- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

**Optional Variables**:
- `OPENAI_API_KEY`
- `EMAIL_FROM`

---

### Check 5: No Console Errors

**Requirement**: Application must run without console errors.

**Validation**:
- Open browser dev tools
- Navigate through application
- No red errors in console

---

## Security Expectations

### Expectation 1: No Secrets in Code

**Requirement**: No hardcoded API keys or secrets.

**Scan Patterns**:
```
sk-[a-zA-Z0-9]{32,}  # OpenAI keys
pk_[a-zA-Z0-9]{32,}  # Payment keys
AIza[a-zA-Z0-9]{35}  # Google keys
```

**Validation**:
- Scan all source files
- No matches found

---

### Expectation 2: XSS Protection

**Requirement**: User-generated content must be sanitized.

**Implementation**:
- Use DOMPurify for HTML content
- React's built-in escaping for text

**Validation**:
- Search for DOMPurify usage
- No dangerouslySetInnerHTML without sanitization

---

### Expectation 3: HTTPS Only

**Requirement**: All external requests must use HTTPS.

**Validation**:
- Scan for `http://` in code
- Only HTTPS URLs allowed

---

### Expectation 4: Authentication Enforcement

**Requirement**: Protected routes must enforce authentication.

**Validation**:
- AuthGuard or ProtectedRoute wraps protected routes
- Unauthorized access redirects to login

---

## Green/Red Evaluation Model

### Status Definitions

| Status | Color | Meaning | Action |
|--------|-------|---------|--------|
| PASS | 🟢 GREEN | Meets all criteria | Ready for handover |
| WARN | 🟡 YELLOW | Minor issues | Handover with documentation |
| FAIL | 🔴 RED | Critical issues | Block handover, fix required |

### Severity Levels

| Severity | Impact | Examples |
|----------|--------|----------|
| Critical | Blocks deployment | Build failure, security issue |
| High | Affects functionality | Broken routes, wiring issues |
| Medium | Affects UX | UI inconsistencies |
| Low | Cosmetic | Minor styling issues |

### Evaluation Order

```
1. Architecture Compliance (Critical)
2. Environment Checks (Critical)
3. Build Integrity (Critical)
4. Wiring Verification (High)
5. Legacy Detection (High)
6. Database Integrity (High)
7. API Health (High)
8. Security Posture (Critical)
9. UI Consistency (Medium)
10. Documentation (Medium)
```

### Failure Handling

| Severity | Action |
|----------|--------|
| Critical fail | STOP execution, report RED, require fix |
| High fail | Continue, report RED, require fix before deployment |
| Medium fail | Continue, report YELLOW, fix recommended |
| Low fail | Continue, report info only |

---

## Build Handover Criteria

### Mandatory Criteria (All Must Pass)

| # | Criterion | Validation |
|---|-----------|------------|
| 1 | Build succeeds | `npm run build` exits 0 |
| 2 | TypeScript compiles | `tsc --noEmit` exits 0 |
| 3 | Lint passes | `npm run lint` with max 10 warnings |
| 4 | All routes accessible | Manual or automated route check |
| 5 | Authentication works | Login/logout flow verified |
| 6 | Database connected | Supabase connectivity verified |
| 7 | No critical security issues | Security scan clean |
| 8 | Architecture updated | ARCHITECTURE.md current |

### Conditional Criteria (Based on Changes)

| Criterion | When Required |
|-----------|---------------|
| New routes wired | When routes added |
| Components documented | When components added |
| Hooks documented | When hooks added |
| API documented | When endpoints added |
| Edge functions deployed | When functions changed |

### Handover Checklist Template

```markdown
## Build Handover Checklist

**Date**: [Date]
**Build Version**: [Version/Commit]
**Agent**: [Agent ID]

### Mandatory Checks

- [ ] Build succeeds
- [ ] TypeScript compiles
- [ ] Lint passes
- [ ] All routes accessible
- [ ] Authentication works
- [ ] Database connected
- [ ] No security issues
- [ ] Architecture updated

### Conditional Checks

- [ ] New routes wired (if applicable)
- [ ] Components documented (if applicable)
- [ ] Hooks documented (if applicable)

### Overall Status

**Status**: 🟢 GREEN / 🟡 YELLOW / 🔴 RED

**Notes**: [Any observations or known issues]

### Sign-Off

**Agent Sign-Off**: [Agent ID] - [Date]
**User Verification**: Pending / Completed
```

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-25 | AI Agent | Initial QA requirements document |

---

**END OF QA REQUIREMENTS DOCUMENT**

This document defines the quality assurance requirements for the Maturion Genesis Forge platform. All builds must meet these criteria before handover to users.
