/**
 * QA Status Service
 * 
 * Provides functions to retrieve and analyze QA status for AI assistant integration.
 * This enables the AI to give intelligent, real-time answers about system health.
 */

import { supabase } from '@/integrations/supabase/client';

export interface QAStatus {
  systemHealth: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  unresolvedAlerts: number;
  criticalIssues: string[];
  warnings: string[];
  recommendations: string[];
  lastRunTime: string;
}

/**
 * Get comprehensive QA status for a given organization
 * This function is designed to be called by the AI assistant
 */
export async function getQAStatus(organizationId: string): Promise<QAStatus> {
  try {
    const criticalIssues: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Load latest QA metrics
    const { data: metrics } = await supabase
      .from('qa_metrics')
      .select('*')
      .eq('organization_id', organizationId)
      .order('recorded_at', { ascending: false })
      .limit(1);

    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    let lastRunTime = 'Never';

    if (metrics && metrics.length > 0) {
      const latestMetric = metrics[0];
      totalTests = latestMetric.metric_data?.total_tests || 0;
      passedTests = latestMetric.metric_data?.passed || 0;
      failedTests = latestMetric.metric_data?.failed || 0;
      
      if (latestMetric.metric_data?.last_run_time) {
        const runTime = new Date(latestMetric.metric_data.last_run_time);
        lastRunTime = runTime.toLocaleString();
      }
    }

    // Load watchdog incidents
    const { data: watchdogIncidents } = await supabase
      .from('watchdog_incidents')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    const unresolvedIncidents = watchdogIncidents?.filter(i => i.status !== 'resolved') || [];
    
    if (unresolvedIncidents.length > 0) {
      criticalIssues.push(`${unresolvedIncidents.length} unresolved watchdog incident(s) detected`);
      unresolvedIncidents.slice(0, 3).forEach(incident => {
        if (incident.incident_type) {
          criticalIssues.push(`- ${incident.incident_type}: ${incident.description || 'No description'}`);
        }
      });
    }

    // Load watchdog alerts
    const { data: watchdogAlerts } = await supabase
      .from('watchdog_alerts')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('resolved', false)
      .order('created_at', { ascending: false });

    const unresolvedAlerts = watchdogAlerts?.length || 0;
    const criticalAlerts = watchdogAlerts?.filter(a => a.severity_level === 'critical') || [];

    if (criticalAlerts.length > 0) {
      criticalIssues.push(`${criticalAlerts.length} critical alert(s) requiring immediate attention`);
      criticalAlerts.slice(0, 3).forEach(alert => {
        criticalIssues.push(`- ${alert.title}: ${alert.message}`);
      });
    }

    const warningAlerts = watchdogAlerts?.filter(a => a.severity_level === 'warning') || [];
    if (warningAlerts.length > 0) {
      warnings.push(`${warningAlerts.length} warning(s) detected`);
    }

    // Load document processing status
    const { data: documents } = await supabase
      .from('maturion_documents')
      .select('status')
      .eq('organization_id', organizationId);

    if (documents && documents.length > 0) {
      const pendingDocs = documents.filter(d => d.status === 'pending').length;
      const failedDocs = documents.filter(d => d.status === 'failed').length;
      const processedDocs = documents.filter(d => d.status === 'processed').length;

      if (failedDocs > 0) {
        criticalIssues.push(`${failedDocs} document(s) failed to process - may need reprocessing`);
      }

      if (pendingDocs > 10) {
        warnings.push(`${pendingDocs} document(s) still pending processing - check processing queue`);
      }

      const successRate = documents.length > 0 ? (processedDocs / documents.length) * 100 : 0;
      if (successRate < 80) {
        recommendations.push(`Document processing success rate is ${successRate.toFixed(1)}% - consider reviewing failed documents`);
      }
    }

    // Calculate system health
    let healthScore = 100;

    // Deduct for unresolved incidents
    if (unresolvedIncidents.length > 0) {
      healthScore -= unresolvedIncidents.length * 5;
    }

    // Deduct for critical alerts
    if (criticalAlerts.length > 0) {
      healthScore -= criticalAlerts.length * 10;
    }

    // Deduct for failed tests
    if (failedTests > 0 && totalTests > 0) {
      const failureRate = (failedTests / totalTests) * 100;
      healthScore -= failureRate * 0.5;
    }

    healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));

    // Add recommendations based on health score
    if (healthScore < 50) {
      recommendations.push('System health is below 50% - immediate action required');
      recommendations.push('Run "QA Tests" to identify specific failing components');
      recommendations.push('Check the Watchdog dashboard for detailed incident information');
    } else if (healthScore < 80) {
      recommendations.push('System health needs attention - review alerts and failed tests');
    } else if (healthScore >= 95) {
      recommendations.push('System is running smoothly - maintain regular monitoring');
    }

    return {
      systemHealth: healthScore,
      totalTests,
      passedTests,
      failedTests,
      unresolvedAlerts,
      criticalIssues,
      warnings,
      recommendations,
      lastRunTime
    };

  } catch (error) {
    console.error('Error fetching QA status:', error);
    throw error;
  }
}

/**
 * Generate a plain-language summary of QA status for AI assistant
 */
export function generateQASummary(status: QAStatus): string {
  const lines: string[] = [];

  // Overall health
  lines.push(`## System Health: ${status.systemHealth}%`);
  lines.push('');

  if (status.systemHealth >= 95) {
    lines.push('✅ The application is running smoothly with no significant issues.');
  } else if (status.systemHealth >= 80) {
    lines.push('⚠️ The application is mostly healthy but has some areas needing attention.');
  } else if (status.systemHealth >= 50) {
    lines.push('🔴 The application has several issues that should be addressed soon.');
  } else {
    lines.push('🚨 The application has critical issues requiring immediate attention!');
  }
  lines.push('');

  // Test results
  if (status.totalTests > 0) {
    lines.push(`### Test Results`);
    lines.push(`- Total tests run: ${status.totalTests}`);
    lines.push(`- Passed: ${status.passedTests}`);
    lines.push(`- Failed: ${status.failedTests}`);
    lines.push(`- Last run: ${status.lastRunTime}`);
    lines.push('');
  }

  // Critical issues
  if (status.criticalIssues.length > 0) {
    lines.push('### Critical Issues:');
    status.criticalIssues.forEach(issue => {
      lines.push(issue);
    });
    lines.push('');
  }

  // Warnings
  if (status.warnings.length > 0) {
    lines.push('### Warnings:');
    status.warnings.forEach(warning => {
      lines.push(`- ${warning}`);
    });
    lines.push('');
  }

  // Recommendations
  if (status.recommendations.length > 0) {
    lines.push('### Recommendations:');
    status.recommendations.forEach(rec => {
      lines.push(`- ${rec}`);
    });
  }

  return lines.join('\n');
}

/**
 * Check if there are any issues requiring immediate attention
 */
export function hasImmediateIssues(status: QAStatus): boolean {
  return (
    status.systemHealth < 80 ||
    status.criticalIssues.length > 0 ||
    status.unresolvedAlerts > 0
  );
}
