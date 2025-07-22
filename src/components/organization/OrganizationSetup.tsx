import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { Building, Plus } from 'lucide-react'

const organizationSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters'),
  description: z.string().optional(),
  
  // AI Behavior & Knowledge Source Policy v2.0 fields
  primary_website_url: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  linked_domains: z.array(z.string()).optional(),
  industry_tags: z.array(z.string()).optional(),
  region_operating: z.string().optional(),
  risk_concerns: z.array(z.string()).optional(),
  compliance_commitments: z.array(z.string()).optional(),
  threat_sensitivity_level: z.enum(['Basic', 'Moderate', 'Advanced']).optional(),
})

type OrganizationData = z.infer<typeof organizationSchema>

interface OrganizationSetupProps {
  onComplete: () => void
}

export const OrganizationSetup: React.FC<OrganizationSetupProps> = ({ onComplete }) => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const form = useForm<OrganizationData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  })

  const handleSubmit = async (data: OrganizationData) => {
    if (!user) return

    setLoading(true)
    
    try {
      const { data: organization, error } = await supabase
        .from('organizations')
        .insert({
          name: data.name,
          description: data.description,
          owner_id: user.id,
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      toast({
        title: 'Success',
        description: 'Organization created successfully!',
      })

      onComplete()
    } catch (error: any) {
      console.error('Error creating organization:', error)
      toast({
        title: 'Error creating organization',
        description: error.message || 'Failed to create organization. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Building className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Create Your Organization</CardTitle>
          <CardDescription>
            Set up your organization to begin maturity assessments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Organization Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter organization name"
                {...form.register('name')}
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
                placeholder="Describe your organization"
                className="min-h-[100px]"
                {...form.register('description')}
              />
              {form.formState.errors.description && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.description.message}
                </p>
              )}
            </div>
            
            <Button type="submit" className="w-full" disabled={loading}>
              <Plus className="mr-2 h-4 w-4" />
              {loading ? 'Creating Organization...' : 'Create Organization'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}