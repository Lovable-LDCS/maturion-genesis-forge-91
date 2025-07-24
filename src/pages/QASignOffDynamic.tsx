import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  XCircle, 
  FileText, 
  Camera, 
  Edit,
  ArrowLeft,
  Target,
  Database,
  Users,
  Building,
  BarChart3,
  FolderOpen,
  AlertTriangle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMilestones, MilestoneWithTasks, MilestoneTestNoteInsert } from '@/hooks/useMilestones';
import { useOrganization } from '@/hooks/useOrganization';
import { Tables } from '@/integrations/supabase/types';
import { MilestoneDataSeeder } from '@/components/milestones/MilestoneDataSeeder';
import { MaturionComplianceCheck } from '@/components/qa/MaturionComplianceCheck';
import WebhookTester from '@/components/webhook/WebhookTester';

type MilestoneStatus = Tables<'milestone_tasks'>['status'];

const QASignOffDynamic: React.FC = () => {
  const [selectedTask, setSelectedTask] = useState<Tables<'milestone_tasks'> | null>(null);
  const [selectedMilestone, setSelectedMilestone] = useState<MilestoneWithTasks | null>(null);
  const [testNotes, setTestNotes] = useState('');
  const [testStatus, setTestStatus] = useState<MilestoneStatus>('ready_for_test');
  const [complianceStatus, setComplianceStatus] = useState({ isCompliant: false, checkedItems: 0, totalItems: 6 });
  const { toast } = useToast();
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  
  const { 
    milestones, 
    loading, 
    error, 
    updateMilestoneTask, 
    addTestNote 
  } = useMilestones(currentOrganization?.id);

  const getStatusIcon = (status: MilestoneStatus) => {
    switch (status) {
      case 'signed_off':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'ready_for_test':
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'escalated':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'alternative_proposal':
        return <FileText className="h-4 w-4 text-green-400" />;
      default:
        return <div className="h-4 w-4 rounded-full bg-gray-300" />;
    }
  };

  const getStatusBadge = (status: MilestoneStatus) => {
    const configs = {
      'signed_off': { variant: 'default' as const, text: 'Signed Off', className: 'bg-green-500 hover:bg-green-600' },
      'ready_for_test': { variant: 'secondary' as const, text: 'Ready for Test', className: 'bg-blue-500 hover:bg-blue-600 text-white' },
      'in_progress': { variant: 'outline' as const, text: 'In Progress', className: 'border-yellow-500 text-yellow-600' },
      'failed': { variant: 'destructive' as const, text: 'Failed', className: '' },
      'rejected': { variant: 'destructive' as const, text: 'Rejected', className: 'bg-red-600 hover:bg-red-700' },
      'escalated': { variant: 'secondary' as const, text: 'Escalated', className: 'bg-amber-500 hover:bg-amber-600 text-white' },
      'alternative_proposal': { variant: 'outline' as const, text: 'Alternative Proposal', className: 'border-green-400 text-green-600' },
      'not_started': { variant: 'outline' as const, text: 'Not Started', className: 'border-gray-400 text-gray-600' },
    };
    
    const config = configs[status] || configs.not_started;
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.text}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: Tables<'milestones'>['priority']) => {
    const configs = {
      'critical': { text: 'Critical', className: 'bg-red-100 text-red-800' },
      'high': { text: 'High', className: 'bg-orange-100 text-orange-800' },
      'medium': { text: 'Medium', className: 'bg-yellow-100 text-yellow-800' },
      'low': { text: 'Low', className: 'bg-green-100 text-green-800' },
    };
    
    const config = configs[priority] || configs.medium;
    return (
      <Badge variant="secondary" className={config.className}>
        {config.text}
      </Badge>
    );
  };

  const addTestNoteHandler = async () => {
    if (!selectedTask || !testNotes.trim() || !currentOrganization) return;

    try {
      // Add test note
      const noteInsert: MilestoneTestNoteInsert = {
        milestone_task_id: selectedTask.id,
        organization_id: currentOrganization.id,
        created_by: currentOrganization.owner_id, // In real app, use auth.uid()
        note_content: testNotes,
        status_at_time: testStatus,
      };

      await addTestNote(noteInsert);

      // Update task status if changed
      if (selectedTask.status !== testStatus) {
        await updateMilestoneTask(
          selectedTask.id, 
          {
            status: testStatus,
            updated_by: currentOrganization.owner_id, // In real app, use auth.uid()
          },
          selectedTask.name, // task name
          selectedMilestone?.name // milestone name
        );
      }

      setTestNotes('');
      setSelectedTask(null);
    } catch (error) {
      console.error('Error adding test note:', error);
    }
  };

  const getMilestoneIcon = (milestoneId: string) => {
    if (milestoneId.includes('foundation')) return <Building className="h-5 w-5" />;
    if (milestoneId.includes('assessment')) return <BarChart3 className="h-5 w-5" />;
    if (milestoneId.includes('evidence')) return <FolderOpen className="h-5 w-5" />;
    return <Target className="h-5 w-5" />;
  };

  const getCompletionStats = () => {
    const allTasks = milestones.flatMap(m => m.milestone_tasks);
    const total = allTasks.length;
    const signedOff = allTasks.filter(t => t.status === 'signed_off').length;
    const readyForTest = allTasks.filter(t => t.status === 'ready_for_test').length;
    const inProgress = allTasks.filter(t => t.status === 'in_progress').length;
    const failed = allTasks.filter(t => t.status === 'failed').length;

    return {
      total,
      signedOff,
      readyForTest,
      inProgress,
      failed,
      completionRate: total > 0 ? Math.round((signedOff / total) * 100) : 0,
    };
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading milestones...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentOrganization) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Building className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <p className="text-amber-600 mb-4">Please select an organization first</p>
            <Button onClick={() => navigate('/')}>Go to Dashboard</Button>
          </div>
        </div>
      </div>
    );
  }

  // Show seeder if no milestones exist
  if (milestones.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-6">
            <Database className="h-16 w-16 text-muted-foreground mx-auto" />
            <div>
              <h2 className="text-2xl font-bold mb-2">No Milestones Found</h2>
              <p className="text-muted-foreground mb-6">
                Seed the database with initial milestone data to get started.
              </p>
            </div>
            <MilestoneDataSeeder
              organizationId={currentOrganization.id}
              userId={currentOrganization.owner_id}
              onSeedComplete={() => window.location.reload()}
            />
          </div>
        </div>
      </div>
    );
  }

  const stats = getCompletionStats();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold">QA Sign-Off Tracker</h1>
            <p className="text-muted-foreground">
              Dynamic milestone tracking powered by database - {currentOrganization.name}
            </p>
          </div>
        </div>
      </div>

      {/* Maturion Compliance Check */}
      <MaturionComplianceCheck
        organizationId={currentOrganization.id}
        onComplianceChange={(isCompliant, checkedItems, totalItems) => 
          setComplianceStatus({ isCompliant, checkedItems, totalItems })
        }
      />

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Compliance Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${complianceStatus.isCompliant ? 'text-green-600' : 'text-red-600'}`}>
              {complianceStatus.checkedItems}/{complianceStatus.totalItems}
            </div>
            <p className="text-xs text-muted-foreground">
              {complianceStatus.isCompliant ? 'Fully Compliant' : 'Non-Compliant'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Signed Off</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.signedOff}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ready for Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.readyForTest}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completionRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Milestones */}
      <Card>
        <CardHeader>
          <CardTitle>Milestone Progress</CardTitle>
          <CardDescription>
            Track and manage milestone completion status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            {milestones.map((milestone) => (
              <AccordionItem key={milestone.id} value={milestone.id}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center justify-between w-full mr-4">
                    <div className="flex items-center gap-3">
                      {getMilestoneIcon(milestone.id)}
                      <div className="text-left">
                        <div className="font-semibold">{milestone.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {milestone.phase} - Week {milestone.week}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getPriorityBadge(milestone.priority)}
                      {getStatusBadge(milestone.status)}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-4">
                    <p className="text-sm text-muted-foreground mb-4">
                      {milestone.description}
                    </p>
                    
                    {milestone.milestone_tasks.map((task) => (
                      <Card key={task.id} className="ml-4">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(task.status)}
                              <CardTitle className="text-base">{task.name}</CardTitle>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(task.status)}
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                     onClick={() => {
                                       setSelectedTask(task);
                                       setSelectedMilestone(milestone);
                                       setTestStatus(task.status);
                                     }}
                                  >
                                    <Edit className="h-4 w-4 mr-1" />
                                    Update
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>Update Task Status</DialogTitle>
                                    <DialogDescription>
                                      Add test notes and update the status for {task.name}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <Label htmlFor="status">Status</Label>
                                      <Select value={testStatus} onValueChange={(value: MilestoneStatus) => setTestStatus(value)}>
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-background border shadow-md z-50">
                                          <SelectItem value="not_started">Not Started</SelectItem>
                                          <SelectItem value="in_progress">In Progress</SelectItem>
                                          <SelectItem value="ready_for_test">Ready for Test</SelectItem>
                                          <SelectItem value="signed_off">Signed Off</SelectItem>
                                          <SelectItem value="failed">Failed</SelectItem>
                                          <SelectItem value="rejected">Rejected</SelectItem>
                                          <SelectItem value="escalated">Escalated</SelectItem>
                                          <SelectItem value="alternative_proposal">Alternative Proposal</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div>
                                      <Label htmlFor="notes">Test Notes</Label>
                                      <Textarea
                                        id="notes"
                                        placeholder="Add your test notes, findings, or comments..."
                                        value={testNotes}
                                        onChange={(e) => setTestNotes(e.target.value)}
                                        rows={4}
                                      />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                      <Button variant="outline" onClick={() => setSelectedTask(null)}>
                                        Cancel
                                      </Button>
                                      <Button onClick={addTestNoteHandler}>
                                        Save Update
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </div>
                          <CardDescription>{task.description}</CardDescription>
                          {task.updated_at && (
                            <div className="text-xs text-muted-foreground">
                              Last updated: {new Date(task.updated_at).toLocaleDateString()}
                            </div>
                          )}
                        </CardHeader>
                        
                        {task.milestone_test_notes.length > 0 && (
                          <CardContent className="pt-0">
                            <h4 className="font-medium mb-2 text-sm">Test History</h4>
                            <div className="space-y-2">
                              {task.milestone_test_notes.map((note) => (
                                <div key={note.id} className="border-l-2 border-muted pl-3 py-2">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-medium">
                                      {new Date(note.created_at).toLocaleDateString()}
                                    </span>
                                    {getStatusBadge(note.status_at_time)}
                                  </div>
                                  <p className="text-sm text-muted-foreground">{note.note_content}</p>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Webhook Testing Section */}
      <WebhookTester />
    </div>
  );
};

export default QASignOffDynamic;