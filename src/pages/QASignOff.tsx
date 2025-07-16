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
  FolderOpen
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Types for our QA system
type FeatureStatus = 'not-started' | 'in-progress' | 'ready-for-test' | 'signed-off' | 'failed';

interface TestNote {
  id: string;
  date: string;
  tester: string;
  notes: string;
  status: FeatureStatus;
  screenshots?: string[];
}

interface Feature {
  id: string;
  name: string;
  description: string;
  status: FeatureStatus;
  priority: 'critical' | 'high' | 'medium' | 'low';
  testNotes: TestNote[];
  lastTested?: string;
  assignee?: string;
}

interface Milestone {
  id: string;
  name: string;
  description: string;
  phase: string;
  targetWeek: string;
  features: Feature[];
  overallStatus: FeatureStatus;
}

// Mock data structure for our QA tracking
const initialMilestones: Milestone[] = [
  {
    id: 'foundation-setup',
    name: 'Foundation Setup',
    description: 'Core system infrastructure and basic functionality',
    phase: 'Phase 1',
    targetWeek: 'Week 1',
    overallStatus: 'in-progress',
    features: [
      {
        id: 'supabase-integration',
        name: 'Supabase Integration',
        description: 'Database setup, authentication, RLS policies, and basic CRUD operations',
        status: 'signed-off',
        priority: 'critical',
        lastTested: '2025-01-16',
        assignee: 'System',
        testNotes: [
          {
            id: '1',
            date: '2025-01-16',
            tester: 'Johan Ras',
            notes: 'All RLS policies cleaned up and working correctly. Database triggers functioning properly. Organization creation and membership working as expected.',
            status: 'signed-off'
          }
        ]
      },
      {
        id: 'user-management',
        name: 'User Management System',
        description: 'User authentication, profiles, and session management',
        status: 'signed-off',
        priority: 'critical',
        lastTested: '2025-01-16',
        assignee: 'System',
        testNotes: [
          {
            id: '2',
            date: '2025-01-16',
            tester: 'Johan Ras',
            notes: 'UPDATED: Authentication working correctly. Profile creation on signup functional. Team member invitation flow now complete and tested. All user management features operational.',
            status: 'signed-off'
          }
        ]
      },
      {
        id: 'organization-setup',
        name: 'Organization Setup',
        description: 'Organization creation, management, and basic structure',
        status: 'in-progress',
        priority: 'critical',
        lastTested: '2025-01-16',
        assignee: 'System',
        testNotes: [
          {
            id: '3',
            date: '2025-01-16',
            tester: 'Johan Ras',
            notes: 'Organization creation works. Need to add editing capabilities and team management interface.',
            status: 'in-progress'
          }
        ]
      },
      {
        id: 'team-member-invitation',
        name: 'Team Member Invitation',
        description: 'Invite and manage team members within organizations',
        status: 'ready-for-test',
        priority: 'high',
        lastTested: '2025-01-16',
        assignee: 'System',
        testNotes: [
          {
            id: '4',
            date: '2025-01-16',
            tester: 'Johan Ras',
            notes: 'EMAIL DELIVERY STATUS UPDATE:\n\n✅ Database Layer: All RLS policies working, unique constraints fixed for resending\n✅ Edge Function: Complete send-invitation function with Resend integration\n✅ Email Template: Professional HTML email template ready\n✅ Integration: Full invitation creation to email sending pipeline\n✅ Error Handling: Graceful fallback when email fails\n✅ Manual Testing: Ready for manual token-based testing\n\n🚫 Email delivery to real addresses: BLOCKED (awaiting domain verification)\n✅ Manual link flow: READY FOR TEST\n\nMANUAL TESTING PROCESS:\n1. Create invitation via UI ✅\n2. Copy invitation_token from database ⏳\n3. Construct link: /accept-invitation?token=<token> ⏳\n4. Test acceptance flow ⏳\n5. Verify membership creation ⏳',
            status: 'ready-for-test'
          }
        ]
      },
      {
        id: 'milestone-tracking',
        name: 'Real Milestone Tracking',
        description: 'Replace hardcoded milestone data with dynamic tracking system',
        status: 'not-started',
        priority: 'medium',
        testNotes: []
      }
    ]
  },
  {
    id: 'assessment-framework',
    name: 'Assessment Framework',
    description: 'Core assessment domain configuration and maturity criteria setup',
    phase: 'Phase 1',
    targetWeek: 'Week 2',
    overallStatus: 'not-started',
    features: [
      {
        id: 'domain-configuration',
        name: 'Assessment Domain Configuration',
        description: 'Set up and manage assessment domains (e.g., Security, Operations, Development)',
        status: 'not-started',
        priority: 'critical',
        testNotes: []
      },
      {
        id: 'maturity-criteria',
        name: 'Maturity Criteria Setup',
        description: 'Define and configure maturity levels and criteria for each domain',
        status: 'not-started',
        priority: 'critical',
        testNotes: []
      },
      {
        id: 'assessment-templates',
        name: 'Assessment Templates',
        description: 'Create reusable assessment templates and questionnaires',
        status: 'not-started',
        priority: 'high',
        testNotes: []
      }
    ]
  },
  {
    id: 'evidence-management',
    name: 'Evidence Management',
    description: 'System for uploading, categorizing, and managing assessment evidence',
    phase: 'Phase 1',
    targetWeek: 'Week 3',
    overallStatus: 'not-started',
    features: [
      {
        id: 'evidence-upload',
        name: 'Evidence Upload System',
        description: 'Upload and store various file types as assessment evidence',
        status: 'not-started',
        priority: 'high',
        testNotes: []
      },
      {
        id: 'evidence-categorization',
        name: 'Evidence Categorization',
        description: 'Tag and categorize evidence by domain, maturity level, and criteria',
        status: 'not-started',
        priority: 'high',
        testNotes: []
      },
      {
        id: 'evidence-review',
        name: 'Evidence Review Workflow',
        description: 'Review, approve, and provide feedback on submitted evidence',
        status: 'not-started',
        priority: 'medium',
        testNotes: []
      }
    ]
  }
];

const QASignOff: React.FC = () => {
  const [milestones, setMilestones] = useState<Milestone[]>(initialMilestones);
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [testNotes, setTestNotes] = useState('');
  const [testStatus, setTestStatus] = useState<FeatureStatus>('ready-for-test');
  const { toast } = useToast();
  const navigate = useNavigate();

  const getStatusIcon = (status: FeatureStatus) => {
    switch (status) {
      case 'signed-off':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'ready-for-test':
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case 'in-progress':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <div className="h-4 w-4 rounded-full bg-gray-300" />;
    }
  };

  const getStatusBadge = (status: FeatureStatus) => {
    const configs = {
      'signed-off': { variant: 'default' as const, text: 'Signed Off', className: 'bg-green-500 hover:bg-green-600' },
      'ready-for-test': { variant: 'secondary' as const, text: 'Ready for Test', className: 'bg-blue-500 hover:bg-blue-600 text-white' },
      'in-progress': { variant: 'outline' as const, text: 'In Progress', className: 'border-yellow-500 text-yellow-600' },
      'failed': { variant: 'destructive' as const, text: 'Failed', className: '' },
      'not-started': { variant: 'outline' as const, text: 'Not Started', className: 'border-gray-300 text-gray-500' }
    };
    
    const config = configs[status];
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.text}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: Feature['priority']) => {
    const configs = {
      'critical': { variant: 'destructive' as const, text: 'Critical', className: '' },
      'high': { variant: 'default' as const, text: 'High', className: 'bg-orange-500 hover:bg-orange-600' },
      'medium': { variant: 'secondary' as const, text: 'Medium', className: '' },
      'low': { variant: 'outline' as const, text: 'Low', className: '' }
    };
    
    const config = configs[priority];
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.text}
      </Badge>
    );
  };

  const addTestNote = () => {
    if (!selectedFeature || !testNotes.trim()) return;

    const newNote: TestNote = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      tester: 'Johan Ras', // In real app, get from auth context
      notes: testNotes,
      status: testStatus
    };

    setMilestones(prev => prev.map(milestone => ({
      ...milestone,
      features: milestone.features.map(feature => 
        feature.id === selectedFeature.id 
          ? { 
              ...feature, 
              status: testStatus,
              lastTested: newNote.date,
              testNotes: [...feature.testNotes, newNote] 
            }
          : feature
      )
    })));

    toast({
      title: "Test note added",
      description: `Updated ${selectedFeature.name} status to ${testStatus.replace('-', ' ')}`
    });

    setTestNotes('');
    setSelectedFeature(null);
  };

  const getMilestoneIcon = (milestoneId: string) => {
    switch (milestoneId) {
      case 'foundation-setup':
        return <Database className="h-5 w-5" />;
      case 'assessment-framework':
        return <BarChart3 className="h-5 w-5" />;
      case 'evidence-management':
        return <FolderOpen className="h-5 w-5" />;
      default:
        return <Target className="h-5 w-5" />;
    }
  };

  const getCompletionStats = () => {
    const allFeatures = milestones.flatMap(m => m.features);
    const signedOff = allFeatures.filter(f => f.status === 'signed-off').length;
    const readyForTest = allFeatures.filter(f => f.status === 'ready-for-test').length;
    const inProgress = allFeatures.filter(f => f.status === 'in-progress').length;
    const notStarted = allFeatures.filter(f => f.status === 'not-started').length;
    
    return { total: allFeatures.length, signedOff, readyForTest, inProgress, notStarted };
  };

  const stats = getCompletionStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary-foreground" />
                </div>
                <h1 className="text-2xl font-bold">QA Sign-Off Tracker</h1>
              </div>
            </div>
            <Badge variant="outline" className="text-sm">
              Last Updated: {new Date().toLocaleDateString()}
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Signed Off</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.signedOff}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Ready for Test</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.readyForTest}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Not Started</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-500">{stats.notStarted}</div>
            </CardContent>
          </Card>
        </div>

        {/* Milestones */}
        <Accordion type="multiple" defaultValue={['foundation-setup']} className="space-y-4">
          {milestones.map((milestone) => (
            <AccordionItem key={milestone.id} value={milestone.id}>
              <Card>
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center justify-between w-full mr-4">
                    <div className="flex items-center space-x-4">
                      {getMilestoneIcon(milestone.id)}
                      <div className="text-left">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-semibold">{milestone.name}</h3>
                          <Badge variant="outline">{milestone.phase}</Badge>
                          <Badge variant="secondary">{milestone.targetWeek}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {milestone.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(milestone.overallStatus)}
                      <span className="text-sm text-muted-foreground">
                        {milestone.features.filter(f => f.status === 'signed-off').length}/{milestone.features.length} Complete
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="px-6 pb-4">
                    <div className="space-y-4">
                      {milestone.features.map((feature) => (
                        <Card key={feature.id} className="border-l-4 border-l-primary/20">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  {getStatusIcon(feature.status)}
                                  <CardTitle className="text-base">{feature.name}</CardTitle>
                                  {getPriorityBadge(feature.priority)}
                                </div>
                                <CardDescription>{feature.description}</CardDescription>
                                {feature.lastTested && (
                                  <p className="text-xs text-muted-foreground">
                                    Last tested: {feature.lastTested}
                                    {feature.assignee && ` by ${feature.assignee}`}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center space-x-2">
                                {getStatusBadge(feature.status)}
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => setSelectedFeature(feature)}
                                    >
                                      <Edit className="h-4 w-4 mr-1" />
                                      Update
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                      <DialogTitle>Update Test Status: {feature.name}</DialogTitle>
                                      <DialogDescription>
                                        Add test notes and update the status of this feature
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div>
                                        <Label htmlFor="status">New Status</Label>
                                        <Select value={testStatus} onValueChange={(value) => setTestStatus(value as FeatureStatus)}>
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="in-progress">In Progress</SelectItem>
                                            <SelectItem value="ready-for-test">Ready for Test</SelectItem>
                                            <SelectItem value="signed-off">Signed Off</SelectItem>
                                            <SelectItem value="failed">Failed</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div>
                                        <Label htmlFor="notes">Test Notes</Label>
                                        <Textarea
                                          id="notes"
                                          placeholder="Enter test results, observations, or issues found..."
                                          value={testNotes}
                                          onChange={(e) => setTestNotes(e.target.value)}
                                          rows={4}
                                        />
                                      </div>
                                      <Button onClick={addTestNote} className="w-full">
                                        Add Test Note
                                      </Button>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </div>
                          </CardHeader>
                          {feature.testNotes.length > 0 && (
                            <CardContent className="pt-0">
                              <div className="space-y-3">
                                <h4 className="text-sm font-medium">Test History</h4>
                                {feature.testNotes.slice(-3).map((note) => (
                                  <div key={note.id} className="border rounded-lg p-3 bg-muted/50">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center space-x-2">
                                        <span className="text-sm font-medium">{note.tester}</span>
                                        <span className="text-xs text-muted-foreground">{note.date}</span>
                                      </div>
                                      {getStatusBadge(note.status)}
                                    </div>
                                    <p className="text-sm">{note.notes}</p>
                                  </div>
                                ))}
                                {feature.testNotes.length > 3 && (
                                  <p className="text-xs text-muted-foreground">
                                    ...and {feature.testNotes.length - 3} more test notes
                                  </p>
                                )}
                              </div>
                            </CardContent>
                          )}
                        </Card>
                      ))}
                    </div>
                  </div>
                </AccordionContent>
              </Card>
            </AccordionItem>
          ))}
        </Accordion>
      </main>
    </div>
  );
};

export default QASignOff;