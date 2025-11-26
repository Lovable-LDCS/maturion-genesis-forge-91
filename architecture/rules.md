# Maturion Genesis Forge - Architecture Rules

**Version:** 1.0  
**Date:** 2025-11-25  
**Status:** True North Reference

---

## Table of Contents

1. [Introduction](#introduction)
2. [True North Philosophy](#true-north-philosophy)
3. [High-Level Functional Architecture](#high-level-functional-architecture)
4. [Page Structure & Layout Definitions](#page-structure--layout-definitions)
5. [Component Maps & Dependencies](#component-maps--dependencies)
6. [Component Wiring Requirements](#component-wiring-requirements)
7. [UX/UI Rules & Consistency Standards](#uxui-rules--consistency-standards)
8. [Branding, Spacing & Typography](#branding-spacing--typography)
9. [System Behaviors & User Interaction Standards](#system-behaviors--user-interaction-standards)
10. [Launch Requirements](#launch-requirements)
11. [ESLint Cleanliness Enforcement](#eslint-cleanliness-enforcement)
12. [Domain-Specific Rules](#domain-specific-rules)
13. [Acceptance Criteria](#acceptance-criteria)

---

## Introduction

This document defines the architectural rules that govern the Maturion Genesis Forge platform. These rules serve as the **True North** reference for all development, QA, and deployment activities. Every change to the codebase must be validated against these rules before handover.

### Purpose

- Define the single source of truth for architectural decisions
- Establish clear guidelines for component development and wiring
- Ensure consistency across UI/UX implementation
- Set quality gates for build readiness
- Provide acceptance criteria for functional requirements

---

## True North Philosophy

### Core Principles

1. **Architecture = Source of Truth**: All development follows this architecture document
2. **Architecture-First Development**: Update architecture before implementing features
3. **QA Alignment**: QA systems validate against architectural requirements
4. **No Legacy Components**: Unused components must be removed or wired
5. **Strict Wiring**: All components must be connected at both static and runtime levels

### One Time Build Process

The One Time Build process is the definitive workflow for implementing changes:

```
1. Define/update architecture requirements
       ↓
2. Encode requirements in qa/requirements.json
       ↓
3. Run QA (expect RED if incomplete)
       ↓
4. Implement features to satisfy architecture
       ↓
5. Run QA until GREEN
       ↓
6. Handover to user for UI verification
```

### RED/GREEN Evaluation Model

| Status | Meaning |
|--------|---------|
| 🔴 **RED** | Implementation does not match architecture; handover blocked |
| 🟡 **YELLOW** | Non-critical issues present; handover possible with documented exceptions |
| 🟢 **GREEN** | Full alignment between architecture and implementation; ready for handover |

---

## High-Level Functional Architecture

### System Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
│  React SPA (Vite + TypeScript)                                  │
│  - 30 Pages (Public + Authenticated)                            │
│  - 196 UI Components (17 Categories)                            │
│  - 44 Custom Hooks                                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓ ↑
┌─────────────────────────────────────────────────────────────────┐
│                      INTEGRATION LAYER                          │
│  Supabase Client SDK                                            │
│  - Authentication & Authorization                               │
│  - Real-time Subscriptions                                      │
│  - Database Queries                                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓ ↑
┌─────────────────────────────────────────────────────────────────┐
│                       BACKEND LAYER                             │
│  PostgreSQL + Edge Functions                                    │
│  - 54 Edge Functions                                            │
│  - RLS Policies                                                 │
│  - Database Triggers                                            │
└─────────────────────────────────────────────────────────────────┘
```

### Core Domains (Six Domains Framework)

| Domain | Purpose | Key Pages |
|--------|---------|-----------|
| Leadership & Governance | Strategic oversight, policy framework | Dashboard, Assessment Framework |
| Process Integrity | Systematic workflows, quality controls | Process Audit Builder |
| People & Culture | Team development, organizational values | Team Page, Journey |
| Protection | Risk mitigation, security measures | Security Dashboard, Watchdog |
| Proof it Works | Performance metrics, validation | QA Sign Off, QA Dashboard |
| Performance | Continuous improvement, optimization | Dashboard, Modules Overview |

---

## Page Structure & Layout Definitions

### Route Categories

#### Public Routes (No Authentication, No Sidebar)
Pages accessible without login, optimized for conversion:

| Route | Component | Layout |
|-------|-----------|--------|
| `/` | Index.tsx | Full-width marketing |
| `/journey` | Journey.tsx | Full-width marketing |
| `/auth` | LoginForm | Minimal auth layout |
| `/accept-invitation` | InvitationAcceptance | Minimal layout |
| `/subscribe` | Subscribe.tsx | Marketing checkout |
| `/subscribe/checkout` | SubscribeCheckout.tsx | Checkout layout |

#### Authenticated Routes (AppLayout with Sidebar)
Pages requiring login, wrapped with standard layout:

| Route | Component | Sidebar Section |
|-------|-----------|-----------------|
| `/dashboard` | Dashboard.tsx | Main |
| `/modules` | ModulesOverview.tsx | Main |
| `/free-assessment` | FreeAssessment.tsx | Pre-subscription |
| `/maturity/setup` | MaturitySetup.tsx | Maturity Roadmap |
| `/assessment` | Assessment.tsx | Maturity Roadmap |
| `/team` | TeamPage.tsx | Maturity Roadmap |

#### Admin-Only Routes (Gated by useAdminAccess)
Pages restricted to administrators:

| Route | Component | Sidebar Section |
|-------|-----------|-----------------|
| `/admin/config` | AdminConfig.tsx | Admin |
| `/admin/workflow` | AdminWorkflowDashboard.tsx | Admin |
| `/admin/health-checker` | AdminHealthChecker.tsx | Admin |
| `/watchdog` | WatchdogDashboard.tsx | Watchdog |
| `/organization/settings` | OrganizationSettings.tsx | Settings |

### Layout Components

| Component | Purpose | Required For |
|-----------|---------|--------------|
| AppLayout | Main authenticated wrapper | All authenticated routes |
| Sidebar | Navigation menu | All authenticated routes |
| Header | Top navigation bar | All authenticated routes |
| AuthGuard | Authentication gate | Protected routes |

---

## Component Maps & Dependencies

### Component Categories (17 Total)

Detailed component maps are defined in `architecture/components.md`. Key categories:

| Category | Component Count | Purpose |
|----------|-----------------|---------|
| admin | 10+ | Administrative tools |
| ai | 15+ | AI chat, document processing |
| assessment | 20+ | Assessment frameworks |
| auth | 5+ | Authentication |
| checkout | 10+ | Payment & subscriptions |
| layout | 5+ | App structure |
| qa | 30+ | Quality assurance tools |
| ui | 40+ | shadcn/ui base components |

### Dependency Rules

1. **UI Components**: Base components (ui/) can be imported by any component
2. **Feature Components**: Must stay within their category unless explicitly shared
3. **Hooks**: Can be imported by any component that requires the functionality
4. **Context Providers**: Must be wired at the appropriate level in the component tree

---

## Component Wiring Requirements

### Definition of "Wired"

A component is considered **wired** when it meets both criteria:

1. **Static Wiring**: Code references exist (imports, route definitions)
2. **Runtime Wiring**: Component renders and functions in the UI

### Wiring Verification Process

```
For each component:
  1. Check: Is component imported in any file? (Static)
  2. Check: Is component rendered in the DOM? (Runtime)
  3. Check: Do event handlers function? (Interactivity)
  
  If ANY check fails → Component is NOT wired
```

### Legacy Component Rules

| Condition | Action |
|-----------|--------|
| Component exists but not imported | WARN on first detection |
| Component fails wiring 2+ cycles | MARK FOR DELETION |
| Component not in architecture | Require documentation or DELETE |
| Component intentionally unused | Document in exclusion list |

### Current Wiring Status

Per `ARCHITECTURE.md`:
- Pages: **30/30 Wired (100%)**
- Component Categories: **17/17 Wired (100%)**
- Individual Components: **196/196 Wired (100%)**
- Custom Hooks: **44/44 Wired (100%)**
- Edge Functions: **54/54 Active (100%)**

---

## UX/UI Rules & Consistency Standards

### Layout Constraints

| Element | Constraint |
|---------|------------|
| Page max-width | 1440px |
| Content padding | 24px (desktop), 16px (mobile) |
| Sidebar width | 256px (expanded), 64px (collapsed) |
| Header height | 64px |

### Responsive Breakpoints

| Breakpoint | Width | Target |
|------------|-------|--------|
| `sm` | 640px | Mobile landscape |
| `md` | 768px | Tablet portrait |
| `lg` | 1024px | Tablet landscape |
| `xl` | 1280px | Desktop |
| `2xl` | 1536px | Large desktop |

### Component Consistency Rules

1. **All buttons**: Use shadcn/ui Button component
2. **All forms**: Use React Hook Form with Zod validation
3. **All modals**: Use shadcn/ui Dialog component
4. **All notifications**: Use Sonner toast notifications
5. **All icons**: Use Lucide React icons only

### State Feedback Requirements

| Action | Required Feedback |
|--------|-------------------|
| Form submission | Loading spinner + success/error toast |
| Data loading | Skeleton or spinner |
| Error states | Error message with retry option |
| Empty states | Helpful message with action suggestion |
| Save operations | "Saving..." indicator + confirmation |

---

## Branding, Spacing & Typography

### Color Palette

| Color | Usage | Tailwind Class |
|-------|-------|----------------|
| Primary | Main actions, brand | `bg-primary` |
| Secondary | Secondary actions | `bg-secondary` |
| Destructive | Dangerous actions | `bg-destructive` |
| Muted | Disabled, subtle | `bg-muted` |
| Accent | Highlights | `bg-accent` |

### Typography Scale

| Element | Size | Weight | Class |
|---------|------|--------|-------|
| H1 | 2.25rem | Bold | `text-4xl font-bold` |
| H2 | 1.875rem | Semibold | `text-3xl font-semibold` |
| H3 | 1.5rem | Semibold | `text-2xl font-semibold` |
| H4 | 1.25rem | Medium | `text-xl font-medium` |
| Body | 1rem | Normal | `text-base` |
| Small | 0.875rem | Normal | `text-sm` |
| Caption | 0.75rem | Normal | `text-xs` |

### Spacing Scale (Tailwind)

| Name | Size | Use Case |
|------|------|----------|
| 1 | 4px | Inline elements |
| 2 | 8px | Tight groups |
| 4 | 16px | Standard gaps |
| 6 | 24px | Section padding |
| 8 | 32px | Large sections |
| 12 | 48px | Page sections |

### Organization Branding

Organizations can customize:
- Primary color
- Logo
- Favicon

Branding is loaded via `useOrgTheme` hook and applied to themed components.

---

## System Behaviors & User Interaction Standards

### Navigation Behavior

| Action | Expected Behavior |
|--------|-------------------|
| Click sidebar item | Navigate to page, highlight active item |
| Use browser back | Navigate to previous page in history |
| Deep link | Route to correct page, maintain auth state |
| 404 route | Show NotFound page with navigation options |

### Form Behavior

| Action | Expected Behavior |
|--------|-------------------|
| Submit valid form | Process submission, show success |
| Submit invalid form | Show validation errors, focus first error |
| Unsaved changes + navigate | Prompt for confirmation |
| Network error | Show error toast with retry |

### Authentication Behavior

| State | Behavior |
|-------|----------|
| Not authenticated | Redirect to `/auth` |
| Authenticated + protected route | Allow access |
| Authenticated + admin route (non-admin) | Redirect to dashboard |
| Session expired | Redirect to `/auth` with message |

### Admin Access Gating

Admin visibility requires EITHER:
- `user.role === 'admin'`
- Email in admin list
- Role selector set to Admin

Admin sections must use `useAdminAccess()` hook for gating.

---

## Launch Requirements

### Zero Tolerance Requirements (Must Pass for Launch)

1. **No 404 Routes**: All routes in architecture must resolve
2. **No Console Errors**: Critical errors block launch
3. **No TypeScript Errors**: Build must compile clean
4. **No ESLint Errors**: Lint must pass
5. **All Wiring Complete**: No orphaned components
6. **Authentication Works**: Login/logout functional
7. **Database Connected**: Supabase connectivity verified

### Pre-Launch Checklist

- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes
- [ ] All routes respond 200
- [ ] Authentication flow works
- [ ] Admin routes gated properly
- [ ] Sidebar navigation functional
- [ ] MaturionChat renders globally
- [ ] Forms submit successfully
- [ ] Error states display correctly

### Deployment Requirements

| Requirement | Validation |
|-------------|------------|
| Environment variables set | ENV-001, ENV-002, ENV-003 |
| Build passes | BUILD-001, BUILD-002 |
| Database connected | DB-001, API-003 |
| No security issues | SEC-001, SEC-002 |

---

## ESLint Cleanliness Enforcement

### ESLint Configuration

The project uses ESLint 9.9.0 with TypeScript support:

```javascript
// eslint.config.js key rules
{
  "no-unused-vars": "warn",
  "no-console": "warn",
  "@typescript-eslint/no-explicit-any": "warn",
  "@typescript-eslint/explicit-function-return-type": "off"
}
```

### Lint Rules

| Rule | Severity | Description |
|------|----------|-------------|
| No unused vars | Warn | Remove unused imports/vars |
| No console | Warn | Use proper logging |
| No explicit any | Warn | Use proper types |
| React hooks deps | Error | Ensure correct dependencies |

### Enforcement

- **Pre-commit**: ESLint must pass (warnings allowed, errors blocked)
- **Pre-deploy**: Maximum 10 warnings allowed
- **CI/CD**: Build fails on ESLint errors

---

## Domain-Specific Rules

### ISMS Workflow Rules

1. Workflow phases must be completed sequentially where dependencies exist
2. Phase completion status must be persisted
3. Admin-only phases require admin role verification
4. Workflow dashboard must show accurate progress

### Assessment Rules

1. Assessment scores must be calculated using defined algorithm
2. Evidence must be linked to assessments
3. Gap analysis must identify deviations
4. Reports must reflect real-time data

### Document Processing Rules

1. Documents must be chunked for embedding (800-1200 tokens)
2. Embeddings must be generated for all chunks
3. Document status must be tracked (pending, processing, completed, failed)
4. Duplicate documents must be detected and handled

### AI Chat Rules

1. Maturion must be context-aware (organization, page, domain)
2. Responses must be scoped to user's organization
3. Guardrails must prevent unauthorized data access
4. Feedback must be collected for learning

---

## Acceptance Criteria

### For Each Feature

Every feature must meet these criteria before acceptance:

1. **Functional**: Feature works as specified
2. **Wired**: Component is statically and runtime wired
3. **Styled**: Matches UI/UX standards
4. **Responsive**: Works at all breakpoints
5. **Accessible**: Meets basic accessibility
6. **Secure**: No security vulnerabilities
7. **Documented**: Architecture updated if needed
8. **Tested**: QA checks pass

### For Handover

Handover from agent to user requires:

1. ✅ All QA checks GREEN
2. ✅ No TypeScript errors
3. ✅ No ESLint errors
4. ✅ Build succeeds
5. ✅ All routes accessible
6. ✅ Database connectivity verified
7. ✅ Architecture document updated
8. ✅ No console errors in browser

### Acceptance Sign-Off Template

```
## Handover Acceptance

**Feature**: [Feature Name]
**Date**: [Date]
**Agent**: [Agent ID]

### Verification Status

| Check | Status |
|-------|--------|
| QA GREEN | ☐ |
| Build passes | ☐ |
| Lint passes | ☐ |
| Routes work | ☐ |
| UI renders | ☐ |
| Forms function | ☐ |

### User Verification

**Verified by**: [User]
**Date**: [Date]
**Status**: ACCEPTED / REJECTED

**Notes**: [Any observations or issues]
```

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-25 | AI Agent | Initial architecture rules document |

---

**END OF ARCHITECTURE RULES DOCUMENT**

This document, in conjunction with `ARCHITECTURE.md`, serves as the True North for all development activities. All changes must be validated against these rules before deployment.
