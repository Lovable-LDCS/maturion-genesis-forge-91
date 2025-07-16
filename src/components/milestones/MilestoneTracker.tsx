import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react'

interface Milestone {
  id: string
  name: string
  description: string
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked'
  phase: string
  week: string
  progress: number
  notes?: string
}

const mockMilestones: Milestone[] = [
  {
    id: '1',
    name: 'Supabase Integration',
    description: 'Set up authentication, database, and file storage',
    status: 'in_progress',
    phase: 'Phase 1',
    week: 'Week 1',
    progress: 75,
    notes: 'Authentication complete, working on database schema'
  },
  {
    id: '2',
    name: 'User Management System',
    description: 'Implement RBAC and organizational hierarchy',
    status: 'in_progress',
    phase: 'Phase 1',
    week: 'Week 1',
    progress: 50,
  },
  {
    id: '3',
    name: 'Organization Setup',
    description: 'Create organization and branch management interfaces',
    status: 'completed',
    phase: 'Phase 1',
    week: 'Week 1',
    progress: 100,
  },
  {
    id: '4',
    name: 'Assessment Framework',
    description: 'Build configuration interfaces for domains, MPS, and criteria',
    status: 'not_started',
    phase: 'Phase 1',
    week: 'Week 2',
    progress: 0,
  },
  {
    id: '5',
    name: 'Evidence Management',
    description: 'Implement evidence upload and basic verification',
    status: 'not_started',
    phase: 'Phase 1',
    week: 'Week 2',
    progress: 0,
  },
]

const getStatusIcon = (status: Milestone['status']) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-green-500" />
    case 'in_progress':
      return <Clock className="h-4 w-4 text-blue-500" />
    case 'blocked':
      return <XCircle className="h-4 w-4 text-red-500" />
    default:
      return <AlertCircle className="h-4 w-4 text-gray-400" />
  }
}

const getStatusColor = (status: Milestone['status']) => {
  switch (status) {
    case 'completed':
      return 'bg-green-500'
    case 'in_progress':
      return 'bg-blue-500'
    case 'blocked':
      return 'bg-red-500'
    default:
      return 'bg-gray-400'
  }
}

const getStatusText = (status: Milestone['status']) => {
  switch (status) {
    case 'completed':
      return 'Completed'
    case 'in_progress':
      return 'In Progress'
    case 'blocked':
      return 'Blocked'
    default:
      return 'Not Started'
  }
}

export const MilestoneTracker: React.FC = () => {
  const totalMilestones = mockMilestones.length
  const completedMilestones = mockMilestones.filter(m => m.status === 'completed').length
  const inProgressMilestones = mockMilestones.filter(m => m.status === 'in_progress').length
  const overallProgress = (completedMilestones / totalMilestones) * 100

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
        {mockMilestones.map((milestone) => (
          <Card key={milestone.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  {getStatusIcon(milestone.status)}
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium">{milestone.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {milestone.phase}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {milestone.week}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {milestone.description}
                    </p>
                    {milestone.notes && (
                      <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                        {milestone.notes}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <Badge 
                    variant="outline" 
                    className={`${getStatusColor(milestone.status)} text-white`}
                  >
                    {getStatusText(milestone.status)}
                  </Badge>
                </div>
              </div>
              {milestone.status === 'in_progress' && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Progress</span>
                    <span className="text-sm text-muted-foreground">
                      {milestone.progress}%
                    </span>
                  </div>
                  <Progress value={milestone.progress} className="h-2" />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}