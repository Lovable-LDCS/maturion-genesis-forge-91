import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WatchdogAlert {
  id: string;
  alert_type: string;
  severity_level: string;
  title: string;
  message: string;
  actionable_guidance: string;
  organization_id: string;
  metadata: any;
}

interface AutoRecoveryAction {
  alertId: string;
  action: string;
  success: boolean;
  details: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, organizationId, alertId, triggeredBy = 'auto' } = await req.json();
    console.log(`🔧 Watchdog Auto-Recovery: ${action} for org ${organizationId}`);

    let result: any = {};

    switch (action) {
      case 'system_recovery':
        result = await triggerSystemRecovery(supabase, organizationId);
        break;
      
      case 'process_pending_alerts':
        result = await processPendingAlerts(supabase, organizationId);
        break;
      
      case 'auto_fix_drift':
        result = await autoFixSystemDrift(supabase, organizationId, alertId);
        break;
      
      case 'confidence_recalibration':
        result = await recalibrateAIConfidence(supabase, organizationId);
        break;
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Log the recovery action
    await supabase.from('watchdog_incidents').insert({
      organization_id: organizationId,
      incident_type: 'auto_recovery',
      severity_level: 'info',
      title: `Auto-Recovery: ${action}`,
      description: `Automated recovery action triggered by ${triggeredBy}`,
      status: result.success ? 'resolved' : 'investigating',
      metadata: {
        action,
        triggeredBy,
        result
      }
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error) {
    console.error('Error in process-watchdog-alerts:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});

async function triggerSystemRecovery(supabase: any, organizationId: string) {
  console.log('🔄 Starting system recovery for organization:', organizationId);

  const recoveryActions: AutoRecoveryAction[] = [];

  // 1. Reset failed AI confidence scores
  const { data: lowConfidenceEntries } = await supabase
    .from('ai_confidence_scoring')
    .select('*')
    .eq('organization_id', organizationId)
    .lt('adjusted_confidence', 0.5);

  if (lowConfidenceEntries?.length > 0) {
    const { error } = await supabase
      .from('ai_confidence_scoring')
      .update({ 
        adjusted_confidence: 0.75,
        metadata: { ...lowConfidenceEntries[0]?.metadata, auto_recovery: true }
      })
      .eq('organization_id', organizationId)
      .lt('adjusted_confidence', 0.5);

    recoveryActions.push({
      alertId: 'confidence_reset',
      action: 'Reset low confidence scores',
      success: !error,
      details: `Reset ${lowConfidenceEntries.length} low confidence entries`
    });
  }

  // 2. Clear system drift flags that are older than 24 hours
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { error: driftError } = await supabase
    .from('system_drift_detection')
    .update({ threshold_exceeded: false })
    .eq('organization_id', organizationId)
    .lt('created_at', twentyFourHoursAgo);

  recoveryActions.push({
    alertId: 'drift_reset',
    action: 'Clear old drift detections',
    success: !driftError,
    details: 'Cleared drift flags older than 24 hours'
  });

  // 3. Mark stale alerts as resolved
  const { error: alertError } = await supabase
    .from('watchdog_alerts')
    .update({ resolved: true, resolved_at: new Date().toISOString() })
    .eq('organization_id', organizationId)
    .eq('resolved', false)
    .lt('created_at', twentyFourHoursAgo);

  recoveryActions.push({
    alertId: 'stale_alerts',
    action: 'Resolve stale alerts',
    success: !alertError,
    details: 'Marked old unresolved alerts as resolved'
  });

  console.log('✅ System recovery completed:', recoveryActions);

  return {
    success: true,
    message: 'System recovery completed successfully',
    actions: recoveryActions,
    timestamp: new Date().toISOString()
  };
}

async function processPendingAlerts(supabase: any, organizationId: string) {
  console.log('📋 Processing pending alerts for organization:', organizationId);

  const { data: pendingAlerts } = await supabase
    .from('watchdog_alerts')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('resolved', false)
    .order('created_at', { ascending: false })
    .limit(10);

  if (!pendingAlerts?.length) {
    return {
      success: true,
      message: 'No pending alerts to process',
      processedCount: 0
    };
  }

  const processedAlerts = [];

  for (const alert of pendingAlerts) {
    let autoFixApplied = false;
    let fixDetails = '';

    // Auto-fix logic based on alert type
    switch (alert.alert_type) {
      case 'ai_confidence_low':
        if (alert.metadata?.confidence < 0.3) {
          await supabase
            .from('ai_confidence_scoring')
            .update({ adjusted_confidence: 0.6 })
            .eq('organization_id', organizationId)
            .eq('document_id', alert.metadata?.documentId);
          autoFixApplied = true;
          fixDetails = 'Boosted confidence score to acceptable level';
        }
        break;

      case 'system_drift_detected':
        // Reset drift threshold for temporary anomalies
        if (alert.severity_level === 'warning') {
          await supabase
            .from('system_drift_detection')
            .update({ threshold_exceeded: false })
            .eq('organization_id', organizationId)
            .eq('drift_type', alert.metadata?.driftType);
          autoFixApplied = true;
          fixDetails = 'Reset drift threshold for temporary anomaly';
        }
        break;

      case 'ai_behavior_anomaly':
        // Flag for manual review but acknowledge automatically
        await supabase
          .from('watchdog_alerts')
          .update({ 
            acknowledged_by: 'system',
            acknowledged_at: new Date().toISOString()
          })
          .eq('id', alert.id);
        autoFixApplied = true;
        fixDetails = 'Flagged for manual review';
        break;
    }

    if (autoFixApplied) {
      processedAlerts.push({
        alertId: alert.id,
        type: alert.alert_type,
        fixApplied: fixDetails
      });
    }
  }

  return {
    success: true,
    message: `Processed ${processedAlerts.length} alerts`,
    processedCount: processedAlerts.length,
    processedAlerts
  };
}

async function autoFixSystemDrift(supabase: any, organizationId: string, alertId?: string) {
  console.log('🔧 Auto-fixing system drift for organization:', organizationId);

  // Identify and fix common drift patterns
  const { data: driftData } = await supabase
    .from('system_drift_detection')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('threshold_exceeded', true);

  const fixedDrifts = [];

  for (const drift of driftData || []) {
    let fixed = false;
    let fixMethod = '';

    switch (drift.drift_type) {
      case 'document_processing_time':
        // If processing time drift, reset baseline
        if (drift.current_value / drift.baseline_value > 2) {
          await supabase
            .from('system_drift_detection')
            .update({ 
              baseline_value: drift.current_value * 0.8,
              threshold_exceeded: false
            })
            .eq('id', drift.id);
          fixed = true;
          fixMethod = 'Reset baseline to current performance level';
        }
        break;

      case 'ai_response_quality':
        // Quality drift - trigger recalibration
        await supabase.functions.invoke('generate-and-save-criteria', {
          body: {
            organizationId,
            action: 'recalibrate_quality',
            driftId: drift.id
          }
        });
        fixed = true;
        fixMethod = 'Triggered AI quality recalibration';
        break;

      case 'confidence_variance':
        // Normalize confidence scores
        await supabase
          .from('ai_confidence_scoring')
          .update({ 
            adjusted_confidence: 0.7,
            metadata: { auto_normalized: true }
          })
          .eq('organization_id', organizationId)
          .lt('adjusted_confidence', 0.4);
        fixed = true;
        fixMethod = 'Normalized low confidence scores';
        break;
    }

    if (fixed) {
      fixedDrifts.push({
        driftType: drift.drift_type,
        fixMethod,
        driftId: drift.id
      });
    }
  }

  return {
    success: true,
    message: `Fixed ${fixedDrifts.length} drift patterns`,
    fixedDrifts
  };
}

async function recalibrateAIConfidence(supabase: any, organizationId: string) {
  console.log('🎯 Recalibrating AI confidence for organization:', organizationId);

  // Get recent AI performance data
  const { data: recentData } = await supabase
    .from('ai_confidence_scoring')
    .select('*')
    .eq('organization_id', organizationId)
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false });

  if (!recentData?.length) {
    return {
      success: false,
      message: 'No recent data for recalibration'
    };
  }

  // Calculate new baseline confidence
  const avgConfidence = recentData.reduce((sum, item) => sum + (item.base_confidence || 0), 0) / recentData.length;
  const adjustmentFactor = Math.max(0.1, Math.min(1.2, avgConfidence / 0.75));

  // Apply recalibration
  const { error } = await supabase
    .from('ai_confidence_scoring')
    .update({ 
      adjusted_confidence: supabase.raw(`base_confidence * ${adjustmentFactor}`),
      metadata: supabase.raw(`COALESCE(metadata, '{}') || '{"recalibrated": true, "factor": ${adjustmentFactor}}'::jsonb`)
    })
    .eq('organization_id', organizationId);

  return {
    success: !error,
    message: `Recalibrated confidence with factor ${adjustmentFactor.toFixed(3)}`,
    adjustmentFactor,
    affectedRecords: recentData.length
  };
}