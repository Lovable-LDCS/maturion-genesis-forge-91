import { useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { useMilestones, MilestoneWithTasks } from '@/hooks/useMilestones';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

export default function MilestoneDetail() {
  const { milestone_id } = useParams<{ milestone_id: string }>();
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { milestones, loading, updateMilestoneTask } = useMilestones(currentOrganization?.id);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const milestone = milestones.find((m) => m.id === milestone_id);

  if (!milestone) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-muted-foreground">Milestone not found</h1>
          <p className="mt-2 text-muted-foreground">The milestone you're looking for doesn't exist.</p>
          <Link to="/" className="inline-flex items-center mt-4 text-primary hover:underline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const tasks = milestone.milestone_tasks || [];
  const signedOffTasks = tasks.filter(task => task.status === 'signed_off');
  const progressPercentage = tasks.length > 0 ? (signedOffTasks.length / tasks.length) * 100 : 0;

  const handleSignOff = async (taskId: string, taskName: string) => {
    if (!user) return;

    try {
      await updateMilestoneTask(
        taskId,
        {
          status: 'signed_off',
          updated_by: user.id,
        },
        taskName,
        milestone.name
      );
    } catch (error) {
      console.error('Error signing off task:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'signed_off':
        return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">Signed Off</Badge>;
      case 'ready_for_test':
        return <Badge variant="secondary">Ready for Test</Badge>;
      case 'in_progress':
        return <Badge variant="outline">In Progress</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header Section */}
      <div className="mb-8">
        <Link to="/" className="inline-flex items-center mb-4 text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
        
        <div className="space-y-4">
          <h1 className="text-3xl font-bold">{milestone.name}</h1>
          
          {milestone.description && (
            <p className="text-muted-foreground text-lg">{milestone.description}</p>
          )}
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Progress: {signedOffTasks.length} of {tasks.length} tasks signed off</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-3" />
          </div>
        </div>
      </div>

      {/* Task List Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Tasks</h2>
        
        {tasks.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">No tasks found for this milestone.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {tasks
              .sort((a, b) => a.display_order - b.display_order)
              .map((task) => {
                const isSignedOff = task.status === 'signed_off';
                
                return (
                  <Card key={task.id} className="transition-all hover:shadow-md">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <CardTitle className="text-lg">{task.name}</CardTitle>
                          {task.description && (
                            <p className="text-sm text-muted-foreground">{task.description}</p>
                          )}
                        </div>
                        <div className="ml-4">
                          {getStatusBadge(task.status)}
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          {isSignedOff ? (
                            <>
                              <div className="flex items-center">
                                <CheckCircle className="mr-1 h-4 w-4 text-green-600" />
                                Signed off on {format(new Date(task.updated_at), 'MMM d, yyyy')}
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center">
                              <Clock className="mr-1 h-4 w-4" />
                              Pending sign-off
                            </div>
                          )}
                        </div>
                        
                        <Button
                          variant={isSignedOff ? "outline" : "default"}
                          size="sm"
                          disabled={isSignedOff}
                          onClick={() => handleSignOff(task.id, task.name)}
                          className={isSignedOff ? "cursor-not-allowed" : ""}
                        >
                          {isSignedOff ? 'Signed Off' : 'Sign Off'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}