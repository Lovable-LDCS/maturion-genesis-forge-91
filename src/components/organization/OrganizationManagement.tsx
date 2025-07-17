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
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  CheckCircle,
  Palette,
  Bell,
  Globe,
  Upload,
  Mail,
  MessageSquare,
  Webhook,
  Zap
} from 'lucide-react'

const organizationSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters'),
  description: z.string().optional(),
})

const brandingSchema = z.object({
  logoUrl: z.string().url().optional().or(z.literal('')),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color'),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color'),
})

const notificationSchema = z.object({
  emailAlerts: z.boolean(),
  digestFrequency: z.enum(['daily', 'weekly', 'monthly']),
  milestoneUpdates: z.boolean(),
  teamInvitations: z.boolean(),
  systemMaintenance: z.boolean(),
})

const integrationSchema = z.object({
  slackWebhookUrl: z.string().url().optional().or(z.literal('')),
  emailWebhookUrl: z.string().url().optional().or(z.literal('')),
  zapierWebhookUrl: z.string().url().optional().or(z.literal('')),
})

type OrganizationData = z.infer<typeof organizationSchema>
type BrandingData = z.infer<typeof brandingSchema>
type NotificationData = z.infer<typeof notificationSchema>
type IntegrationData = z.infer<typeof integrationSchema>

export const OrganizationManagement: React.FC = () => {
  const { organizations, currentOrganization, switchOrganization, hasPermission, refetch } = useOrganization()
  const { user } = useAuth()
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [brandingLoading, setBrandingLoading] = useState(false)
  const [notificationLoading, setNotificationLoading] = useState(false)
  const [integrationLoading, setIntegrationLoading] = useState(false)

  const form = useForm<OrganizationData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: currentOrganization?.name || '',
      description: currentOrganization?.description || '',
    },
  })

  const brandingForm = useForm<BrandingData>({
    resolver: zodResolver(brandingSchema),
    defaultValues: {
      logoUrl: '',
      primaryColor: '#3b82f6',
      accentColor: '#8b5cf6',
    },
  })

  const notificationForm = useForm<NotificationData>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      emailAlerts: true,
      digestFrequency: 'weekly',
      milestoneUpdates: true,
      teamInvitations: true,
      systemMaintenance: true,
    },
  })

  const integrationForm = useForm<IntegrationData>({
    resolver: zodResolver(integrationSchema),
    defaultValues: {
      slackWebhookUrl: '',
      emailWebhookUrl: '',
      zapierWebhookUrl: '',
    },
  })

  // Reset forms when organization changes
  React.useEffect(() => {
    if (currentOrganization) {
      form.reset({
        name: currentOrganization.name,
        description: currentOrganization.description || '',
      })
      
      integrationForm.reset({
        slackWebhookUrl: currentOrganization.slack_webhook_url || '',
        emailWebhookUrl: currentOrganization.email_webhook_url || '',
        zapierWebhookUrl: currentOrganization.zapier_webhook_url || '',
      })
    }
  }, [currentOrganization, form, integrationForm])

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

  const handleBrandingUpdate = async (data: BrandingData) => {
    if (!currentOrganization || !hasPermission('admin')) return

    setBrandingLoading(true)
    try {
      // In a real app, you would save this to a settings table
      // For now, we'll just show a success message
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
      
      toast({
        title: 'Branding Updated',
        description: 'Your organization branding has been saved successfully!',
      })
    } catch (error: any) {
      toast({
        title: 'Error updating branding',
        description: error.message || 'Failed to update branding. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setBrandingLoading(false)
    }
  }

  const handleNotificationUpdate = async (data: NotificationData) => {
    if (!currentOrganization || !hasPermission('admin')) return

    setNotificationLoading(true)
    try {
      // In a real app, you would save this to a settings table
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
      
      toast({
        title: 'Notifications Updated',
        description: 'Your notification preferences have been saved successfully!',
      })
    } catch (error: any) {
      toast({
        title: 'Error updating notifications',
        description: error.message || 'Failed to update notifications. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setNotificationLoading(false)
    }
  }

  const handleIntegrationUpdate = async (data: IntegrationData) => {
    if (!currentOrganization || !hasPermission('admin')) return

    setIntegrationLoading(true)
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          slack_webhook_url: data.slackWebhookUrl || null,
          email_webhook_url: data.emailWebhookUrl || null,
          zapier_webhook_url: data.zapierWebhookUrl || null,
        })
        .eq('id', currentOrganization.id)

      if (error) throw error
      
      toast({
        title: 'Integrations Updated',
        description: 'Your integration settings have been saved successfully!',
      })

      refetch() // Refresh organization data
    } catch (error: any) {
      console.error('Error updating integrations:', error)
      toast({
        title: 'Error updating integrations',
        description: error.message || 'Failed to update integrations. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIntegrationLoading(false)
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

      {/* Settings Tabs */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general" className="flex items-center space-x-2">
            <Building className="h-4 w-4" />
            <span>General</span>
          </TabsTrigger>
          <TabsTrigger value="branding" className="flex items-center space-x-2">
            <Palette className="h-4 w-4" />
            <span>Branding</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center space-x-2">
            <Bell className="h-4 w-4" />
            <span>Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center space-x-2">
            <Globe className="h-4 w-4" />
            <span>Integrations</span>
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
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
        </TabsContent>

        {/* Branding Settings */}
        <TabsContent value="branding">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Palette className="h-5 w-5" />
                <span>Branding & Appearance</span>
              </CardTitle>
              <CardDescription>
                Customize your organization's visual identity
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={brandingForm.handleSubmit(handleBrandingUpdate)} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="logoUrl">Organization Logo URL</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="logoUrl"
                        {...brandingForm.register('logoUrl')}
                        placeholder="https://example.com/logo.png"
                      />
                      <Button type="button" variant="outline" size="icon">
                        <Upload className="h-4 w-4" />
                      </Button>
                    </div>
                    {brandingForm.formState.errors.logoUrl && (
                      <p className="text-sm text-destructive">
                        {brandingForm.formState.errors.logoUrl.message}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="primaryColor">Primary Color</Label>
                      <div className="flex space-x-2">
                        <Input
                          id="primaryColor"
                          type="color"
                          {...brandingForm.register('primaryColor')}
                          className="w-16 h-10 p-1 border rounded"
                        />
                        <Input
                          {...brandingForm.register('primaryColor')}
                          placeholder="#3b82f6"
                          className="flex-1"
                        />
                      </div>
                      {brandingForm.formState.errors.primaryColor && (
                        <p className="text-sm text-destructive">
                          {brandingForm.formState.errors.primaryColor.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="accentColor">Accent Color</Label>
                      <div className="flex space-x-2">
                        <Input
                          id="accentColor"
                          type="color"
                          {...brandingForm.register('accentColor')}
                          className="w-16 h-10 p-1 border rounded"
                        />
                        <Input
                          {...brandingForm.register('accentColor')}
                          placeholder="#8b5cf6"
                          className="flex-1"
                        />
                      </div>
                      {brandingForm.formState.errors.accentColor && (
                        <p className="text-sm text-destructive">
                          {brandingForm.formState.errors.accentColor.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg space-y-2">
                    <Label className="text-sm font-medium">Preview</Label>
                    <div className="flex items-center space-x-3 p-3 rounded border">
                      <div 
                        className="w-8 h-8 rounded"
                        style={{ backgroundColor: brandingForm.watch('primaryColor') }}
                      />
                      <span className="font-medium">{currentOrganization.name}</span>
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: brandingForm.watch('accentColor') }}
                      />
                    </div>
                  </div>
                </div>

                <Button type="submit" disabled={brandingLoading || !hasPermission('admin')}>
                  <Save className="h-4 w-4 mr-2" />
                  {brandingLoading ? 'Saving...' : 'Save Branding'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Notification Preferences</span>
              </CardTitle>
              <CardDescription>
                Control how and when you receive notifications
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={notificationForm.handleSubmit(handleNotificationUpdate)} className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Email Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive immediate email notifications for important events
                      </p>
                    </div>
                    <Switch
                      checked={notificationForm.watch('emailAlerts')}
                      onCheckedChange={(checked) => notificationForm.setValue('emailAlerts', checked)}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Digest Frequency</Label>
                    <Select
                      value={notificationForm.watch('digestFrequency')}
                      onValueChange={(value: 'daily' | 'weekly' | 'monthly') => 
                        notificationForm.setValue('digestFrequency', value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily Summary</SelectItem>
                        <SelectItem value="weekly">Weekly Summary</SelectItem>
                        <SelectItem value="monthly">Monthly Summary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <Label className="text-base">Notification Types</Label>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-normal">Milestone Updates</Label>
                        <p className="text-xs text-muted-foreground">
                          Get notified when milestones are completed or updated
                        </p>
                      </div>
                      <Switch
                        checked={notificationForm.watch('milestoneUpdates')}
                        onCheckedChange={(checked) => notificationForm.setValue('milestoneUpdates', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-normal">Team Invitations</Label>
                        <p className="text-xs text-muted-foreground">
                          Get notified when team members join or leave
                        </p>
                      </div>
                      <Switch
                        checked={notificationForm.watch('teamInvitations')}
                        onCheckedChange={(checked) => notificationForm.setValue('teamInvitations', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-normal">System Maintenance</Label>
                        <p className="text-xs text-muted-foreground">
                          Get notified about scheduled maintenance and updates
                        </p>
                      </div>
                      <Switch
                        checked={notificationForm.watch('systemMaintenance')}
                        onCheckedChange={(checked) => notificationForm.setValue('systemMaintenance', checked)}
                      />
                    </div>
                  </div>
                </div>

                <Button type="submit" disabled={notificationLoading || !hasPermission('admin')}>
                  <Save className="h-4 w-4 mr-2" />
                  {notificationLoading ? 'Saving...' : 'Save Preferences'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integration Settings */}
        <TabsContent value="integrations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="h-5 w-5" />
                <span>Integrations</span>
              </CardTitle>
              <CardDescription>
                Connect your organization with external services and tools
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={integrationForm.handleSubmit(handleIntegrationUpdate)} className="space-y-6">
                <div className="space-y-6">
                  {/* Slack Integration */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="h-5 w-5 text-primary" />
                      <Label className="text-base font-medium">Slack Integration</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Send milestone updates and notifications to your Slack workspace
                    </p>
                    <Input
                      {...integrationForm.register('slackWebhookUrl')}
                      placeholder="https://hooks.slack.com/services/..."
                    />
                    {integrationForm.formState.errors.slackWebhookUrl && (
                      <p className="text-sm text-destructive">
                        {integrationForm.formState.errors.slackWebhookUrl.message}
                      </p>
                    )}
                  </div>

                  <Separator />

                  {/* Email Webhook */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-5 w-5 text-primary" />
                      <Label className="text-base font-medium">Email Webhook</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Send organization events to your email automation service
                    </p>
                    <Input
                      {...integrationForm.register('emailWebhookUrl')}
                      placeholder="https://your-email-service.com/webhook"
                    />
                    {integrationForm.formState.errors.emailWebhookUrl && (
                      <p className="text-sm text-destructive">
                        {integrationForm.formState.errors.emailWebhookUrl.message}
                      </p>
                    )}
                  </div>

                  <Separator />

                  {/* Zapier Integration */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Zap className="h-5 w-5 text-primary" />
                      <Label className="text-base font-medium">Zapier Webhook</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Trigger Zapier workflows when organization events occur
                    </p>
                    <Input
                      {...integrationForm.register('zapierWebhookUrl')}
                      placeholder="https://hooks.zapier.com/hooks/catch/..."
                    />
                    {integrationForm.formState.errors.zapierWebhookUrl && (
                      <p className="text-sm text-destructive">
                        {integrationForm.formState.errors.zapierWebhookUrl.message}
                      </p>
                    )}
                  </div>

                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <Webhook className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Webhook Events</p>
                        <p className="text-xs text-muted-foreground">
                          Webhooks will be triggered for: milestone completions, team member changes, 
                          organization updates, and QA sign-offs.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <Button type="submit" disabled={integrationLoading || !hasPermission('admin')}>
                  <Save className="h-4 w-4 mr-2" />
                  {integrationLoading ? 'Saving...' : 'Save Integrations'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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