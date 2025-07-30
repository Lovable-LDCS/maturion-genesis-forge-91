import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Clock, Play, AlertTriangle, CheckCircle, XCircle, Loader, Wrench, Trash2, Code2, FileX, Check, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';

interface RefactorFinding {
  id: string;
  run_at: string;
  source_file: string;
  finding_type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  recommended_action: string;
  detected_by: string;
  created_at: string;
  acknowledged: boolean;
  review_notes: string | null;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
}

interface RefactorSummary {
  lastRun: string | null;
  totalFindings: number;
  highSeverityFindings: number;
  mediumSeverityFindings: number;
  lowSeverityFindings: number;
  findingsByType: Record<string, number>;
}

export const RefactorQALogs: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const [findings, setFindings] = useState<RefactorFinding[]>([]);
  const [summary, setSummary] = useState<RefactorSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [acknowledgeDialogOpen, setAcknowledgeDialogOpen] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState<RefactorFinding | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  const fetchRefactorFindings = async () => {
    if (!currentOrganization?.id) return;

    try {
      setLoading(true);
      
      // Fetch recent findings
      const { data: findingsData, error: findingsError } = await supabase
        .from('refactor_qa_log')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('run_at', { ascending: false })
        .limit(100);

      if (findingsError) {
        console.error('Error fetching refactor findings:', findingsError);
        toast.error('Failed to fetch refactor findings');
        return;
      }

      console.log('Fetched refactor findings:', findingsData?.length || 0, 'findings for org:', currentOrganization.id);

      setFindings((findingsData || []) as RefactorFinding[]);

      // Calculate summary statistics
      if (findingsData && findingsData.length > 0) {
        const latestRun = findingsData[0].run_at;
        const recentFindings = findingsData.filter(finding => finding.run_at === latestRun);
        
        const highSeverity = recentFindings.filter(f => f.severity === 'high').length;
        const mediumSeverity = recentFindings.filter(f => f.severity === 'medium').length;
        const lowSeverity = recentFindings.filter(f => f.severity === 'low').length;
        
        const findingsByType = recentFindings.reduce((acc, finding) => {
          acc[finding.finding_type] = (acc[finding.finding_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        setSummary({
          lastRun: latestRun,
          totalFindings: recentFindings.length,
          highSeverityFindings: highSeverity,
          mediumSeverityFindings: mediumSeverity,
          lowSeverityFindings: lowSeverity,
          findingsByType
        });
      } else {
        setSummary({
          lastRun: null,
          totalFindings: 0,
          highSeverityFindings: 0,
          mediumSeverityFindings: 0,
          lowSeverityFindings: 0,
          findingsByType: {}
        });
      }
    } catch (error) {
      console.error('Error in fetchRefactorFindings:', error);
      toast.error('Failed to fetch refactor findings');
    } finally {
      setLoading(false);
    }
  };

  const triggerManualRefactorScan = async () => {
    try {
      setIsRunning(true);
      console.log('Starting manual refactor scan for org:', currentOrganization?.id);
      toast.info('Manual refactor scan started!');
      
      const { data, error } = await supabase.functions.invoke('run-refactor-qa-cycle', {
        body: { 
          manual: true, 
          organizationId: currentOrganization?.id,
          triggeringUserId: (await supabase.auth.getUser()).data.user?.id
        }
      });

      if (error) {
        throw error;
      }

      toast.success('Refactor scan completed successfully');
      
      // Refresh findings after a delay
      setTimeout(() => {
        fetchRefactorFindings();
      }, 2000);
      
    } catch (error) {
      console.error('Error triggering refactor scan:', error);
      toast.error('Failed to trigger refactor scan');
    } finally {
      setIsRunning(false);
    }
  };

  const sendTestSlackNotification = async () => {
    try {
      toast.info('Sending test Slack notification...');
      
      const { data, error } = await supabase.functions.invoke('send-test-slack-notification', {
        body: { 
          organizationId: currentOrganization?.id
        }
      });

      if (error) {
        throw error;
      }

      toast.success('Test Slack notification sent successfully! Check your Slack channel.');
    } catch (error) {
      console.error('Error sending test Slack notification:', error);
      toast.error(`Failed to send test notification: ${error.message}`);
    }
  };

  const handleAcknowledge = (finding: RefactorFinding) => {
    setSelectedFinding(finding);
    setReviewNotes('');
    setAcknowledgeDialogOpen(true);
  };

  const submitAcknowledgement = async () => {
    if (!selectedFinding) return;

    try {
      const { error } = await supabase
        .from('refactor_qa_log')
        .update({
          acknowledged: true,
          review_notes: reviewNotes.trim() || null,
          acknowledged_by: (await supabase.auth.getUser()).data.user?.id,
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', selectedFinding.id);

      if (error) {
        console.error('Error acknowledging finding:', error);
        toast.error('Failed to acknowledge finding');
        return;
      }

      toast.success('Finding acknowledged successfully');
      setAcknowledgeDialogOpen(false);
      setSelectedFinding(null);
      setReviewNotes('');
      
      // Refresh findings
      fetchRefactorFindings();
    } catch (error) {
      console.error('Error in submitAcknowledgement:', error);
      toast.error('Failed to acknowledge finding');
    }
  };

  useEffect(() => {
    fetchRefactorFindings();
  }, [currentOrganization?.id]);

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return <Badge variant="destructive">High</Badge>;
      case 'medium':
        return <Badge variant="outline" className="border-yellow-600 text-yellow-600">Medium</Badge>;
      case 'low':
        return <Badge variant="secondary">Low</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getFindingTypeIcon = (type: string) => {
    switch (type) {
      case 'dead-component':
        return <FileX className="h-4 w-4 text-red-600" />;
      case 'unused-function':
        return <Code2 className="h-4 w-4 text-orange-600" />;
      case 'stale-api':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'duplicated-logic':
        return <Wrench className="h-4 w-4 text-blue-600" />;
      case 'stale-function':
        return <Trash2 className="h-4 w-4 text-gray-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getFindingTypeLabel = (type: string) => {
    switch (type) {
      case 'dead-component':
        return 'Dead Component';
      case 'unused-function':
        return 'Unused Function';
      case 'stale-api':
        return 'Stale API';
      case 'duplicated-logic':
        return 'Duplicated Logic';
      case 'stale-function':
        return 'Stale Function';
      default:
        return type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Loader className="h-8 w-8 mx-auto mb-2 animate-spin" />
          <p>Loading refactor findings...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Alert Panel for High Severity Issues */}
        {summary && summary.highSeverityFindings > 0 && (
          <Alert className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription>
              <div className="font-medium text-red-800 dark:text-red-200 mb-1">
                🚨 {summary.highSeverityFindings} high-priority refactoring issues detected
              </div>
              <div className="text-sm text-red-700 dark:text-red-300">
                These issues may impact performance or maintainability. Review recommendations below.
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Success Alert */}
        {summary && summary.totalFindings === 0 && summary.lastRun && (
          <Alert className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription>
              <div className="font-medium text-green-800 dark:text-green-200">
                ✨ No refactoring issues detected — codebase is clean!
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Refactor Summary Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="h-6 w-6 mx-auto text-blue-600 mb-2" />
              <div className="text-lg font-bold">
                {summary?.lastRun ? new Date(summary.lastRun).toLocaleDateString() : 'Never'}
              </div>
              <div className="text-sm text-muted-foreground">Last Scan</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <AlertTriangle className="h-6 w-6 mx-auto text-red-600 mb-2" />
              <div className="text-lg font-bold">{summary?.highSeverityFindings || 0}</div>
              <div className="text-sm text-muted-foreground">High Priority</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <Wrench className="h-6 w-6 mx-auto text-yellow-600 mb-2" />
              <div className="text-lg font-bold">{summary?.mediumSeverityFindings || 0}</div>
              <div className="text-sm text-muted-foreground">Medium Priority</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-6 w-6 mx-auto text-green-600 mb-2" />
              <div className="text-lg font-bold">{summary?.lowSeverityFindings || 0}</div>
              <div className="text-sm text-muted-foreground">Low Priority</div>
            </CardContent>
          </Card>
        </div>

        {/* Manual Trigger */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Refactor Quality Analysis
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">Runs daily</Badge>
                <Button 
                  onClick={triggerManualRefactorScan} 
                  disabled={isRunning}
                  size="sm"
                >
                  {isRunning ? (
                    <>
                      <Loader className="h-4 w-4 mr-2 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Run Manual Scan
                    </>
                  )}
                </Button>
              </div>
            </CardTitle>
            <CardDescription>
              Automated detection of unused code, dead components, stale APIs, and refactoring opportunities.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {summary && summary.lastRun && (
              <Alert>
                <Wrench className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-1">Latest Refactor Scan Results</div>
                  <div className="text-sm space-y-1">
                    <div>📊 Total Issues: {summary.totalFindings}</div>
                    {Object.entries(summary.findingsByType).map(([type, count]) => (
                      <div key={type}>• {getFindingTypeLabel(type)}: {count}</div>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button variant="outline" size="sm" onClick={sendTestSlackNotification}>
                      📧 Test Slack Alert
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Refactor Findings Table */}
        <Card>
          <CardHeader>
            <CardTitle>Refactoring Opportunities</CardTitle>
            <CardDescription>
              Detailed findings from automated code analysis with actionable recommendations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {findings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No refactoring findings yet. Run a manual scan to start analyzing your codebase.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>File/Component</TableHead>
                    <TableHead>Issue Type</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Recommended Action</TableHead>
                    <TableHead>Detected</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {findings.map((finding) => (
                    <TableRow 
                      key={finding.id}
                      className={finding.acknowledged ? 'opacity-60 bg-muted/50' : ''}
                    >
                      <TableCell>
                        {finding.acknowledged ? (
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-green-700 bg-green-100 dark:bg-green-900/20 dark:text-green-400">
                              <Check className="h-3 w-3 mr-1" />
                              Reviewed
                            </Badge>
                            {finding.review_notes && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs">{finding.review_notes}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-amber-700 bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400">
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm max-w-[200px]">
                        <div className="truncate" title={finding.source_file}>
                          {finding.source_file}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getFindingTypeIcon(finding.finding_type)}
                          <span className="text-sm">{getFindingTypeLabel(finding.finding_type)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getSeverityBadge(finding.severity)}
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <div className="text-sm" title={finding.description}>
                          {finding.description}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <div className="text-sm text-muted-foreground" title={finding.recommended_action}>
                          {finding.recommended_action}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(finding.run_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {!finding.acknowledged && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAcknowledge(finding)}
                            className="h-8"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Acknowledge
                          </Button>
                        )}
                        {finding.acknowledged && finding.acknowledged_at && (
                          <div className="text-xs text-muted-foreground">
                            Reviewed {new Date(finding.acknowledged_at).toLocaleDateString()}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Acknowledgement Dialog */}
        <Dialog open={acknowledgeDialogOpen} onOpenChange={setAcknowledgeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Acknowledge Refactor Finding</DialogTitle>
              <DialogDescription>
                Mark this finding as reviewed. You can optionally add notes about your review or the actions taken.
              </DialogDescription>
            </DialogHeader>
            
            {selectedFinding && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-sm font-medium mb-2">Finding Details:</div>
                  <div className="text-sm">
                    <div><strong>File:</strong> {selectedFinding.source_file}</div>
                    <div><strong>Type:</strong> {getFindingTypeLabel(selectedFinding.finding_type)}</div>
                    <div><strong>Description:</strong> {selectedFinding.description}</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="review-notes">Review Notes (Optional)</Label>
                  <Textarea
                    id="review-notes"
                    placeholder="Add any notes about your review, actions taken, or reasons for dismissing..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setAcknowledgeDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submitAcknowledgement}>
                <Check className="h-4 w-4 mr-2" />
                Acknowledge
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};