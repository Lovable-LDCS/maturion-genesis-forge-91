import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ChevronRight, TestTube, Loader2 } from 'lucide-react';
import { StatusIcon } from './StatusIcon';
import { StatusBadge } from './StatusBadge';
import { TestResultsDialog } from './TestResultsDialog';
import { MilestoneWithTasks } from '@/hooks/useMilestones';
import { useMilestoneTests } from '@/hooks/useMilestoneTests';

interface MilestoneCardProps {
  milestone: MilestoneWithTasks;
  onClick?: () => void;
  showNavigation?: boolean;
}

export const MilestoneCard: React.FC<MilestoneCardProps> = ({ 
  milestone, 
  onClick,
  showNavigation = true 
}) => {
  const [showTestResults, setShowTestResults] = useState(false);
  const { testSessions, isRunning, runTests, setManualVerification, exportTestResults } = useMilestoneTests();
  
  const completedTasks = milestone.milestone_tasks?.filter(task => task.status === 'signed_off').length || 0;
  const totalTasks = milestone.milestone_tasks?.length || 0;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  
  // Get the latest test session for this milestone
  const latestTestSession = testSessions.find(session => session.milestoneId === milestone.id);

  const handleRunTest = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    try {
      const session = await runTests(milestone);
      setShowTestResults(true);
    } catch (error) {
      console.error('Test failed:', error);
    }
  };

  const handleViewResults = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    setShowTestResults(true);
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

  return (
    <Card 
      className={`transition-all ${onClick ? 'cursor-pointer hover:shadow-md' : ''}`}
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <StatusIcon status={milestone.status} />
            <div className="space-y-2 flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <h4 className="font-medium">{milestone.name}</h4>
                  {milestone.phase && (
                    <Badge variant="outline" className="text-xs">
                      {milestone.phase}
                    </Badge>
                  )}
                  {milestone.week && (
                    <Badge variant="secondary" className="text-xs">
                      Week {milestone.week}
                    </Badge>
                  )}
                </div>
                {showNavigation && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              {milestone.description && (
                <p className="text-sm text-muted-foreground">
                  {milestone.description}
                </p>
              )}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{completedTasks}/{totalTasks} tasks completed</span>
                 <span>{Math.round(progress)}% complete</span>
               </div>
               <Progress value={progress} className="h-2" />
               
               {/* Test Results Summary */}
               {latestTestSession && (
                 <div className="flex items-center justify-between text-xs">
                   <span className="text-muted-foreground">
                     Last tested: {latestTestSession.timestamp.toLocaleDateString()}
                   </span>
                   <div className="flex items-center space-x-1">
                     <div className={`w-2 h-2 rounded-full ${
                       latestTestSession.overallStatus === 'passed' ? 'bg-green-500' :
                       latestTestSession.overallStatus === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                     }`} />
                     <span className="capitalize">{latestTestSession.overallStatus}</span>
                     {latestTestSession.manualVerified && (
                       <Badge variant="outline" className="ml-1 text-xs px-1 py-0">Verified</Badge>
                     )}
                   </div>
                 </div>
               )}
             </div>
           </div>
           
           <div className="ml-4 flex flex-col items-end space-y-2">
             <StatusBadge status={milestone.status} />
             
             {/* Test Actions */}
             <div className="flex flex-col space-y-1">
               <Button
                 size="sm"
                 variant="outline"
                 onClick={handleRunTest}
                 disabled={isRunning}
                 className="text-xs px-2 py-1 h-6"
               >
                 {isRunning ? (
                   <Loader2 className="h-3 w-3 animate-spin" />
                 ) : (
                   <TestTube className="h-3 w-3" />
                 )}
                 <span className="ml-1">
                   {isRunning ? 'Running...' : 'Run Test'}
                 </span>
               </Button>
               
               {latestTestSession && (
                 <Button
                   size="sm"
                   variant="ghost"
                   onClick={handleViewResults}
                   className="text-xs px-2 py-1 h-6"
                 >
                   View Results
                 </Button>
               )}
             </div>
           </div>
         </div>
         
         {/* Test Results Dialog */}
         <TestResultsDialog
           open={showTestResults}
           onOpenChange={setShowTestResults}
           session={latestTestSession}
           onManualVerify={handleManualVerify}
           onExport={handleExport}
         />
      </CardContent>
    </Card>
  );
};