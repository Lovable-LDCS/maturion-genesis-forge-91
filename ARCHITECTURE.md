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
11. [ISMS Workflow Architecture](#isms-workflow-architecture)
12. [Maturion AI Agent Architecture](#maturion-ai-agent-architecture)
13. [ISMS Modules Architecture](#isms-modules-architecture)
14. [Deployment Architecture](#deployment-architecture)
15. [QA & Testing Strategy](#qa--testing-strategy)
16. [Component Inventory & Wiring](#component-inventory--wiring)
17. [Custom Agent Integration](#custom-agent-integration)
18. [Build & Development Guidelines](#build--development-guidelines)

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
- **32 Pages**: Complete application with public and authenticated routes (including Free Assessment, Get to Know You, and ISMS Landing)
- **196 UI Components**: Modular, reusable component architecture
- **44 Custom Hooks**: Business logic encapsulation
- **54 Edge Functions**: Serverless backend processing
- **17 Component Categories**: Feature-based organization
- **6 Assessment Domains**: Core maturity evaluation framework
- **7 ISMS Modules**: Integrated Security Management System modules
- **Maturion AI Agent**: Intelligent AI assistant with model routing, RAG, and tool-based capabilities

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

### Page Inventory (32 Pages)

#### Public Routes (No Authentication Required, No Sidebar)
| Route | Page Component | Purpose | Wiring Status |
|-------|---------------|---------|---------------|
| `/` | Index.tsx | Landing page with domain overview | ✅ Wired |
| `/journey` | Journey.tsx | Maturity development journey visualization | ✅ Wired |
| `/auth` | LoginForm | User authentication | ✅ Wired |
| `/accept-invitation` | InvitationAcceptance | Team invitation acceptance | ✅ Wired |
| `/subscribe` | Subscribe.tsx | Subscription landing | ✅ Wired |
| `/subscribe/checkout` | SubscribeCheckout.tsx | Payment checkout | ✅ Wired |
| `/get-to-know-you` | GetToKnowYou.tsx | Company onboarding profile | ✅ Wired |

#### Authenticated Routes - Pre-Subscription (Require Login + AppLayout with Sidebar)
| Route | Page Component | Purpose | Wiring Status |
|-------|---------------|---------|---------------|
| `/free-assessment` | FreeAssessment.tsx | Free maturity assessment landing (Pre-subscription) | ✅ Wired |

#### Authenticated Routes - Core (Require Login + AppLayout with Sidebar)
| Route | Page Component | Purpose | Wiring Status |
|-------|---------------|---------|---------------|
| `/isms` | ISMSLanding.tsx | ISMS module overview and navigation hub | ✅ Wired |
| `/modules` | ModulesOverview.tsx | Module selection (legacy) | ✅ Wired |
| `/dashboard` | Dashboard.tsx | Main dashboard | ✅ Wired |
| `/maturity/setup` | MaturitySetup.tsx | Audit structure setup (Maturity Roadmap) | ✅ Wired |
| `/assessment` | Assessment.tsx | Assessment interface | ✅ Wired |
| `/assessment/framework` | AuditStructureConfig.tsx | Framework configuration | ✅ Wired |
| `/audit/domain/:domainId` | DomainAuditBuilder.tsx | Domain audit builder | ✅ Wired |
| `/assessment-framework` | AssessmentFramework.tsx | Framework management | ✅ Wired |
| `/domain-management` | AssessmentFramework.tsx | Domain management | ✅ Wired (alias) |

#### Team & Organization Routes (Authenticated)
| Route | Page Component | Purpose | Wiring Status |
|-------|---------------|---------|---------------|
| `/team` | TeamPage.tsx | Team management | ✅ Wired |
| `/organization/settings` | OrganizationSettings.tsx | Org settings & hierarchy (Admin-only) | ✅ Wired |

#### AI & Knowledge Routes (Admin-only)
| Route | Page Component | Purpose | Wiring Status |
|-------|---------------|---------|---------------|
| `/maturion/knowledge-base` | MaturionKnowledgeBase.tsx | Knowledge base (Admin-only) | ✅ Wired |
| `/maturion/uploads` | MaturionUploads.tsx | Document uploads (Admin-only) | ✅ Wired |
| `/data-sources` | DataSourcesManagement.tsx | Data source config | ✅ Wired |

#### QA & Admin Routes (Admin-only)
| Route | Page Component | Purpose | Wiring Status |
|-------|---------------|---------|---------------|
| `/qa-dashboard` | QADashboard.tsx | QA tools dashboard | ✅ Wired |
| `/qa-signoff` | QASignOffDynamic.tsx | QA sign-off workflows | ✅ Wired |
| `/qa-test-dashboard` | QATestDashboard.tsx | Test dashboard | ✅ Wired |
| `/test-suite` | TestSuite.tsx | Test suite | ✅ Wired |
| `/admin/config` | AdminConfig.tsx | Admin configuration (Admin-only) | ✅ Wired |
| `/admin/workflow` | AdminWorkflowDashboard.tsx | Workflow dashboard (Admin-only) | ✅ Wired |
| `/admin/user-matrix` | UserFieldMatrix.tsx | User matrix (Admin-only) | ✅ Wired |
| `/admin/health-checker` | AdminHealthChecker.tsx | Health checker (Admin-only) | ✅ Wired |
| `/watchdog` | WatchdogDashboard.tsx | System monitoring (Admin-only) | ✅ Wired |

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

## ISMS Workflow Architecture

### Overview

The Integrated Security Management System (ISMS) Workflow provides a structured, phase-based approach to implementing and managing security and maturity assessments. The workflow is designed to guide administrators through the complete lifecycle of ISMS implementation, from initial setup to continuous monitoring.

### Workflow Philosophy

The ISMS workflow embodies the following principles:
1. **Phase-Based Progression**: Clear, sequential phases with defined objectives
2. **Admin-Centric**: Primary focus on administrative functionality and oversight
3. **Organizational Hierarchy**: Respects multi-level organizational structure
4. **Progress Tracking**: Visual indicators and metrics for completion status
5. **Flexibility**: Allows non-linear navigation while maintaining structure

### Workflow Phases

#### Phase 1: Initial Setup & Configuration
**Objective**: Establish foundational organizational structure and admin access

**Key Activities**:
- Admin user onboarding
- Organization profile configuration
- User field matrix setup
- Role and permission assignment

**Routes**:
- `/admin/config` - Admin configuration
- `/organization/settings` - Organization setup
- `/team` - Team management

**Completion Criteria**:
- Admin users created and configured
- Organization profile complete
- Basic team structure established
- Permission matrix configured

**Status**: ✅ Implemented

---

#### Phase 2: Assessment Framework Definition
**Objective**: Configure assessment criteria and maturity framework

**Key Activities**:
- Domain configuration (6 core domains)
- Criteria customization
- Maturity level definition
- Knowledge base setup

**Routes**:
- `/assessment/framework` - Framework configuration
- `/maturity/setup` - Maturity level setup
- `/maturion/knowledge-base` - Knowledge base management
- `/maturion/uploads` - Document uploads

**Completion Criteria**:
- All 6 domains configured
- Assessment criteria defined
- Maturity levels established
- Knowledge base populated

**Status**: ✅ Implemented

---

#### Phase 3: Team & Access Management
**Objective**: Invite team members and configure access controls

**Key Activities**:
- Team member invitations
- Role assignments
- Access matrix configuration
- Approval workflow setup

**Routes**:
- `/team` - Team management
- `/admin/config` - Access configuration
- `/admin/user-matrix` - User field matrix

**Completion Criteria**:
- Team members invited
- Roles assigned appropriately
- Access controls configured
- Approval workflows active

**Status**: ✅ Implemented

---

#### Phase 4: Assessment Execution
**Objective**: Conduct maturity assessments and gather evidence

**Key Activities**:
- Assessment initialization
- Evidence collection
- Scoring and evaluation
- Progress tracking

**Routes**:
- `/assessment` - Assessment execution
- `/dashboard` - Assessment overview
- `/modules` - Module-based assessment

**Completion Criteria**:
- Assessments created and assigned
- Evidence collected and linked
- Scoring completed
- Results documented

**Status**: ✅ Implemented

---

#### Phase 5: Review & Sign-Off
**Objective**: Review assessment results and obtain approvals

**Key Activities**:
- Results review
- QA sign-off
- Final approval
- Results publication

**Routes**:
- `/qa-signoff` - QA sign-off workflow
- `/qa-dashboard` - QA dashboard
- `/admin/health-checker` - System health validation

**Completion Criteria**:
- Results reviewed and validated
- QA sign-off obtained
- Management approval secured
- Results published

**Status**: ✅ Implemented

---

#### Phase 6: Continuous Monitoring
**Objective**: Monitor ongoing compliance and maturity improvements

**Key Activities**:
- Watchdog monitoring
- Journey tracking
- Periodic reviews
- Continuous improvement

**Routes**:
- `/watchdog` - Watchdog monitoring
- `/journey` - Maturity journey
- `/dashboard` - Progress dashboard

**Completion Criteria**:
- Monitoring active
- Incidents tracked
- Improvement initiatives logged
- Trend analysis available

**Status**: ✅ Implemented

---

### Workflow Dashboard

**Component**: `AdminWorkflowDashboard.tsx`
**Route**: `/admin/workflow`
**Access**: Admin-only

**Features**:
- Overall progress tracking across all phases
- Current phase highlighting
- Phase-specific quick actions
- Visual progress indicators
- Completion statistics (Completed/In Progress/Pending)

**Status**: ✅ Wired

---

### Organizational Hierarchy Integration

#### Hierarchy Levels

1. **Backoffice/Global (APGI)**
   - **Level**: `backoffice`
   - **Scope**: All organizations and best practices
   - **Access**: Global view across all Mother Companies
   - **Permissions**: Full system administration

2. **Mother Companies**
   - **Level**: `parent`
   - **Scope**: Own organization and future subsidiaries
   - **Access**: Own data and aggregated subsidiary data
   - **Permissions**: Organization-level administration

3. **Future: Sister Companies**
   - **Level**: `parent` (peer to Mother Companies)
   - **Scope**: Own organization and future subsidiaries
   - **Access**: Own data only (isolated from other sisters)
   - **Permissions**: Organization-level administration
   - **Status**: 🔄 Planned

4. **Future: Subsidiaries**
   - **Level**: `subsidiary`
   - **Scope**: Own organization only
   - **Access**: Own data, limited parent visibility
   - **Permissions**: Limited administration
   - **Status**: 🔄 Planned

**Database Schema**:
- Table: `organizations`
- Fields: `organization_level`, `parent_organization_id`
- Hook: `useOrganizationHierarchy.ts`

**Status**: ✅ Implemented (Backoffice & Mother Companies)

---

### User Field Matrix

**Component**: `UserFieldMatrix.tsx`
**Route**: `/admin/user-matrix`
**Access**: Admin-only

#### Role Definitions

| Role | Level | Scope | Permissions |
|------|-------|-------|-------------|
| **Superuser** | Backoffice | Global (APGI) | Full access to all features and organizations |
| **Owner** | Organization | Org + Subsidiaries | Full access within organization hierarchy |
| **Admin** | Organization | Org + Subsidiaries | Configuration and team management |
| **Technician** | Organization | Single Org | Assessment execution and evidence submission |
| **Viewer** | Organization | Single Org | Read-only access to results |

#### Permission Categories

**Organization Settings**:
- Edit profile: Superuser, Owner, Admin
- Manage branding: Superuser, Owner, Admin
- Delete organization: Superuser, Owner only

**Team Management**:
- Invite members: Superuser, Owner, Admin
- Assign roles: Superuser, Owner, Admin (limited)
- Remove members: Superuser, Owner, Admin

**Assessment Framework**:
- Configure domains: Superuser, Owner, Admin
- Edit criteria: Superuser, Owner, Admin
- Import frameworks: Superuser, Owner, Admin

**Assessment Execution**:
- Create assessment: All except Viewer
- Submit evidence: All except Viewer
- Score responses: All except Viewer
- View results: All roles

**QA & Approval**:
- QA sign-off: Superuser, Owner, Admin
- Final approval: Superuser, Owner only
- Publish results: Superuser, Owner only

**Admin Functions**:
- System configuration: Superuser only
- Health checker: Superuser, Owner
- Watchdog setup: Superuser, Owner, Admin

**Status**: ✅ Implemented

---

### Navigation & Sidebar Architecture

The application implements a workflow-based sidebar structure that reflects the user journey from pre-subscription through maturity roadmap development.

#### Pre-Subscription Pages (No Sidebar)

Marketing and onboarding pages operate without a sidebar to optimize for conversion:

**Public Routes (No Authentication, No Sidebar)**:
- `/` - Landing page with domain overview and value proposition
- `/journey` - Maturity development journey visualization  
- `/subscribe` - Subscription landing page
- `/subscribe/checkout` - Payment checkout flow
- `/get-to-know-you` - Company onboarding and profile creation
- `/auth` - User authentication
- `/accept-invitation` - Team invitation acceptance

**Navigation Flow**:
1. Landing page (`/`) → User explores platform
2. Subscribe page (`/subscribe`) → User selects modules
3. Checkout page (`/subscribe/checkout`) → User completes payment
4. Get to Know You (`/get-to-know-you`) → User provides company information
5. ISMS Landing (`/isms`) → User enters main application

**Characteristics**:
- Full-width marketing layouts
- Custom navigation optimized for conversion
- No AppLayout wrapper
- Direct navigation between marketing pages

#### Authenticated User Sidebar Structure

Once users authenticate, they see a structured sidebar organized by workflow phase:

**1. Main Section** (Always visible to authenticated users)
- **Dashboard** - `/dashboard` - Overview and metrics (Admin-only in current configuration)
- **ISMS** - `/isms` - Integrated Security Management System hub with module cards

**2. Pre-subscription Section** (Accessible before full subscription)
- **Free Assessment** - `/free-assessment` - Free maturity assessment landing page

This section helps users:
- Understand the assessment process
- Complete the free 15-minute maturity assessment
- See what they'll receive (scores, gap analysis, recommendations)
- Be directed to subscribe after completion

**3. Maturity Roadmap Section** (Post-subscription, user-accessible based on assignments)
This section contains the core audit structure setup and evidence management workflow:
- **Audit Structure Setup** - `/maturity/setup` - Configure maturity model (formerly "Maturity Setup")
- **Assessment** - `/assessment` - Conduct full assessments
- **Assessment Framework** - `/assessment/framework` - Framework configuration
- **QA Sign-Off** - `/qa-signoff` - Quality assurance validation
- **Team** - `/team` - Team member management

**Note**: Once published, Audit Structure Setup becomes the "Maturity Roadmap Evidence Management Workflow"

**4. Admin-Only Sections** (Visible only to administrators)

All admin sections are styled with orange labels for visual distinction and use `useAdminAccess()` hook for access control.

**Maturion Section** (AI Configuration)
- **Knowledge Base** - `/maturion/knowledge-base` - AI knowledge management
- **Uploads** - `/maturion/uploads` - Document processing

**Settings Section** (Organization Hierarchy)
- **Settings** - `/organization/settings` - Organization settings with hierarchy matrix for viewing signed-up organizations and subsidiary users

**Admin Section** (System Administration)
- **Workflow Dashboard** - `/admin/workflow` - ISMS implementation progress tracking
- **User Matrix** - `/admin/user-matrix` - Role-based permissions management
- **Admin Config** - `/admin/config` - System configuration
- **Health Checker** - `/admin/health-checker` - System health validation and QA dashboard

**Watchdog Section** (System Monitoring)
- **Watchdog** - `/watchdog` - AI behavior monitoring and system drift detection

#### Access Control

**Admin Detection**:
- Hook: `useAdminAccess()`
- Condition: `isAdmin === true` (based on user role or email in admin list)
- Renders: All admin-only sidebar sections

**User Access**:
- All authenticated users see Main, Pre-subscription, and Maturity Roadmap sections
- Pre-subscription section accessible to all authenticated users
- Maturity Roadmap section accessible based on subscription and team assignments

**Sidebar Status**: ✅ Wired and tested

---

### Admin Sidebar Integration

The workflow has been integrated into the application sidebar with admin-only visibility.

**Admin Section Items**:
1. **Workflow Dashboard** - `/admin/workflow`
   - Icon: Workflow
   - Purpose: Track ISMS implementation progress

2. **User Matrix** - `/admin/user-matrix`
   - Icon: Lock
   - Purpose: View and manage role-based permissions

3. **Admin Config** - `/admin/config`
   - Icon: Settings
   - Purpose: System configuration

4. **Health Checker** - `/admin/health-checker`
   - Icon: Activity
   - Purpose: System health validation

**Conditional Rendering**:
- Hook: `useAdminAccess()`
- Condition: `isAdmin === true`
- Visual Indicator: Orange label for admin section

**Status**: ✅ Wired

---

### Workflow State Management

**Current Implementation**:
- Progress values: Hardcoded in `AdminWorkflowDashboard.tsx`
- Status tracking: Component-level state

**Future Enhancement** (Planned):
- Database table: `workflow_state`
- Fields: `organization_id`, `phase`, `progress`, `status`, `last_updated`
- Real-time updates: Supabase subscriptions
- Persistent tracking: Cross-session state recovery

**Status**: 🔄 Planned for enhancement

---

### Integration Points

#### With Existing Features

1. **Organization Management**
   - Hook: `useOrganizationHierarchy`
   - Integration: Workflow respects org hierarchy
   - Status: ✅ Integrated

2. **Admin Access Control**
   - Hook: `useAdminAccess`
   - Integration: Workflow dashboard admin-only
   - Status: ✅ Integrated

3. **Team Management**
   - Component: `TeamManagement.tsx`
   - Integration: Phase 3 links to team page
   - Status: ✅ Integrated

4. **QA Sign-Off**
   - Component: `QASignOffDynamic.tsx`
   - Integration: Phase 5 links to QA workflow
   - Status: ✅ Integrated

#### With Future Features

1. **Sister Company Support**
   - Enhancement: Add peer-level organizations
   - Impact: Workflow isolation per sister company
   - Status: 🔄 Planned

2. **Subsidiary Management**
   - Enhancement: Full subsidiary hierarchy
   - Impact: Cascading workflow states
   - Status: 🔄 Planned

3. **Workflow Automation**
   - Enhancement: Auto-advance on completion
   - Impact: Reduced manual progression
   - Status: 🔄 Planned

---

### Routes Summary

**New Routes Added**:
- `/admin/workflow` - Workflow Dashboard (Admin-only)
- `/admin/user-matrix` - User Field Matrix (Admin-only)

**Routes Referenced**:
- All existing routes integrated into workflow phases
- Quick actions link to relevant pages
- Sidebar provides navigation to all workflow-related pages

---

### Documentation References

**Primary Documentation**:
- `docs/ISMS_WORKFLOW.md` - Comprehensive workflow specification
- `.github/agents/README.md` - Custom agent usage guide
- `.github/copilot/agents.yml` - Agent configuration

**Related Documents**:
- This ARCHITECTURE.md - System architecture
- `qa/requirements.json` - QA requirements (to be updated)

---

## Maturion AI Agent Architecture

### Overview

**Maturion** is an enterprise-grade AI assistant specializing in Security, Loss Prevention, and Operational Excellence. The agent implements a sophisticated architecture combining multiple AI models, context awareness, document retrieval (RAG), and tool-based capabilities.

### Core Components

#### 1. Model Router (`/src/agents/maturion/router/modelRouter.ts`)

**Purpose**: Dynamically selects the appropriate AI model based on task complexity

**Supported Models**:
- **GPT-5 Thinking (o1-preview)**: Deep risk reasoning, security analysis, audit interpretation
- **GPT-5 (gpt-4-turbo-preview)**: General conversation, professional advisory
- **GPT-4.1 (gpt-4-turbo-preview)**: Fast classification, lightweight Q/A
- **GPT-4o-mini**: UI responses, metadata formatting
- **Specialist Models**: Future code analysis, log analysis, anomaly detection

**Task Categories**:
```typescript
type TaskCategory =
  | 'deep_reasoning'      // Complex security analysis
  | 'general_advisory'    // Standard conversation
  | 'quick_classification'// Fast categorization
  | 'ui_formatting'       // Response formatting
  | 'code_analysis'       // Code review
  | 'log_analysis'        // Security logs
  | 'anomaly_detection';  // Threat detection
```

**Intelligence**: Automatically infers task category from query content and context

**Status**: ✅ Implemented

---

#### 2. Context Provider (`/src/agents/maturion/context/contextProvider.ts`)

**Purpose**: Provides comprehensive contextual awareness

**Context Elements**:
- **Organization**: ID, name, industry tags, compliance commitments
- **User**: ID, role, name, email
- **Page**: Current page, domain, audit item ID
- **Documents**: Uploaded documents linked to page/domain
- **History**: Last 10 interactions (short-term memory)

**Functions**:
- `buildMaturionContext()`: Constructs context from app state
- `formatContextForPrompt()`: Formats context for AI prompts
- `getRelevantDocuments()`: Filters documents by current page/domain

**Status**: ✅ Implemented

---

#### 3. RAG System (`/src/agents/maturion/rag/documentRetrieval.ts`)

**Purpose**: Retrieval-Augmented Generation for document interpretation

**Capabilities**:
- **Document Chunking**: Splits documents into 800-1200 token chunks with 100-token overlap
- **Embedding Generation**: Creates vector embeddings using OpenAI
- **Semantic Search**: Performs vector similarity search across document chunks
- **Context Retrieval**: Retrieves relevant document sections for AI queries

**Key Functions**:
- `chunkDocument()`: Chunks documents for embedding
- `generateEmbedding()`: Generates embeddings via Edge Function
- `searchDocuments()`: Performs semantic search
- `retrieveContext()`: Retrieves relevant context for queries
- `processDocument()`: Processes newly uploaded documents

**Database Integration**:
- Stores chunks in `document_chunks` table
- Uses vector similarity search (pgvector extension)
- Supports domain/organization filtering

**Status**: ✅ Implemented

---

#### 4. Tool Interface (`/src/agents/maturion/tools/toolInterface.ts`)

**Purpose**: Defines and manages tool-based capabilities

**Tool Definition Structure**:
```typescript
interface ToolDefinition {
  name: string;
  description: string;
  category: ToolCategory;
  parameters: ToolParameter[];
  execute: (args, context) => Promise<ToolResult>;
}
```

**Tool Categories**:
- Policy Management
- Procedure Building
- Threat Analysis
- Control Design
- Maturity Assessment
- Implementation Planning
- Template Generation
- Audit Evidence
- Risk Management
- Incident Analysis
- Governance
- Code Assistance
- Log Analysis

**Tool Registry**: Central registry for registering and executing tools

**Status**: ✅ Implemented

---

#### 5. Core Tools (`/src/agents/maturion/tools/coreTools.ts`)

**Implemented Tools**:

1. **Policy Writer/Updater**
   - Generates security policies aligned with industry standards
   - Supports ISO 27001, NIST, PCI DSS, SOC 2
   - Updates existing policies

2. **Procedure Builder**
   - Creates step-by-step implementation procedures
   - Maps to Six Domains framework
   - Defines roles and responsibilities

3. **Threat Modelling Assistant**
   - Analyzes threats using STRIDE, PASTA, or DREAD
   - Identifies attack vectors
   - Recommends mitigations

4. **Maturity Gap Explainer**
   - Explains gaps between current and target maturity
   - Provides actionable recommendations
   - Estimates timeline and effort

5. **Template Generator**
   - Creates SOPs, logs, registers, checklists
   - Organization-branded templates
   - Domain-specific content

**Future Tools** (Planned):
- Control Design Advisor
- Implementation Roadmap Generator
- Audit Evidence Evaluator
- Risk Register Generator
- Incident Analysis Tool
- Corporate Governance Advisor
- Code Assistance Tool
- Log Parser Security Tool

**Status**: ✅ 5/13 tools implemented

---

#### 6. Guardrails (`/src/agents/maturion/guardrails/guardrails.ts`)

**Purpose**: Security and safety constraints for AI behavior

**Guardrail Rules**:
1. **Organization Isolation**: Actions must be scoped to user's organization
2. **Authentication Required**: User must be authenticated
3. **No Arbitrary URLs**: Direct URL fetching prohibited
4. **No Autonomous Scanning**: Scanning must use approved tools
5. **Admin-Only Modifications**: Data changes require admin role
6. **Cross-Org Prevention**: Cannot access other organizations' data
7. **Sensitive Data Handling**: Detects and protects sensitive information

**Security Functions**:
- `checkGuardrails()`: Validates action permissions
- `sanitizeResponse()`: Removes sensitive data from responses
- `validateToolArguments()`: Prevents SQL/command injection
- `checkRateLimit()`: Rate limiting per user/tool
- `logSecurityEvent()`: Logs security violations

**Status**: ✅ Implemented

---

#### 7. System Prompt (`/src/agents/maturion/prompts/system.md`)

**Purpose**: Core identity and behavioral instructions for Maturion

**Key Elements**:
- Identity as enterprise security AI consultant
- Six Domains expertise
- Standards-based approach (ISO, NIST, ASIS, PCI, SOC 2)
- Tool-usage protocols
- Response formatting guidelines
- Security constraints

**Conversational Style**: Professional, clear, concise, helpful, transparent

**Status**: ✅ Implemented

---

#### 8. Learning Layer (`/src/agents/maturion/learning/learningLayer.ts`)

**Purpose**: Human-in-the-loop learning (NOT autonomous self-training)

**Capabilities**:
- **Pattern Recording**: Stores anonymized interaction patterns
- **Feedback Collection**: Captures user feedback (helpful/rating/comments)
- **Learning Patterns**: Identifies improvement opportunities
- **Developer Approval**: All changes require human approval
- **KB Auto-Ingestion**: Automatically processes new documents

**Learning Pattern Types**:
- Query improvement suggestions
- Tool usage recommendations
- Response quality issues
- Gap identification

**Feedback Analysis**:
- Helpful rate calculation
- Average rating tracking
- Common issue identification
- Improvement suggestions

**Status**: ✅ Implemented

---

#### 9. Main Orchestrator (`/src/agents/maturion/index.ts`)

**Purpose**: Coordinates all Maturion capabilities

**Query Flow**:
1. Check guardrails
2. Select appropriate model
3. Retrieve relevant documents (RAG)
4. Build full prompt with context
5. Execute AI query
6. Handle tool calls (iterative)
7. Sanitize response
8. Calculate confidence score
9. Store interaction
10. Record learning patterns

**Main Function**:
```typescript
queryMaturion(params: MaturionQuery): Promise<MaturionResponse>
```

**Response Structure**:
```typescript
interface MaturionResponse {
  response: string;
  taskCategory: TaskCategory;
  modelUsed: string;
  toolsExecuted: Array<ToolExecution>;
  documentsReferenced: string[];
  confidenceScore: number;
  interactionId: string;
}
```

**Status**: ✅ Implemented

---

### Integration Points

#### With Existing Systems

**MaturionChat Component**: Global chat assistant (already exists)
- Will be enhanced to use new Maturion agent
- Context passed from current page/domain
- Tool results displayed in UI

**Document Upload System**: Existing document processors
- Integration with RAG processing
- Automatic embedding generation
- Vector search capabilities

**Watchdog System**: AI behavior monitoring
- Monitor Maturion queries and responses
- Track confidence scores
- Alert on anomalies

**Admin Dashboard**: Learning pattern review
- View pending learning patterns
- Approve/reject improvements
- Analyze feedback trends

---

### Future Enhancements

#### Multi-Agent Mesh
Instead of single Maturion, implement specialized sub-agents:
- **PolicyCraft**: Policy writing specialist
- **ThreatLens**: Threat analysis specialist
- **AuditMaster**: Audit and compliance specialist
- **CodeSmith**: Code improvement specialist

Maturion delegates to specialized agents based on query type.

#### Industry Intelligence Plugin
- Hook into curated RSS feeds
- MITRE ATT&CK updates
- Security news aggregators
- Industry-specific threat intelligence

#### Advanced Tooling
- Real-time log analysis
- Automated threat detection
- Continuous compliance monitoring
- Code security scanning

---

### Database Schema

**Required Tables**:
```sql
-- AI learning patterns
ai_learning_patterns (
  id uuid primary key,
  pattern_type text,
  description text,
  suggested_improvement text,
  status text,
  occurrence_count integer,
  created_at timestamp,
  approved_by uuid,
  approved_at timestamp
)

-- AI feedback submissions
ai_feedback_submissions (
  id uuid primary key,
  interaction_id text,
  helpful boolean,
  rating integer,
  comment text,
  user_id uuid,
  timestamp timestamp
)

-- Existing: maturion_responses (already in schema)
-- Existing: document_chunks (already in schema)
-- Existing: documents (already in schema)
```

---

### Wiring Status

| Component | Status | Integration |
|-----------|--------|-------------|
| Model Router | ✅ Implemented | Standalone module |
| Context Provider | ✅ Implemented | Standalone module |
| RAG System | ✅ Implemented | Uses existing document_chunks table |
| Tool Interface | ✅ Implemented | Standalone module |
| Core Tools | ✅ 5/13 Implemented | Tool registry |
| Guardrails | ✅ Implemented | Standalone module |
| System Prompt | ✅ Implemented | Markdown file |
| Learning Layer | ✅ Implemented | Requires DB tables |
| Main Orchestrator | ✅ Implemented | Coordinates all components |
| UI Integration | 🔄 Pending | MaturionChat component |
| Watchdog Integration | 🔄 Pending | Monitoring hooks |
| Admin Dashboard | 🔄 Pending | Learning pattern UI |

---

## ISMS Modules Architecture

### Overview

The Integrated Security Management System (ISMS) comprises 7 core modules accessible through the ISMS landing page (`/isms`). Each module represents a distinct functional area of security management.

### Module Hub Page

**ISMS Landing Page** (`ISMSLanding.tsx`)
- **Route**: `/isms`
- **Purpose**: Central hub for all ISMS modules
- **Features**: 
  - Module cards with subscription status
  - Feature previews for each module
  - Active vs. inactive module visualization
  - Direct navigation to subscribed modules
  - Subscription gateway for locked modules
- **Status**: ✅ Wired

### 7 ISMS Modules

#### 1. Maturity Roadmap ✅ Active
- **ID**: `maturity-roadmap`
- **Route**: `/maturity/setup`
- **Status**: Subscribed (default module)
- **Description**: Build and assess organizational security maturity framework across six operational domains
- **Features**:
  - Six Domains Assessment (Leadership & Governance, Process Integrity, People & Culture, Protection, Proof it Works, Performance)
  - Audit Structure Setup
  - Assessment execution
  - Assessment Framework configuration
  - QA Sign-Off workflows
  - Team Management
- **Sidebar Items**:
  - Audit Structure Setup
  - Assessment
  - Assessment Framework
  - QA Sign-Off
  - Team

#### 2. Risk Management 🔒 Planned
- **ID**: `risk-management`
- **Route**: `/risk-management`
- **Status**: Not subscribed
- **Description**: Comprehensive risk identification, assessment, and mitigation strategies
- **Features**:
  - Risk Assessment
  - Threat Modeling
  - Control Registers
  - Compliance Tracking

#### 3. Project Implementation 🔒 Planned
- **ID**: `project-implementation`
- **Route**: `/project-implementation`
- **Status**: Not subscribed
- **Description**: Streamline security project planning, execution, and delivery
- **Features**:
  - Project Planning
  - Resource Management
  - Timeline Tracking
  - Deliverable Management

#### 4. Data Analytics & Assurance 🔒 Planned
- **ID**: `data-analytics`
- **Route**: `/data-analytics`
- **Status**: Not subscribed
- **Description**: AI-driven insights from access control, video surveillance, and operational data
- **Features**:
  - Access Analytics
  - Video Surveillance Analysis
  - Anomaly Detection
  - Compliance Reporting

#### 5. Skills Development Portal 🔒 Planned
- **ID**: `skills-development`
- **Route**: `/skills-development`
- **Status**: Not subscribed
- **Description**: Upskill your security team with globally recognized training and certification programs
- **Features**:
  - Training Programs
  - Certification Tracking
  - Skill Assessments
  - Learning Paths
- **Partnership**: Powered by APGI

#### 6. Incident Management 🔒 Planned
- **ID**: `incident-management`
- **Route**: `/incident-management`
- **Status**: Not subscribed
- **Description**: Rapid incident response, tracking, and resolution workflows
- **Features**:
  - Incident Logging
  - Response Workflows
  - Root Cause Analysis
  - Corrective Actions

#### 7. Systems Data Extraction Tool 🔒 Planned
- **ID**: `systems-extraction`
- **Route**: `/systems-extraction`
- **Status**: Not subscribed
- **Description**: Extract, transform, and analyze data from multiple security and operational systems
- **Features**:
  - Data Extraction
  - System Integration
  - Data Transformation
  - Export & Reporting

### Module Subscription Logic

**Subscription Status Determination**:
- Currently hardcoded in `ISMSLanding.tsx`
- Future: Query `subscriptions` table or user profile
- Default: Maturity Roadmap active for all users

**Navigation Behavior**:
- **Subscribed modules**: Navigate to module route
- **Unsubscribed modules**: Redirect to `/subscribe` page
- **Visual indicators**: Lock icon, greyed out styling, "Not Subscribed" badge

**Implementation Status**: 
- ISMS Landing Page: ✅ Wired
- Maturity Roadmap: ✅ Active and fully functional
- Other modules: 🔒 Planned (UI ready, functionality pending)

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

#### Pages (30/30 Wired - 100%)
✅ All pages properly wired through App.tsx routing (including new Free Assessment page)

#### Component Categories (17/17 Wired - 100%)
✅ All component categories in active use

#### Individual Components (196/196 Wired - 100%)
✅ All components referenced and functional

#### Hooks (44/44 Wired - 100%)
✅ All hooks actively used

#### Edge Functions (54/54 Active - 100%)
✅ All functions deployed and callable

#### Maturion AI Agent Components (9/9 Implemented - 100%)
✅ All core Maturion agent modules implemented:
- Model Router
- Context Provider
- RAG System
- Tool Interface & Core Tools
- Guardrails
- System Prompt
- Learning Layer
- Main Orchestrator

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
| 1.1 | 2025-11-21 | Copilot | Added ISMS Workflow Architecture section with workflow phases, organizational hierarchy, user field matrix, and admin sidebar integration |
| 1.2 | 2025-11-23 | Copilot | Restructured sidebar navigation workflow: Pre-subscription pages (no sidebar), Maturity Roadmap section for users, Admin-only sections (Maturion, Settings, Admin, Watchdog). Updated page inventory and routes. |
| 1.3 | 2025-11-23 | Copilot | Added Maturion AI Agent Architecture section with comprehensive documentation of model routing, context awareness, RAG system, tools, guardrails, and learning layer. Added Free Assessment page to Pre-subscription category. Updated page count to 30. |

---

**END OF ARCHITECTURE DOCUMENT**

This document serves as the "True North" for all development, QA, and deployment activities on the Maturion Genesis Forge platform. All changes must be validated against this architecture before deployment.
