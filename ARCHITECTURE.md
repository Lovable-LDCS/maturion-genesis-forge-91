# Maturion Genesis Forge - Comprehensive Architecture Document

**Version:** 1.0  
**Date:** 2025-11-20  
**Status:** True North Reference

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Architecture Principles](#architecture-principles)
4. [Technology Stack](#technology-stack)
5. [Application Structure](#application-structure)
6. [Domain Architecture](#domain-architecture)
7. [UI/UX Components](#uiux-components)
8. [Data Architecture](#data-architecture)
9. [Integration Architecture](#integration-architecture)
10. [Security Architecture](#security-architecture)
11. [Deployment Architecture](#deployment-architecture)
12. [QA & Testing Strategy](#qa--testing-strategy)
13. [Component Inventory & Wiring](#component-inventory--wiring)
14. [Custom Agent Integration](#custom-agent-integration)
15. [Build & Development Guidelines](#build--development-guidelines)

---

## Executive Summary

**Maturion Genesis Forge** is a comprehensive enterprise maturity assessment and compliance management platform. The system enables organizations to assess operational maturity across six core domains, manage compliance milestones, track progress, and leverage AI-powered assistance through the Maturion AI assistant.

### Core Purpose
- **Maturity Assessment**: Evaluate organizational maturity using the Six Domains framework
- **Compliance Management**: Track and manage compliance milestones and requirements
- **AI-Powered Insights**: Leverage document analysis and AI reasoning for recommendations
- **Team Collaboration**: Multi-organization hierarchy with role-based access control
- **Quality Assurance**: Comprehensive QA workflows ensuring system integrity

### Key Metrics
- **29 Pages**: Complete application with public and authenticated routes
- **196 UI Components**: Modular, reusable component architecture
- **44 Custom Hooks**: Business logic encapsulation
- **54 Edge Functions**: Serverless backend processing
- **17 Component Categories**: Feature-based organization
- **6 Assessment Domains**: Core maturity evaluation framework

---

## System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  React SPA (Vite + TypeScript)                           │   │
│  │  - React Router v6 (BrowserRouter)                       │   │
│  │  - TanStack Query (State Management)                     │   │
│  │  - shadcn/ui Components                                  │   │
│  │  - Tailwind CSS                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓ ↑
┌─────────────────────────────────────────────────────────────────┐
│                      INTEGRATION LAYER                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Supabase Client SDK                                     │   │
│  │  - Authentication                                        │   │
│  │  - Real-time Subscriptions                              │   │
│  │  - Database Queries                                      │   │
│  │  - Storage API                                           │   │
│  │  - Edge Functions RPC                                    │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓ ↑
┌─────────────────────────────────────────────────────────────────┐
│                       BACKEND LAYER                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐  │
│  │  PostgreSQL DB  │  │  Edge Functions │  │  File Storage  │  │
│  │  - RLS Policies │  │  - 54 Functions │  │  - Documents   │  │
│  │  - Triggers     │  │  - AI Chat      │  │  - Branding    │  │
│  │  - Functions    │  │  - Processing   │  │  - Uploads     │  │
│  └─────────────────┘  └─────────────────┘  └────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓ ↑
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                             │
│  - OpenAI API (AI Chat & Embeddings)                            │
│  - External Data Sources (PostgreSQL, MySQL, APIs)              │
│  - Email Services (Invitations, Notifications)                  │
│  - Webhook Integrations                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Architecture Principles

### 1. True North Philosophy
- **Architecture as Source of Truth**: All development follows the architecture document
- **Architecture-First Development**: Update architecture before implementing features
- **QA Alignment**: QA systems validate against architectural requirements
- **No Legacy Components**: Unused components must be removed or wired

### 2. One Time Build Process
1. Define/update architecture requirements
2. Encode requirements in QA system
3. Implement features to satisfy architecture
4. Run QA until GREEN
5. Handover to user for UI verification

### 3. Strict Wiring Requirements
- **All components must be wired**: No orphaned components allowed
- **Static Wiring**: Code references, imports, route files must exist
- **Runtime Wiring**: UI elements must appear and respond in the application
- **Failure Handling**: Unwired components for 2+ cycles → DELETE

### 4. Quality Assurance Gates
- No deployment without GREEN QA
- QA must validate:
  - Architecture compliance
  - Build integrity
  - Wiring verification
  - Security posture
  - Database integrity
  - API health

---

## Technology Stack

### Frontend Core
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.3.1 | UI framework with hooks and concurrent features |
| TypeScript | 5.5.3 | Type-safe development |
| Vite | 5.4.1 | Build tool and dev server |
| React Router | 6.26.2 | Client-side routing (BrowserRouter) |
| Tailwind CSS | 3.4.11 | Utility-first styling |

### State Management
| Technology | Version | Purpose |
|------------|---------|---------|
| TanStack React Query | 5.56.2 | Async state management & caching |
| React Context API | Built-in | Global state (Auth, Organization) |
| React Hook Form | 7.53.0 | Form state management |
| Zod | 3.23.8 | Schema validation |

### UI Component Library
| Technology | Version | Purpose |
|------------|---------|---------|
| shadcn/ui | Latest | Base component library |
| Radix UI | Various | Accessible component primitives (40+ packages) |
| Lucide React | 0.462.0 | Icon library |
| Recharts | 2.12.7 | Data visualization |

### Backend & Services
| Technology | Version | Purpose |
|------------|---------|---------|
| Supabase | 2.57.4 | Backend-as-a-Service |
| PostgreSQL | 14+ | Primary database |
| Supabase Auth | Built-in | Authentication & authorization |
| Supabase Storage | Built-in | File storage |
| Edge Functions | Deno | Serverless compute |

### Additional Libraries
| Technology | Version | Purpose |
|------------|---------|---------|
| DOMPurify | 3.2.6 | XSS protection |
| mammoth | 1.8.0 | Word document processing |
| date-fns | 3.6.0 | Date manipulation |
| colord | 2.9.3 | Color manipulation |
| Sonner | 1.5.0 | Toast notifications |

### Development Tools
| Technology | Version | Purpose |
|------------|---------|---------|
| ESLint | 9.9.0 | Code linting |
| TypeScript ESLint | 8.0.1 | TypeScript-specific linting |
| PostCSS | 8.4.47 | CSS processing |
| Autoprefixer | 10.4.20 | CSS vendor prefixes |

---

## Application Structure

### Directory Organization

```
maturion-genesis-forge-91/
├── .github/
│   ├── agents/
│   │   └── my-agent.agent.md          # Custom agent configuration
│   └── workflows/
│       ├── db-push.yml                 # Database migration workflow
│       └── deploy-gh-pages.yml         # GitHub Pages deployment
├── docs/
│   ├── API_DOCUMENTATION.md            # API reference
│   ├── SECURITY.md                     # Security guidelines
│   └── [other documentation]
├── public/                             # Static assets
├── src/
│   ├── components/                     # 17 feature categories
│   │   ├── admin/                      # Admin tools
│   │   ├── ai/                         # AI chat & document processing
│   │   ├── assessment/                 # Assessment frameworks
│   │   ├── auth/                       # Authentication
│   │   ├── checkout/                   # Payment & subscriptions
│   │   ├── diagnostics/                # System diagnostics
│   │   ├── layout/                     # Layout components
│   │   ├── milestones/                 # Milestone tracking
│   │   ├── organization/               # Org management
│   │   ├── qa/                         # QA tools & workflows
│   │   ├── security/                   # Security dashboard
│   │   ├── team/                       # Team management
│   │   ├── test/                       # Test utilities
│   │   ├── ui/                         # shadcn/ui base components
│   │   ├── watchdog/                   # System monitoring
│   │   └── webhook/                    # Webhook integrations
│   ├── contexts/                       # React contexts
│   │   ├── AuthContext.tsx             # Authentication state
│   │   └── OrganizationContext.tsx     # Organization state
│   ├── hooks/                          # 44 custom hooks
│   ├── integrations/                   # External integrations
│   │   └── supabase/
│   │       ├── client.ts               # Supabase client
│   │       └── types.ts                # Database types
│   ├── lib/                            # Utilities & helpers
│   │   ├── routes.ts                   # Route constants
│   │   └── [other utilities]
│   ├── pages/                          # 29 page components
│   ├── App.tsx                         # Root component
│   ├── main.tsx                        # Entry point
│   └── index.css                       # Global styles
├── supabase/
│   ├── functions/                      # 54 Edge Functions
│   └── migrations/                     # Database migrations
├── ARCHITECTURE.md                     # This document (True North)
├── package.json                        # Dependencies
├── tsconfig.json                       # TypeScript config
├── vite.config.ts                      # Vite configuration
└── tailwind.config.ts                  # Tailwind configuration
```

---

## Domain Architecture

### Six Domains Framework

The application is built around six core domains of operational excellence:

#### 1. Leadership & Governance
**Purpose**: Strategic oversight, policy framework, decision-making structures

**Components**:
- Policy management
- Governance frameworks
- Leadership assessment criteria
- Compliance tracking

**Pages**:
- Dashboard (overview)
- Assessment Framework
- Domain Audit Builder

**Database Tables**:
- `domains` (domain_id: 'leadership-governance')
- `criteria`
- `mps_criteria`
- `assessments`

#### 2. Process Integrity
**Purpose**: Systematic workflows, quality controls, process documentation

**Components**:
- Process documentation
- Workflow management
- Quality control systems
- Process assessment

**Pages**:
- Process Integrity Audit Builder
- Assessment

**Database Tables**:
- `domains` (domain_id: 'process-integrity')
- `criteria`
- `process_documents`

#### 3. People & Culture
**Purpose**: Team development, organizational values, human resources

**Components**:
- Team management
- Culture assessment
- Training programs
- Performance evaluation

**Pages**:
- Team Page
- Organization Settings
- Journey (onboarding)

**Database Tables**:
- `users`
- `organization_members`
- `teams`

#### 4. Protection
**Purpose**: Risk mitigation, security measures, compliance

**Components**:
- Security dashboard
- Risk assessment
- Compliance monitoring
- Protection measures

**Pages**:
- Admin Security Dashboard
- Protection Audit Builder
- Watchdog Dashboard

**Database Tables**:
- `security_logs`
- `watchdog_incidents`
- `compliance_records`

#### 5. Proof it Works
**Purpose**: Performance metrics, validation, evidence collection

**Components**:
- Evidence management
- Performance tracking
- Validation workflows
- Metrics collection

**Pages**:
- QA Sign Off
- QA Dashboard
- Test Suite

**Database Tables**:
- `evidence`
- `validation_results`
- `qa_logs`

#### 6. Performance
**Purpose**: Continuous improvement, optimization, measurement

**Components**:
- Performance metrics
- Improvement tracking
- Optimization tools
- Analytics

**Pages**:
- Dashboard
- Modules Overview
- Assessment

**Database Tables**:
- `performance_metrics`
- `improvement_plans`
- `analytics_events`

---

## UI/UX Components

### Page Inventory (29 Pages)

#### Public Routes (No Authentication Required)
| Route | Page Component | Purpose | Wiring Status |
|-------|---------------|---------|---------------|
| `/` | Index.tsx | Landing page with domain overview | ✅ Wired |
| `/auth` | LoginForm | User authentication | ✅ Wired |
| `/accept-invitation` | InvitationAcceptance | Team invitation acceptance | ✅ Wired |
| `/subscribe` | Subscribe.tsx | Subscription landing | ✅ Wired |
| `/subscribe/checkout` | SubscribeCheckout.tsx | Payment checkout | ✅ Wired |

#### Authenticated Routes (Require Login + AppLayout)
| Route | Page Component | Purpose | Wiring Status |
|-------|---------------|---------|---------------|
| `/modules` | ModulesOverview.tsx | Module selection | ✅ Wired |
| `/dashboard` | Dashboard.tsx | Main dashboard | ✅ Wired |
| `/maturity/setup` | MaturitySetup.tsx | Maturity model setup | ✅ Wired |
| `/assessment` | Assessment.tsx | Assessment interface | ✅ Wired |
| `/assessment/framework` | AuditStructureConfig.tsx | Framework configuration | ✅ Wired |
| `/audit/domain/:domainId` | DomainAuditBuilder.tsx | Domain audit builder | ✅ Wired |
| `/assessment-framework` | AssessmentFramework.tsx | Framework management | ✅ Wired |
| `/domain-management` | AssessmentFramework.tsx | Domain management | ✅ Wired (alias) |

#### Team & Organization Routes
| Route | Page Component | Purpose | Wiring Status |
|-------|---------------|---------|---------------|
| `/team` | TeamPage.tsx | Team management | ✅ Wired |
| `/organization/settings` | OrganizationSettings.tsx | Org settings | ✅ Wired |
| `/journey` | Journey.tsx | Onboarding journey | ✅ Wired |

#### AI & Knowledge Routes
| Route | Page Component | Purpose | Wiring Status |
|-------|---------------|---------|---------------|
| `/maturion/knowledge-base` | MaturionKnowledgeBase.tsx | Knowledge base | ✅ Wired |
| `/maturion/uploads` | MaturionUploads.tsx | Document uploads | ✅ Wired |
| `/data-sources` | DataSourcesManagement.tsx | Data source config | ✅ Wired |

#### QA & Admin Routes
| Route | Page Component | Purpose | Wiring Status |
|-------|---------------|---------|---------------|
| `/qa-dashboard` | QADashboard.tsx | QA tools dashboard | ✅ Wired |
| `/qa-signoff` | QASignOffDynamic.tsx | QA sign-off workflows | ✅ Wired |
| `/qa-test-dashboard` | QATestDashboard.tsx | Test dashboard | ✅ Wired |
| `/test-suite` | TestSuite.tsx | Test suite | ✅ Wired |
| `/admin/config` | AdminConfig.tsx | Admin configuration | ✅ Wired |
| `/watchdog` | WatchdogDashboard.tsx | System monitoring | ✅ Wired |

#### Other Routes
| Route | Page Component | Purpose | Wiring Status |
|-------|---------------|---------|---------------|
| `/milestones/:id` | MilestoneDetail.tsx | Milestone details | ✅ Wired |
| `*` | NotFound.tsx | 404 error page | ✅ Wired |

#### Legacy Redirects
| Route | Redirect To | Status |
|-------|------------|--------|
| `/maturity/build` | `/maturity/setup` | ✅ Active redirect |
| `/knowledge-base` | `/maturion/knowledge-base` | ✅ Active redirect |
| `/uploads` | `/maturion/uploads` | ✅ Active redirect |

### Component Categories (17 Categories, 196 Components)

#### 1. Admin Components (`/components/admin`)
**Purpose**: Administrative tools and configurations

**Key Components**:
- AdminPanel
- ReasoningScopeTracker
- SystemConfiguration

**Wiring**: ✅ All wired through AdminConfig page

#### 2. AI Components (`/components/ai`)
**Purpose**: AI chat, document processing, embeddings

**Key Components**:
- MaturionChat (Global assistant)
- DocumentUploadProcessor
- DocumentPreviewPane
- ApprovedFilesQueue
- DocumentProcessingDebugger

**Sub-categories**:
- `phase4/`: Fourth phase AI features
- `phase5/`: Fifth phase AI features

**Wiring**: ✅ MaturionChat globally wired, document processors wired through upload pages

#### 3. Assessment Components (`/components/assessment`)
**Purpose**: Assessment frameworks, MPS management, criteria

**Key Components**:
- AssessmentBuilder
- MPSManagement
- CriterionForm
- IntentCreator
- DomainSelector

**Wiring**: ✅ Wired through assessment pages

#### 4. Auth Components (`/components/auth`)
**Purpose**: Authentication and authorization

**Key Components**:
- LoginForm
- AuthGuard
- ProtectedRoute

**Wiring**: ✅ AuthGuard wraps entire app, LoginForm on /auth

#### 5. Checkout Components (`/components/checkout`)
**Purpose**: Payment and subscription

**Key Components**:
- CheckoutForm
- EFTPaymentSection
- SubscriptionPlans

**Wiring**: ✅ Wired through Subscribe and SubscribeCheckout pages

#### 6. Diagnostics Components (`/components/diagnostics`)
**Purpose**: System diagnostics and debugging

**Key Components**:
- SystemHealthCheck
- DiagnosticPanel

**Wiring**: ✅ Wired through admin pages

#### 7. Layout Components (`/components/layout`)
**Purpose**: App layout structure

**Key Components**:
- AppLayout (Wraps all authenticated routes)
- Sidebar
- Header
- Navigation

**Wiring**: ✅ Core layout, wraps all authenticated pages

#### 8. Milestones Components (`/components/milestones`)
**Purpose**: Milestone tracking system

**Key Components**:
- MilestoneCard
- MilestoneProgress
- TaskList
- SignOffWorkflow

**Wiring**: ✅ Wired through Dashboard and MilestoneDetail pages

#### 9. Organization Components (`/components/organization`)
**Purpose**: Organization management, branding

**Key Components**:
- OrganizationManagement
- BrandingUploader
- LinkedOrganizationSetup
- OrganizationDomainsPanel
- DeBeersBrandingDemo

**Wiring**: ✅ Wired through OrganizationSettings page

#### 10. QA Components (`/components/qa`)
**Purpose**: Quality assurance tools and workflows

**Key Components** (30+ components):
- QADebugHub
- QARulesManager
- QASystemTest
- AutomatedQALogs
- RefactorQALogs
- RegressionTestMode
- DocumentChunkTester
- EdgeFunctionTester
- MPSLinkageRebuilder
- DeduplicationManager
- LegacyDocumentCleaner
- DuplicateDocumentCleaner
- And 18+ more QA tools

**Wiring**: ✅ Wired through QADashboard, QASignOff, QATestDashboard

#### 11. Security Components (`/components/security`)
**Purpose**: Security dashboard and monitoring

**Key Components**:
- SecurityDashboard
- SecurityMetrics
- ThreatMonitoring

**Wiring**: ✅ Wired through AdminSecurityDashboard page

#### 12. Team Components (`/components/team`)
**Purpose**: Team management

**Key Components**:
- TeamManagement
- MemberInvitation
- RoleAssignment

**Wiring**: ✅ Wired through TeamPage

#### 13. Test Components (`/components/test`)
**Purpose**: Test utilities

**Key Components**:
- DKPOrgCrawlTest
- TestRunner

**Wiring**: ✅ Wired through TestSuite page

#### 14. UI Components (`/components/ui`)
**Purpose**: shadcn/ui base components (40+ components)

**Key Components**:
- Button, Input, Select, Dialog, Card, Alert
- Tabs, Accordion, Dropdown, Toast
- And 30+ more UI primitives

**Wiring**: ✅ Base components, used throughout application

#### 15. Watchdog Components (`/components/watchdog`)
**Purpose**: System drift monitoring

**Key Components**:
- WatchdogControlPanel
- SystemDriftMonitor
- AIBehaviorAnalyzer
- CrossOrgTracker
- WatchdogIncidentManager
- AIConfidenceHeatmap

**Wiring**: ✅ Wired through WatchdogDashboard page

#### 16. Webhook Components (`/components/webhook`)
**Purpose**: Webhook integrations

**Key Components**:
- WebhookManager
- WebhookConfiguration

**Wiring**: ✅ Wired through admin configuration

#### 17. Additional Component Files
- App.tsx: Root application component
- NavigationHelper: Navigation assistance

**Wiring**: ✅ Core app structure

### Custom Hooks (44 Hooks)

**Authentication & Authorization**:
- `useAuth` - Authentication context
- `useAdminAccess` - Admin role verification
- `useSecurityValidation` - Security checks
- `useEnhancedSecurity` - Enhanced security features

**Organization Management**:
- `useOrganization` - Organization state
- `useOrganizationContext` - Organization context
- `useOrganizationHierarchy` - Org hierarchy
- `useOrgTheme` - Organization theming

**Assessment & MPS**:
- `useMPSManagement` - MPS CRUD operations
- `useMPSValidation` - MPS validation
- `useMPSDocumentAnalysis` - Document analysis
- `useAIMPSGeneration` - AI-generated MPS
- `useCustomCriterion` - Custom criteria
- `useDeferredCriteria` - Deferred criteria
- `useDomainAuditBuilder` - Domain audit
- `useDomainProgress` - Domain progress

**AI & Documents**:
- `useMaturionDocuments` - Document management
- `useMaturionContext` - AI context
- `useFileUpload` - File upload handling
- `useUnifiedUpload` - Unified upload system
- `useDocumentEmbeddingStatus` - Embedding status
- `useEmbeddingStatus` - General embedding status
- `useDocumentVersions` - Document versions
- `useIntentGeneration` - Intent generation

**AI Learning & Feedback**:
- `useAILearningFeedback` - AI feedback
- `useAIFeedbackSubmissions` - Feedback submissions
- `useAILearningPatterns` - Learning patterns
- `useSmartFeedbackLoop` - Smart feedback
- `useFeedbackRetrainingWeights` - Retraining weights
- `useLearningModelSnapshots` - Model snapshots
- `useLearningRuleConfigurations` - Learning rules
- `useHumanApprovalWorkflows` - Approval workflows

**Milestones & Tasks**:
- `useMilestones` - Milestone management
- `useMilestoneTests` - Milestone testing
- `useStepStatusManagement` - Step status

**Subscriptions & Payments**:
- `useSubscriptionModules` - Subscription modules
- `useDiscountCodes` - Discount codes

**Testing & QA**:
- `useBestPracticeComparator` - Best practice comparison
- `useApprovalRequests` - Approval requests

**System & Monitoring**:
- `useWatchdogRealTime` - Real-time monitoring
- `useWebhooks` - Webhook management
- `usePolicyChangeLog` - Policy changes
- `useMaturityScoring` - Maturity scoring

**UI & Forms**:
- `use-toast` - Toast notifications
- `useSecureForm` - Secure form handling

---

## Data Architecture

### Database Schema Overview

The system uses PostgreSQL with Supabase, featuring Row Level Security (RLS), triggers, and functions.

#### Core Tables

**Organizations & Users**:
```sql
organizations
  - id (uuid, primary key)
  - name (text)
  - organization_type (text)
  - industry_tags (text[])
  - region_operating (text)
  - compliance_commitments (text[])
  - parent_organization_id (uuid, nullable)
  - created_at, updated_at

users
  - id (uuid, primary key)
  - email (text, unique)
  - full_name (text)
  - role (text: 'admin', 'member', 'viewer')
  - created_at, updated_at

organization_members
  - id (uuid, primary key)
  - organization_id (uuid, foreign key)
  - user_id (uuid, foreign key)
  - role (text)
  - joined_at
```

**Domains & Assessments**:
```sql
domains
  - id (text, primary key)
  - name (text)
  - description (text)
  - display_order (integer)
  - created_at

criteria
  - id (uuid, primary key)
  - domain_id (text, foreign key)
  - organization_id (uuid, foreign key)
  - criterion_text (text)
  - criterion_type (text)
  - created_at

mps_criteria
  - id (uuid, primary key)
  - mps_number (integer)
  - mps_title (text)
  - domain_id (text, foreign key)
  - organization_id (uuid, foreign key)
  - criterion_text (text)
  - created_at

assessments
  - id (uuid, primary key)
  - organization_id (uuid, foreign key)
  - domain_id (text, foreign key)
  - assessment_data (jsonb)
  - status (text)
  - created_at, updated_at
```

**Milestones & Tasks**:
```sql
milestones
  - id (uuid, primary key)
  - organization_id (uuid, foreign key)
  - title (text)
  - description (text)
  - status (text: 'not_started', 'in_progress', 'completed')
  - progress_percentage (integer)
  - created_at, updated_at

milestone_tasks
  - id (uuid, primary key)
  - milestone_id (uuid, foreign key)
  - title (text)
  - description (text)
  - status (text)
  - assigned_to (uuid, foreign key to users)
  - due_date (timestamp)
  - created_at, updated_at
```

**Documents & Knowledge**:
```sql
documents
  - id (uuid, primary key)
  - organization_id (uuid, foreign key)
  - file_name (text)
  - file_path (text)
  - file_type (text)
  - file_size (bigint)
  - processing_status (text)
  - embedding_status (text)
  - created_at, updated_at

document_chunks
  - id (uuid, primary key)
  - document_id (uuid, foreign key)
  - chunk_text (text)
  - chunk_index (integer)
  - embedding (vector)
  - metadata (jsonb)
  - created_at

maturion_responses
  - id (uuid, primary key)
  - organization_id (uuid, foreign key)
  - query_text (text)
  - response_text (text)
  - context_used (jsonb)
  - created_at
```

**QA & Testing**:
```sql
qa_logs
  - id (uuid, primary key)
  - organization_id (uuid, foreign key)
  - test_type (text)
  - test_results (jsonb)
  - status (text: 'passed', 'failed', 'warning')
  - created_at

qa_rules
  - id (uuid, primary key)
  - organization_id (uuid, foreign key)
  - rule_name (text)
  - rule_type (text)
  - rule_config (jsonb)
  - is_active (boolean)
  - severity_level (text)
  - created_at, updated_at
```

**Security & Monitoring**:
```sql
watchdog_incidents
  - id (uuid, primary key)
  - organization_id (uuid, foreign key)
  - incident_type (text)
  - severity (text)
  - description (text)
  - metadata (jsonb)
  - status (text)
  - created_at, resolved_at

security_logs
  - id (uuid, primary key)
  - user_id (uuid, foreign key)
  - action (text)
  - resource (text)
  - ip_address (inet)
  - created_at
```

**Data Sources**:
```sql
data_sources
  - id (uuid, primary key)
  - organization_id (uuid, foreign key)
  - name (text)
  - source_type (text)
  - connection_config (jsonb, encrypted)
  - is_active (boolean)
  - connection_status (text)
  - last_tested_at (timestamp)
  - created_at, updated_at
```

### Row Level Security (RLS)

All tables implement RLS policies to ensure organization-level data isolation:

```sql
-- Example RLS Policy
CREATE POLICY "Users can only access their organization's data"
ON milestones
FOR ALL
USING (
  organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
);
```

### Database Functions

**Key Functions**:
- `get_user_primary_organization()` - Get user's primary org
- `calculate_milestone_progress()` - Auto-calculate progress
- `update_milestone_status()` - Status management trigger
- `encrypt_credentials()` - AES-256-GCM encryption
- `decrypt_credentials()` - Secure decryption

---

## Integration Architecture

### Supabase Edge Functions (54 Functions)

#### Document Processing Functions
| Function | Purpose | Status |
|----------|---------|--------|
| `process-document-v2` | Main document processing pipeline | ✅ Active |
| `process-single-document` | Single document processor | ✅ Active |
| `process-ai-document` | AI-enhanced processing | ✅ Active |
| `diagnose-document-retrieval` | Document retrieval diagnostics | ✅ Active |
| `reprocess-document` | Reprocess failed documents | ✅ Active |
| `trigger-document-reprocess` | Trigger reprocessing | ✅ Active |
| `trigger-pending-processing` | Process pending queue | ✅ Active |
| `extract-and-index` | Extract & index content | ✅ Active |
| `regenerate-embeddings` | Regenerate embeddings | ✅ Active |

#### AI & Chat Functions
| Function | Purpose | Status |
|----------|---------|--------|
| `maturion-ai-chat` | Main AI chat endpoint | ✅ Active |
| `search-ai-context` | Search AI context | ✅ Active |
| `test-ai-reasoning-integration` | Test AI reasoning | ✅ Active |
| `bulk-update-context` | Bulk context updates | ✅ Active |

#### QA & Testing Functions
| Function | Purpose | Status |
|----------|---------|--------|
| `run-full-qa-cycle` | Complete QA cycle | ✅ Active |
| `run-refactor-qa-cycle` | Refactor QA cycle | ✅ Active |
| `run-branding-qa-verification` | Branding QA | ✅ Active |
| `process-qa-alerts` | Process QA alerts | ✅ Active |

#### Data Management Functions
| Function | Purpose | Status |
|----------|---------|--------|
| `cleanup-duplicate-document` | Remove duplicates | ✅ Active |
| `cleanup-legacy-documents` | Clean legacy docs | ✅ Active |
| `delete-corrupted-chunks` | Remove corrupted chunks | ✅ Active |
| `fix-pending-uploads` | Fix pending uploads | ✅ Active |
| `requeue-pending-document` | Requeue documents | ✅ Active |
| `list-all-documents` | List all documents | ✅ Active |

#### Data Source Functions
| Function | Purpose | Status |
|----------|---------|--------|
| `connect-data-source` | Test data source connection | ✅ Active |
| `query-data-source` | Query external data sources | ✅ Active |
| `sync-data-source` | Sync data from sources | ✅ Active |
| `encrypt-credentials` | Encrypt credentials (AES-256) | ✅ Active |
| `test-data-sources-api` | Test data sources API | ✅ Active |
| `reset-stuck-syncs` | Reset stuck sync jobs | ✅ Active |

#### MPS & Criteria Functions
| Function | Purpose | Status |
|----------|---------|--------|
| `generate-and-save-criteria` | Generate criteria | ✅ Active |
| `rebuild-mps-linkage` | Rebuild MPS links | ✅ Active |
| `fix-governance-documents` | Fix governance docs | ✅ Active |

#### Organization Functions
| Function | Purpose | Status |
|----------|---------|--------|
| `seed-org-domains` | Seed organization domains | ✅ Active |
| `seed-debeers-domains` | Seed De Beers domains | ✅ Active |
| `grant-admin-access` | Grant admin access | ✅ Active |

#### Web Crawling Functions
| Function | Purpose | Status |
|----------|---------|--------|
| `crawl-org-domain` | Crawl organization domain | ✅ Active |
| `run-web-crawl-test` | Test web crawling | ✅ Active |
| `schedule-nightly-crawl` | Schedule nightly crawls | ✅ Active |
| `get-crawl-status` | Get crawl status | ✅ Active |

#### Watchdog & Monitoring Functions
| Function | Purpose | Status |
|----------|---------|--------|
| `process-watchdog-alerts` | Process watchdog alerts | ✅ Active |
| `send-watchdog-notifications` | Send notifications | ✅ Active |

#### Communication Functions
| Function | Purpose | Status |
|----------|---------|--------|
| `send-invitation` | Send team invitations | ✅ Active |
| `send-webhook` | Send webhook notifications | ✅ Active |
| `send-gap-followup` | Send gap follow-up emails | ✅ Active |
| `send-test-slack-notification` | Test Slack integration | ✅ Active |

#### Testing & Diagnostic Functions
| Function | Purpose | Status |
|----------|---------|--------|
| `test-responses-api-integration` | Test responses API | ✅ Active |
| `test-gap-ticket-system` | Test gap ticket system | ✅ Active |
| `test-branding-audit-fix` | Test branding audit | ✅ Active |
| `test-branding-fixes` | Test branding fixes | ✅ Active |
| `check-database-access` | Check DB access | ✅ Active |
| `analyze-table-data` | Analyze table data | ✅ Active |
| `scan-all-tables` | Scan all tables | ✅ Active |
| `healthz` | Health check endpoint | ✅ Active |

#### Storage Functions
| Function | Purpose | Status |
|----------|---------|--------|
| `relink-legacy-storage` | Relink legacy storage | ✅ Active |

### External Integrations

#### OpenAI Integration
- **API**: OpenAI GPT-4 and Embeddings API
- **Purpose**: AI chat, document analysis, embeddings
- **Components**: MaturionChat, DocumentProcessor
- **Status**: ✅ Active

#### Email Integration
- **Service**: Supabase Email (or configured SMTP)
- **Purpose**: Invitations, notifications, alerts
- **Functions**: send-invitation, send-gap-followup
- **Status**: ✅ Active

#### Webhook Integration
- **Purpose**: External system notifications
- **Function**: send-webhook
- **Status**: ✅ Active

#### Data Source Integrations
Supported external data sources:
- PostgreSQL
- MySQL
- Supabase
- REST APIs
- Google Drive
- SharePoint
- Custom APIs

**Security**: All credentials encrypted with AES-256-GCM

---

## Security Architecture

### Authentication & Authorization

#### Authentication Provider
- **Provider**: Supabase Auth
- **Methods**: Email/password, OAuth (configurable)
- **Session Management**: JWT tokens
- **Status**: ✅ Implemented

#### Role-Based Access Control (RBAC)

**Roles**:
1. **Admin**: Full system access
2. **Member**: Standard user access
3. **Viewer**: Read-only access

**Role Assignment**:
- Organization-level roles in `organization_members`
- User-level role in `users` table
- Admin override via admin list

#### Row Level Security (RLS)

All tables enforce organization-scoped RLS:
```sql
-- Ensures users only access their organization's data
CREATE POLICY "org_isolation" ON [table_name]
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid()
  )
);
```

### Data Security

#### Encryption
- **Credentials**: AES-256-GCM encryption
- **Key Derivation**: PBKDF2 with 100,000 iterations
- **At Rest**: Supabase encryption
- **In Transit**: TLS/HTTPS

#### XSS Protection
- **Library**: DOMPurify
- **Scope**: All user-generated content
- **Status**: ✅ Implemented

#### SQL Injection Protection
- **Method**: Parameterized queries via Supabase client
- **Status**: ✅ Built-in

### Security Monitoring

#### Watchdog System
- **Purpose**: System drift monitoring
- **Components**: WatchdogDashboard, incident tracking
- **Alerts**: Real-time incident notifications
- **Status**: ✅ Active

#### Security Logging
- **Table**: `security_logs`
- **Tracked**: User actions, resource access, IP addresses
- **Retention**: Configurable
- **Status**: ✅ Active

#### Admin Security Dashboard
- **Page**: AdminSecurityDashboard
- **Features**: Security metrics, threat monitoring
- **Status**: ✅ Wired

---

## Deployment Architecture

### Build Configuration

#### Vite Configuration
```typescript
// vite.config.ts
export default defineConfig({
  base: process.env.BASE_URL || '/',
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: // Potential code splitting
      }
    }
  }
});
```

#### TypeScript Configuration
- **Mode**: Strict type checking
- **Target**: ES2020
- **Module**: ESNext
- **Status**: ✅ Configured

### GitHub Actions Workflows

#### Database Migration Workflow
**File**: `.github/workflows/db-push.yml`
```yaml
name: Database Migrations
on:
  push:
    branches: [main]
jobs:
  migrate:
    - runs Supabase migrations
    - cleans invalid migrations
    - validates connectivity
```
**Status**: ✅ Active

#### GitHub Pages Deployment
**File**: `.github/workflows/deploy-gh-pages.yml`
```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  build-and-deploy:
    - npm install
    - npm run build
    - deploy to gh-pages branch
```
**Status**: ✅ Active

### Environment Configuration

#### Required Environment Variables
```bash
# Supabase
VITE_SUPABASE_PROJECT_ID=dmhlxhatogrrrvuruayv
VITE_SUPABASE_URL=https://dmhlxhatogrrrvuruayv.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=[anon-key]

# Optional: OpenAI (for AI features)
OPENAI_API_KEY=[key]

# Optional: Email configuration
EMAIL_FROM=[email]
```

#### GitHub Secrets (for CI/CD)
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`
- Additional secrets as needed

### Deployment Targets

#### GitHub Pages
- **URL**: `https://<username>.github.io/maturion-genesis-forge-91/` (see repository Settings > Pages for actual URL)
- **Build**: Static SPA deployed via GitHub Actions
- **Routing**: BrowserRouter with base path support
- **Status**: ✅ Configured and Active
- **Deployment**: Automatic on push to `main` branch
- **Access**: 
  - Main app: `https://<username>.github.io/maturion-genesis-forge-91/`
  - Health Checker: `https://<username>.github.io/maturion-genesis-forge-91/admin/health-checker`
  - QA Dashboard: `https://<username>.github.io/maturion-genesis-forge-91/qa-dashboard`

#### Alternative Platforms
- **Netlify**: Compatible
- **Vercel**: Compatible
- **Cloudflare Pages**: Compatible

### Build Output

```bash
dist/
├── index.html (1.5 KB)
├── assets/
│   ├── index-[hash].css (102 KB)
│   └── index-[hash].js (2.4 MB / 650 KB gzipped)
└── [static assets]
```

**Performance Notes**:
- ⚠️ Large JS bundle (2.4 MB) - Consider code splitting
- ✅ Good compression ratio (650 KB gzipped)
- ✅ Efficient CSS (102 KB)

---

## QA & Testing Strategy

### QA Philosophy

#### True North Alignment
- QA validates against architecture (this document)
- Architecture defines "what should be"
- QA confirms "what is"
- RED = Mismatch between architecture and implementation
- GREEN = Full alignment

#### One Time Build QA Process
1. **Architecture Check**: Validate architecture is current
2. **Generate QA Checks**: Encode requirements in qa/requirements.json
3. **Run QA**: Execute all checks (expect RED if incomplete)
4. **Build to GREEN**: Implement until all checks pass
5. **Handover**: User verifies via UI

### QA System Components

#### 1. Architecture Compliance Checker
**Purpose**: Verify implementation matches architecture

**Checks**:
- All routes defined in architecture exist
- All components listed are present
- All integrations are wired
- No orphaned files

**Status**: 🔄 To be implemented

#### 2. Wiring Verification System
**Purpose**: Ensure all components are properly wired

**Static Wiring Checks**:
- Component imports exist
- Route definitions present
- Context providers wired
- Hook usage valid

**Runtime Wiring Checks**:
- UI elements render
- Click handlers respond
- State updates work
- Navigation functions

**Status**: 🔄 To be implemented

#### 3. Legacy Component Detector
**Purpose**: Identify unused/unwired components for removal

**Rules**:
- Component exists but not imported → Mark for review
- Component fails wiring check 2+ times → Mark for deletion
- Component not in architecture → Mark for removal

**Status**: 🔄 To be implemented

#### 4. Build Integrity Checker
**Purpose**: Ensure build succeeds

**Checks**:
- `npm run build` succeeds
- `npm run lint` passes
- TypeScript compilation succeeds
- No critical warnings

**Status**: ✅ Build working, automation needed

#### 5. Database Integrity Checker
**Purpose**: Validate database schema and migrations

**Checks**:
- All migrations applied
- RLS policies active
- Required tables exist
- Triggers functional

**Status**: 🔄 To be implemented

#### 6. Security Posture Checker
**Purpose**: Validate security measures

**Checks**:
- RLS enabled on all tables
- Credentials encrypted
- XSS protection active
- No secrets in code

**Status**: 🔄 To be implemented

### Existing QA Components

#### QA Dashboard (`/qa-dashboard`)
**Features**:
- 30+ QA tools
- Test execution
- Results visualization
- Component testing

**QA Tools Available**:
1. QADebugHub - Debug central
2. QARulesManager - QA rules configuration
3. QASystemTest - System testing
4. AutomatedQALogs - Automated logging
5. RefactorQALogs - Refactor tracking
6. RegressionTestMode - Regression testing
7. DocumentChunkTester - Document testing
8. EdgeFunctionTester - Function testing
9. MPSLinkageRebuilder - MPS verification
10. DeduplicationManager - Duplicate detection
11. LegacyDocumentCleaner - Legacy cleanup
12. DuplicateDocumentCleaner - Duplicate cleanup
13. AIReasoningIntegrationTester - AI testing
14. BatchDocumentReprocessor - Batch processing
15. AILogicIngestionDashboard - AI ingestion
16. And 15+ more specialized tools

#### QA Sign-Off System (`/qa-signoff`)
**Purpose**: Formal QA approval workflow

**Features**:
- Sign-off workflows
- Evidence collection
- Approval tracking
- Audit trails

#### QA Test Dashboard (`/qa-test-dashboard`)
**Purpose**: Test execution and monitoring

**Features**:
- Test suite execution
- Results tracking
- Performance metrics
- Coverage reports

### Health Checker UI (To Be Implemented)

**Location**: Admin-only sidebar tab

**Features**:
- One-click "Run QA" button
- Human-readable report (no code)
- Component-level failure details
- GREEN/RED status indicators

**Report Sections**:
1. Architecture Compliance
2. Environment Status
3. Build/Lint/Type Check
4. Wiring Verification Results
5. Database Connectivity
6. API Health
7. Security Checks
8. Overall Status

**Strict Mode**: Toggle to make missing envs/DB fail RED

---

## Component Inventory & Wiring

### Wiring Status Matrix

All components are currently wired. This matrix will be maintained to track wiring status:

#### Pages (29/29 Wired - 100%)
✅ All pages properly wired through App.tsx routing

#### Component Categories (17/17 Wired - 100%)
✅ All component categories in active use

#### Individual Components (196/196 Wired - 100%)
✅ All components referenced and functional

#### Hooks (44/44 Wired - 100%)
✅ All hooks actively used

#### Edge Functions (54/54 Active - 100%)
✅ All functions deployed and callable

### Legacy Component Detection Rules

**Rule 1: Import Check**
- If component file exists but not imported anywhere → WARN
- If warning persists 2 cycles → MARK FOR DELETION

**Rule 2: Route Check**
- If page component not in routes.ts → WARN
- If warning persists 2 cycles → MARK FOR DELETION

**Rule 3: Usage Check**
- If component imported but never rendered → WARN
- If warning persists 2 cycles → MARK FOR DELETION

**Rule 4: Architecture Check**
- If component not in architecture document → WARN
- If intentionally excluded → Document in exclusions
- Otherwise → MARK FOR DELETION

### Component Exclusion List
(Components intentionally not wired, with reason)

Currently: None - all components are wired.

---

## Custom Agent Integration

### Custom Agent Configuration

**Location**: `.github/agents/my-agent.agent.md`

**Purpose**: Encode build philosophy for AI coding agent

**Key Directives**:
1. Architecture-first development
2. True North compliance
3. One Time Build process
4. No legacy components
5. Strict wiring requirements
6. QA-driven development

### Agent Responsibilities

#### Architecture Management
- Update architecture before code changes
- Ensure requirements are machine-verifiable
- Maintain qa/requirements.json

#### Code Implementation
- Implement features to satisfy architecture
- Write code, run commands, manage environment
- Handle migrations and database changes

#### QA Execution
- Run full QA repeatedly until GREEN
- Fix issues based on QA signals
- Never handover with RED QA

#### User Interface
- Provide English-readable QA reports
- No code in reports, only plain language
- Clear component-level failure explanations

### Integration with QA System

The custom agent should:
1. Read ARCHITECTURE.md as True North
2. Read qa/requirements.json for validation rules
3. Execute QA checks before handover
4. Auto-correct based on QA failures
5. Report status through Health Checker UI

### Agent Workflow

```
User Request (English)
        ↓
Agent Updates Architecture
        ↓
Agent Updates qa/requirements.json
        ↓
Agent Generates QA Checks (RED expected)
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

---

## Build & Development Guidelines

### Development Setup

#### Prerequisites
- Node.js 18+ (recommend using nvm)
- npm or bun
- Git
- Supabase account

#### Installation
```bash
# Clone repository
git clone <repository-url>
cd maturion-genesis-forge-91

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development server
npm run dev
```

#### Available Scripts
```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run build:dev    # Development mode build
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

### Code Standards

#### TypeScript
- Strict mode enabled
- All types defined
- No `any` types (use `unknown` if needed)
- Proper interface definitions

#### React
- Functional components only
- Hooks for state management
- PropTypes via TypeScript interfaces
- Consistent naming: PascalCase for components

#### CSS/Styling
- Tailwind utility classes
- Component-scoped styles
- Consistent spacing (Tailwind scale)
- Responsive design (mobile-first)

#### File Naming
- Components: `PascalCase.tsx`
- Hooks: `useCamelCase.ts`
- Utilities: `camelCase.ts`
- Pages: `PascalCase.tsx`

### Git Workflow

#### Branch Strategy
- `main`: Production-ready code
- `copilot/*`: AI agent working branches
- Feature branches as needed

#### Commit Messages
```
feat: Add new feature
fix: Fix bug
docs: Update documentation
refactor: Refactor code
test: Add tests
chore: Maintenance tasks
```

### Testing Strategy (To Be Implemented)

#### Unit Tests
- Test individual components
- Test custom hooks
- Test utility functions
- Coverage target: 80%+

#### Integration Tests
- Test page flows
- Test API interactions
- Test database operations

#### E2E Tests
- Test critical user journeys
- Test navigation
- Test wiring
- Test admin flows

### Performance Guidelines

#### Bundle Size
- Target: < 500 KB gzipped
- Current: 650 KB gzipped (⚠️ needs optimization)
- Strategy: Implement code splitting

#### Code Splitting Recommendations
```typescript
// Lazy load heavy components
const MaturionChat = lazy(() => import('@/components/ai/MaturionChat'));
const QADashboard = lazy(() => import('@/pages/QADashboard'));

// Route-based splitting
const routes = [
  { path: '/qa-dashboard', component: lazy(() => import('@/pages/QADashboard')) }
];
```

#### Performance Monitoring
- Monitor First Contentful Paint (FCP)
- Monitor Time to Interactive (TTI)
- Monitor bundle size on each build

### Security Guidelines

#### Secrets Management
- Never commit secrets to repository
- Use environment variables
- Use GitHub Secrets for CI/CD
- Rotate credentials regularly

#### Code Security
- Sanitize all user input (DOMPurify)
- Use parameterized queries
- Validate all API inputs
- Implement CORS properly

#### Authentication Security
- JWT token refresh
- Secure session storage
- Role-based access checks
- Admin access verification

### Documentation Requirements

#### Code Documentation
- JSDoc for public APIs
- Inline comments for complex logic
- README for each major feature
- Architecture updates for new features

#### API Documentation
- Document all Edge Functions
- Document all database functions
- Document RLS policies
- Document external integrations

---

## Appendix A: Technology Versions

```json
{
  "frontend": {
    "react": "18.3.1",
    "typescript": "5.5.3",
    "vite": "5.4.1",
    "react-router-dom": "6.26.2",
    "tailwindcss": "3.4.11"
  },
  "state_management": {
    "@tanstack/react-query": "5.56.2",
    "react-hook-form": "7.53.0",
    "zod": "3.23.8"
  },
  "backend": {
    "@supabase/supabase-js": "2.57.4",
    "postgresql": "14+"
  },
  "ui_libraries": {
    "lucide-react": "0.462.0",
    "recharts": "2.12.7",
    "sonner": "1.5.0"
  },
  "development": {
    "eslint": "9.9.0",
    "typescript-eslint": "8.0.1",
    "vite": "5.4.1"
  }
}
```

---

## Appendix B: Route Reference

Complete route mapping (see "UI/UX Components" section for full table)

---

## Appendix C: Database ERD

```
organizations 1---* organization_members *---1 users
organizations 1---* domains
organizations 1---* milestones
milestones 1---* milestone_tasks
domains 1---* criteria
domains 1---* mps_criteria
organizations 1---* documents
documents 1---* document_chunks
organizations 1---* assessments
organizations 1---* qa_logs
organizations 1---* watchdog_incidents
```

---

## Appendix D: QA Requirements Reference

See `qa/requirements.json` for machine-readable QA requirements.

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-20 | AI Agent | Initial comprehensive architecture |

---

**END OF ARCHITECTURE DOCUMENT**

This document serves as the "True North" for all development, QA, and deployment activities on the Maturion Genesis Forge platform. All changes must be validated against this architecture before deployment.
