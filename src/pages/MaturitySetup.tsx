import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ArrowLeft, 
  Upload, 
  Palette, 
  Building, 
  User, 
  Briefcase,
  Brain,
  FileText,
  ChevronRight,
  Shield,
  Globe,
  AlertTriangle,
  Plus,
  Trash2,
  X,
  Clock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';


// Standardized options for Risk & Awareness Profile
const INDUSTRY_OPTIONS = [
  'Mining', 'Energy', 'Finance', 'Healthcare', 'Manufacturing', 
  'Technology', 'Government', 'Construction', 'Retail', 'Transportation', 'Other'
];

const REGION_OPTIONS = [
  'North America', 'Europe', 'Asia Pacific', 'Latin America', 
  'Middle East & Africa', 'Southern Africa', 'Global'
];

const RISK_CONCERN_OPTIONS = [
  'Cyber Attacks', 'Insider Threats', 'Data Breaches', 'Supply Chain Risks',
  'Regulatory Compliance', 'Physical Security', 'Business Continuity', 'Third-party Risks'
];

const COMPLIANCE_OPTIONS = [
  'ISO 27001', 'NIST', 'SOC 2', 'PCI DSS', 'GDPR', 'HIPAA', 'SOX', 'COBIT'
];

interface UploadedFile {
  file: File;
  uploadedAt: Date;
  id: string;
}

interface FormData {
  // User Information
  fullName: string;
  title: string;
  bio: string;
  
  // Company Information
  companyName: string;
  primaryColor: string;
  companyLogo?: File;
  optionalDocuments: UploadedFile[];
  
  // AI-Assisted Model Naming
  modelName: string;
  
  // Risk & Awareness Profile
  primaryWebsiteUrl: string;
  linkedDomains: string[];
  industryTags: string[];
  customIndustry: string;
  regionOperating: string;
  riskConcerns: string[];
  complianceCommitments: string[];
  threatSensitivityLevel: 'Basic' | 'Moderate' | 'Advanced';
}

const MaturitySetup = () => {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const { currentOrganization, refetch: refetchOrganization } = useOrganization();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<FormData>({
    fullName: profile?.full_name || '',
    title: '',
    bio: '',
    companyName: currentOrganization?.name || '',
    primaryColor: '#0066cc',
    modelName: '',
    primaryWebsiteUrl: currentOrganization?.primary_website_url || '',
    linkedDomains: currentOrganization?.linked_domains || [],
    industryTags: currentOrganization?.industry_tags || [],
    customIndustry: currentOrganization?.custom_industry || '',
    regionOperating: currentOrganization?.region_operating || '',
    riskConcerns: currentOrganization?.risk_concerns || [],
    complianceCommitments: currentOrganization?.compliance_commitments || [],
    threatSensitivityLevel: (currentOrganization?.threat_sensitivity_level as 'Basic' | 'Moderate' | 'Advanced') || 'Basic',
    optionalDocuments: []
  });
  
  // Re-sync organization profile when currentOrganization changes
  useEffect(() => {
    if (currentOrganization) {
      console.log('Syncing organization data to form:', currentOrganization);
      setFormData(prev => ({
        ...prev,
        companyName: currentOrganization.name || '',
        primaryWebsiteUrl: currentOrganization.primary_website_url || '',
        linkedDomains: currentOrganization.linked_domains || [],
        industryTags: currentOrganization.industry_tags || [],
        customIndustry: currentOrganization.custom_industry || '',
        regionOperating: currentOrganization.region_operating || '',
        riskConcerns: currentOrganization.risk_concerns || [],
        complianceCommitments: currentOrganization.compliance_commitments || [],
        threatSensitivityLevel: (currentOrganization.threat_sensitivity_level as 'Basic' | 'Moderate' | 'Advanced') || 'Basic',
      }));
    }
  }, [currentOrganization]);

  // Force refetch organization data when component mounts
  useEffect(() => {
    refetchOrganization();
  }, [refetchOrganization]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Auto-save function
  const autoSave = async () => {
    if (!currentOrganization || !user?.id) return;
    
    // Only auto-save if we have some basic required data
    if (!formData.companyName && !formData.regionOperating && formData.industryTags.length === 0) {
      return;
    }

    setIsSaving(true);
    try {
      const cleanDomains = formData.linkedDomains.filter(d => d && d.trim());
      
      const { error } = await supabase
        .from('organizations')
        .update({
          name: formData.companyName || currentOrganization.name,
          primary_website_url: formData.primaryWebsiteUrl || null,
          linked_domains: cleanDomains,
          industry_tags: formData.industryTags,
          custom_industry: formData.customIndustry || null,
          region_operating: formData.regionOperating || null,
          risk_concerns: formData.riskConcerns,
          compliance_commitments: formData.complianceCommitments,
          threat_sensitivity_level: formData.threatSensitivityLevel,
          updated_by: user.id
        })
        .eq('id', currentOrganization.id);
        
      if (error) {
        console.error('Auto-save error:', error);
      } else {
        setLastSaved(new Date());
        // Refresh organization data to pick up changes
        await refetchOrganization();
        // Store the setup data in localStorage for persistence
        localStorage.setItem('maturion_setup_data', JSON.stringify(formData));
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save when form data changes (with debounce)
  useEffect(() => {
    if (!currentOrganization) return;
    
    const timeoutId = setTimeout(() => {
      autoSave();
    }, 2000); // Auto-save 2 seconds after user stops typing

    return () => clearTimeout(timeoutId);
  }, [formData.companyName, formData.primaryWebsiteUrl, formData.linkedDomains, 
      formData.industryTags, formData.customIndustry, formData.regionOperating, 
      formData.riskConcerns, formData.complianceCommitments, formData.threatSensitivityLevel]);

  // Generate AI-suggested model name based on company name
  const generateModelName = () => {
    if (formData.companyName) {
      const companyAbbr = formData.companyName
        .split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .join('');
      const suggestedName = `${formData.companyName} SCS - Security Control Standard`;
      setFormData(prev => ({ ...prev, modelName: suggestedName }));
      
      toast({
        title: "Model Name Generated",
        description: "AI has suggested a name for your maturity model. You can edit it if needed.",
      });
    } else {
      toast({
        title: "Company Name Required",
        description: "Please enter your company name first to generate a model name.",
        variant: "destructive"
      });
    }
  };

  const handleFileUpload = (field: 'companyLogo', file: File) => {
    setFormData(prev => ({ ...prev, [field]: file }));
    toast({
      title: "File Uploaded",
      description: "Company logo uploaded successfully.",
    });
  };

  const handleOptionalDocumentUpload = (file: File) => {
    const newDocument: UploadedFile = {
      file,
      uploadedAt: new Date(),
      id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    setFormData(prev => ({ 
      ...prev, 
      optionalDocuments: [...prev.optionalDocuments, newDocument] 
    }));
    
    toast({
      title: "Document Uploaded",
      description: `${file.name} uploaded successfully.`,
    });
  };

  const removeOptionalDocument = (documentId: string) => {
    setFormData(prev => ({
      ...prev,
      optionalDocuments: prev.optionalDocuments.filter(doc => doc.id !== documentId)
    }));
    
    toast({
      title: "Document Removed",
      description: "Document removed from your uploads.",
    });
  };

  const triggerFileUpload = (field: 'companyLogo') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleFileUpload(field, file);
      }
    };
    input.click();
  };

  const triggerOptionalDocumentUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.png,.jpg,.jpeg,.txt,.csv,.xlsx';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleOptionalDocumentUpload(file);
      }
    };
    input.click();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUploadTime = (date: Date): string => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayToggle = (field: 'industryTags' | 'riskConcerns' | 'complianceCommitments', value: string) => {
    const currentArray = formData[field];
    if (currentArray.includes(value)) {
      setFormData(prev => ({ 
        ...prev, 
        [field]: currentArray.filter(item => item !== value) 
      }));
    } else {
      setFormData(prev => ({ 
        ...prev, 
        [field]: [...currentArray, value] 
      }));
    }
  };

  const addLinkedDomain = () => {
    setFormData(prev => ({ 
      ...prev, 
      linkedDomains: [...prev.linkedDomains, ''] 
    }));
  };

  const removeLinkedDomain = (index: number) => {
    setFormData(prev => ({
      ...prev,
      linkedDomains: prev.linkedDomains.filter((_, i) => i !== index)
    }));
  };

  const updateLinkedDomain = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      linkedDomains: prev.linkedDomains.map((domain, i) => i === index ? value : domain)
    }));
  };

  const handleSaveProgress = async () => {
    await autoSave();
    toast({
      title: "Progress Saved",
      description: "Your setup progress has been saved successfully.",
    });
  };

  const handleStartBuilding = async () => {
    // Auto-save before proceeding
    await autoSave();
    
    // Then proceed with validation and submission
    handleSubmit();
  };

  const handleSubmit = async () => {
    // Validation
    const isOtherSelected = formData.industryTags.includes('Other');
    const customIndustryRequired = isOtherSelected && !formData.customIndustry.trim();
    
    if (!formData.fullName || !formData.title || !formData.companyName || !formData.modelName || 
        !formData.regionOperating || formData.industryTags.length === 0 || formData.riskConcerns.length === 0 ||
        customIndustryRequired) {
      
      let errorMessage = "Please fill in all required fields including Risk & Awareness Profile before proceeding.";
      if (customIndustryRequired) {
        errorMessage = "Please specify your industry when 'Other' is selected.";
      }
      
      toast({
        title: "Required Fields Missing",
        description: errorMessage,
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Create or update organization with enhanced profile
      const cleanDomains = formData.linkedDomains.filter(d => d && d.trim());
      
      let orgData;
      if (currentOrganization) {
        // Update existing organization
        const { data, error } = await supabase
          .from('organizations')
          .update({
            name: formData.companyName,
            primary_website_url: formData.primaryWebsiteUrl || null,
            linked_domains: cleanDomains,
            industry_tags: formData.industryTags,
            custom_industry: formData.customIndustry || null,
            region_operating: formData.regionOperating,
            risk_concerns: formData.riskConcerns,
            compliance_commitments: formData.complianceCommitments,
            threat_sensitivity_level: formData.threatSensitivityLevel,
            updated_by: user?.id
          })
          .eq('id', currentOrganization.id)
          .select()
          .single();
          
        if (error) throw error;
        orgData = data;
      } else {
        // Create new organization
        const { data, error } = await supabase
          .from('organizations')
          .insert({
            name: formData.companyName,
            owner_id: user?.id,
            created_by: user?.id,
            updated_by: user?.id,
            primary_website_url: formData.primaryWebsiteUrl || null,
            linked_domains: cleanDomains,
            industry_tags: formData.industryTags,
            custom_industry: formData.customIndustry || null,
            region_operating: formData.regionOperating,
            risk_concerns: formData.riskConcerns,
            compliance_commitments: formData.complianceCommitments,
            threat_sensitivity_level: formData.threatSensitivityLevel,
          })
          .select()
          .single();
          
        if (error) throw error;
        orgData = data;
      }
      
      // Store the setup data in localStorage for persistence
      localStorage.setItem('maturion_setup_data', JSON.stringify(formData));
      localStorage.setItem('maturion_setup_completed', 'true');
      
      toast({
        title: "Setup Complete",
        description: "Your organization profile and maturity model setup is complete. AI threat intelligence is now personalized to your profile.",
      });
      
      // Navigate to the assessment framework
      navigate('/assessment/framework');
      
    } catch (error: any) {
      console.error('Setup error:', error);
      toast({
        title: "Setup Failed",
        description: error.message || "There was an error saving your setup. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/modules')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Modules
            </Button>
            
            <div className="flex items-center space-x-2">
              <Badge variant="outline">Maturity Development</Badge>
              <Badge>Setup Phase</Badge>
              {isSaving && (
                <Badge variant="secondary" className="animate-pulse">
                  Saving...
                </Badge>
              )}
              {lastSaved && !isSaving && (
                <Badge variant="outline" className="text-green-600">
                  Saved {lastSaved.toLocaleTimeString()}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">
              Tell Us More About Yourself
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-6">
              You are laying the foundation of your company's official maturity model. 
              This model becomes the security control standard for all future organizational implementation.
            </p>
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full">
              <Building className="h-4 w-4" />
              <span className="text-sm font-medium">Foundation Setup</span>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* User Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Your Information
                </CardTitle>
                <CardDescription>
                  Tell us about yourself as the primary superuser for this maturity model.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    placeholder="Your full name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="title">Title/Role *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="e.g., CISO, Security Manager, IT Director"
                  />
                </div>
                
                <div>
                  <Label htmlFor="bio">Short Personal Bio</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    placeholder="Brief description of your background and experience..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Company Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Company Information
                </CardTitle>
                <CardDescription>
                  Configure your organization's branding and identity.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => handleInputChange('companyName', e.target.value)}
                    placeholder="Your organization name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="primaryColor">Primary Brand Color</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={formData.primaryColor}
                      onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                      className="w-20 h-10"
                    />
                    <Input
                      value={formData.primaryColor}
                      onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                      placeholder="#0066cc"
                      className="flex-1"
                    />
                  </div>
                </div>
                
                <div>
                  <Label>Company Logo</Label>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">
                      {formData.companyLogo ? formData.companyLogo.name : 'Upload your company logo'}
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => triggerFileUpload('companyLogo')}
                    >
                      Choose File
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Risk & Awareness Profile - NEW SECTION */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Risk & Awareness Profile
                </CardTitle>
                <CardDescription>
                  Configure your organization's risk profile for personalized AI threat intelligence.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Website & Domains */}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="primaryWebsiteUrl">Primary Website URL</Label>
                      <Input
                        id="primaryWebsiteUrl"
                        type="url"
                        value={formData.primaryWebsiteUrl}
                        onChange={(e) => handleInputChange('primaryWebsiteUrl', e.target.value)}
                        placeholder="https://www.yourcompany.com"
                      />
                    </div>
                    
                    <div>
                      <Label>Additional Domains (Optional)</Label>
                      <p className="text-xs text-muted-foreground mb-2">ESG portals, security sites, etc.</p>
                      {formData.linkedDomains.map((domain, index) => (
                        <div key={index} className="flex gap-2 mb-2">
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

                  {/* Industry & Region */}
                  <div className="space-y-4">
                    <div>
                      <Label>Industry Sectors *</Label>
                      <p className="text-xs text-muted-foreground mb-2">Select 1-5 industries for targeted threat intelligence</p>
                      <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto border rounded p-2">
                        {INDUSTRY_OPTIONS.map((industry) => (
                          <div key={industry} className="flex items-center space-x-2">
                            <Checkbox
                              id={`industry-${industry}`}
                              checked={formData.industryTags.includes(industry)}
                              onCheckedChange={() => handleArrayToggle('industryTags', industry)}
                            />
                            <Label htmlFor={`industry-${industry}`} className="text-sm">{industry}</Label>
                          </div>
                        ))}
                      </div>
                      
                      {/* Conditional Custom Industry Input */}
                      {formData.industryTags.includes('Other') && (
                        <div className="mt-3">
                          <Label htmlFor="customIndustry">Please specify your industry *</Label>
                          <Input
                            id="customIndustry"
                            value={formData.customIndustry}
                            onChange={(e) => handleInputChange('customIndustry', e.target.value)}
                            placeholder="e.g. Heavy Equipment Distribution, Cybersecurity Consulting, etc."
                            className="mt-1"
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <Label>Primary Operating Region *</Label>
                      <Select
                        value={formData.regionOperating}
                        onValueChange={(value) => handleInputChange('regionOperating', value)}
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
                    </div>
                  </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Risk Concerns */}
                  <div>
                    <Label>Primary Risk Concerns *</Label>
                    <p className="text-xs text-muted-foreground mb-2">Select 1-8 key risk areas</p>
                    <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto border rounded p-2">
                      {RISK_CONCERN_OPTIONS.map((risk) => (
                        <div key={risk} className="flex items-center space-x-2">
                          <Checkbox
                            id={`risk-${risk}`}
                            checked={formData.riskConcerns.includes(risk)}
                            onCheckedChange={() => handleArrayToggle('riskConcerns', risk)}
                          />
                          <Label htmlFor={`risk-${risk}`} className="text-sm">{risk}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Compliance & Sensitivity */}
                  <div className="space-y-4">
                    <div>
                      <Label>Compliance Frameworks (Optional)</Label>
                      <div className="grid grid-cols-1 gap-2 max-h-20 overflow-y-auto border rounded p-2">
                        {COMPLIANCE_OPTIONS.map((framework) => (
                          <div key={framework} className="flex items-center space-x-2">
                            <Checkbox
                              id={`compliance-${framework}`}
                              checked={formData.complianceCommitments.includes(framework)}
                              onCheckedChange={() => handleArrayToggle('complianceCommitments', framework)}
                            />
                            <Label htmlFor={`compliance-${framework}`} className="text-sm">{framework}</Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label>Threat Sensitivity Level</Label>
                      <Select
                        value={formData.threatSensitivityLevel}
                        onValueChange={(value: 'Basic' | 'Moderate' | 'Advanced') => 
                          handleInputChange('threatSensitivityLevel', value)
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
                      <p className="text-xs text-muted-foreground mt-1">
                        Controls the depth and frequency of external threat intelligence integration
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">🧠 AI Enhancement Active</h4>
                  <p className="text-xs text-muted-foreground">
                    External threat intelligence will be tagged "ADVISORY ONLY" and never impact maturity scores.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Optional Documents */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Optional Documents
                </CardTitle>
                <CardDescription>
                  Additional context to help personalize your maturity model.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Company Profile, Org Chart, or Related Documents</Label>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Upload company profile, organizational chart, policies, or similar documents
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={triggerOptionalDocumentUpload}
                    >
                      Choose File
                    </Button>
                  </div>
                </div>

                {/* Uploaded Files List */}
                {formData.optionalDocuments.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Uploaded Documents ({formData.optionalDocuments.length})</Label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {formData.optionalDocuments.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate" title={doc.file.name}>
                                {doc.file.name}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>{formatUploadTime(doc.uploadedAt)}</span>
                                <span>•</span>
                                <span>{formatFileSize(doc.file.size)}</span>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeOptionalDocument(doc.id)}
                            className="text-muted-foreground hover:text-destructive flex-shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Model Naming */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Maturity Model Naming
                </CardTitle>
                <CardDescription>
                  AI-assisted naming for your organization's security control standard.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="modelName">Model Name *</Label>
                  <Input
                    id="modelName"
                    value={formData.modelName}
                    onChange={(e) => handleInputChange('modelName', e.target.value)}
                    placeholder="e.g., YourCompany SCS - Security Control Standard"
                  />
                </div>
                
                <Button 
                  variant="outline" 
                  onClick={generateModelName}
                  className="w-full"
                  disabled={!formData.companyName}
                >
                  <Brain className="h-4 w-4 mr-2" />
                  Generate AI Suggestion
                </Button>
                
                <div className="p-3 bg-muted/50 rounded-md">
                  <p className="text-sm text-muted-foreground">
                    This name will appear on all reports, certificates, and documentation 
                    generated by your maturity model.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Call to Action */}
          <div className="mt-12 text-center">
            <Card className="max-w-2xl mx-auto">
              <CardContent className="pt-6">
                <h3 className="text-xl font-semibold mb-2">
                  Ready to Build Your Maturity Model?
                </h3>
                <p className="text-muted-foreground mb-6">
                  Once you proceed, you'll work with our AI assistant to define domains, 
                  maturity practice statements, and criteria specific to your organization.
                </p>
                
                <div className="flex gap-4 justify-center">
                  <Button 
                    variant="outline"
                    onClick={handleSaveProgress}
                    disabled={isSaving}
                    className="min-w-[150px]"
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      'Save Progress'
                    )}
                  </Button>
                  
                  <div className="relative">
                    <Button 
                      size="lg" 
                      onClick={handleStartBuilding}
                      disabled={isSubmitting || isSaving || !lastSaved || !formData.fullName || !formData.title || !formData.companyName || 
                               !formData.modelName || !formData.regionOperating || formData.industryTags.length === 0 || 
                               formData.riskConcerns.length === 0}
                      className="min-w-[200px]"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Setting Up...
                        </>
                      ) : (
                        <>
                          Start Building Your Maturity Model
                          <ChevronRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                    {!lastSaved && (
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-popover text-popover-foreground px-3 py-1 rounded text-xs whitespace-nowrap border shadow-md z-10">
                        Please save your setup to continue
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

    </div>
  );
};

export default MaturitySetup;