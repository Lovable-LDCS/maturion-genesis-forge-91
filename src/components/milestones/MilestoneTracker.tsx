import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, Clock, AlertCircle, XCircle, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useOrganization } from '@/hooks/useOrganization'
import { useMilestones } from '@/hooks/useMilestones'


const getStatusIcon = (status: string) => {
  switch (status) {
    case 'signed_off':
      return <CheckCircle className="h-4 w-4 text-green-500" />
    case 'ready_for_test':
    case 'in_progress':
      return <Clock className="h-4 w-4 text-blue-500" />
    case 'failed':
    case 'rejected':
      return <XCircle className="h-4 w-4 text-red-500" />
    default:
      return <AlertCircle className="h-4 w-4 text-gray-400" />
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'signed_off':
      return 'bg-green-500'
    case 'ready_for_test':
    case 'in_progress':
      return 'bg-blue-500'
    case 'failed':
    case 'rejected':
      return 'bg-red-500'
    default:
      return 'bg-gray-400'
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'signed_off':
      return 'Signed Off'
    case 'ready_for_test':
      return 'Ready for Test'
    case 'in_progress':
      return 'In Progress'
    case 'failed':
      return 'Failed'
    case 'rejected':
      return 'Rejected'
    default:
      return 'Not Started'
  }
}

export const MilestoneTracker: React.FC = () => {
  const navigate = useNavigate()
  const { currentOrganization } = useOrganization()
  const { milestones, loading } = useMilestones(currentOrganization?.id)
  
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const totalMilestones = milestones.length
  const completedMilestones = milestones.filter(m => m.status === 'signed_off').length
  const inProgressMilestones = milestones.filter(m => m.status === 'in_progress' || m.status === 'ready_for_test').length
  const overallProgress = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Phase 1: Foundation Setup</CardTitle>
          <CardDescription>
            Week 1-2: Core infrastructure and assessment framework
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-muted-foreground">
                {completedMilestones}/{totalMilestones} milestones completed
              </span>
            </div>
            <Progress value={overallProgress} className="h-2" />
            
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{completedMilestones}</div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{inProgressMilestones}</div>
                <div className="text-sm text-muted-foreground">In Progress</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {totalMilestones - completedMilestones - inProgressMilestones}
                </div>
                <div className="text-sm text-muted-foreground">Remaining</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Current Milestones</h3>
        {milestones.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">No milestones found. Create your first milestone to get started.</p>
            </CardContent>
          </Card>
        ) : (
          milestones.map((milestone) => {
            const completedTasks = milestone.milestone_tasks?.filter(task => task.status === 'signed_off').length || 0
            const totalTasks = milestone.milestone_tasks?.length || 0
            const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
            
            return (
              <Card 
                key={milestone.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/milestones/${milestone.id}`)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      {getStatusIcon(milestone.status)}
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
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
                      <Badge 
                        variant="outline" 
                        className={`${getStatusColor(milestone.status)} text-white`}
                      >
                        {getStatusText(milestone.status)}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}