import React from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Ban, Shield, FileX } from 'lucide-react';

interface RedAlertCondition {
  type: 'PROMPT_OVERFLOW' | 'ANNEX1_FALLBACK' | 'PLACEHOLDER_DETECTED' | 'EVIDENCE_FIRST_BROKEN';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  message: string;
  suggestion: string;
  details?: string;
}

interface RedAlertMonitorProps {
  alerts: RedAlertCondition[];
  isOpen: boolean;
  onClose: () => void;
  onAbort: () => void;
  mpsNumber?: number;
}

const alertIcons = {
  PROMPT_OVERFLOW: FileX,
  ANNEX1_FALLBACK: Ban,
  PLACEHOLDER_DETECTED: AlertTriangle,
  EVIDENCE_FIRST_BROKEN: Shield
};

const alertColors = {
  CRITICAL: 'destructive',
  HIGH: 'destructive', 
  MEDIUM: 'default'
} as const;

export const RedAlertMonitor: React.FC<RedAlertMonitorProps> = ({
  alerts,
  isOpen,
  onClose,
  onAbort,
  mpsNumber
}) => {
  if (!isOpen || alerts.length === 0) return null;

  const criticalAlerts = alerts.filter(alert => alert.severity === 'CRITICAL');
  const hasCriticalAlerts = criticalAlerts.length > 0;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            🚨 RED ALERT: Generation Blocked
            {mpsNumber && <Badge variant="outline">MPS {mpsNumber}</Badge>}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            {hasCriticalAlerts ? 
              `${criticalAlerts.length} critical security violation${criticalAlerts.length > 1 ? 's' : ''} detected. Generation cannot proceed.` :
              `${alerts.length} validation issue${alerts.length > 1 ? 's' : ''} detected that require attention.`
            }
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {alerts.map((alert, index) => {
            const IconComponent = alertIcons[alert.type];
            return (
              <Alert key={index} variant={alertColors[alert.severity]} className="border-l-4">
                <IconComponent className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={alertColors[alert.severity]}>
                        {alert.severity}
                      </Badge>
                      <span className="font-medium">{alert.message}</span>
                    </div>
                    <div className="text-sm bg-background/50 p-2 rounded border">
                      <strong>Suggested Fix:</strong> {alert.suggestion}
                    </div>
                    {alert.details && (
                      <div className="text-xs font-mono bg-muted p-2 rounded">
                        {alert.details}
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            );
          })}
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
          <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
            <Shield className="h-4 w-4" />
            Security Protection Active
          </div>
          <div className="text-red-600 space-y-1">
            <div>• All criteria generation is blocked until issues are resolved</div>
            <div>• These safeguards prevent incorrect content generation</div>
            <div>• Review the suggested fixes above and retry generation</div>
            {hasCriticalAlerts && (
              <div className="font-medium">• Critical alerts must be resolved before proceeding</div>
            )}
          </div>
        </div>
        
        <AlertDialogFooter className="flex gap-2">
          <AlertDialogAction
            onClick={onAbort}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <Ban className="h-4 w-4 mr-2" />
            Abort Generation
          </AlertDialogAction>
          <AlertDialogAction onClick={onClose}>
            Review Issues
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// Hook for easy Red Alert creation
export const useRedAlertMonitor = () => {
  const createAlert = (
    type: RedAlertCondition['type'], 
    message: string, 
    suggestion: string,
    details?: string,
    severity: RedAlertCondition['severity'] = 'CRITICAL'
  ): RedAlertCondition => ({
    type,
    severity,
    message,
    suggestion,
    details
  });

  const validateForRedAlerts = (
    prompt: string, 
    mpsNumber: number, 
    context: any
  ): RedAlertCondition[] => {
    const alerts: RedAlertCondition[] = [];
    const promptTokenCount = Math.ceil(prompt.length / 4);

    // Alert 1: Prompt Overflow
    if (promptTokenCount > 12000) {
      alerts.push(createAlert(
        'PROMPT_OVERFLOW',
        `Prompt exceeds 12,000 token limit (${promptTokenCount.toLocaleString()} tokens)`,
        'Reduce prompt complexity or split into smaller requests',
        `Current: ${promptTokenCount} tokens | Limit: 12,000 tokens`,
        'CRITICAL'
      ));
    }

    // Alert 2: Annex 1 Fallback (unless MPS 1)
    if (prompt.toLowerCase().includes('annex 1') && mpsNumber !== 1) {
      alerts.push(createAlert(
        'ANNEX1_FALLBACK',
        `Forbidden Annex 1 fallback detected for MPS ${mpsNumber}`,
        'Ensure proper MPS document context is loaded before generation',
        `MPS ${mpsNumber} should not reference Annex 1 fallback patterns`,
        'CRITICAL'
      ));
    }

    // Alert 3: Placeholder Detection
    const placeholderPatterns = [
      /Assessment Criterion [0-9]/i,
      /Criterion [A-Z]/i,
      /\[PLACEHOLDER\]/i,
      /TBD/i,
      /TODO/i
    ];
    
    for (const pattern of placeholderPatterns) {
      if (pattern.test(prompt)) {
        alerts.push(createAlert(
          'PLACEHOLDER_DETECTED',
          'Placeholder text detected in prompt',
          'Remove placeholder content and use specific, evidence-based criteria',
          `Pattern found: ${pattern.source}`,
          'CRITICAL'
        ));
        break; // Only report first placeholder found
      }
    }

    // Alert 4: Evidence-First Rule
    if (!prompt.includes('evidence-first') && !prompt.includes('Evidence must be')) {
      alerts.push(createAlert(
        'EVIDENCE_FIRST_BROKEN',
        'Evidence-first structure enforcement missing',
        'Ensure prompt enforces evidence-first sentence structure',
        'Criteria must start with evidence types, not organization names',
        'HIGH'
      ));
    }

    return alerts;
  };

  return { createAlert, validateForRedAlerts };
};