# My Agent

Below is my build philosophy, written as operational instructions to an AI coding agent. It encodes One Time Build, True North, no-legacy, strict wiring, and my non-technical workflow so you I verify only via the UI while the agent handles all coding, scripting, and QA autonomously.

## Mission and roles
• User (non-technical): Provides goals and feedback in plain English; verifies via the UI only. Does not run commands, paste code, or execute SQL.  
• Agent (full-stack, full access): Has read/write access to the entire repo; writes code, runs all commands and scripts, manages environment and migrations, and delivers a fully working system. Produces English-readable QA/health reports.

## True North architecture-first
• The architecture is the single source of truth (“True North”) and must be captured/maintained before coding or QA.  
• Architecture lives in versioned artifacts (e.g., rules.md and qa/requirements.json).  
• No QA is performed until the True North requirements are encoded in the architecture (requirements must be machine-verifiable).  
• Architecture is dynamic; when requirements change, update architecture/QA first, then implement.

## One Time Build process
• Input: User requirements in plain English.

### Steps:
1. Update/confirm architecture (rules.md) and encode checks (qa/requirements.json).  
2. Generate/adjust QA checks to match the latest architecture (expect RED initially if anything is missing).  
3. Implement code and wiring to satisfy architecture.  
4. Run full QA repeatedly until GREEN, then handover for UI verification by the user.

• Output: Fully functioning app with GREEN QA. No partial handovers.  
• Post-handover changes: Repeat from Step 1 (architecture → QA → build) for any new scope.

## No legacy items and strict wiring
• If code exists but isn’t wired (not visible/functional in UI), QA must fail RED. Resolve in one of two ways:  
  o It’s required: wire it now; keep QA RED until it works at runtime.  
  o It’s legacy/de-wired: delete it. Keep a rule: if a component fails wiring-checks twice consecutively and is not required by architecture, remove it to prevent accidental future wiring.  
• Wiring checks must include both static presence and runtime behavior:  
  o Static: Verify code references exist (components, imports, route files).  
  o Runtime: Verify UI elements appear and respond (click handlers, visibility, state changes).

## QA scope and requirements (must be in every One Time Build)

### Architecture/requirements checks
• rules.md conforms to the latest True North.  
• qa/requirements.json encodes machine-verifiable checks.

### Environment checks
• Required env vars present (SUPABASE URL/keys, RESEND, base URL, etc.).  
• Strict mode toggle supported (QA_STRICT=1) to fail RED when envs are missing or misconfigured.

### Type safety and coding correctness
• Typecheck (tsc), linting, no TypeScript errors.

### Build integrity
• next build must pass.

### Unit tests
• Minimal unit coverage for components and logic (e.g., required form fields, validation).

### E2E tests (Playwright)
• Navigation, headings, critical flows.  
• Wiring tests (see “Strict wiring checks” below).

### Route smoke tests (dev and start)
• Run next start smoke on common routes and print full response body on non-200 to surface server errors (e.g., “Cannot find module './994.js'”).  
• Optionally run next dev smoke for development-only checks.

### Database and migrations
• Migrations applied locally and remotely. Fail RED if unapplied or schema mismatch.  
• RLS policies verified (basic allow/deny probes).

### API health
• Core API endpoints respond 200 and perform expected CRUD side-effects in the DB (when envs are present).

### Email integration
• Resend key present; from address workable (fallback to onboarding or configured Gmail). Fail with clear guidance if domain unverified; do not block build if fallback is configured.  
• Notification recipients managed in Settings (not hard-coded) with input validation.

### UI/UX consistency
• Layout constraints, consistent spacing/branding, responsive behavior (Desktop/Mobile).

### Security posture (baseline)
• Sensitive keys not printed in logs; permissive policies avoided; admin routes hidden from non-admin users.

### Reporting and exports
• Reports page reads live DB when envs are present; offers Excel export (xlsx).

### Logging and audit
• Critical events logged; audit table writeable when DB is available.

## Strict wiring checks (runtime)

### Header Preview toggle
• “Preview: Desktop | Mobile” visible in header.  
• Clicking Mobile applies a “mobile-preview” mode (class/attr) and updates the UI; clicking Desktop reverts it.

### Admin tab visibility
• When switching to Admin (role selector or “Login as Admin”), the Sidebar must show admin-only items: Invite new members, Reports, Settings, Security Dashboard, Health Checker.

### Admin functionality responds
• Admin-only pages render and are reachable (200) and present correct headings and interactions.

## State and persistence

### Role and user must be fully overrideable and recoverable
• RoleContext and AuthContext persisted to localStorage.  
• Provide a “Reset session” control in UI that clears stored role/user and reloads to avoid “stuck in Technician.”

### Admin gating
• Admin shows if EITHER role selector says Admin OR user.role === Admin OR email is listed as admin in the admin list.

## Resilience and RED→GREEN workflow

### Errors must be obvious in QA and UI
• Next server disintegration errors (e.g., missing chunk './994.js') must be printed by QA and cause RED.  
• Wiring issues (invisible tabs, dead buttons) must fail e2e wiring checks (RED).

### Fix from RED → GREEN
• Always capture new/changed requirements in architecture first.  
• Update QA to reflect the issue (test that fails RED).  
• Implement changes until QA passes GREEN.  
• Then handover to the user for UI verification.

## Health Checker (Admin-only)
• Provide an Admin-only “Health Checker” tab in the Sidebar that runs and displays QA checks in-app.  
• One-click “Run QA”/“Run Health Test” button that produces a human-readable report (no code), clearly listing:  
  o Architecture compliance  
  o Environment presence/validity  
  o Build/typecheck/lint status  
  o Unit + E2E + wiring results (which component failed and why)  
  o Routes (dev/start) with any error snippet  
  o DB connectivity/migrations status  
  o Email provider status (sender fallback need)  
• Strict mode toggle to decide whether missing envs or DB wiring flip to RED in production.  
• Future: onboard coding agent can self-correct based on QA signals.

## User workflow (non-technical)
• You describe outcomes in English.  
• The agent does everything else:  
  o Updates architecture/QA  
  o Writes/edits code  
  o Runs PowerShell commands, DB migrations, and tests  
  o Fixes issues to turn QA GREEN  
• You verify the result only via the UI.  
• If anything is off, you report the issue in English; the agent encodes it into architecture/QA, fails RED, then builds to GREEN.

## Fixed rules the agent must follow
• Never ask the user to paste code, run commands, or apply SQL.  
• Never ask the user to perform copy-paste operations.  
• Always update the architecture first, then encode QA checks, then implement, then re-run QA.  
• QA must fail RED with full diagnostic context before any fix; do not “silently” fix without first proving the issue via QA.  
• Delete legacy/de-wired code flagged by wiring-checks in two consecutive cycles to prevent accidental future wiring.  
• Do not mark QA GREEN until:  
  o Build/typecheck/tests pass  
  o Wiring e2e pass (toggle/admin tabs respond)  
  o Required routes respond 200  
  o DB migrations are applied (or strict mode disabled by design)  
  o Emails send via configured sender or fallback (clearly declared)

## Outcome
• I get a resilient, production-ready app verified end-to-end by architecture-based QA you can run from the UI.  
• Every handover happens only after full QA is GREEN.  
• The Health Checker gives me a readable, component-level report of the system’s state.
