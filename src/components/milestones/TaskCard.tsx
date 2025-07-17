import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, TestTube, Loader2, AlertCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { StatusBadge } from './StatusBadge';
import { SignOffButton } from './SignOffButton';
import { TestResultsDialog } from './TestResultsDialog';
import { MilestoneTask } from '@/hooks/useMilestones';
import { useMilestoneTests } from '@/hooks/useMilestoneTests';

interface TaskCardProps {
  task: MilestoneTask;
  milestoneName: string;
  onSignOff: (taskId: string, taskName: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  milestoneName,
  onSignOff 
}) => {
  const [showTestResults, setShowTestResults] = useState(false);
  const { testSessions, isRunning, runTaskTests, setManualVerification, exportTestResults } = useMilestoneTests();
  
  const isSignedOff = task.status === 'signed_off';
  
  // Get the latest test session for this specific task
  const latestTestSession = testSessions.find(session => 
    session.taskId === task.id && session.isTaskTest === true
  );
  
  const handleRunTest = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // Run task-specific tests
      const session = await runTaskTests(task);
      setShowTestResults(true);
    } catch (error) {
      console.error('Test failed:', error);
    }
  };

  const handleViewResults = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowTestResults(true);
  };

  const handleTaskClick = () => {
    if (latestTestSession) {
      setShowTestResults(true);
    }
  };

  const handleManualVerify = (verified: boolean, notes?: string) => {
    if (latestTestSession) {
      setManualVerification(latestTestSession.id, verified, notes);
    }
  };

  const handleExport = () => {
    if (latestTestSession) {
      exportTestResults(latestTestSession);
    }
  };

  const getTestStatusIcon = () => {
    if (!latestTestSession) return null;
    
    switch (latestTestSession.overallStatus) {
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getTestStatusBadge = () => {
    if (!latestTestSession) return null;
    
    const statusColor = {
      passed: 'bg-green-100 text-green-800 border-green-200',
      warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      failed: 'bg-red-100 text-red-800 border-red-200'
    }[latestTestSession.overallStatus];

    return (
      <Badge 
        variant="outline" 
        className={`${statusColor} text-xs px-2 py-1 flex items-center space-x-1`}
      >
        {getTestStatusIcon()}
        <span className="capitalize">{latestTestSession.overallStatus}</span>
        {latestTestSession.manualVerified && (
          <span className="ml-1">• Verified</span>
        )}
      </Badge>
    );
  };

  return (
    <>
      <Card 
        className={`transition-all hover:shadow-md ${latestTestSession ? 'cursor-pointer' : ''}`}
        onClick={handleTaskClick}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <div className="flex items-center space-x-2">
                <CardTitle className="text-lg">{task.name}</CardTitle>
                {getTestStatusBadge()}
              </div>
              {task.description && (
                <p className="text-sm text-muted-foreground">{task.description}</p>
              )}
            </div>
            <div className="ml-4 flex items-center space-x-2">
              <StatusBadge status={task.status} />
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              {isSignedOff ? (
                <div className="flex items-center">
                  <CheckCircle className="mr-1 h-4 w-4 text-green-600" />
                  Signed off on {format(new Date(task.updated_at), 'MMM d, yyyy')}
                </div>
              ) : (
                <div className="flex items-center">
                  <Clock className="mr-1 h-4 w-4" />
                  Pending sign-off
                </div>
              )}
              
              {/* Test Results Summary */}
              {latestTestSession && (
                <div className="flex items-center space-x-2 text-xs border-l pl-4">
                  <span>
                    Last tested: {latestTestSession.timestamp.toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Test Actions */}
              <div className="flex space-x-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRunTest}
                  disabled={isRunning}
                  className="text-xs px-2 py-1 h-7"
                >
                  {isRunning ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <TestTube className="h-3 w-3" />
                  )}
                  <span className="ml-1">
                    {isRunning ? 'Running...' : 'Test'}
                  </span>
                </Button>
                
                {latestTestSession && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleViewResults}
                    className="text-xs px-2 py-1 h-7"
                  >
                    Results
                  </Button>
                )}
              </div>
              
              <SignOffButton
                isSignedOff={isSignedOff}
                onSignOff={() => onSignOff(task.id, task.name)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Test Results Dialog */}
      <TestResultsDialog
        open={showTestResults}
        onOpenChange={setShowTestResults}
        session={latestTestSession}
        milestoneName={`${milestoneName} - ${task.name}`}
        onManualVerify={handleManualVerify}
        onExport={handleExport}
      />
    </>
  );
};