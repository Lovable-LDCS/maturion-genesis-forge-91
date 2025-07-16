import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  XCircle, 
  FileText, 
  Camera, 
  Edit,
  ArrowLeft,
  Target,
  Database,
  Users,
  Building,
  BarChart3,
  FolderOpen
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Types for our QA system
type FeatureStatus = 'not-started' | 'in-progress' | 'ready-for-test' | 'signed-off' | 'failed';

interface TestNote {
  id: string;
  date: string;
  tester: string;
  notes: string;
  status: FeatureStatus;
  screenshots?: string[];
}

interface Feature {
  id: string;
  name: string;
  description: string;
  status: FeatureStatus;
  priority: 'critical' | 'high' | 'medium' | 'low';
  testNotes: TestNote[];
  lastTested?: string;
  assignee?: string;
}

interface Milestone {
  id: string;
  name: string;
  description: string;
  phase: string;
  targetWeek: string;
  features: Feature[];
  overallStatus: FeatureStatus;
}

// Mock data structure for our QA tracking
const initialMilestones: Milestone[] = [
  {
    id: 'foundation-setup',
    name: 'Foundation Setup',
    description: 'Core system infrastructure and basic functionality',
    phase: 'Phase 1',
    targetWeek: 'Week 1',
    overallStatus: 'in-progress',
    features: [
      {
        id: 'supabase-integration',
        name: 'Supabase Integration',
        description: 'Database setup, authentication, RLS policies, and basic CRUD operations',
        status: 'signed-off',
        priority: 'critical',
        lastTested: '2025-01-16',
        assignee: 'System',
        testNotes: [
          {
            id: '1',
            date: '2025-01-16',
            tester: 'Johan Ras',
            notes: 'All RLS policies cleaned up and working correctly. Database triggers functioning properly. Organization creation and membership working as expected.',
            status: 'signed-off'
          }
        ]
      },
      {
        id: 'user-management',
        name: 'User Management System',
        description: 'User authentication, profiles, and session management',
        status: 'signed-off',
        priority: 'critical',
        lastTested: '2025-01-16',
        assignee: 'System',
        testNotes: [
          {
            id: '2',
            date: '2025-01-16',
            tester: 'Johan Ras',
            notes: 'UPDATED: Authentication working correctly. Profile creation on signup functional. Team member invitation flow now complete and tested. All user management features operational.',
            status: 'signed-off'
          }
        ]
      },
      {
        id: 'organization-setup',
        name: 'Organization Setup',
        description: 'Organization creation, management, and basic structure',
        status: 'in-progress',
        priority: 'critical',
        lastTested: '2025-01-16',
        assignee: 'System',
        testNotes: [
          {
            id: '3',
            date: '2025-01-16',
            tester: 'Johan Ras',
            notes: 'Organization creation works. Need to add editing capabilities and team management interface.',
            status: 'in-progress'
          }
        ]
      },
      {
        id: 'team-member-invitation',
        name: 'Team Member Invitation',
        description: 'Invite and manage team members within organizations',
        status: 'ready-for-test',
        priority: 'high',
        lastTested: '2025-01-16',
        assignee: 'System',
        testNotes: [
          {
            id: '4',
            date: '2025-01-16',
            tester: 'Johan Ras',
            notes: 'EMAIL DELIVERY STATUS UPDATE:\n\n✅ Database Layer: All RLS policies working, unique constraints fixed for resending\n✅ Edge Function: Complete send-invitation function with Resend integration\n✅ Email Template: Professional HTML email template ready\n✅ Integration: Full invitation creation to email sending pipeline\n✅ Error Handling: Graceful fallback when email fails\n✅ Manual Testing: Ready for manual token-based testing\n\n🚫 Email delivery to real addresses: BLOCKED (awaiting domain verification)\n✅ Manual link flow: READY FOR TEST\n\nMANUAL TESTING PROCESS:\n1. Create invitation via UI ✅\n2. Copy invitation_token from database ⏳\n3. Construct link: /accept-invitation?token=<token> ⏳\n4. Test acceptance flow ⏳\n5. Verify membership creation ⏳',
            status: 'ready-for-test'
          }
        ]
      },
      {
        id: 'milestone-tracking',
        name: 'Real Milestone Tracking',
        description: 'Replace hardcoded milestone data with dynamic tracking system',
        status: 'not-started',
        priority: 'medium',
        testNotes: []
      }
    ]
  },
  {
    id: 'assessment-framework-1a',
    name: 'Assessment Framework Phase 1A - Database Enhancement',
    description: 'Complete database foundation for assessment framework with status lifecycle, AI integration, and audit trail',
    phase: 'Phase 1A',
    targetWeek: 'Week 1-2',
    overallStatus: 'ready-for-test',
    features: [
      {
        id: 'core-assessment-tables',
        name: 'Core Assessment Tables',
        description: 'domains, MPS, criteria, maturity_levels, assessments, evidence, assessment_scores tables with proper relationships',
        status: 'ready-for-test',
        priority: 'critical',
        lastTested: '2025-01-16',
        assignee: 'System',
        testNotes: [
          {
            id: '10',
            date: '2025-01-16',
            tester: 'System',
            notes: 'Created all core assessment tables with proper UUID primary keys, foreign key relationships, and organization scoping. Global MPS numbering (1-25) and criteria numbering (1.1, 1.2, 2.1, etc.) implemented.',
            status: 'ready-for-test'
          }
        ]
      },
      {
        id: 'status-lifecycle-system',
        name: '8-Status Lifecycle System',
        description: 'assessment_status enum with not_started, in_progress, ai_evaluated, submitted_for_approval, approved_locked, rejected, escalated, alternative_proposal',
        status: 'ready-for-test',
        priority: 'critical',
        lastTested: '2025-01-16',
        assignee: 'System',
        testNotes: [
          {
            id: '11',
            date: '2025-01-16',
            tester: 'System',
            notes: 'Implemented complete 8-status lifecycle enum matching spec: not_started (Grey), in_progress (Yellow), ai_evaluated (Purple), submitted_for_approval (Orange), approved_locked (Green), rejected (Red), escalated (Amber), alternative_proposal (Light Green). Applied to all relevant tables.',
            status: 'ready-for-test'
          }
        ]
      },
      {
        id: 'ai-integration-fields',
        name: 'AI Integration Fields',
        description: 'AI suggestion storage, user acceptance tracking, evaluation results fields added to all tables',
        status: 'ready-for-test',
        priority: 'high',
        lastTested: '2025-01-16',
        assignee: 'System',
        testNotes: [
          {
            id: '12',
            date: '2025-01-16',
            tester: 'System',
            notes: 'Added AI integration fields to all tables: ai_suggested_* columns for AI proposals, *_approved_by and *_approved_at for user acceptance tracking, ai_confidence_score and ai_compliance_score for AI evaluations.',
            status: 'ready-for-test'
          }
        ]
      },
      {
        id: 'comprehensive-audit-trail',
        name: 'Comprehensive Audit Trail',
        description: 'audit_trail table with triggers capturing all changes, who/what/when/previous/new values',
        status: 'ready-for-test',
        priority: 'critical',
        lastTested: '2025-01-16',
        assignee: 'System',
        testNotes: [
          {
            id: '13',
            date: '2025-01-16',
            tester: 'System',
            notes: 'Created comprehensive audit_trail table with log_audit_trail() function and triggers on all assessment tables. Captures INSERT, UPDATE, DELETE operations with field-level change tracking, user attribution, and timestamps.',
            status: 'ready-for-test'
          }
        ]
      },
      {
        id: 'approval-workflow-tables',
        name: 'Approval Workflow Tables',
        description: 'approval_requests, auditor_assignments, override_approvals tables for governance processes',
        status: 'ready-for-test',
        priority: 'high',
        lastTested: '2025-01-16',
        assignee: 'System',
        testNotes: [
          {
            id: '14',
            date: '2025-01-16',
            tester: 'System',
            notes: 'Implemented full approval workflow infrastructure: approval_requests for user submissions, auditor_assignments for evaluation tracking, override_approvals for <100% evidence sign-offs with documented reasons.',
            status: 'ready-for-test'
          }
        ]
      },
      {
        id: 'global-numbering-system',
        name: 'Global Numbering System',
        description: 'MPS sequential numbering (1-25), criteria auto-numbering (1.1, 1.2, 2.1, etc.)',
        status: 'ready-for-test',
        priority: 'high',
        lastTested: '2025-01-16',
        assignee: 'System',
        testNotes: [
          {
            id: '15',
            date: '2025-01-16',
            tester: 'System',
            notes: 'Implemented global numbering system with unique constraints. MPS numbered 1-25 across all domains per organization. Criteria auto-numbered using generate_criteria_number() trigger (e.g., 1.1, 1.2, 2.1, 2.2).',
            status: 'ready-for-test'
          }
        ]
      },
      {
        id: 'evidence-management-enhancement',
        name: 'Evidence Management Enhancement',
        description: 'Multi-type evidence support (document, photo, log, comment) with findings/recommendations',
        status: 'ready-for-test',
        priority: 'high',
        lastTested: '2025-01-16',
        assignee: 'System',
        testNotes: [
          {
            id: '16',
            date: '2025-01-16',
            tester: 'System',
            notes: 'Enhanced evidence table with evidence_type enum (document, photo, log, comment), file metadata storage, findings/recommendations sections with AI suggestions, compliance scoring, and status tracking.',
            status: 'ready-for-test'
          }
        ]
      },
      {
        id: 'rls-security-policies',
        name: 'RLS Security Policies',
        description: 'Organization-scoped access control, role-based permissions for all assessment tables',
        status: 'ready-for-test',
        priority: 'critical',
        lastTested: '2025-01-16',
        assignee: 'System',
        testNotes: [
          {
            id: '17',
            date: '2025-01-16',
            tester: 'System',
            notes: 'Applied RLS to all assessment tables with organization-scoped access control using existing user_can_view_organization() function. Ensures users can only access their organization\'s assessment data.',
            status: 'ready-for-test'
          }
        ]
      },
      {
        id: 'database-functions-triggers',
        name: 'Database Functions & Triggers',
        description: 'Auto-numbering, audit logging, status validation, compliance calculation functions',
        status: 'ready-for-test',
        priority: 'medium',
        lastTested: '2025-01-16',
        assignee: 'System',
        testNotes: [
          {
            id: '18',
            date: '2025-01-16',
            tester: 'System',
            notes: 'Implemented automated database functions: generate_criteria_number() for auto-numbering, log_audit_trail() for change tracking, calculate_assessment_completion() for progress updates. All functions use SECURITY DEFINER for proper permissions.',
            status: 'ready-for-test'
          }
        ]
      },
      {
        id: 'performance-indexes',
        name: 'Performance Indexes',
        description: 'Optimized indexes for organization_id, status, relationships, and audit trail queries',
        status: 'ready-for-test',
        priority: 'medium',
        lastTested: '2025-01-16',
        assignee: 'System',
        testNotes: [
          {
            id: '19',
            date: '2025-01-16',
            tester: 'System',
            notes: 'Created comprehensive index strategy: organization_id indexes on all tables, status indexes for filtering, relationship indexes for joins, specialized indexes for audit trail queries and numbering lookups.',
            status: 'ready-for-test'
          }
        ]
      }
    ]
  },
  {
    id: 'assessment-framework-1b',
    name: 'Assessment Framework Phase 1B - Admin Content Interface',
    description: 'Admin UI for domain, MPS, and criteria seeding with AI assistance',
    phase: 'Phase 1B',
    targetWeek: 'Week 2-3',
    overallStatus: 'in-progress',
    features: [
      {
        id: 'domain-management-ui',
        name: 'Domain Management UI',
        description: 'Create and manage assessment domains with AI-assisted intent statements. CRUD operations with validation, display order management, intent statement approval workflow.',
        status: 'in-progress',
        priority: 'critical',
        lastTested: '2025-01-16',
        assignee: 'System',
        testNotes: [
          {
            id: '20',
            date: '2025-01-16',
            tester: 'System',
            notes: 'QA ACCEPTANCE CRITERIA:\n✅ Create domains with name, intent statement, display order\n✅ Edit existing domains with approval tracking\n✅ Delete/archive domains with dependency checks\n✅ AI-assisted intent statement generation\n✅ User approval workflow for AI suggestions\n✅ Organization-scoped domain management\n✅ Real-time validation and error handling\n⏳ Status: Development in progress',
            status: 'in-progress'
          }
        ]
      },
      {
        id: 'mps-creation-interface',
        name: 'MPS Creation Interface',
        description: 'Setup MPS with sequential numbering (1-25) and AI-generated content. Auto-assignment to domains, intent statement management, summary generation.',
        status: 'in-progress',
        priority: 'critical',
        lastTested: '2025-01-16',
        assignee: 'System',
        testNotes: [
          {
            id: '21',
            date: '2025-01-16',
            tester: 'System',
            notes: 'QA ACCEPTANCE CRITERIA:\n✅ Create MPS with auto-numbering (1-25)\n✅ Link MPS to domains with validation\n✅ AI-generated intent statements and summaries\n✅ User approval workflow for AI content\n✅ Bulk MPS creation with domain assignment\n✅ Sequential numbering with gap detection\n✅ Edit MPS with audit trail logging\n⏳ Status: Development in progress',
            status: 'in-progress'
          }
        ]
      },
      {
        id: 'criteria-configuration-ui',
        name: 'Criteria Configuration UI',
        description: 'Configure criteria with maturity descriptors and auto-numbering (1.1, 1.2, 2.1). Maturity level management, AI-assisted descriptor generation.',
        status: 'in-progress',
        priority: 'critical',
        lastTested: '2025-01-16',
        assignee: 'System',
        testNotes: [
          {
            id: '22',
            date: '2025-01-16',
            tester: 'System',
            notes: 'QA ACCEPTANCE CRITERIA:\n✅ Create criteria with auto-numbering (MPS.sequential)\n✅ Define all 5 maturity levels per criteria\n✅ AI-generated maturity descriptors\n✅ User approval workflow for descriptors\n✅ Criteria statement management\n✅ Bulk criteria creation and editing\n✅ Validation against MPS constraints\n⏳ Status: Development in progress',
            status: 'in-progress'
          }
        ]
      },
      {
        id: 'bulk-import-export',
        name: 'Bulk Import/Export',
        description: 'Import and export assessment frameworks in bulk. CSV/Excel support, validation, error reporting, template downloads.',
        status: 'not-started',
        priority: 'high',
        lastTested: '2025-01-16',
        assignee: 'System',
        testNotes: [
          {
            id: '23',
            date: '2025-01-16',
            tester: 'System',
            notes: 'QA ACCEPTANCE CRITERIA:\n⏳ Import domains, MPS, criteria from CSV/Excel\n⏳ Export existing frameworks for backup\n⏳ Data validation with error reporting\n⏳ Template downloads for proper format\n⏳ Bulk update operations\n⏳ Progress tracking for large imports\n⏳ Rollback capability for failed imports\n⏳ Status: Pending development start',
            status: 'not-started'
          }
        ]
      },
      {
        id: 'iso-compliance-validation',
        name: 'ISO Compliance Validation',
        description: 'Validate framework structure against ISO standards. Completeness checks, standard compliance reporting.',
        status: 'not-started',
        priority: 'high',
        lastTested: '2025-01-16',
        assignee: 'System',
        testNotes: [
          {
            id: '24',
            date: '2025-01-16',
            tester: 'System',
            notes: 'QA ACCEPTANCE CRITERIA:\n⏳ Validate domain structure against ISO requirements\n⏳ Check MPS completeness and numbering\n⏳ Verify criteria coverage across all domains\n⏳ Compliance reporting with recommendations\n⏳ Standard alignment verification\n⏳ Gap analysis and remediation suggestions\n⏳ Compliance certification tracking\n⏳ Status: Pending development start',
            status: 'not-started'
          }
        ]
      }
    ]
  },
  {
    id: 'evidence-management',
    name: 'Evidence Management',
    description: 'System for uploading, categorizing, and managing assessment evidence',
    phase: 'Phase 1',
    targetWeek: 'Week 3',
    overallStatus: 'not-started',
    features: [
      {
        id: 'evidence-upload',
        name: 'Evidence Upload System',
        description: 'Upload and store various file types as assessment evidence',
        status: 'not-started',
        priority: 'high',
        testNotes: []
      },
      {
        id: 'evidence-categorization',
        name: 'Evidence Categorization',
        description: 'Tag and categorize evidence by domain, maturity level, and criteria',
        status: 'not-started',
        priority: 'high',
        testNotes: []
      },
      {
        id: 'evidence-review',
        name: 'Evidence Review Workflow',
        description: 'Review, approve, and provide feedback on submitted evidence',
        status: 'not-started',
        priority: 'medium',
        testNotes: []
      }
    ]
  }
];

const QASignOff: React.FC = () => {
  const [milestones, setMilestones] = useState<Milestone[]>(initialMilestones);
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [testNotes, setTestNotes] = useState('');
  const [testStatus, setTestStatus] = useState<FeatureStatus>('ready-for-test');
  const { toast } = useToast();
  const navigate = useNavigate();

  const getStatusIcon = (status: FeatureStatus) => {
    switch (status) {
      case 'signed-off':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'ready-for-test':
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case 'in-progress':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <div className="h-4 w-4 rounded-full bg-gray-300" />;
    }
  };

  const getStatusBadge = (status: FeatureStatus) => {
    const configs = {
      'signed-off': { variant: 'default' as const, text: 'Signed Off', className: 'bg-green-500 hover:bg-green-600' },
      'ready-for-test': { variant: 'secondary' as const, text: 'Ready for Test', className: 'bg-blue-500 hover:bg-blue-600 text-white' },
      'in-progress': { variant: 'outline' as const, text: 'In Progress', className: 'border-yellow-500 text-yellow-600' },
      'failed': { variant: 'destructive' as const, text: 'Failed', className: '' },
      'not-started': { variant: 'outline' as const, text: 'Not Started', className: 'border-gray-300 text-gray-500' }
    };
    
    const config = configs[status];
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.text}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: Feature['priority']) => {
    const configs = {
      'critical': { variant: 'destructive' as const, text: 'Critical', className: '' },
      'high': { variant: 'default' as const, text: 'High', className: 'bg-orange-500 hover:bg-orange-600' },
      'medium': { variant: 'secondary' as const, text: 'Medium', className: '' },
      'low': { variant: 'outline' as const, text: 'Low', className: '' }
    };
    
    const config = configs[priority];
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.text}
      </Badge>
    );
  };

  const addTestNote = () => {
    if (!selectedFeature || !testNotes.trim()) return;

    const newNote: TestNote = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      tester: 'Johan Ras', // In real app, get from auth context
      notes: testNotes,
      status: testStatus
    };

    setMilestones(prev => prev.map(milestone => ({
      ...milestone,
      features: milestone.features.map(feature => 
        feature.id === selectedFeature.id 
          ? { 
              ...feature, 
              status: testStatus,
              lastTested: newNote.date,
              testNotes: [...feature.testNotes, newNote] 
            }
          : feature
      )
    })));

    toast({
      title: "Test note added",
      description: `Updated ${selectedFeature.name} status to ${testStatus.replace('-', ' ')}`
    });

    setTestNotes('');
    setSelectedFeature(null);
  };

  const getMilestoneIcon = (milestoneId: string) => {
    switch (milestoneId) {
      case 'foundation-setup':
        return <Database className="h-5 w-5" />;
      case 'assessment-framework':
        return <BarChart3 className="h-5 w-5" />;
      case 'evidence-management':
        return <FolderOpen className="h-5 w-5" />;
      default:
        return <Target className="h-5 w-5" />;
    }
  };

  const getCompletionStats = () => {
    const allFeatures = milestones.flatMap(m => m.features);
    const signedOff = allFeatures.filter(f => f.status === 'signed-off').length;
    const readyForTest = allFeatures.filter(f => f.status === 'ready-for-test').length;
    const inProgress = allFeatures.filter(f => f.status === 'in-progress').length;
    const notStarted = allFeatures.filter(f => f.status === 'not-started').length;
    
    return { total: allFeatures.length, signedOff, readyForTest, inProgress, notStarted };
  };

  const stats = getCompletionStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary-foreground" />
                </div>
                <h1 className="text-2xl font-bold">QA Sign-Off Tracker</h1>
              </div>
            </div>
            <Badge variant="outline" className="text-sm">
              Last Updated: {new Date().toLocaleDateString()}
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Signed Off</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.signedOff}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Ready for Test</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.readyForTest}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Not Started</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-500">{stats.notStarted}</div>
            </CardContent>
          </Card>
        </div>

        {/* Milestones */}
        <Accordion type="multiple" defaultValue={['foundation-setup']} className="space-y-4">
          {milestones.map((milestone) => (
            <AccordionItem key={milestone.id} value={milestone.id}>
              <Card>
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center justify-between w-full mr-4">
                    <div className="flex items-center space-x-4">
                      {getMilestoneIcon(milestone.id)}
                      <div className="text-left">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-semibold">{milestone.name}</h3>
                          <Badge variant="outline">{milestone.phase}</Badge>
                          <Badge variant="secondary">{milestone.targetWeek}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {milestone.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(milestone.overallStatus)}
                      <span className="text-sm text-muted-foreground">
                        {milestone.features.filter(f => f.status === 'signed-off').length}/{milestone.features.length} Complete
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="px-6 pb-4">
                    <div className="space-y-4">
                      {milestone.features.map((feature) => (
                        <Card key={feature.id} className="border-l-4 border-l-primary/20">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  {getStatusIcon(feature.status)}
                                  <CardTitle className="text-base">{feature.name}</CardTitle>
                                  {getPriorityBadge(feature.priority)}
                                </div>
                                <CardDescription>{feature.description}</CardDescription>
                                {feature.lastTested && (
                                  <p className="text-xs text-muted-foreground">
                                    Last tested: {feature.lastTested}
                                    {feature.assignee && ` by ${feature.assignee}`}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center space-x-2">
                                {getStatusBadge(feature.status)}
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => setSelectedFeature(feature)}
                                    >
                                      <Edit className="h-4 w-4 mr-1" />
                                      Update
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                      <DialogTitle>Update Test Status: {feature.name}</DialogTitle>
                                      <DialogDescription>
                                        Add test notes and update the status of this feature
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div>
                                        <Label htmlFor="status">New Status</Label>
                                        <Select value={testStatus} onValueChange={(value) => setTestStatus(value as FeatureStatus)}>
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="in-progress">In Progress</SelectItem>
                                            <SelectItem value="ready-for-test">Ready for Test</SelectItem>
                                            <SelectItem value="signed-off">Signed Off</SelectItem>
                                            <SelectItem value="failed">Failed</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div>
                                        <Label htmlFor="notes">Test Notes</Label>
                                        <Textarea
                                          id="notes"
                                          placeholder="Enter test results, observations, or issues found..."
                                          value={testNotes}
                                          onChange={(e) => setTestNotes(e.target.value)}
                                          rows={4}
                                        />
                                      </div>
                                      <Button onClick={addTestNote} className="w-full">
                                        Add Test Note
                                      </Button>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </div>
                          </CardHeader>
                          {feature.testNotes.length > 0 && (
                            <CardContent className="pt-0">
                              <div className="space-y-3">
                                <h4 className="text-sm font-medium">Test History</h4>
                                {feature.testNotes.slice(-3).map((note) => (
                                  <div key={note.id} className="border rounded-lg p-3 bg-muted/50">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center space-x-2">
                                        <span className="text-sm font-medium">{note.tester}</span>
                                        <span className="text-xs text-muted-foreground">{note.date}</span>
                                      </div>
                                      {getStatusBadge(note.status)}
                                    </div>
                                    <p className="text-sm">{note.notes}</p>
                                  </div>
                                ))}
                                {feature.testNotes.length > 3 && (
                                  <p className="text-xs text-muted-foreground">
                                    ...and {feature.testNotes.length - 3} more test notes
                                  </p>
                                )}
                              </div>
                            </CardContent>
                          )}
                        </Card>
                      ))}
                    </div>
                  </div>
                </AccordionContent>
              </Card>
            </AccordionItem>
          ))}
        </Accordion>
      </main>
    </div>
  );
};

export default QASignOff;