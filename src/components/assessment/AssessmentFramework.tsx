import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { FEATURE_FLAGS } from '@/lib/config';
import { StatusBadge } from '@/components/milestones/StatusBadge';
import { BrandingUploader } from '@/components/organization/BrandingUploader';
import { DeBeersBrandingDemo } from '@/components/organization/DeBeersBrandingDemo';

interface Assessment {
  id: string;
  name: string;
  description: string;
  status: string;
  assessment_period_start: string;
  assessment_period_end: string;
  overall_completion_percentage: number;
  ai_confidence_score: number;
  user_acceptance_status: string;
}

interface Domain {
  id: string;
  name: string;
  intent_statement: string;
  status: string;
  display_order: number;
}

export const AssessmentFramework: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAdminAccess();

  // Review dialog state
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewItems, setReviewItems] = useState<any[]>([]);
  const [reviewType, setReviewType] = useState<'intents' | 'criteria' | null>(null);
  const [reviewDomain, setReviewDomain] = useState<Domain | null>(null);
  const [thinContext, setThinContext] = useState(false);
  const [saving, setSaving] = useState(false);


  useEffect(() => {
    if (currentOrganization?.id) {
      fetchAssessmentData();
    }
  }, [currentOrganization?.id]);

  const fetchAssessmentData = async () => {
    if (!currentOrganization?.id) return;

    try {
      // Fetch assessments
      const { data: assessmentData, error: assessmentError } = await supabase
        .from('assessments')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false });

      if (assessmentError) throw assessmentError;

      // Fetch domains
      const { data: domainData, error: domainError } = await supabase
        .from('domains')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('display_order', { ascending: true });

      if (domainError) throw domainError;

      setAssessments(assessmentData || []);
      setDomains(domainData || []);
    } catch (error) {
      console.error('Error fetching assessment data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const generateIntents = async (domain: Domain) => {
    if (!FEATURE_FLAGS.intents_generation_enabled || !currentOrganization?.id) return;
    const { data, error } = await supabase.functions.invoke('generate-intents-list', {
      body: { organizationId: currentOrganization.id, domainId: domain.id }
    });
    if (error || data?.success === false) {
      console.error('Intents generation error:', error || data);
      return;
    }
    setReviewTitle(`Review intents for ${domain.name}`);
    setReviewItems(data.intents || []);
    setReviewType('intents');
    setReviewDomain(domain);
    setThinContext(false);
    setReviewOpen(true);
  };

  const generateCriteria = async (domain: Domain) => {
    if (!FEATURE_FLAGS.criteria_generation_enabled || !currentOrganization?.id) return;
    const { data, error } = await supabase.functions.invoke('generate-criteria-list', {
      body: { organizationId: currentOrganization.id, domainId: domain.id, max: 12 }
    });
    if (error || data?.success === false) {
      console.error('Criteria generation error:', error || data);
      return;
    }
    setReviewTitle(`Review criteria for ${domain.name}`);
    setReviewItems(data.criteria || []);
    setReviewType('criteria');
    setReviewDomain(domain);
    setThinContext(!!data.thin_context);
    setReviewOpen(true);
  };

  const approveItems = async () => {
    if (!reviewDomain || !currentOrganization?.id || !reviewType) return;
    setSaving(true);
    try {
      if (reviewType === 'intents') {
        const primary = reviewItems[0]?.intent_statement || '';
        if (primary) {
          await supabase.from('domains').update({ intent_statement: primary }).eq('id', reviewDomain.id);
        }
      } else if (reviewType === 'criteria') {
        // Placeholder: criteria persistence via RPC to be added next.
      }
    } finally {
      setSaving(false);
      setReviewOpen(false);
      fetchAssessmentData();
    }
  };

  const createGapTicket = async () => {
    if (!FEATURE_FLAGS.gap_followup_enabled || !currentOrganization?.id || !reviewDomain) return;
    try {
      await supabase.from('gap_tickets').insert({
        organization_id: currentOrganization.id,
        prompt: `Thin context detected for domain ${reviewDomain.name}`,
        missing_specifics: ['insufficient_document_context'],
        follow_up_date: new Date(Date.now() + 48*60*60*1000).toISOString(),
        status: 'open'
      });
      await supabase.functions.invoke('send-gap-followup', { body: { organizationId: currentOrganization.id } });
    } catch (e) {
      console.error('Gap ticket creation error:', e);
    } finally {
      setReviewOpen(false);
    }
  };

  return (

    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Assessment Framework & Organization Setup</h2>
        <p className="text-muted-foreground">
          Configure your organization's assessment framework and branding settings
        </p>
      </div>

      <Tabs defaultValue="framework" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="framework">Assessment Framework</TabsTrigger>
          <TabsTrigger value="branding">Organization Branding</TabsTrigger>
        </TabsList>
        
        <TabsContent value="framework" className="space-y-6 mt-6">
          {/* Assessment Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Assessment Overview
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Phase 1A Complete
                </Badge>
              </CardTitle>
              <CardDescription>
                Current assessments and their progress status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assessments.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No assessments found.</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    The assessment framework is ready for use. Create your first assessment to get started.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {assessments.map((assessment) => (
                    <div key={assessment.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium">{assessment.name}</h4>
                          <p className="text-sm text-muted-foreground">{assessment.description}</p>
                        </div>
                        <StatusBadge status={assessment.status} />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Progress</label>
                          <div className="mt-1">
                            <Progress value={assessment.overall_completion_percentage || 0} className="h-2" />
                            <span className="text-xs text-muted-foreground">
                              {assessment.overall_completion_percentage || 0}% complete
                            </span>
                          </div>
                        </div>
                        
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Assessment Period</label>
                          <p className="text-sm">
                            {assessment.assessment_period_start} to {assessment.assessment_period_end}
                          </p>
                        </div>
                        
                        {assessment.ai_confidence_score && (
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">AI Confidence</label>
                            <p className="text-sm">{assessment.ai_confidence_score}%</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Domain Framework */}
          <Card>
            <CardHeader>
              <CardTitle>Assessment Domains</CardTitle>
              <CardDescription>
                Core assessment domains with maturity practice statements and criteria
              </CardDescription>
            </CardHeader>
            <CardContent>
              {domains.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No domains configured.</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    The domain structure is ready for configuration.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {domains.map((domain) => (
                    <div key={domain.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-medium">{domain.name}</h4>
                            <StatusBadge status={domain.status} />
                          </div>
                                                    <p className="text-sm text-muted-foreground">{domain.intent_statement}</p>
                        </div>
                        {isAdmin && (
                          <div className="flex gap-2">
                            {FEATURE_FLAGS.intents_generation_enabled && (
                              <Button size="sm" variant="outline" onClick={() => generateIntents(domain)}>Generate intents</Button>
                            )}
                            {FEATURE_FLAGS.criteria_generation_enabled && (
                              <Button size="sm" onClick={() => generateCriteria(domain)}>Generate criteria</Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Review Dialog */}
          <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{reviewTitle}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 max-h-[60vh] overflow-auto">
                {reviewItems.length === 0 ? (
                  <p className="text-muted-foreground">No items returned.</p>
                ) : (
                  <ul className="list-disc pl-5 space-y-2">
                    {reviewItems.map((it, idx) => (
                      <li key={idx}>
                        {reviewType === 'intents' ? it.intent_statement : it.statement}
                      </li>
                    ))}
                  </ul>
                )}
                {thinContext && (
                  <div className="p-2 rounded bg-yellow-50 text-yellow-800 text-sm">
                    Thin context detected. Consider creating a gap ticket. A follow-up email will be sent.
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                {thinContext && FEATURE_FLAGS.gap_followup_enabled && (
                  <Button variant="outline" onClick={createGapTicket}>Create Gap Ticket</Button>
                )}
                <Button onClick={approveItems} disabled={saving}>{saving ? 'Saving...' : 'Approve'}</Button>
              </div>
            </DialogContent>
          </Dialog>


          {/* Implementation Status */}
          <Card>
            <CardHeader>
              <CardTitle>Database Implementation Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h5 className="font-medium text-green-600">✅ Completed Components</h5>
                  <ul className="space-y-1 text-sm">
                    <li>• Core Assessment Tables (domains, criteria, assessments, etc.)</li>
                    <li>• 8-Status Lifecycle System (assessment_status enum)</li>
                    <li>• AI Integration Fields (ai_evaluation_result, ai_confidence_score)</li>
                    <li>• Enhanced Audit Trail System with status tracking</li>
                    <li>• Performance Indexes and Query Optimization</li>
                    <li>• Row Level Security Policies</li>
                    <li>• Assessment Progress Calculation Functions</li>
                  </ul>
                </div>
                
                <div className="space-y-3">
                  <h5 className="font-medium text-blue-600">🔄 Available Features</h5>
                  <ul className="space-y-1 text-sm">
                    <li>• Multi-tenant organization support</li>
                    <li>• Real-time audit logging</li>
                    <li>• AI evaluation integration ready</li>
                    <li>• User acceptance tracking</li>
                    <li>• Evidence management system</li>
                    <li>• Maturity level assessments</li>
                    <li>• Comprehensive status lifecycle</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="branding" className="mt-6 space-y-6">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Telemetry tracking for branding tab opened */}
            {(() => {
              // Log branding tab access
              console.log('[TELEMETRY] branding_tab_opened', {
                orgId: currentOrganization?.id,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                sessionId: crypto.randomUUID()
              });
              return null;
            })()}
            
            {currentOrganization?.id && (
              <DeBeersBrandingDemo orgId={currentOrganization.id} />
            )}
            {currentOrganization?.id && (
              <BrandingUploader orgId={currentOrganization.id} />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};