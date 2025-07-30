import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface RefactorFinding {
  sourceFile: string;
  findingType: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  recommendedAction: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const isManual = body.manual || false;
    const targetOrganizationId = body.organizationId || null;
    const triggeringUserId = body.triggeringUserId || null;
    
    console.log(`🔍 Starting ${isManual ? 'manual' : 'scheduled'} refactor QA cycle`);
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get organizations - if manual run, filter by specific org
    let orgQuery = supabase
      .from('organizations')
      .select('id, name')
      .eq('organization_type', 'primary');
    
    if (isManual && targetOrganizationId) {
      orgQuery = orgQuery.eq('id', targetOrganizationId);
    }
    
    const { data: organizations, error: orgError } = await orgQuery;
    
    if (orgError) {
      throw new Error(`Failed to fetch organizations: ${orgError.message}`);
    }

    const results = {
      totalOrganizations: organizations?.length || 0,
      processedOrganizations: 0,
      totalFindings: 0,
      highSeverityFindings: 0,
      mediumSeverityFindings: 0,
      lowSeverityFindings: 0,
      alertsSent: 0
    };

    for (const org of organizations || []) {
      console.log(`🏢 Processing refactor scan for organization: ${org.name} (${org.id})`);
      
      const findings = await performRefactorScan(org.id);
      
      // Log findings to database
      if (findings.length > 0) {
        const { error: insertError } = await supabase
          .from('refactor_qa_log')
          .insert(
            findings.map(finding => ({
              ...finding,
              source_file: finding.sourceFile,
              finding_type: finding.findingType,
              recommended_action: finding.recommendedAction,
              organization_id: org.id,
              run_at: new Date().toISOString()
            }))
          );

        if (insertError) {
          console.error('Error inserting refactor findings:', insertError);
        } else {
          results.totalFindings += findings.length;
          results.highSeverityFindings += findings.filter(f => f.severity === 'high').length;
          results.mediumSeverityFindings += findings.filter(f => f.severity === 'medium').length;
          results.lowSeverityFindings += findings.filter(f => f.severity === 'low').length;
        }
      }
      
      results.processedOrganizations++;
    }

    // Send alert if there are medium or high severity findings
    if (results.highSeverityFindings > 0 || results.mediumSeverityFindings > 0) {
      await sendRefactorAlert(supabase, results, isManual ? 'manual' : 'scheduled');
      results.alertsSent++;
    }

    console.log('✅ Refactor QA cycle completed:', results);
    
    return new Response(JSON.stringify({
      success: true,
      summary: results,
      message: 'Refactor QA cycle completed successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('❌ Refactor QA cycle failed:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function performRefactorScan(organizationId: string): Promise<RefactorFinding[]> {
  const findings: RefactorFinding[] = [];
  
  // Mock refactor analysis - in a real implementation, this would:
  // 1. Scan the codebase for unused imports/exports
  // 2. Check for dead components
  // 3. Detect stale APIs and functions
  // 4. Find redundant logic patterns
  // 5. Identify unreachable UI elements
  
  // For now, we'll generate sample findings for demonstration
  const mockFindings: RefactorFinding[] = [
    {
      sourceFile: 'src/components/unused/OldButton.tsx',
      findingType: 'dead-component',
      severity: 'medium',
      description: 'Component exported but never imported or used in any other files',
      recommendedAction: 'Remove unused component file or add to component library if intentional'
    },
    {
      sourceFile: 'src/utils/legacyHelpers.ts',
      findingType: 'unused-function',
      severity: 'low',
      description: 'Function formatOldDate exported but no references found in codebase',
      recommendedAction: 'Remove unused function or document if part of public API'
    },
    {
      sourceFile: 'src/api/deprecatedEndpoints.ts',
      findingType: 'stale-api',
      severity: 'high',
      description: 'API endpoint /legacy/users still defined but returns 404 in production',
      recommendedAction: 'Remove deprecated endpoint and update documentation'
    },
    {
      sourceFile: 'src/components/ui/Button.tsx + src/components/common/ActionButton.tsx',
      findingType: 'duplicated-logic',
      severity: 'medium',
      description: 'Similar button styling logic detected in multiple components',
      recommendedAction: 'Consolidate button variants into single reusable component'
    },
    {
      sourceFile: 'supabase/functions/old-webhook/index.ts',
      findingType: 'stale-function',
      severity: 'medium',
      description: 'Edge function deployed but no cron jobs or active triggers found',
      recommendedAction: 'Remove unused edge function or document purpose'
    }
  ];
  
  // Simulate finding detection - in reality this would involve:
  // - File system analysis
  // - AST parsing for imports/exports
  // - Runtime analysis for reachability
  // - Pattern matching for duplicated code
  
  const randomFindings = mockFindings.slice(0, Math.floor(Math.random() * mockFindings.length) + 1);
  findings.push(...randomFindings);
  
  console.log(`Found ${findings.length} refactor issues for organization ${organizationId}`);
  
  return findings;
}

async function sendRefactorAlert(supabase: any, results: any, runType: string) {
  try {
    console.log('📧 Sending refactor alert');
    
    const runTime = new Date().toLocaleString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    const runTypeLabel = runType === 'manual' ? '👤 Manual' : '⏰ Scheduled';
    
    let alertMessage = `🧹 Refactor QA Run: ${runTime} (${runTypeLabel})\n`;
    
    if (results.totalFindings === 0) {
      alertMessage += '✅ No refactoring issues detected – codebase is clean';
    } else {
      alertMessage += `🔍 Found ${results.totalFindings} refactoring opportunities:\n`;
      
      if (results.highSeverityFindings > 0) {
        alertMessage += `🚨 High Priority: ${results.highSeverityFindings} issues\n`;
      }
      if (results.mediumSeverityFindings > 0) {
        alertMessage += `⚠️ Medium Priority: ${results.mediumSeverityFindings} issues\n`;
      }
      if (results.lowSeverityFindings > 0) {
        alertMessage += `📝 Low Priority: ${results.lowSeverityFindings} issues\n`;
      }
      
      alertMessage += '\nCheck the QA Dashboard for detailed recommendations.';
    }

    // Try to send webhook notification if configured
    const { data: orgs } = await supabase
      .from('organizations')
      .select('slack_webhook_url')
      .not('slack_webhook_url', 'is', null)
      .limit(1);
    
    if (orgs && orgs.length > 0 && orgs[0].slack_webhook_url) {
      try {
        await fetch(orgs[0].slack_webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: alertMessage,
            username: 'Maturion Refactor Bot',
            icon_emoji: results.highSeverityFindings > 0 ? ':warning:' : ':broom:'
          })
        });
      } catch (webhookError) {
        console.error('Failed to send Slack alert:', webhookError);
      }
    }
    
  } catch (error) {
    console.error('Failed to send refactor alert:', error);
  }
}