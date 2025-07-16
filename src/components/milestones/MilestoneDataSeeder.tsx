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

// Hardcoded milestone data to seed the database
const SEED_MILESTONES = [
  {
    name: 'Foundation Setup',
    description: 'Core system infrastructure and basic functionality',
    phase: 'Phase 1',
    week: 1,
    priority: 'critical' as const,
    status: 'in_progress' as const,
    display_order: 1,
    tasks: [
      {
        name: 'Supabase Integration',
        description: 'Database setup, authentication, RLS policies, and basic CRUD operations',
        status: 'signed_off' as const,
        display_order: 1,
      },
      {
        name: 'User Management System',
        description: 'User authentication, profiles, and session management',
        status: 'signed_off' as const,
        display_order: 2,
      },
      {
        name: 'Organization Setup',
        description: 'Organization creation, management, and basic structure',
        status: 'in_progress' as const,
        display_order: 3,
      },
      {
        name: 'Team Member Invitation',
        description: 'Invite and manage team members within organizations',
        status: 'ready_for_test' as const,
        display_order: 4,
      },
      {
        name: 'Real Milestone Tracking',
        description: 'Replace hardcoded milestone data with dynamic tracking system',
        status: 'in_progress' as const,
        display_order: 5,
      }
    ]
  },
  {
    name: 'Assessment Framework Phase 1A - Database Enhancement',
    description: 'Complete database foundation for assessment framework with status lifecycle, AI integration, and audit trail',
    phase: 'Phase 1A',
    week: 2,
    priority: 'critical' as const,
    status: 'ready_for_test' as const,
    display_order: 2,
    tasks: [
      {
        name: 'Core Assessment Tables',
        description: 'domains, MPS, criteria, maturity_levels, assessments, evidence, assessment_scores tables with proper relationships',
        status: 'ready_for_test' as const,
        display_order: 1,
      },
      {
        name: '8-Status Lifecycle System',
        description: 'assessment_status enum with not_started, in_progress, ai_evaluated, submitted_for_approval, approved_locked, rejected, escalated, alternative_proposal',
        status: 'ready_for_test' as const,
        display_order: 2,
      },
      {
        name: 'AI Integration Fields',
        description: 'AI suggestion storage, user acceptance tracking, evaluation results fields added to all tables',
        status: 'ready_for_test' as const,
        display_order: 3,
      },
      {
        name: 'Comprehensive Audit Trail',
        description: 'audit_trail table with triggers capturing all changes, who/what/when/previous/new values',
        status: 'ready_for_test' as const,
        display_order: 4,
      },
      {
        name: 'RLS Security Policies',
        description: 'Organization-scoped access control, role-based permissions for all assessment tables',
        status: 'ready_for_test' as const,
        display_order: 5,
      }
    ]
  },
  {
    name: 'Assessment Framework Phase 1B - Admin Content Interface',
    description: 'Admin UI for domain, MPS, and criteria seeding with AI assistance',
    phase: 'Phase 1B',
    week: 3,
    priority: 'critical' as const,
    status: 'in_progress' as const,
    display_order: 3,
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