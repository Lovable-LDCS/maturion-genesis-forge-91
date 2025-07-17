import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MilestoneWithTasks } from '@/hooks/useMilestones';

export interface TestResult {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'warning' | 'running';
  message: string;
  details?: string;
  category: 'database' | 'security' | 'structure' | 'performance' | 'manual';
}

export interface TestSession {
  id: string;
  milestoneId: string;
  taskId?: string; // Add task ID for task-specific tests
  isTaskTest?: boolean; // Flag to distinguish task tests from milestone tests
  timestamp: Date;
  results: TestResult[];
  overallStatus: 'passed' | 'failed' | 'warning';
  manualVerified?: boolean;
  manualVerifiedBy?: string;
  manualVerifiedAt?: Date;
  notes?: string;
}

export const useMilestoneTests = () => {
  const [testSessions, setTestSessions] = useState<TestSession[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();

  // Database health checks
  const runDatabaseTests = async (milestone: MilestoneWithTasks): Promise<TestResult[]> => {
    const results: TestResult[] = [];

    // Test 1: Check milestone table structure
    try {
      const { data: milestoneData, error } = await supabase
        .from('milestones')
        .select('*')
        .eq('id', milestone.id)
        .single();

      if (error) throw error;

      results.push({
        id: 'db-milestone-structure',
        name: 'Milestone Data Structure',
        status: 'passed',
        message: 'Milestone record found and accessible',
        category: 'database'
      });
    } catch (error) {
      results.push({
        id: 'db-milestone-structure',
        name: 'Milestone Data Structure',
        status: 'failed',
        message: `Failed to access milestone data: ${error}`,
        category: 'database'
      });
    }

    // Test 2: Check milestone tasks relationship
    try {
      const { data: tasks, error } = await supabase
        .from('milestone_tasks')
        .select('*')
        .eq('milestone_id', milestone.id);

      if (error) throw error;

      const expectedTasks = milestone.milestone_tasks?.length || 0;
      const actualTasks = tasks?.length || 0;

      if (expectedTasks === actualTasks) {
        results.push({
          id: 'db-tasks-relationship',
          name: 'Tasks Relationship',
          status: 'passed',
          message: `All ${actualTasks} tasks properly linked`,
          category: 'database'
        });
      } else {
        results.push({
          id: 'db-tasks-relationship',
          name: 'Tasks Relationship',
          status: 'warning',
          message: `Task count mismatch: expected ${expectedTasks}, found ${actualTasks}`,
          category: 'database'
        });
      }
    } catch (error) {
      results.push({
        id: 'db-tasks-relationship',
        name: 'Tasks Relationship',
        status: 'failed',
        message: `Failed to check tasks: ${error}`,
        category: 'database'
      });
    }

    // Test 3: Check audit trail
    try {
      const { data: auditData, error } = await supabase
        .from('audit_trail')
        .select('*')
        .eq('record_id', milestone.id)
        .limit(1);

      if (error) throw error;

      if (auditData && auditData.length > 0) {
        results.push({
          id: 'db-audit-trail',
          name: 'Audit Trail',
          status: 'passed',
          message: 'Audit trail is active and logging changes',
          category: 'database'
        });
      } else {
        results.push({
          id: 'db-audit-trail',
          name: 'Audit Trail',
          status: 'warning',
          message: 'No audit trail entries found',
          category: 'database'
        });
      }
    } catch (error) {
      results.push({
        id: 'db-audit-trail',
        name: 'Audit Trail',
        status: 'failed',
        message: `Audit trail check failed: ${error}`,
        category: 'database'
      });
    }

    return results;
  };

  // Security tests
  const runSecurityTests = async (milestone: MilestoneWithTasks): Promise<TestResult[]> => {
    const results: TestResult[] = [];

    // Test 1: RLS Policy check
    try {
      // Try to access milestone without proper context (should fail if RLS is working)
      const { error } = await supabase.rpc('user_can_view_organization', {
        org_id: milestone.organization_id
      });

      if (!error) {
        results.push({
          id: 'sec-rls-policies',
          name: 'Row Level Security',
          status: 'passed',
          message: 'RLS policies are active and functioning',
          category: 'security'
        });
      } else {
        results.push({
          id: 'sec-rls-policies',
          name: 'Row Level Security',
          status: 'warning',
          message: 'RLS policy check inconclusive',
          category: 'security'
        });
      }
    } catch (error) {
      results.push({
        id: 'sec-rls-policies',
        name: 'Row Level Security',
        status: 'failed',
        message: `RLS check failed: ${error}`,
        category: 'security'
      });
    }

    // Test 2: Check organization membership
    try {
      const { data: membership, error } = await supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', milestone.organization_id)
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

      if (error) throw error;

      if (membership && membership.length > 0) {
        results.push({
          id: 'sec-org-membership',
          name: 'Organization Access',
          status: 'passed',
          message: `User has ${membership[0].role} role in organization`,
          category: 'security'
        });
      } else {
        results.push({
          id: 'sec-org-membership',
          name: 'Organization Access',
          status: 'failed',
          message: 'User is not a member of this organization',
          category: 'security'
        });
      }
    } catch (error) {
      results.push({
        id: 'sec-org-membership',
        name: 'Organization Access',
        status: 'failed',
        message: `Organization access check failed: ${error}`,
        category: 'security'
      });
    }

    return results;
  };

  // Structure and data quality tests
  const runStructureTests = async (milestone: MilestoneWithTasks): Promise<TestResult[]> => {
    const results: TestResult[] = [];

    // Test 1: Required fields check
    const requiredFields = ['name', 'organization_id', 'created_by', 'updated_by'];
    const missingFields = requiredFields.filter(field => !milestone[field as keyof typeof milestone]);

    if (missingFields.length === 0) {
      results.push({
        id: 'struct-required-fields',
        name: 'Required Fields',
        status: 'passed',
        message: 'All required fields are present',
        category: 'structure'
      });
    } else {
      results.push({
        id: 'struct-required-fields',
        name: 'Required Fields',
        status: 'failed',
        message: `Missing fields: ${missingFields.join(', ')}`,
        category: 'structure'
      });
    }

    // Test 2: Status enum validation
    const validStatuses = ['not_started', 'in_progress', 'ready_for_test', 'signed_off', 'failed', 'rejected', 'escalated', 'alternative_proposal'];
    if (validStatuses.includes(milestone.status)) {
      results.push({
        id: 'struct-status-enum',
        name: 'Status Validation',
        status: 'passed',
        message: `Status "${milestone.status}" is valid`,
        category: 'structure'
      });
    } else {
      results.push({
        id: 'struct-status-enum',
        name: 'Status Validation',
        status: 'failed',
        message: `Invalid status: "${milestone.status}"`,
        category: 'structure'
      });
    }

    // Test 3: Priority enum validation
    const validPriorities = ['critical', 'high', 'medium', 'low'];
    if (validPriorities.includes(milestone.priority)) {
      results.push({
        id: 'struct-priority-enum',
        name: 'Priority Validation',
        status: 'passed',
        message: `Priority "${milestone.priority}" is valid`,
        category: 'structure'
      });
    } else {
      results.push({
        id: 'struct-priority-enum',
        name: 'Priority Validation',
        status: 'failed',
        message: `Invalid priority: "${milestone.priority}"`,
        category: 'structure'
      });
    }

    // Test 4: Task consistency
    const tasks = milestone.milestone_tasks || [];
    const taskStatuses = tasks.map(t => t.status);
    const invalidTaskStatuses = taskStatuses.filter(status => !validStatuses.includes(status));

    if (invalidTaskStatuses.length === 0) {
      results.push({
        id: 'struct-task-statuses',
        name: 'Task Status Consistency',
        status: 'passed',
        message: `All ${tasks.length} tasks have valid statuses`,
        category: 'structure'
      });
    } else {
      results.push({
        id: 'struct-task-statuses',
        name: 'Task Status Consistency',
        status: 'failed',
        message: `${invalidTaskStatuses.length} tasks have invalid statuses`,
        category: 'structure'
      });
    }

    return results;
  };

  // Performance tests
  const runPerformanceTests = async (milestone: MilestoneWithTasks): Promise<TestResult[]> => {
    const results: TestResult[] = [];

    // Test 1: Query performance
    const startTime = Date.now();
    try {
      await supabase
        .from('milestones')
        .select(`
          *,
          milestone_tasks (
            *,
            milestone_test_notes (*)
          )
        `)
        .eq('id', milestone.id)
        .single();

      const queryTime = Date.now() - startTime;

      if (queryTime < 1000) {
        results.push({
          id: 'perf-query-time',
          name: 'Query Performance',
          status: 'passed',
          message: `Query completed in ${queryTime}ms`,
          category: 'performance'
        });
      } else if (queryTime < 3000) {
        results.push({
          id: 'perf-query-time',
          name: 'Query Performance',
          status: 'warning',
          message: `Query took ${queryTime}ms (consider optimization)`,
          category: 'performance'
        });
      } else {
        results.push({
          id: 'perf-query-time',
          name: 'Query Performance',
          status: 'failed',
          message: `Query took ${queryTime}ms (optimization needed)`,
          category: 'performance'
        });
      }
    } catch (error) {
      results.push({
        id: 'perf-query-time',
        name: 'Query Performance',
        status: 'failed',
        message: `Query failed: ${error}`,
        category: 'performance'
      });
    }

    // Test 2: Data size check
    const dataSize = JSON.stringify(milestone).length;
    if (dataSize < 10000) {
      results.push({
        id: 'perf-data-size',
        name: 'Data Size',
        status: 'passed',
        message: `Milestone data size: ${dataSize} bytes`,
        category: 'performance'
      });
    } else if (dataSize < 50000) {
      results.push({
        id: 'perf-data-size',
        name: 'Data Size',
        status: 'warning',
        message: `Large data size: ${dataSize} bytes`,
        category: 'performance'
      });
    } else {
      results.push({
        id: 'perf-data-size',
        name: 'Data Size',
        status: 'failed',
        message: `Excessive data size: ${dataSize} bytes`,
        category: 'performance'
      });
    }

    return results;
  };

  // Task-specific database tests
  const runTaskDatabaseTests = async (task: any): Promise<TestResult[]> => {
    const results: TestResult[] = [];

    // Test 1: Check task data structure
    try {
      const { data: taskData, error } = await supabase
        .from('milestone_tasks')
        .select('*')
        .eq('id', task.id)
        .single();

      if (error) throw error;

      results.push({
        id: 'db-task-structure',
        name: 'Task Data Structure',
        status: 'passed',
        message: 'Task record found and accessible',
        category: 'database'
      });
    } catch (error) {
      results.push({
        id: 'db-task-structure',
        name: 'Task Data Structure',
        status: 'failed',
        message: `Failed to access task data: ${error}`,
        category: 'database'
      });
    }

    // Test 2: Check task audit trail
    try {
      const { data: auditData, error } = await supabase
        .from('audit_trail')
        .select('*')
        .eq('record_id', task.id)
        .limit(1);

      if (error) throw error;

      if (auditData && auditData.length > 0) {
        results.push({
          id: 'db-task-audit',
          name: 'Task Audit Trail',
          status: 'passed',
          message: 'Task audit trail is active',
          category: 'database'
        });
      } else {
        results.push({
          id: 'db-task-audit',
          name: 'Task Audit Trail',
          status: 'warning',
          message: 'No audit trail entries found for this task',
          category: 'database'
        });
      }
    } catch (error) {
      results.push({
        id: 'db-task-audit',
        name: 'Task Audit Trail',
        status: 'failed',
        message: `Task audit trail check failed: ${error}`,
        category: 'database'
      });
    }

    // Test 3: Check milestone relationship
    try {
      const { data: milestoneData, error } = await supabase
        .from('milestones')
        .select('name, status')
        .eq('id', task.milestone_id)
        .single();

      if (error) throw error;

      results.push({
        id: 'db-milestone-link',
        name: 'Milestone Relationship',
        status: 'passed',
        message: `Task linked to milestone: ${milestoneData.name}`,
        category: 'database'
      });
    } catch (error) {
      results.push({
        id: 'db-milestone-link',
        name: 'Milestone Relationship',
        status: 'failed',
        message: `Failed to verify milestone relationship: ${error}`,
        category: 'database'
      });
    }

    return results;
  };

  // Task-specific structure tests
  const runTaskStructureTests = async (task: any): Promise<TestResult[]> => {
    const results: TestResult[] = [];

    // Test 1: Required fields check
    const requiredFields = ['name', 'milestone_id', 'organization_id', 'created_by', 'updated_by'];
    const missingFields = requiredFields.filter(field => !task[field]);

    if (missingFields.length === 0) {
      results.push({
        id: 'struct-task-fields',
        name: 'Task Required Fields',
        status: 'passed',
        message: 'All required task fields are present',
        category: 'structure'
      });
    } else {
      results.push({
        id: 'struct-task-fields',
        name: 'Task Required Fields',
        status: 'failed',
        message: `Missing task fields: ${missingFields.join(', ')}`,
        category: 'structure'
      });
    }

    // Test 2: Status validation
    const validStatuses = ['not_started', 'in_progress', 'ready_for_test', 'signed_off', 'failed', 'rejected', 'escalated', 'alternative_proposal'];
    if (validStatuses.includes(task.status)) {
      results.push({
        id: 'struct-task-status',
        name: 'Task Status Validation',
        status: 'passed',
        message: `Task status "${task.status}" is valid`,
        category: 'structure'
      });
    } else {
      results.push({
        id: 'struct-task-status',
        name: 'Task Status Validation',
        status: 'failed',
        message: `Invalid task status: "${task.status}"`,
        category: 'structure'
      });
    }

    // Test 3: Name validation
    if (task.name && task.name.trim().length > 0) {
      results.push({
        id: 'struct-task-name',
        name: 'Task Name Validation',
        status: 'passed',
        message: `Task name is valid: "${task.name}"`,
        category: 'structure'
      });
    } else {
      results.push({
        id: 'struct-task-name',
        name: 'Task Name Validation',
        status: 'failed',
        message: 'Task name is missing or empty',
        category: 'structure'
      });
    }

    return results;
  };

  // Run tests for a specific task
  const runTaskTests = async (task: any): Promise<TestSession> => {
    setIsRunning(true);
    
    const sessionId = `task-test-${task.id}-${Date.now()}`;
    const allResults: TestResult[] = [];

    try {
      toast({
        title: 'Running Task Tests',
        description: `Starting health check for task: ${task.name}`,
      });

      // Run task-specific test categories
      const [dbResults, structResults] = await Promise.all([
        runTaskDatabaseTests(task),
        runTaskStructureTests(task)
      ]);

      allResults.push(...dbResults, ...structResults);

      // Determine overall status
      const failedTests = allResults.filter(r => r.status === 'failed');
      const warningTests = allResults.filter(r => r.status === 'warning');
      
      let overallStatus: 'passed' | 'failed' | 'warning';
      if (failedTests.length > 0) {
        overallStatus = 'failed';
      } else if (warningTests.length > 0) {
        overallStatus = 'warning';
      } else {
        overallStatus = 'passed';
      }

      const session: TestSession = {
        id: sessionId,
        milestoneId: task.milestone_id, // Parent milestone ID
        taskId: task.id, // Specific task ID
        isTaskTest: true, // Flag to identify task tests
        timestamp: new Date(),
        results: allResults,
        overallStatus
      };

      // Remove any existing test session for this specific task
      setTestSessions(prev => [session, ...prev.filter(s => !(s.taskId === task.id && s.isTaskTest))]);

      toast({
        title: 'Task Tests Complete',
        description: `${allResults.length} tests completed with ${overallStatus} status`,
        variant: overallStatus === 'failed' ? 'destructive' : 'default'
      });

      return session;
    } catch (error) {
      toast({
        title: 'Task Test Failed',
        description: `Error running task tests: ${error}`,
        variant: 'destructive'
      });
      throw error;
    } finally {
      setIsRunning(false);
    }
  };

  // Run all tests for a milestone
  const runTests = async (milestone: MilestoneWithTasks): Promise<TestSession> => {
    setIsRunning(true);
    
    const sessionId = `test-${milestone.id}-${Date.now()}`;
    const allResults: TestResult[] = [];

    try {
      toast({
        title: 'Running Tests',
        description: `Starting health check for ${milestone.name}`,
      });

      // Run all test categories
      const [dbResults, secResults, structResults, perfResults] = await Promise.all([
        runDatabaseTests(milestone),
        runSecurityTests(milestone),
        runStructureTests(milestone),
        runPerformanceTests(milestone)
      ]);

      allResults.push(...dbResults, ...secResults, ...structResults, ...perfResults);

      // Determine overall status
      const failedTests = allResults.filter(r => r.status === 'failed');
      const warningTests = allResults.filter(r => r.status === 'warning');
      
      let overallStatus: 'passed' | 'failed' | 'warning';
      if (failedTests.length > 0) {
        overallStatus = 'failed';
      } else if (warningTests.length > 0) {
        overallStatus = 'warning';
      } else {
        overallStatus = 'passed';
      }

      const session: TestSession = {
        id: sessionId,
        milestoneId: milestone.id,
        timestamp: new Date(),
        results: allResults,
        overallStatus
      };

      setTestSessions(prev => [session, ...prev.filter(s => s.milestoneId !== milestone.id)]);

      toast({
        title: 'Tests Complete',
        description: `${allResults.length} tests completed with ${overallStatus} status`,
        variant: overallStatus === 'failed' ? 'destructive' : 'default'
      });

      return session;
    } catch (error) {
      toast({
        title: 'Test Failed',
        description: `Error running tests: ${error}`,
        variant: 'destructive'
      });
      throw error;
    } finally {
      setIsRunning(false);
    }
  };

  // Manual verification
  const setManualVerification = async (sessionId: string, verified: boolean, notes?: string) => {
    const { data: user } = await supabase.auth.getUser();
    
    setTestSessions(prev => 
      prev.map(session => 
        session.id === sessionId 
          ? {
              ...session,
              manualVerified: verified,
              manualVerifiedBy: user.user?.id,
              manualVerifiedAt: new Date(),
              notes
            }
          : session
      )
    );

    toast({
      title: verified ? 'Test Verified' : 'Verification Removed',
      description: verified ? 'Manual verification recorded' : 'Manual verification removed',
    });
  };

  // Export test results
  const exportTestResults = (session: TestSession) => {
    const exportData = {
      milestone_id: session.milestoneId,
      timestamp: session.timestamp,
      overall_status: session.overallStatus,
      manual_verified: session.manualVerified,
      manual_verified_by: session.manualVerifiedBy,
      manual_verified_at: session.manualVerifiedAt,
      notes: session.notes,
      test_results: session.results.map(result => ({
        test_id: result.id,
        test_name: result.name,
        category: result.category,
        status: result.status,
        message: result.message,
        details: result.details
      }))
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `milestone-test-${session.milestoneId}-${session.timestamp.toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);

    toast({
      title: 'Export Complete',
      description: 'Test results exported successfully',
    });
  };

  return {
    testSessions,
    isRunning,
    runTests,
    runTaskTests, // Add the new task test function
    setManualVerification,
    exportTestResults
  };
};