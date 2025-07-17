import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ChevronRight } from 'lucide-react';
import { StatusIcon } from './StatusIcon';
import { StatusBadge } from './StatusBadge';
import { MilestoneWithTasks } from '@/hooks/useMilestones';

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
  const completedTasks = milestone.milestone_tasks?.filter(task => task.status === 'signed_off').length || 0;
  const totalTasks = milestone.milestone_tasks?.length || 0;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

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
            </div>
          </div>
          <div className="ml-4">
            <StatusBadge status={milestone.status} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};