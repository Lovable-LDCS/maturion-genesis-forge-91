# Sidebar Workflow Restructuring Summary

## Overview

The sidebar navigation has been restructured to align with the user workflow journey, from pre-subscription marketing pages through authenticated maturity roadmap development to admin-only system configuration.

## Changes at a Glance

### Before Restructuring

```
┌─────────────────────────────────────┐
│ SIDEBAR (Always visible when auth)  │
├─────────────────────────────────────┤
│ Main                                │
│  • Dashboard                        │
│  • Modules                          │
├─────────────────────────────────────┤
│ Assessment                          │
│  • Assessment                       │
│  • Maturity Setup                   │
│  • Assessment Framework             │
│  • QA Sign-Off                      │
├─────────────────────────────────────┤
│ Organization                        │
│  • Team                             │
│  • Organization Settings            │
├─────────────────────────────────────┤
│ Maturion                            │
│  • Knowledge Base                   │
│  • Uploads                          │
│  • Journey                          │
├─────────────────────────────────────┤
│ Admin (Admin-only)                  │
│  • Workflow Dashboard               │
│  • User Matrix                      │
│  • Admin Config                     │
│  • Health Checker                   │
├─────────────────────────────────────┤
│ Tools                               │
│  • Watchdog                         │
└─────────────────────────────────────┘

PUBLIC ROUTES (with sidebar):
• / (Landing)
• /journey (was authenticated)
```

### After Restructuring

```
┌─────────────────────────────────────┐
│ PRE-SUBSCRIPTION                    │
│ (Marketing pages - NO SIDEBAR)      │
├─────────────────────────────────────┤
│ Public Routes:                      │
│  • / (Landing page)                 │
│  • /journey (Maturity roadmap viz)  │
│  • /subscribe (Subscription)        │
│  • /subscribe/checkout (Payment)    │
│  • /auth (Login)                    │
│  • /accept-invitation (Invite)      │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ AUTHENTICATED USERS                 │
│ (Sidebar visible)                   │
├─────────────────────────────────────┤
│ Main                                │
│  • Dashboard                        │
│  • Modules                          │
├─────────────────────────────────────┤
│ Maturity Roadmap                    │
│ (User-accessible by assignment)     │
│  • Audit Structure Setup ⭐         │
│  • Assessment                       │
│  • Assessment Framework             │
│  • QA Sign-Off                      │
│  • Team                             │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ ADMIN-ONLY SECTIONS                 │
│ (Orange labels, gated access)       │
├─────────────────────────────────────┤
│ Maturion (AI Configuration)         │
│  • Knowledge Base                   │
│  • Uploads                          │
├─────────────────────────────────────┤
│ Settings (Organization)             │
│  • Settings (with hierarchy view)   │
├─────────────────────────────────────┤
│ Admin (System Administration)       │
│  • Workflow Dashboard               │
│  • User Matrix                      │
│  • Admin Config                     │
│  • Health Checker                   │
├─────────────────────────────────────┤
│ Watchdog (System Monitoring)        │
│  • Watchdog                         │
└─────────────────────────────────────┘

⭐ "Maturity Setup" renamed to "Audit Structure Setup"
   (becomes "Maturity Roadmap Evidence Management 
    Workflow" when published)
```

## Key Changes

### 1. Pre-Subscription Flow (No Sidebar)

**Purpose**: Optimize marketing pages for conversion

**Pages**:
- Landing page (/)
- Journey visualization (/journey) - **MOVED from authenticated**
- Subscribe pages (/subscribe, /subscribe/checkout)
- Authentication (/auth)
- Invitation acceptance (/accept-invitation)

**Impact**:
- Full-width layouts for better marketing UX
- No navigation distraction during signup flow
- Journey page now accessible without login for prospects

### 2. Maturity Roadmap Section

**Purpose**: Group all audit structure and evidence management workflow pages

**Renamed**:
- "Maturity Setup" → "Audit Structure Setup"
  - Once published, becomes "Maturity Roadmap Evidence Management Workflow"

**Grouped Together**:
- Audit Structure Setup
- Assessment
- Assessment Framework
- QA Sign-Off
- Team management

**Access**: User-accessible based on assignments (not admin-only)

### 3. Admin-Only Restructuring

**Purpose**: Clear separation of system administration functions

**Maturion Section** (AI Configuration):
- Moved from general user access to admin-only
- Contains AI knowledge base and document uploads

**Settings Section** (Organization Hierarchy):
- Replaces separate "Organization" category
- Includes organization settings with hierarchy matrix
- Shows signed-up organizations and subsidiary users

**Admin Section** (System Administration):
- Workflow Dashboard
- User Matrix (role-based permissions)
- Admin Config
- Health Checker (QA dashboard)

**Watchdog Section** (System Monitoring):
- Separated into its own admin-only section
- AI behavior monitoring and system drift detection

**Visual Distinction**:
- All admin sections have orange labels
- Gated by `useAdminAccess()` hook

### 4. Navigation Simplification

**Before**: 6 sidebar categories (mixed user/admin)
**After**: 2 user categories + 4 admin categories

**User sections** (always visible when authenticated):
- Main
- Maturity Roadmap

**Admin sections** (conditional, orange labels):
- Maturion
- Settings
- Admin
- Watchdog

## Technical Implementation

### Files Modified

1. **src/components/layout/AppSidebar.tsx**
   - Reorganized `navigationItems` array
   - Moved admin items to `adminNavigationItems`
   - Updated group filtering logic
   - Added orange styling to admin sections

2. **src/App.tsx**
   - Moved `/journey` from `<ProtectedRoute><AppLayout>` to public route
   - No longer wraps Journey page with AppLayout

3. **ARCHITECTURE.md**
   - Added "Navigation & Sidebar Architecture" section
   - Updated page inventory
   - Documented access control
   - Version bumped to 1.2

4. **qa/requirements.json**
   - Added WIRE-006: Sidebar Navigation Structure
   - Added WIRE-007: Admin Access Control
   - Version bumped to 1.2.0

### Access Control

**Admin Detection**:
```typescript
const { isAdmin } = useAdminAccess();
```

**Conditional Rendering**:
```typescript
{isAdmin && (
  <SidebarGroup>
    <SidebarGroupLabel className="text-orange-600">
      Admin
    </SidebarGroupLabel>
    {/* Admin items */}
  </SidebarGroup>
)}
```

### Build Verification

✅ **TypeScript Compilation**: No errors  
✅ **Vite Build**: Successful  
✅ **JSON Validation**: QA requirements valid

## Alignment with Requirements

### Requirement 1: Pre-subscription Pages (No Sidebar) ✅

- Landing page (/) - no sidebar ✅
- Journey page (/journey) - no sidebar ✅
- Other marketing pages - no sidebar ✅
- Navigation optimized for marketing ✅

### Requirement 2: Maturity Roadmap Section ✅

- Named "Maturity Roadmap" ✅
- Contains audit structure setup ✅
- Accessible by users based on assignments ✅
- Groups all evidence management workflow pages ✅

### Requirement 3: Admin-Only Sections ✅

**Maturion** (AI Configuration):
- Admin-only access ✅
- Contains Knowledge Base and Uploads ✅

**Organization**:
- Integrated into Settings ✅
- Includes hierarchy matrix view ✅
- No separate Organization category ✅

**Admin Pages**:
- Keep as is ✅
- Admin-only access ✅

**Watchdog**:
- Keep as is ✅
- Admin-only access ✅

## Testing Checklist

### Navigation Flow
- [ ] Landing page (/) displays without sidebar
- [ ] Journey page (/journey) displays without sidebar
- [ ] Subscribe pages display without sidebar
- [ ] Login redirects to Dashboard with sidebar
- [ ] All Maturity Roadmap pages accessible
- [ ] Navigation between pages works smoothly

### Admin Gating
- [ ] Admin sections hidden for non-admin users
- [ ] Admin sections visible for admin users
- [ ] Orange labels display on admin sections
- [ ] useAdminAccess() hook controls visibility

### Visual Verification
- [ ] Sidebar categories match workflow diagram
- [ ] "Audit Structure Setup" displays (not "Maturity Setup")
- [ ] Team appears in Maturity Roadmap section
- [ ] Organization Settings in Settings section (admin-only)
- [ ] Watchdog in its own section (admin-only)

### QA Dashboard
- [ ] Run Health Checker
- [ ] WIRE-006 check passes (sidebar structure)
- [ ] WIRE-007 check passes (admin gating)
- [ ] All navigation tests pass

## Benefits

1. **Workflow Alignment**: Sidebar structure follows user journey
2. **Marketing Optimization**: Pre-subscription pages optimized for conversion
3. **Clear Access Control**: Admin-only sections clearly distinguished
4. **Better Organization**: Logical grouping of related functionality
5. **Maintainability**: Fully documented and QA-validated structure

## Version History

| Version | Date | Change |
|---------|------|--------|
| 1.0 | Before | Original 6-category sidebar structure |
| 1.1 | 2025-11-23 | Restructured to workflow-based navigation |
| 1.2 | 2025-11-23 | Added QA requirements, updated architecture |

---

**Status**: ✅ Implementation Complete  
**Next**: User verification via UI testing
