# Maturion ISMS Workflow Design

## Overview
This document defines the Integrated Security Management System (ISMS) workflow for the Maturion Genesis Forge application. The workflow guides administrators through the complete lifecycle of security and maturity assessment management.

## Organizational Hierarchy

### Structure Levels
1. **Backoffice/Global (APGI)** - Overarching organization providing best practices
2. **Mother Companies** - Primary organizations under APGI
3. **Sister Companies** - (Future) Organizations at same level as Mother Companies
4. **Subsidiaries** - (Future) Organizations under Mother/Sister Companies
5. **Departments** - Sub-units within organizations

### Current Implementation
- **APGI**: Backoffice/Global level - superuser access
- **Mother Companies**: Organizations with `organization_level: 'parent'`
- **Future**: Sister companies and subsidiaries support planned

## ISMS Workflow Phases

### Phase 1: Initial Setup & Configuration
**Purpose:** Establish foundational organizational structure and admin access

**Steps:**
1. **Admin Onboarding**
   - Create admin user account
   - Assign to APGI (backoffice) or Mother Company
   - Configure admin permissions and roles

2. **Organization Configuration**
   - Set up Mother Company profile
   - Define organizational branding
   - Configure contact information
   - Establish organizational hierarchy

3. **User Field Matrix Setup**
   - Define user roles (Owner, Admin, Technician, Viewer)
   - Configure field-level permissions
   - Set up organizational access levels
   - Define approval workflows

**Routes:**
- `/admin/config` - Admin configuration
- `/organization/settings` - Organization setup
- `/team` - Team management

**Status Indicator:** Setup Progress (0-100%)

---

### Phase 2: Assessment Framework Definition
**Purpose:** Configure assessment criteria and maturity framework

**Steps:**
1. **Domain Configuration**
   - Define assessment domains (6 core domains)
   - Configure domain-specific criteria
   - Set up maturity levels per domain
   - Establish scoring methodology

2. **Framework Customization**
   - Import standard frameworks
   - Customize criteria for organization
   - Define threshold levels
   - Configure weighting factors

3. **Knowledge Base Setup**
   - Upload reference documents
   - Configure AI knowledge base
   - Set up document categorization
   - Enable AI-powered insights

**Routes:**
- `/assessment/framework` - Framework configuration
- `/maturity/setup` - Maturity level setup
- `/maturion/knowledge-base` - Knowledge base management
- `/maturion/uploads` - Document uploads

**Status Indicator:** Framework Configuration (0-100%)

---

### Phase 3: Team & Access Management
**Purpose:** Invite team members and configure access controls

**Steps:**
1. **Team Invitation**
   - Send invitations to team members
   - Assign roles and permissions
   - Configure organizational access
   - Set up approval chains

2. **Access Matrix Configuration**
   - Define role-based access controls
   - Configure field-level permissions
   - Set up data visibility rules
   - Establish cross-organization access

3. **Approval Workflow Setup**
   - Define approval hierarchies
   - Configure workflow stages
   - Set up notification rules
   - Establish escalation policies

**Routes:**
- `/team` - Team management
- `/admin/config` - Access configuration
- `/organization/settings` - Organizational access

**Status Indicator:** Team Setup (0-100%)

---

### Phase 4: Assessment Execution
**Purpose:** Conduct maturity assessments and gather evidence

**Steps:**
1. **Assessment Initialization**
   - Select assessment domains
   - Configure assessment scope
   - Assign assessors
   - Set timeline and milestones

2. **Evidence Collection**
   - Submit evidence documents
   - Link evidence to criteria
   - Capture assessment notes
   - Document findings

3. **Scoring & Evaluation**
   - Review assessment responses
   - Apply scoring methodology
   - Calculate maturity scores
   - Generate preliminary results

**Routes:**
- `/assessment` - Assessment execution
- `/dashboard` - Assessment overview
- `/modules` - Module-based assessment

**Status Indicator:** Assessment Progress (0-100%)

---

### Phase 5: Review & Sign-Off
**Purpose:** Review assessment results and obtain approvals

**Steps:**
1. **Results Review**
   - Review assessment scores
   - Validate findings
   - Identify gaps and issues
   - Document recommendations

2. **QA Sign-Off**
   - Quality assurance review
   - Compliance validation
   - Evidence verification
   - Stakeholder review

3. **Final Approval**
   - Management review
   - Approval workflow execution
   - Sign-off documentation
   - Results publication

**Routes:**
- `/qa-signoff` - QA sign-off workflow
- `/qa-dashboard` - QA dashboard
- `/admin/health-checker` - System health validation

**Status Indicator:** Review & Approval (0-100%)

---

### Phase 6: Continuous Monitoring
**Purpose:** Monitor ongoing compliance and maturity improvements

**Steps:**
1. **Watchdog Monitoring**
   - Real-time compliance monitoring
   - Automated alerts and notifications
   - Drift detection
   - Incident management

2. **Journey Tracking**
   - Track maturity journey
   - Monitor improvement initiatives
   - Measure progress over time
   - Generate trend reports

3. **Periodic Reviews**
   - Schedule reassessments
   - Update frameworks
   - Refresh evidence
   - Continuous improvement

**Routes:**
- `/watchdog` - Watchdog monitoring
- `/journey` - Maturity journey
- `/dashboard` - Progress dashboard

**Status Indicator:** Monitoring Active

---

## User Field Matrix

### Role Definitions

| Role | Level | Permissions | Organizational Scope |
|------|-------|-------------|---------------------|
| **Superuser** | Backoffice | Full access to all features and organizations | Global (APGI) |
| **Owner** | Organization | Full access within organization and subsidiaries | Single org + children |
| **Admin** | Organization | Configuration and team management | Single org + children |
| **Technician** | Organization | Assessment execution and evidence submission | Single org |
| **Viewer** | Organization | Read-only access to results | Single org |

### Field-Level Permissions Matrix

| Feature/Field | Superuser | Owner | Admin | Technician | Viewer |
|---------------|-----------|-------|-------|------------|--------|
| **Organization Settings** |
| Edit org profile | ✓ | ✓ | ✓ | ✗ | ✗ |
| Manage branding | ✓ | ✓ | ✓ | ✗ | ✗ |
| Delete organization | ✓ | ✓ | ✗ | ✗ | ✗ |
| **Team Management** |
| Invite members | ✓ | ✓ | ✓ | ✗ | ✗ |
| Assign roles | ✓ | ✓ | Limited | ✗ | ✗ |
| Remove members | ✓ | ✓ | ✓ | ✗ | ✗ |
| **Assessment Framework** |
| Configure domains | ✓ | ✓ | ✓ | ✗ | ✗ |
| Edit criteria | ✓ | ✓ | ✓ | ✗ | ✗ |
| Import frameworks | ✓ | ✓ | ✓ | ✗ | ✗ |
| **Assessment Execution** |
| Create assessment | ✓ | ✓ | ✓ | ✓ | ✗ |
| Submit evidence | ✓ | ✓ | ✓ | ✓ | ✗ |
| Score responses | ✓ | ✓ | ✓ | ✓ | ✗ |
| View results | ✓ | ✓ | ✓ | ✓ | ✓ |
| **QA & Approval** |
| QA sign-off | ✓ | ✓ | ✓ | ✗ | ✗ |
| Final approval | ✓ | ✓ | ✗ | ✗ | ✗ |
| Publish results | ✓ | ✓ | ✗ | ✗ | ✗ |
| **Admin Functions** |
| System config | ✓ | ✗ | ✗ | ✗ | ✗ |
| Health checker | ✓ | ✓ | ✗ | ✗ | ✗ |
| Watchdog setup | ✓ | ✓ | ✓ | ✗ | ✗ |

### Organizational Access Rules

1. **Backoffice (APGI)**
   - Access: All organizations and best practices
   - Visibility: Global view across all Mother Companies
   - Permissions: Full system administration

2. **Mother Company**
   - Access: Own organization and future subsidiaries
   - Visibility: Own data and aggregated subsidiary data
   - Permissions: Organization-level administration

3. **Future: Sister Company**
   - Access: Own organization and future subsidiaries
   - Visibility: Own data only (isolated from other sisters)
   - Permissions: Organization-level administration

4. **Future: Subsidiary**
   - Access: Own organization only
   - Visibility: Own data, limited parent visibility
   - Permissions: Limited administration

## Workflow Integration in Sidebar

### Admin Section Structure
```
Admin (Admin-only)
├── Workflow Dashboard (NEW)
│   └── Shows current phase and progress
├── Admin Config
│   └── System configuration and permissions
├── Health Checker
│   └── System health and QA validation
└── Security Dashboard (Future)
    └── Security monitoring and alerts
```

### Workflow Progress Indicator
- Visual progress bar showing completion across phases
- Current phase highlighted
- Phase-specific quick actions
- Next steps recommendations

## Implementation Notes

### Database Schema Requirements
- Existing: `organizations` table with `organization_level` field
- Existing: `organization_members` table with role management
- Future: Enhanced permission matrix table
- Future: Workflow state tracking table

### UI Components Needed
1. Workflow Dashboard (new)
2. User Field Matrix Viewer (new)
3. Progress Indicator Component (new)
4. Phase Navigation Component (new)
5. Updated AppSidebar with workflow section

### Routes to Add
- `/admin/workflow` - Workflow dashboard
- `/admin/user-matrix` - User field matrix management
- `/admin/permissions` - Permission configuration

## Success Criteria

1. **Admin can navigate workflow phases** - Clear visual indication of current phase
2. **Phase completion tracked** - Progress indicators show status
3. **Role-based access enforced** - Field matrix controls visibility
4. **Organizational hierarchy respected** - APGI > Mother > (Future) Sister/Subsidiary
5. **Workflow state persisted** - Progress saved and recoverable

## Future Enhancements

1. **Sister Company Support** - Add peer-level organizations
2. **Subsidiary Management** - Full subsidiary hierarchy
3. **Automated Workflow Triggers** - Auto-advance based on completion
4. **Workflow Templates** - Pre-configured workflow paths
5. **Custom Workflow Designer** - Allow workflow customization
6. **Workflow Analytics** - Track time per phase, bottlenecks
7. **Multi-tenancy** - Complete isolation between sister companies
