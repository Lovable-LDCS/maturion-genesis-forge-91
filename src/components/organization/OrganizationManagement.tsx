import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { useOrganization } from '@/hooks/useOrganization'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { 
  Building, 
  Settings, 
  Edit3, 
  Trash2, 
  Save, 
  X, 
  ChevronDown,
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'

const organizationSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters'),
  description: z.string().optional(),
})

type OrganizationData = z.infer<typeof organizationSchema>

export const OrganizationManagement: React.FC = () => {
  const { organizations, currentOrganization, switchOrganization, hasPermission, refetch } = useOrganization()
  const { user } = useAuth()
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const form = useForm<OrganizationData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: currentOrganization?.name || '',
      description: currentOrganization?.description || '',
    },
  })

  // Reset form when organization changes
  React.useEffect(() => {
    if (currentOrganization) {
      form.reset({
        name: currentOrganization.name,
        description: currentOrganization.description || '',
      })
    }
  }, [currentOrganization, form])

  const handleEdit = async (data: OrganizationData) => {
    if (!currentOrganization || !hasPermission('admin')) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          name: data.name,
          description: data.description,
        })
        .eq('id', currentOrganization.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Organization updated successfully!',
      })

      setIsEditing(false)
      refetch() // Refresh organization data
    } catch (error: any) {
      console.error('Error updating organization:', error)
      toast({
        title: 'Error updating organization',
        description: error.message || 'Failed to update organization. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!currentOrganization || !hasPermission('owner')) return

    setDeleteLoading(true)
    try {
      // Delete organization (cascade will handle members and invitations)
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', currentOrganization.id)

      if (error) throw error

      toast({
        title: 'Organization Deleted',
        description: 'Organization and all associated data have been removed.',
      })

      // Refresh organizations list
      refetch()
    } catch (error: any) {
      console.error('Error deleting organization:', error)
      toast({
        title: 'Error deleting organization',
        description: error.message || 'Failed to delete organization. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    form.reset({
      name: currentOrganization?.name || '',
      description: currentOrganization?.description || '',
    })
  }

  if (!currentOrganization) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">No organization selected</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header with Organization Switcher */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Organization Settings</h1>
          <p className="text-muted-foreground">
            Manage your organization details and preferences
          </p>
        </div>

        {/* Multi-Organization Switcher */}
        {organizations.length > 1 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center space-x-2">
                <Building className="h-4 w-4" />
                <span>{currentOrganization.name}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">
                Switch Organization
              </div>
              <DropdownMenuSeparator />
              {organizations.map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => switchOrganization(org.id)}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2">
                    <Building className="h-4 w-4" />
                    <span>{org.name}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Badge variant="secondary" className="text-xs">
                      {org.user_role}
                    </Badge>
                    {org.id === currentOrganization.id && (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    )}
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Organization Details Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Building className="h-5 w-5" />
              <span>Organization Details</span>
            </CardTitle>
            <CardDescription>
              Basic information about your organization
            </CardDescription>
          </div>
          
          {hasPermission('admin') && !isEditing && (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Edit3 className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </CardHeader>
        
        <CardContent className="space-y-4">
          {isEditing ? (
            <form onSubmit={form.handleSubmit(handleEdit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Organization Name</Label>
                <Input
                  id="name"
                  {...form.register('name')}
                  placeholder="Enter organization name"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  {...form.register('description')}
                  placeholder="Describe your organization"
                  className="min-h-[100px]"
                />
                {form.formState.errors.description && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.description.message}
                  </p>
                )}
              </div>
              
              <div className="flex space-x-2">
                <Button type="submit" disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                <p className="text-lg font-medium">{currentOrganization.name}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                <p className="text-muted-foreground">
                  {currentOrganization.description || 'No description provided'}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Your Role</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="secondary">{currentOrganization.user_role}</Badge>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(currentOrganization.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="hover-scale cursor-pointer">
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle className="ml-2 text-lg">Team Members</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              Manage team members and invitations
            </p>
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/team'}>
              Manage Team
            </Button>
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <Calendar className="h-5 w-5 text-primary" />
            <CardTitle className="ml-2 text-lg">Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              View organization activity and logs
            </p>
            <Button variant="outline" size="sm" disabled>
              Coming Soon
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Danger Zone */}
      {hasPermission('owner') && (
        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span>Danger Zone</span>
            </CardTitle>
            <CardDescription>
              Irreversible actions that affect your entire organization
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              <Separator />
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium">Delete Organization</h4>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete this organization and all associated data
                  </p>
                </div>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Organization
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Organization</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the 
                        "{currentOrganization.name}" organization and remove all team members, 
                        invitations, and associated data.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        disabled={deleteLoading}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {deleteLoading ? 'Deleting...' : 'Delete Organization'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}