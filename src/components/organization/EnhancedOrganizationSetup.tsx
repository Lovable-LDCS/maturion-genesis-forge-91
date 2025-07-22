import React, { useState } from 'react'
import { useForm, useFieldArray, Control } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { 
  Building, 
  Plus, 
  Globe, 
  Shield, 
  MapPin, 
  AlertTriangle, 
  FileCheck, 
  Settings,
  X,
  Trash2
} from 'lucide-react'

const organizationSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters'),
  description: z.string().optional(),
  
  // AI Behavior & Knowledge Source Policy v2.0 fields
  primary_website_url: z.string().optional(),
  linked_domains: z.array(z.string()).default([]),
  industry_tags: z.array(z.string()).default([]),
  region_operating: z.string().optional(),
  risk_concerns: z.array(z.string()).default([]),
  compliance_commitments: z.array(z.string()).default([]),
  threat_sensitivity_level: z.enum(['Basic', 'Moderate', 'Advanced']).default('Basic'),
})

type OrganizationData = z.infer<typeof organizationSchema>

interface EnhancedOrganizationSetupProps {
  onComplete: () => void
}

// Predefined options for better UX
const INDUSTRY_OPTIONS = [
  'Diamond Mining', 'Security Services', 'Platinum Mining', 'Gold Mining',
  'Financial Services', 'Manufacturing', 'Technology', 'Healthcare',
  'Government', 'Energy', 'Construction', 'Retail', 'Transportation'
]

const REGION_OPTIONS = [
  'Botswana', 'South Africa', 'Canada', 'United States', 'Australia',
  'Sub-Saharan Africa', 'Europe', 'Asia-Pacific', 'Latin America', 'Middle East'
]

const RISK_CONCERN_OPTIONS = [
  'Theft', 'Sabotage', 'Cyber Fraud', 'Collusion', 'Insider Threat',
  'Data Breach', 'Supply Chain Risk', 'Regulatory Compliance', 'Environmental Risk',
  'Operational Risk', 'Financial Crime', 'Physical Security'
]

const COMPLIANCE_OPTIONS = [
  'VPSHR', 'ISO 31000', 'Kimberley Process', 'ISO 27001', 'SOX', 'GDPR',
  'HIPAA', 'PCI DSS', 'NIST Framework', 'COBIT', 'King IV', 'Basel III'
]

export const EnhancedOrganizationSetup: React.FC<EnhancedOrganizationSetupProps> = ({ onComplete }) => {
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
      const { data: organization, error } = await supabase
        .from('organizations')
        .insert({
          name: data.name,
          description: data.description,
          owner_id: user.id,
          primary_website_url: data.primary_website_url || null,
          linked_domains: data.linked_domains?.filter(d => d.trim()) || [],
          industry_tags: data.industry_tags || [],
          region_operating: data.region_operating || null,
          risk_concerns: data.risk_concerns || [],
          compliance_commitments: data.compliance_commitments || [],
          threat_sensitivity_level: data.threat_sensitivity_level || 'Basic',
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      toast({
        title: 'Success',
        description: 'Organization profile created successfully! Maturion will now personalize threat intelligence based on your profile.',
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

  const renderBasicInfo = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Organization Name *</Label>
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
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Describe your organization"
          className="min-h-[100px]"
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
        <p className="text-xs text-muted-foreground">Used for company reference and threat feed alignment</p>
      </div>

      <div className="space-y-2">
        <Label>Linked Domains</Label>
        <p className="text-xs text-muted-foreground mb-2">Additional relevant sites (ESG portal, security intranet, etc.)</p>
        {form.watch('linked_domains')?.map((domain, index) => (
          <div key={index} className="flex gap-2">
            <Input
              placeholder="https://example.com"
              value={domain}
              onChange={(e) => {
                const domains = form.getValues('linked_domains') || []
                domains[index] = e.target.value
                form.setValue('linked_domains', domains)
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const domains = form.getValues('linked_domains') || []
                domains.splice(index, 1)
                form.setValue('linked_domains', domains)
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            const domains = form.getValues('linked_domains') || []
            form.setValue('linked_domains', [...domains, ''])
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Domain
        </Button>
      </div>
    </div>
  )

  const renderThreatProfile = () => (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label>Industry Categories</Label>
        <p className="text-xs text-muted-foreground">Select all that apply for targeted threat intelligence</p>
        <div className="grid grid-cols-2 gap-2">
          {INDUSTRY_OPTIONS.map((industry) => (
            <div key={industry} className="flex items-center space-x-2">
              <Checkbox
                id={`industry-${industry}`}
                checked={form.watch('industry_tags')?.includes(industry) || false}
                onCheckedChange={(checked) => {
                  const current = form.getValues('industry_tags') || []
                  if (checked) {
                    form.setValue('industry_tags', [...current, industry])
                  } else {
                    form.setValue('industry_tags', current.filter(t => t !== industry))
                  }
                }}
              />
              <Label htmlFor={`industry-${industry}`} className="text-sm">
                {industry}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Primary Operating Region</Label>
        <Select
          value={form.watch('region_operating') || ''}
          onValueChange={(value) => form.setValue('region_operating', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select your primary region" />
          </SelectTrigger>
          <SelectContent>
            {REGION_OPTIONS.map((region) => (
              <SelectItem key={region} value={region}>
                {region}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">For localized threat intelligence</p>
      </div>

      <div className="space-y-3">
        <Label>Risk Concerns</Label>
        <p className="text-xs text-muted-foreground">Key risk areas for personalized threat awareness</p>
        <div className="grid grid-cols-2 gap-2">
          {RISK_CONCERN_OPTIONS.map((risk) => (
            <div key={risk} className="flex items-center space-x-2">
              <Checkbox
                id={`risk-${risk}`}
                checked={form.watch('risk_concerns')?.includes(risk) || false}
                onCheckedChange={(checked) => {
                  const current = form.getValues('risk_concerns') || []
                  if (checked) {
                    form.setValue('risk_concerns', [...current, risk])
                  } else {
                    form.setValue('risk_concerns', current.filter(r => r !== risk))
                  }
                }}
              />
              <Label htmlFor={`risk-${risk}`} className="text-sm">
                {risk}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderComplianceAndSensitivity = () => (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label>Compliance Frameworks (Optional)</Label>
        <p className="text-xs text-muted-foreground">Frameworks you follow for compliance-specific insights</p>
        <div className="grid grid-cols-2 gap-2">
          {COMPLIANCE_OPTIONS.map((framework) => (
            <div key={framework} className="flex items-center space-x-2">
              <Checkbox
                id={`compliance-${framework}`}
                checked={form.watch('compliance_commitments')?.includes(framework) || false}
                onCheckedChange={(checked) => {
                  const current = form.getValues('compliance_commitments') || []
                  if (checked) {
                    form.setValue('compliance_commitments', [...current, framework])
                  } else {
                    form.setValue('compliance_commitments', current.filter(c => c !== framework))
                  }
                }}
              />
              <Label htmlFor={`compliance-${framework}`} className="text-sm">
                {framework}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Threat Sensitivity Level</Label>
        <Select
          value={form.watch('threat_sensitivity_level') || 'Basic'}
          onValueChange={(value: 'Basic' | 'Moderate' | 'Advanced') => form.setValue('threat_sensitivity_level', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Basic">Basic - General threat awareness</SelectItem>
            <SelectItem value="Moderate">Moderate - Enhanced threat monitoring</SelectItem>
            <SelectItem value="Advanced">Advanced - Comprehensive threat intelligence</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Controls how much external threat data Maturion surfaces</p>
      </div>

      <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
        <h4 className="font-medium text-sm mb-2">🧠 AI Behavior Enhancement</h4>
        <p className="text-xs text-muted-foreground">
          These settings enable Maturion's three-layer knowledge model. External threat intelligence will be 
          tagged as "ADVISORY ONLY" and never impact maturity scores or evidence decisions.
        </p>
      </div>
    </div>
  )

  const steps = [
    {
      title: 'Basic Information',
      description: 'Organization details and website',
      icon: Building,
      content: renderBasicInfo()
    },
    {
      title: 'Threat Profile',
      description: 'Industry, region, and risk concerns',
      icon: Shield,
      content: renderThreatProfile()
    },
    {
      title: 'Compliance & Sensitivity',
      description: 'Frameworks and threat monitoring level',
      icon: Settings,
      content: renderComplianceAndSensitivity()
    }
  ]

  const currentStepData = steps[currentStep - 1]

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <currentStepData.icon className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Enhanced Organization Setup</CardTitle>
          <CardDescription>
            Configure your organization profile for personalized AI threat intelligence
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
            Step {currentStep} of {steps.length}: {currentStepData.title}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">{currentStepData.title}</h3>
              <p className="text-sm text-muted-foreground">{currentStepData.description}</p>
              {currentStepData.content}
            </div>
            
            <div className="flex justify-between pt-4">
              {currentStep > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(currentStep - 1)}
                >
                  Previous
                </Button>
              ) : (
                <div />
              )}
              
              {currentStep < steps.length ? (
                <Button
                  type="button"
                  onClick={() => setCurrentStep(currentStep + 1)}
                >
                  Next
                </Button>
              ) : (
                <Button type="submit" disabled={loading}>
                  <Plus className="mr-2 h-4 w-4" />
                  {loading ? 'Creating Organization...' : 'Complete Setup'}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}