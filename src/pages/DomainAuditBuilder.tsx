import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import DomainMPSRunner from '@/components/assessment/DomainMPSRunner';
import MPSDashboard from '@/components/assessment/MPSDashboard';
import DomainCriteriaRunner from '@/components/assessment/DomainCriteriaRunner';

import { useDeferredCriteria } from '@/hooks/useDeferredCriteria';
import { useOrganization } from '@/hooks/useOrganization';
import { DeferredCriteriaReminder } from '@/components/assessment/DeferredCriteriaReminder';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


const DomainAuditBuilder = () => {
    const navigate = useNavigate();
  const { domainId } = useParams();


  // Add deferred criteria management
  const { currentOrganization, organizations, switchOrganization } = useOrganization();
  const {
    deferredQueue,
    getRemindersForMPS,
    handleDeferredAction,
    refreshQueue
  } = useDeferredCriteria(currentOrganization?.id || '');

  // State for deferred reminder modal
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [currentReminderData, setCurrentReminderData] = useState<any>(null);

  // Domain name mapping
  const domainNames: Record<string, string> = {
    'process-integrity': 'Process Integrity',
    'people-culture': 'People & Culture',
    'protection': 'Protection',
    'proof-it-works': 'Proof it Works',
    'leadership-governance': 'Leadership & Governance'
  };

  const domainName = domainNames[domainId || ''] || 'Unknown Domain';

  // FORCE TEST: Check for deferred reminders on page load
  useEffect(() => {
    if (currentOrganization?.id && domainName !== 'Unknown Domain') {
      console.log('🚨 DomainAuditBuilder: FORCE CHECKING for deferred reminders on page load');
      console.log('🔍 Current route domain:', domainName);
      console.log('🔍 Current route domainId:', domainId);
      console.log('🔍 Deferred queue size:', deferredQueue.length);
      
      // Check all possible MPS numbers for this domain
      for (let mpsNumber = 1; mpsNumber <= 10; mpsNumber++) {
        console.log(`🔍 FORCE TEST: Checking MPS ${mpsNumber} in ${domainName}...`);
        
        const reminder = getRemindersForMPS(domainName, mpsNumber.toString());
        if (reminder && reminder.reminderCount > 0) {
          console.log('🔔 FORCE TEST: Found deferred criteria reminder!', reminder);
          setCurrentReminderData(reminder);
          setShowReminderModal(true);
          break; // Show first match
        }
        
        // Also do force test ignoring domain
        const forceMatches = deferredQueue.filter(def => 
          def.targetMPS === mpsNumber.toString() && def.status === 'pending'
        );
        
        if (forceMatches.length > 0) {
          console.log('🚨 FORCE TEST: Found MPS number match ignoring domain for MPS', mpsNumber, ':', {
            matches: forceMatches.length,
            currentDomain: domainName,
            deferredDomains: forceMatches.map(d => d.targetDomain)
          });
          
          const forceReminderData = {
            targetDomain: domainName,
            targetMPS: mpsNumber.toString(),
            deferrals: forceMatches,
            reminderCount: forceMatches.length
          };
          
          console.log('🚨 FORCE TEST: Triggering reminder modal!');
          setCurrentReminderData(forceReminderData);
          setShowReminderModal(true);
          break;
        }
      }
    }
  }, [currentOrganization?.id, domainName, domainId, deferredQueue.length]);

  

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/assessment/framework')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Audit Journey
            </Button>
            
            <Badge variant="outline">Audit Configuration Workflow</Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Title Section */}
          <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold mb-2">
              {domainName} – Audit Configuration
            </h1>
            <div className="flex items-center justify-center gap-3 mb-4">
              <Badge variant="outline">Current Org: {currentOrganization?.name || 'Unselected'}</Badge>
              <Select value={currentOrganization?.id || ''} onValueChange={(v) => switchOrganization(v)}>
                <SelectTrigger className="w-72">
                  <SelectValue placeholder="Switch organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map(org => (
                    <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-6">
              Complete these steps to configure your audit structure for the {domainName} domain
            </p>
            
            
          </div>

                              {/* Domain MPS Runner Panel */}
          <div className="mb-8">
            <DomainMPSRunner domainName={domainName} orgId={currentOrganization?.id || ''} />
          </div>

          {/* Domain MPS Dashboard (collapsible UI) */}
          <div className="mb-8">
            <MPSDashboard domainName={domainName} orgId={currentOrganization?.id || ''} />
          </div>

                    {/* Domain Criteria Runner */}
          <div className="mb-8">
            <DomainCriteriaRunner domainName={domainName} orgId={currentOrganization?.id || ''} />
          </div>

          
        </div>
      </main>

      

      {/* Deferred Criteria Reminder Modal */}
      {showReminderModal && currentReminderData && (
        <DeferredCriteriaReminder
          isOpen={showReminderModal}
          onClose={() => setShowReminderModal(false)}
          targetDomain={currentReminderData?.targetDomain || ''}
          targetMPS={currentReminderData?.targetMPS || ''}
          deferrals={currentReminderData?.deferrals || []}
          onView={(deferral) => {
            console.log('👁️ Viewing deferred criterion:', deferral);
          }}
          onApprove={async (deferral) => {
            const result = await handleDeferredAction(deferral.id, 'approve');
            if (result.success) {
              await refreshQueue();
              setShowReminderModal(false);
            }
          }}
          onEdit={(deferral) => {
            console.log('📝 Edit deferred criterion:', deferral);
          }}
          onDiscard={async (deferral) => {
            const result = await handleDeferredAction(deferral.id, 'discard');
            if (result.success) {
              await refreshQueue();
              setShowReminderModal(false);
            }
          }}
        />
      )}

    </div>
  );
};

export default DomainAuditBuilder;