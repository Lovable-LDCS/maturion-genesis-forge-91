import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const isManual = body.manual || false;
    const triggeringUserId = body.triggeringUserId || null;
    const targetOrganizationId = body.organizationId || null;
    
    console.log(`🚀 Starting ${isManual ? 'manual' : 'scheduled'} QA cycle`);
    
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
      totalMPSs: 0,
      passedGeneration: 0,
      failedGeneration: 0,
      passedRegression: 0,
      failedRegression: 0,
      alertsSent: 0
    };

    for (const org of organizations || []) {
      console.log(`🏢 Processing organization: ${org.name} (${org.id})`);
      
      // Get all MPSs for this organization
      const { data: mpsList, error: mpsError } = await supabase
        .from('maturity_practice_statements')
        .select('id, mps_number, name')
        .eq('organization_id', org.id)
        .order('mps_number');
      
      if (mpsError) {
        console.error(`Error fetching MPSs for org ${org.id}:`, mpsError);
        continue;
      }

      results.totalMPSs += mpsList?.length || 0;
      
      // Test criteria generation for each MPS
      for (const mps of mpsList || []) {
        await testCriteriaGeneration(supabase, org.id, mps, results, isManual ? 'manual' : 'scheduled', triggeringUserId);
        await testRegressionForMPS(supabase, org.id, mps, results, isManual ? 'manual' : 'scheduled', triggeringUserId);
      }
      
      // Also run refactor scan if this is a manual run
      if (isManual) {
        console.log(`🧹 Running integrated refactor scan for organization: ${org.name}`);
        
        try {
          const { data: refactorResult, error: refactorError } = await supabase.functions.invoke('run-refactor-qa-cycle', {
            body: {
              manual: true,
              organizationId: org.id,
              triggeringUserId: triggeringUserId
            }
          });
          
          if (refactorError) {
            console.error('Refactor scan failed:', refactorError);
          } else {
            console.log('Refactor scan completed:', refactorResult);
          }
        } catch (error) {
          console.error('Error running integrated refactor scan:', error);
        }
      }
      
      results.processedOrganizations++;
    }

    // Send summary alert if there were any failures
    if (results.failedGeneration > 0 || results.failedRegression > 0) {
      await sendFailureAlert(supabase, results);
      results.alertsSent++;
    }

    console.log('✅ QA cycle completed:', results);
    
    return new Response(JSON.stringify({
      success: true,
      summary: results,
      message: 'QA cycle completed successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('❌ QA cycle failed:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function testCriteriaGeneration(supabase: any, organizationId: string, mps: any, results: any, runType: string, triggeredBy: string | null) {
  const runAt = new Date().toISOString();
  
  try {
    console.log(`🧪 Testing criteria generation for MPS ${mps.mps_number}: ${mps.name}`);
    
    // Call the generate-and-save-criteria function
    const { data: genResult, error: genError } = await supabase.functions.invoke('generate-and-save-criteria', {
      body: {
        mpsId: mps.id,
        mpsNumber: mps.mps_number,
        mpsName: mps.name,
        organizationId: organizationId
      }
    });
    
    if (genError || !genResult?.success) {
      // Log failure
      await supabase.from('qa_test_log').insert({
        run_at: runAt,
        mps_number: mps.mps_number,
        mps_title: mps.name,
        test_type: 'criteria_generation',
        result: 'failed',
        criteria_generated: 0,
        notes: genError?.message || genResult?.error || 'Unknown generation error',
        organization_id: organizationId,
        run_type: runType,
        triggered_by: triggeredBy
      });
      
      results.failedGeneration++;
      return false;
    }
    
    // Log success
    await supabase.from('qa_test_log').insert({
      run_at: runAt,
      mps_number: mps.mps_number,
      mps_title: mps.name,
      test_type: 'criteria_generation',
      result: 'passed',
      criteria_generated: genResult.criteriaGenerated || 0,
      notes: `Generated ${genResult.criteriaGenerated} criteria successfully`,
      organization_id: organizationId,
      run_type: runType,
      triggered_by: triggeredBy
    });
    
    results.passedGeneration++;
    return true;
    
  } catch (error) {
    console.error(`Error testing criteria generation for MPS ${mps.mps_number}:`, error);
    
    await supabase.from('qa_test_log').insert({
      run_at: runAt,
      mps_number: mps.mps_number,
      mps_title: mps.name,
      test_type: 'criteria_generation',
      result: 'error',
      criteria_generated: 0,
      notes: error.message,
      organization_id: organizationId,
      run_type: runType,
      triggered_by: triggeredBy
    });
    
    results.failedGeneration++;
    return false;
  }
}

async function testRegressionForMPS(supabase: any, organizationId: string, mps: any, results: any, runType: string, triggeredBy: string | null) {
  const runAt = new Date().toISOString();
  
  try {
    console.log(`🔍 Testing regression for MPS ${mps.mps_number}: ${mps.name}`);
    
    // Check if criteria exist
    const { data: criteria, error: criteriaError } = await supabase
      .from('criteria')
      .select('id')
      .eq('mps_id', mps.id);

    if (criteriaError) {
      throw new Error(`Failed to fetch criteria: ${criteriaError.message}`);
    }

    // Test document context availability using the same method as criteria generation
    const { data: directChunks, error: chunkError } = await supabase
      .from('ai_document_chunks')
      .select('content, ai_documents!inner(title, document_type)')
      .eq('organization_id', organizationId)
      .eq('ai_documents.document_type', 'mps_document')
      .ilike('content', `%MPS ${mps.mps_number}%`)
      .limit(1);

    const hasContextFound = !chunkError && directChunks && directChunks.length > 0;
    const hasCriteria = criteria && criteria.length > 0;
    
    let notes = '';
    let driftDetected = false;
    let result = 'passed';
    
    if (!hasCriteria) {
      notes += 'No criteria found. ';
      result = 'failed';
    }
    
    if (!hasContextFound) {
      notes += 'No document context available. ';
      result = 'failed';
      driftDetected = true;
    }
    
    if (result === 'passed') {
      notes = `Regression passed: ${criteria.length} criteria found, document context available`;
    }
    
    // Log regression test result
    await supabase.from('qa_test_log').insert({
      run_at: runAt,
      mps_number: mps.mps_number,
      mps_title: mps.name,
      test_type: 'regression',
      result: result,
      criteria_generated: criteria?.length || 0,
      drift_detected: driftDetected,
      notes: notes.trim(),
      organization_id: organizationId,
      run_type: runType,
      triggered_by: triggeredBy
    });
    
    if (result === 'passed') {
      results.passedRegression++;
    } else {
      results.failedRegression++;
    }
    
    return result === 'passed';
    
  } catch (error) {
    console.error(`Error testing regression for MPS ${mps.mps_number}:`, error);
    
    await supabase.from('qa_test_log').insert({
      run_at: runAt,
      mps_number: mps.mps_number,
      mps_title: mps.name,
      test_type: 'regression',
      result: 'error',
      criteria_generated: 0,
      drift_detected: true,
      notes: error.message,
      organization_id: organizationId,
      run_type: runType,
      triggered_by: triggeredBy
    });
    
    results.failedRegression++;
    return false;
  }
}

async function sendFailureAlert(supabase: any, results: any) {
  try {
    console.log('📧 Sending failure alert');
    
    // Get failed MPSs from the latest run
    const { data: failedMPSs } = await supabase
      .from('qa_test_log')
      .select('mps_number, mps_title, test_type, result')
      .gte('run_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
      .neq('result', 'passed')
      .order('mps_number');
    
    const runTime = new Date().toLocaleString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    let alertMessage = '';
    
    if (results.failedGeneration === 0 && results.failedRegression === 0) {
      alertMessage = `🧪 QA Run: ${runTime}\n✅ All ${results.totalMPSs} MPSs passed QA – no action required`;
    } else {
      const failedMPSNumbers = failedMPSs?.map(mps => `MPS ${mps.mps_number}`).filter((v, i, a) => a.indexOf(v) === i) || [];
      
      alertMessage = `🧪 QA Run: ${runTime}\n✅ Passed: ${results.passedGeneration + results.passedRegression}\n❌ Failed: ${failedMPSNumbers.join(', ') || 'Unknown MPSs'}`;
      
      if (failedMPSs?.some(mps => mps.drift_detected)) {
        alertMessage += '\n⚠️ Drift detected in some MPSs';
      }
    }

    // Try to send webhook notification if configured
    const { data: orgs } = await supabase
      .from('organizations')
      .select('slack_webhook_url, email_webhook_url')
      .not('slack_webhook_url', 'is', null)
      .limit(1);
    
    if (orgs && orgs.length > 0 && orgs[0].slack_webhook_url) {
      try {
        await fetch(orgs[0].slack_webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: alertMessage,
            username: 'Maturion QA Bot',
            icon_emoji: results.failedGeneration === 0 && results.failedRegression === 0 ? ':white_check_mark:' : ':warning:'
          })
        });
      } catch (webhookError) {
        console.error('Failed to send Slack alert:', webhookError);
      }
    }
    
  } catch (error) {
    console.error('Failed to send alert:', error);
  }
}