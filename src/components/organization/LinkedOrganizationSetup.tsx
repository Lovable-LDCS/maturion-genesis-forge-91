import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { 
  Building, 
  Plus, 
  Shield, 
  Settings,
  Trash2,
  ChevronRight,
  ChevronLeft
} from 'lucide-react'

// Unified schema with proper validation
const organizationSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters'),
  description: z.string().optional(),
  
  // Enhanced fields with proper validation
  primary_website_url: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  linked_domains: z.array(z.string().url('Invalid domain URL')).default([]).optional(),
  industry_tags: z.array(z.string()).min(1, 'Please select at least one industry').max(5, 'Maximum 5 industries allowed'),
  region_operating: z.string().min(1, 'Please select your operating region'),
  risk_concerns: z.array(z.string()).min(1, 'Please select at least one risk concern').max(8, 'Maximum 8 risk concerns allowed'),
  compliance_commitments: z.array(z.string()).default([]),
  threat_sensitivity_level: z.enum(['Basic', 'Moderate', 'Advanced']).default('Basic'),
})

type OrganizationData = z.infer<typeof organizationSchema>

interface LinkedOrganizationSetupProps {
  onComplete: () => void
  variant?: 'dashboard' | 'maturity' // Controls flow and messaging
}

// Standardized options (aligned with database enums)
const INDUSTRY_OPTIONS = [
  'Mining', 'Energy', 'Finance', 'Healthcare', 'Manufacturing', 
  'Technology', 'Government', 'Construction', 'Retail', 'Transportation', 'Other'
]

const REGION_OPTIONS = [
  'North America', 'Europe', 'Asia Pacific', 'Latin America', 
  'Middle East & Africa', 'Southern Africa', 'Global'
]

const RISK_CONCERN_OPTIONS = [
  'Cyber Attacks', 'Insider Threats', 'Data Breaches', 'Supply Chain Risks',
  'Regulatory Compliance', 'Physical Security', 'Business Continuity', 'Third-party Risks'
]

const COMPLIANCE_OPTIONS = [
  'ISO 27001', 'NIST', 'SOC 2', 'PCI DSS', 'GDPR', 'HIPAA', 'SOX', 'COBIT'
]

export const LinkedOrganizationSetup: React.FC<LinkedOrganizationSetupProps> = ({ 
  onComplete, 
  variant = 'dashboard' 
}) => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)

  const form = useForm<OrganizationData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: '',
      description: '',
      primary_website_url: '',
      linked_domains: [],
      industry_tags: [],
      region_operating: '',
      risk_concerns: [],
      compliance_commitments: [],
      threat_sensitivity_level: 'Basic',
    },
  })

  const handleSubmit = async (data: OrganizationData) => {
    if (!user) return

    setLoading(true)
    
    try {
      // Clean and validate linked domains
      const cleanDomains = data.linked_domains?.filter(d => d && d.trim()) || []
      
      const { data: organization, error } = await supabase
        .from('organizations')
        .insert({
          name: data.name,
          description: data.description || null,
          owner_id: user.id,
          primary_website_url: data.primary_website_url || null,
          linked_domains: cleanDomains,
          industry_tags: data.industry_tags,
          region_operating: data.region_operating,
          risk_concerns: data.risk_concerns,
          compliance_commitments: data.compliance_commitments,
          threat_sensitivity_level: data.threat_sensitivity_level,
        })
        .select()
        .single()

      if (error) throw error

      toast({
        title: 'Success',
        description: variant === 'maturity' 
          ? 'Organization profile created! Your maturity model setup can now begin.'
          : 'Organization profile created successfully! AI threat intelligence is now personalized to your profile.',
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

  const addLinkedDomain = () => {
    const current = form.getValues('linked_domains') || []
    form.setValue('linked_domains', [...current, ''])
  }

  const removeLinkedDomain = (index: number) => {
    const current = form.getValues('linked_domains') || []
    current.splice(index, 1)
    form.setValue('linked_domains', current)
  }

  const updateLinkedDomain = (index: number, value: string) => {
    const current = form.getValues('linked_domains') || []
    current[index] = value
    form.setValue('linked_domains', current)
  }

  const toggleArrayValue = (field: 'industry_tags' | 'risk_concerns' | 'compliance_commitments', value: string) => {
    const current = form.getValues(field) || []
    if (current.includes(value)) {
      form.setValue(field, current.filter(item => item !== value))
    } else {
      form.setValue(field, [...current, value])
    }
  }

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Organization Name *</Label>
        <Input
          id="name"
          placeholder="Enter organization name"
          {...form.register('name')}
        />
        {form.formState.errors.name && (
          <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Describe your organization"
          {...form.register('description')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="primary_website_url">Primary Website URL</Label>
        <Input
          id="primary_website_url"
          type="url"
          placeholder="https://www.yourcompany.com"
          {...form.register('primary_website_url')}
        />
        {form.formState.errors.primary_website_url && (
          <p className="text-sm text-destructive">{form.formState.errors.primary_website_url.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Additional Domains (Optional)</Label>
        <p className="text-xs text-muted-foreground">ESG portals, security sites, etc.</p>
        {form.watch('linked_domains')?.map((domain, index) => (
          <div key={index} className="flex gap-2">
            <Input
              placeholder="https://portal.example.com"
              value={domain}
              onChange={(e) => updateLinkedDomain(index, e.target.value)}
            />
            <Button type="button" variant="outline" size="sm" onClick={() => removeLinkedDomain(index)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addLinkedDomain}>
          <Plus className="h-4 w-4 mr-2" />
          Add Domain
        </Button>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label>Industry Sectors *</Label>
        <p className="text-xs text-muted-foreground">Select 1-5 industries for targeted threat intelligence</p>
        <div className="grid grid-cols-2 gap-2">
          {INDUSTRY_OPTIONS.map((industry) => (
            <div key={industry} className="flex items-center space-x-2">
              <Checkbox
                id={`industry-${industry}`}
                checked={form.watch('industry_tags')?.includes(industry) || false}
                onCheckedChange={() => toggleArrayValue('industry_tags', industry)}
              />
              <Label htmlFor={`industry-${industry}`} className="text-sm">{industry}</Label>
            </div>
          ))}
        </div>
        {form.formState.errors.industry_tags && (
          <p className="text-sm text-destructive">{form.formState.errors.industry_tags.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Primary Operating Region *</Label>
        <Select
          value={form.watch('region_operating') || ''}
          onValueChange={(value) => form.setValue('region_operating', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select your primary region" />
          </SelectTrigger>
          <SelectContent>
            {REGION_OPTIONS.map((region) => (
              <SelectItem key={region} value={region}>{region}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.region_operating && (
          <p className="text-sm text-destructive">{form.formState.errors.region_operating.message}</p>
        )}
      </div>

      <div className="space-y-3">
        <Label>Primary Risk Concerns *</Label>
        <p className="text-xs text-muted-foreground">Select 1-8 key risk areas</p>
        <div className="grid grid-cols-2 gap-2">
          {RISK_CONCERN_OPTIONS.map((risk) => (
            <div key={risk} className="flex items-center space-x-2">
              <Checkbox
                id={`risk-${risk}`}
                checked={form.watch('risk_concerns')?.includes(risk) || false}
                onCheckedChange={() => toggleArrayValue('risk_concerns', risk)}
              />
              <Label htmlFor={`risk-${risk}`} className="text-sm">{risk}</Label>
            </div>
          ))}
        </div>
        {form.formState.errors.risk_concerns && (
          <p className="text-sm text-destructive">{form.formState.errors.risk_concerns.message}</p>
        )}
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label>Compliance Frameworks (Optional)</Label>
        <div className="grid grid-cols-2 gap-2">
          {COMPLIANCE_OPTIONS.map((framework) => (
            <div key={framework} className="flex items-center space-x-2">
              <Checkbox
                id={`compliance-${framework}`}
                checked={form.watch('compliance_commitments')?.includes(framework) || false}
                onCheckedChange={() => toggleArrayValue('compliance_commitments', framework)}
              />
              <Label htmlFor={`compliance-${framework}`} className="text-sm">{framework}</Label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Threat Sensitivity Level</Label>
        <Select
          value={form.watch('threat_sensitivity_level')}
          onValueChange={(value: 'Basic' | 'Moderate' | 'Advanced') => 
            form.setValue('threat_sensitivity_level', value)
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Basic">Basic - Standard threat awareness</SelectItem>
            <SelectItem value="Moderate">Moderate - Enhanced threat monitoring</SelectItem>
            <SelectItem value="Advanced">Advanced - Comprehensive threat intelligence</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Controls the depth and frequency of external threat intelligence integration
        </p>
      </div>

      <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
        <h4 className="font-medium text-sm mb-2">🧠 AI Enhancement Active</h4>
        <p className="text-xs text-muted-foreground">
          External threat intelligence will be tagged "ADVISORY ONLY" and never impact maturity scores.
        </p>
      </div>
    </div>
  )

  const steps = [
    { title: 'Organization Details', content: renderStep1() },
    { title: 'Risk Profile', content: renderStep2() },
    { title: 'Compliance & Sensitivity', content: renderStep3() }
  ]

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1: return !!form.watch('name')?.trim()
      case 2: return (form.watch('industry_tags')?.length || 0) > 0 && !!form.watch('region_operating')
      case 3: return true // Optional step
      default: return false
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Building className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">
            {variant === 'maturity' ? 'Organization Setup' : 'Enhanced Organization Profile'}
          </CardTitle>
          <CardDescription>
            {variant === 'maturity' 
              ? 'Configure your organization to begin building your maturity model'
              : 'Enable personalized AI threat intelligence for your organization'
            }
          </CardDescription>
          
          {/* Step indicator */}
          <div className="flex justify-center mt-4 gap-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-12 rounded-full ${
                  index + 1 <= currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Step {currentStep} of {steps.length}: {steps[currentStep - 1].title}
          </p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {steps[currentStep - 1].content}
            
            <div className="flex justify-between pt-4">
              {currentStep > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(currentStep - 1)}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
              ) : (
                <div />
              )}
              
              {currentStep < steps.length ? (
                <Button
                  type="button"
                  onClick={() => setCurrentStep(currentStep + 1)}
                  disabled={!isStepValid(currentStep)}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button type="submit" disabled={loading || !isStepValid(currentStep)}>
                  <Plus className="mr-2 h-4 w-4" />
                  {loading ? 'Creating...' : 'Complete Setup'}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}