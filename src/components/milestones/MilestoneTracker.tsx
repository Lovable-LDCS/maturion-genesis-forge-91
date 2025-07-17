import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useNavigate } from 'react-router-dom'
import { useOrganization } from '@/hooks/useOrganization'
import { useMilestones } from '@/hooks/useMilestones'
import { MilestoneCard } from './MilestoneCard'



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
          milestones.map((milestone) => (
            <MilestoneCard
              key={milestone.id}
              milestone={milestone}
              onClick={() => navigate(`/milestones/${milestone.id}`)}
            />
          ))
        )}
      </div>
    </div>
  )
}