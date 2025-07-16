import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useMilestones, MilestoneInsert, MilestoneTaskInsert } from '@/hooks/useMilestones';
import { Database } from '@/integrations/supabase/types';
import { Loader2, Database as DatabaseIcon } from 'lucide-react';

interface MilestoneDataSeederProps {
  organizationId: string;
  userId: string;
  onSeedComplete?: () => void;
}

// Real project milestone data to seed the database
const SEED_MILESTONES = [
  {
    name: 'Organization Setup',
    description: 'Core organization management functionality for APGI',
    phase: 'Foundation',
    week: 1,
    priority: 'critical' as const,
    status: 'not_started' as const,
    display_order: 1,
    tasks: [
      {
        name: 'Create Organization',
        description: 'Implement organization creation with name, description, owner assignment. Validate required fields, handle database errors, show success confirmation.',
        status: 'not_started' as const,
        display_order: 1,
      },
      {
        name: 'Edit Organization',
        description: 'Enable organization editing for owners/admins. Form validation, permission checks, optimistic updates, error handling.',
        status: 'not_started' as const,
        display_order: 2,
      },
      {
        name: 'Delete Organization',
        description: 'Implement organization deletion with cascade handling. Confirmation dialog, data cleanup, member notification, audit trail.',
        status: 'not_started' as const,
        display_order: 3,
      },
      {
        name: 'Organization Settings',
        description: 'Settings page for organization configuration. Branding, preferences, integrations, notification settings.',
        status: 'not_started' as const,
        display_order: 4,
      }
    ]
  },
  {
    name: 'Team Management',
    description: 'Complete team invitation and member management system',
    phase: 'Foundation',
    week: 2,
    priority: 'high' as const,
    status: 'not_started' as const,
    display_order: 2,
    tasks: [
      {
        name: 'Invitation Flow',
        description: 'Send team invitations via email. Role selection, expiration handling, duplicate prevention, email validation.',
        status: 'not_started' as const,
        display_order: 1,
      },
      {
        name: 'Invitation Acceptance',
        description: 'Accept invitations and join organizations. Token validation, email matching, membership creation, welcome flow.',
        status: 'not_started' as const,
        display_order: 2,
      },
      {
        name: 'Resend Invitations',
        description: 'Resend pending invitations. Status tracking, rate limiting, notification updates, audit logging.',
        status: 'not_started' as const,
        display_order: 3,
      },
      {
        name: 'Cancel Invitations',
        description: 'Cancel pending invitations. Permission validation, status updates, notification cleanup, audit trail.',
        status: 'not_started' as const,
        display_order: 4,
      },
      {
        name: 'Member Management',
        description: 'Manage existing team members. Role changes, member removal, permission controls, activity tracking.',
        status: 'not_started' as const,
        display_order: 5,
      }
    ]
  },
  {
    name: 'Assessment Framework Phase 1A - Database Enhancement',
    description: 'Complete database foundation for assessment framework with status lifecycle, AI integration, and audit trail',
    phase: 'Phase 1A',
    week: 3,
    priority: 'critical' as const,
    status: 'signed_off' as const,
    display_order: 3,
    tasks: [
      {
        name: 'Core Assessment Tables',
        description: 'domains, MPS, criteria, maturity_levels, assessments, evidence, assessment_scores tables with proper relationships',
        status: 'signed_off' as const,
        display_order: 1,
      },
      {
        name: '8-Status Lifecycle System',
        description: 'assessment_status enum with not_started, in_progress, ai_evaluated, submitted_for_approval, approved_locked, rejected, escalated, alternative_proposal',
        status: 'signed_off' as const,
        display_order: 2,
      },
      {
        name: 'AI Integration Fields',
        description: 'AI suggestion storage, user acceptance tracking, evaluation results fields added to all tables',
        status: 'signed_off' as const,
        display_order: 3,
      },
      {
        name: 'Comprehensive Audit Trail',
        description: 'audit_trail table with triggers capturing all changes, who/what/when/previous/new values',
        status: 'signed_off' as const,
        display_order: 4,
      },
      {
        name: 'RLS Security Policies',
        description: 'Organization-scoped access control, role-based permissions for all assessment tables',
        status: 'signed_off' as const,
        display_order: 5,
      },
      {
        name: 'Auto-numbering Triggers',
        description: 'Automatic criteria numbering (MPS.sequential), validation triggers, data integrity constraints',
        status: 'signed_off' as const,
        display_order: 6,
      },
      {
        name: 'Assessment Score Calculations',
        description: 'Completion percentage calculations, evidence scoring, AI confidence tracking, maturity level assignments',
        status: 'signed_off' as const,
        display_order: 7,
      },
      {
        name: 'Approval Workflow Tables',
        description: 'approval_requests, override_approvals tables with decision tracking, escalation paths, approval history',
        status: 'signed_off' as const,
        display_order: 8,
      },
      {
        name: 'Auditor Assignment System',
        description: 'auditor_assignments table with site visit scheduling, completion tracking, assignment management',
        status: 'signed_off' as const,
        display_order: 9,
      },
      {
        name: 'Performance Indexes',
        description: 'Database indexes for query optimization, foreign key constraints, composite indexes for filtering',
        status: 'signed_off' as const,
        display_order: 10,
      }
    ]
  },
  {
    name: 'Assessment Framework Phase 1B - Admin Content Interface',
    description: 'Admin UI for domain, MPS, and criteria seeding with AI assistance',
    phase: 'Phase 1B',
    week: 4,
    priority: 'critical' as const,
    status: 'in_progress' as const,
    display_order: 4,
    tasks: [
      {
        name: 'Domain Management UI',
        description: 'Create and manage assessment domains with AI-assisted intent statements. CRUD operations with validation, display order management, intent statement approval workflow.',
        status: 'in_progress' as const,
        display_order: 1,
      },
      {
        name: 'MPS Creation Interface',
        description: 'Setup MPS with sequential numbering (1-25) and AI-generated content. Auto-assignment to domains, intent statement management, summary generation.',
        status: 'in_progress' as const,
        display_order: 2,
      },
      {
        name: 'Criteria Configuration UI',
        description: 'Configure criteria with maturity descriptors and auto-numbering (MPS.sequential). Maturity level management, AI-assisted descriptor generation.',
        status: 'in_progress' as const,
        display_order: 3,
      },
      {
        name: 'Bulk Import/Export',
        description: 'Import and export assessment frameworks in bulk. CSV/Excel support, validation, error reporting, template downloads.',
        status: 'not_started' as const,
        display_order: 4,
      },
      {
        name: 'ISO Compliance Validation',
        description: 'Validate framework structure against ISO standards. Completeness checks, standard compliance reporting.',
        status: 'not_started' as const,
        display_order: 5,
      }
    ]
  },
  {
    name: 'Evidence Management System',
    description: 'Complete evidence upload, categorization, and review workflow for assessments',
    phase: 'Phase 2',
    week: 5,
    priority: 'high' as const,
    status: 'not_started' as const,
    display_order: 5,
    tasks: [
      {
        name: 'Evidence Upload System',
        description: 'File upload interface with drag-drop, progress tracking, file validation. Support for documents, photos, logs, comments.',
        status: 'not_started' as const,
        display_order: 1,
      },
      {
        name: 'Evidence Categorization',
        description: 'Categorize evidence by type and criteria. Metadata management, tagging system, search functionality.',
        status: 'not_started' as const,
        display_order: 2,
      },
      {
        name: 'Evidence Review Workflow',
        description: 'Review and approval workflow for evidence. AI-assisted evaluation, compliance scoring, findings documentation.',
        status: 'not_started' as const,
        display_order: 3,
      },
      {
        name: 'Evidence Storage Management',
        description: 'Supabase storage bucket configuration, file organization, access permissions, cleanup policies.',
        status: 'not_started' as const,
        display_order: 4,
      },
      {
        name: 'Evidence Analytics',
        description: 'Evidence completion tracking, quality metrics, compliance scoring analytics, reporting dashboard.',
        status: 'not_started' as const,
        display_order: 5,
      }
    ]
  },
  {
    name: 'Milestone Tracking System',
    description: 'Real-time milestone and task tracking with QA sign-off workflow',
    phase: 'Meta',
    week: 6,
    priority: 'medium' as const,
    status: 'ready_for_test' as const,
    display_order: 6,
    tasks: [
      {
        name: 'Dynamic QA Sign-off Page',
        description: 'Connected QA page to milestone database tables. Real-time updates, persistent storage, organization scoping.',
        status: 'ready_for_test' as const,
        display_order: 1,
      },
      {
        name: 'Milestone Status Tracking',
        description: '8-status lifecycle for milestones and tasks. Status history, change auditing, approval workflow integration.',
        status: 'ready_for_test' as const,
        display_order: 2,
      },
      {
        name: 'Test Notes and Comments',
        description: 'Test notes attached to tasks with status context. Comments, feedback, approval reasons, issue tracking.',
        status: 'ready_for_test' as const,
        display_order: 3,
      },
      {
        name: 'Milestone Data Seeding',
        description: 'Database seeding component for initial milestone structure. Organization-scoped, RLS-compliant data seeding.',
        status: 'ready_for_test' as const,
        display_order: 4,
      },
      {
        name: 'Progress Analytics',
        description: 'Progress tracking, completion metrics, timeline analysis, team performance indicators.',
        status: 'not_started' as const,
        display_order: 5,
      }
    ]
  }
];

export const MilestoneDataSeeder: React.FC<MilestoneDataSeederProps> = ({
  organizationId,
  userId,
  onSeedComplete
}) => {
  const [isSeeding, setIsSeeding] = useState(false);
  const { createMilestone, createMilestoneTask, milestones } = useMilestones(organizationId);
  const { toast } = useToast();

  const seedMilestoneData = async () => {
    setIsSeeding(true);

    try {
      for (const milestoneData of SEED_MILESTONES) {
        // Create milestone
        const milestoneInsert: MilestoneInsert = {
          organization_id: organizationId,
          created_by: userId,
          updated_by: userId,
          name: milestoneData.name,
          description: milestoneData.description,
          phase: milestoneData.phase,
          week: milestoneData.week,
          priority: milestoneData.priority,
          status: milestoneData.status,
          display_order: milestoneData.display_order,
        };

        const milestone = await createMilestone(milestoneInsert);

        // Create tasks for this milestone
        for (const taskData of milestoneData.tasks) {
          const taskInsert: MilestoneTaskInsert = {
            organization_id: organizationId,
            milestone_id: milestone.id,
            created_by: userId,
            updated_by: userId,
            name: taskData.name,
            description: taskData.description,
            status: taskData.status,
            display_order: taskData.display_order,
          };

          await createMilestoneTask(taskInsert);
        }
      }

      toast({
        title: 'Success',
        description: 'Milestone data seeded successfully!',
      });

      onSeedComplete?.();
    } catch (error) {
      console.error('Error seeding milestone data:', error);
      toast({
        title: 'Error',
        description: 'Failed to seed milestone data',
        variant: 'destructive',
      });
    } finally {
      setIsSeeding(false);
    }
  };

  const hasExistingMilestones = milestones.length > 0;

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DatabaseIcon className="h-5 w-5" />
          Milestone Data Seeder
        </CardTitle>
        <CardDescription>
          {hasExistingMilestones 
            ? 'Milestones already exist in the database'
            : 'Seed the database with initial milestone data'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={seedMilestoneData}
          disabled={isSeeding || hasExistingMilestones}
          className="w-full"
        >
          {isSeeding ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Seeding Data...
            </>
          ) : hasExistingMilestones ? (
            'Data Already Seeded'
          ) : (
            'Seed Milestone Data'
          )}
        </Button>
        
        {hasExistingMilestones && (
          <p className="text-sm text-muted-foreground mt-2">
            Found {milestones.length} existing milestones in the database.
          </p>
        )}
      </CardContent>
    </Card>
  );
};