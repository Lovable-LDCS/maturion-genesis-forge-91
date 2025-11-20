# QA System - Implementation Guide

## Overview

This QA system implements the "True North" philosophy where architecture (ARCHITECTURE.md) is the single source of truth, and QA validates the implementation against it.

## Files

### 1. requirements.json
Machine-verifiable QA requirements organized by category:
- **architecture_compliance**: Validates code matches ARCHITECTURE.md
- **wiring_verification**: Ensures all components are properly wired
- **legacy_detection**: Identifies orphaned/unused components
- **build_integrity**: Validates TypeScript, build, and linting
- **environment_checks**: Validates environment configuration
- **database_integrity**: Validates database schema and migrations
- **api_health**: Validates API endpoints and Edge Functions
- **security_posture**: Validates security measures
- **ui_consistency**: Validates UI/UX standards
- **documentation**: Validates documentation quality

## QA Execution Workflow

### Step 1: Architecture Validation
```bash
# Verify ARCHITECTURE.md exists and is current
# Check all documented components exist
# Verify route definitions match implementation
```

### Step 2: Build Validation
```bash
# Run TypeScript compilation
npm run tsc --noEmit

# Run linting
npm run lint

# Run production build
npm run build
```

### Step 3: Wiring Validation
```bash
# Static wiring: Check all components are imported
# Runtime wiring: Verify UI elements render and respond
# Navigation: Test all routes are accessible
```

### Step 4: Legacy Detection
```bash
# Scan for orphaned components (not imported)
# Scan for unused pages (not in routes)
# Scan for components not in ARCHITECTURE.md
# Mark for review or deletion
```

### Step 5: Security & Database Validation
```bash
# Check for secrets in code
# Verify RLS policies
# Check database connectivity
# Validate migrations applied
```

## RED/GREEN Status

### RED Indicators
- Build fails
- TypeScript errors
- Critical wiring failures
- Security vulnerabilities
- Missing required environment variables
- Database connectivity issues (strict mode)
- Components not wired and not in architecture

### GREEN Indicators
- All builds pass
- No TypeScript errors
- All routes accessible
- All components wired or documented
- Security checks pass
- Database healthy (or strict mode disabled)
- Documentation up to date

## Implementation Status

### ✅ Completed
- [x] ARCHITECTURE.md - Comprehensive architecture document
- [x] qa/requirements.json - Machine-verifiable requirements
- [x] Agent configuration updated

### 🔄 In Progress
- [ ] Architecture compliance checker
- [ ] Wiring verification tool
- [ ] Legacy component detector
- [ ] Health Checker UI component

### 📋 Planned
- [ ] Automated QA execution script
- [ ] CI/CD integration
- [ ] Real-time wiring monitor
- [ ] Component usage analytics

## Usage

### Manual QA Run
1. Review ARCHITECTURE.md for current state
2. Run build validation: `npm run build`
3. Run linting: `npm run lint`
4. Check component wiring status
5. Review qa/requirements.json for any failures
6. Fix issues until all checks are GREEN

### Automated QA (Future)
```bash
# Run full QA cycle
npm run qa:full

# Run specific category
npm run qa:wiring
npm run qa:security
npm run qa:architecture

# Generate QA report
npm run qa:report
```

### Health Checker UI (Future)
- Navigate to /admin/health-checker (admin only)
- Click "Run QA" button
- View human-readable report
- See component-level failure details
- Toggle strict mode for production validation

## Integration with Custom Agent

The custom agent (configured in .github/agents/my-agent.agent.md) should:

1. **Read** ARCHITECTURE.md as True North
2. **Read** qa/requirements.json for validation rules
3. **Execute** QA checks before handover
4. **Auto-correct** based on QA failures
5. **Report** status through Health Checker UI

### Agent Workflow
```
User Request (Plain English)
        ↓
Agent Updates ARCHITECTURE.md
        ↓
Agent Updates qa/requirements.json
        ↓
Agent Generates QA Checks (Expect RED if incomplete)
        ↓
Agent Implements Code
        ↓
Agent Runs QA
        ↓
    RED? → Agent Fixes → Repeat
        ↓
    GREEN? → Handover to User
        ↓
User Verifies in UI
```

## Legacy Component Detection Rules

### Rule 1: Import Check
- Component file exists but not imported → WARN
- Warning persists 2 cycles → MARK FOR DELETION

### Rule 2: Route Check
- Page component not in routes.ts → WARN
- Warning persists 2 cycles → MARK FOR DELETION

### Rule 3: Architecture Sync
- Component not in ARCHITECTURE.md → WARN
- If intentionally excluded → Document in exclusions
- Otherwise → MARK FOR DELETION

### Grace Period
Components get **2 QA cycles** to be either:
1. Properly wired and documented
2. Added to architecture with justification
3. Deleted as legacy/unused

## Wiring Requirements

### Static Wiring
Components must have:
- Import statement somewhere in codebase
- Usage in a parent component or route
- Type definitions if TypeScript

### Runtime Wiring
Components must:
- Render without errors
- Be visible in UI (when route/condition met)
- Respond to user interactions
- Update state correctly

## Strict Mode

When `QA_STRICT=1` is set:
- Missing environment variables → RED
- Database connectivity issues → RED
- Optional dependencies missing → RED
- Any warnings treated as failures

When strict mode disabled (default):
- Missing optional envs → YELLOW
- Database connectivity → YELLOW if no strict requirement
- Warnings → Info only

## Reporting

### Console Report Format
```
=== QA REPORT ===
Status: RED/YELLOW/GREEN

Architecture Compliance: ✅ GREEN
  - All routes defined: PASS
  - All components exist: PASS
  - Documentation current: PASS

Build Integrity: ✅ GREEN
  - TypeScript: PASS
  - Build: PASS
  - Linting: PASS (3 warnings)

Wiring Verification: ❌ RED
  - Static wiring: PASS
  - Runtime wiring: FAIL
    * Component: AdminHealthChecker
    * Issue: Not accessible in sidebar
    * Route: /admin/health-checker
    * Fix: Add to sidebar navigation

Legacy Detection: ⚠️ YELLOW
  - Orphaned components: 2 found
    * TestComponent1 (cycle 1)
    * OldFeature (cycle 2) → MARKED FOR DELETION

Overall: ❌ RED - Fix wiring issues before deployment
```

### UI Report Format
Human-readable dashboard with:
- Overall status badge (RED/YELLOW/GREEN)
- Category breakdown
- Component-level issues
- Recommended fixes
- Historical trends

## Best Practices

1. **Always update ARCHITECTURE.md first** before implementing features
2. **Run QA after every significant change** to catch issues early
3. **Fix RED issues immediately** before continuing development
4. **Document intentional exclusions** to avoid false positives
5. **Use grace period wisely** - don't let components linger unwired
6. **Review QA reports** before every deployment
7. **Keep strict mode enabled** in production environments

## Troubleshooting

### Common Issues

**Issue**: Build passes but QA shows RED
**Solution**: Check wiring verification - components may exist but not be accessible

**Issue**: Component marked as orphaned but it's used
**Solution**: Update ARCHITECTURE.md to document the component

**Issue**: QA takes too long to run
**Solution**: Use category-specific checks instead of full QA for iteration

**Issue**: Too many false positives
**Solution**: Review and update exclusion lists in requirements.json

## Future Enhancements

1. **Automated Fixing**: Agent auto-wires components or marks for deletion
2. **Visual Wiring Map**: Graph showing component dependencies
3. **Usage Analytics**: Track which components are most/least used
4. **Performance Metrics**: Monitor QA execution time and optimize
5. **Integration Testing**: Add E2E tests for critical flows
6. **Continuous QA**: Real-time monitoring during development

---

**Remember**: QA is not a blocker - it's a guide. RED means "needs attention", not "stop everything". The goal is continuous improvement toward GREEN, with architecture as the North Star.
