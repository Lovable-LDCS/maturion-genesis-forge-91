import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FormData {
  // User Information
  fullName: string;
  title: string;
  bio: string;
  
  // Company Information
  companyName: string;
  primaryColor: string;
  companyLogo?: File;
  companyProfile?: File;
  
  // Risk & Awareness Profile
  industryTags: string[];
  regionOperating: string;
  riskConcerns: string[];
  complianceCommitments: string[];
  threatSensitivityLevel: string;
  
  // AI-Assisted Model Naming
  modelName: string;
}

const MaturitySetup = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<FormData>({
    fullName: profile?.full_name || '',
    title: '',
    bio: '',
    companyName: currentOrganization?.name || '',
    primaryColor: '#0066cc',
    industryTags: [],
    regionOperating: '',
    riskConcerns: [],
    complianceCommitments: [],
    threatSensitivityLevel: 'Basic',
    modelName: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleFileUpload = (field: 'companyLogo' | 'companyProfile', file: File) => {
    setFormData(prev => ({ ...prev, [field]: file }));
    toast({
      title: "File Uploaded",
      description: `${field === 'companyLogo' ? 'Company logo' : 'Company profile'} uploaded successfully.`,
    });
  };

  const triggerFileUpload = (field: 'companyLogo' | 'companyProfile') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = field === 'companyLogo' ? 'image/*' : '.pdf,.doc,.docx,.png,.jpg,.jpeg';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleFileUpload(field, file);
      }
    };
    input.click();
  };

  const handleInputChange = (field: keyof FormData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayValue = (field: 'industryTags' | 'riskConcerns' | 'complianceCommitments', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value) 
        ? prev[field].filter(item => item !== value)
        : [...prev[field], value]
    }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.fullName || !formData.title || !formData.companyName || !formData.modelName) {
      toast({
        title: "Required Fields Missing",
        description: "Please fill in all required fields before proceeding.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Here you would typically save the data to your backend
      // For now, we'll simulate the process
      
      // Store the setup data in localStorage for persistence
      localStorage.setItem('maturion_setup_data', JSON.stringify(formData));
      localStorage.setItem('maturion_setup_completed', 'true');
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Setup Complete",
        description: "Your organization profile has been saved. You can now build your maturity model.",
      });
      
      // Navigate to the assessment framework
      navigate('/assessment/framework');
      
    } catch (error) {
      toast({
        title: "Setup Failed",
        description: "There was an error saving your setup. Please try again.",
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

            {/* Optional Uploads */}
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
              <CardContent>
                <div>
                  <Label>Company Profile or Org Chart</Label>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">
                      {formData.companyProfile ? formData.companyProfile.name : 'Upload company profile, organizational chart, or similar document'}
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => triggerFileUpload('companyProfile')}
                    >
                      Choose File
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Risk & Awareness Profile */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Risk & Awareness Profile
                </CardTitle>
                <CardDescription>
                  Configure your organization's risk profile to enable contextualized AI recommendations and threat matching.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Industry Tags */}
                  <div>
                    <Label className="flex items-center gap-2 mb-3">
                      <Building className="h-4 w-4" />
                      Industry Sectors
                    </Label>
                    <div className="space-y-2">
                      {['Mining', 'Energy', 'Finance', 'Healthcare', 'Manufacturing', 'Technology', 'Government', 'Other'].map((industry) => (
                        <label key={industry} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.industryTags.includes(industry)}
                            onChange={() => toggleArrayValue('industryTags', industry)}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm">{industry}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Region Operating */}
                  <div>
                    <Label htmlFor="regionOperating" className="flex items-center gap-2 mb-3">
                      <Globe className="h-4 w-4" />
                      Primary Operating Region
                    </Label>
                    <select
                      id="regionOperating"
                      value={formData.regionOperating}
                      onChange={(e) => handleInputChange('regionOperating', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select Region</option>
                      <option value="North America">North America</option>
                      <option value="Europe">Europe</option>
                      <option value="Asia Pacific">Asia Pacific</option>
                      <option value="Latin America">Latin America</option>
                      <option value="Middle East & Africa">Middle East & Africa</option>
                      <option value="Southern Africa">Southern Africa</option>
                      <option value="Global">Global</option>
                    </select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Risk Concerns */}
                  <div>
                    <Label className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="h-4 w-4" />
                      Primary Risk Concerns
                    </Label>
                    <div className="space-y-2">
                      {['Cyber Attacks', 'Insider Threats', 'Data Breaches', 'Supply Chain Risks', 'Regulatory Compliance', 'Physical Security', 'Business Continuity', 'Third-party Risks'].map((risk) => (
                        <label key={risk} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.riskConcerns.includes(risk)}
                            onChange={() => toggleArrayValue('riskConcerns', risk)}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm">{risk}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Compliance Commitments */}
                  <div>
                    <Label className="flex items-center gap-2 mb-3">
                      <FileText className="h-4 w-4" />
                      Compliance Frameworks
                    </Label>
                    <div className="space-y-2">
                      {['ISO 27001', 'NIST', 'SOC 2', 'PCI DSS', 'GDPR', 'HIPAA', 'SOX', 'COBIT'].map((framework) => (
                        <label key={framework} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.complianceCommitments.includes(framework)}
                            onChange={() => toggleArrayValue('complianceCommitments', framework)}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm">{framework}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Threat Sensitivity Level */}
                <div>
                  <Label htmlFor="threatSensitivityLevel" className="flex items-center gap-2 mb-3">
                    <Shield className="h-4 w-4" />
                    Threat Sensitivity Level
                  </Label>
                  <select
                    id="threatSensitivityLevel"
                    value={formData.threatSensitivityLevel}
                    onChange={(e) => handleInputChange('threatSensitivityLevel', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="Basic">Basic - Standard threat awareness</option>
                    <option value="Enhanced">Enhanced - Increased threat monitoring</option>
                    <option value="Advanced">Advanced - High-sensitivity threat detection</option>
                    <option value="Critical">Critical - Maximum threat awareness</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-2">
                    Controls the depth and frequency of external threat intelligence integration
                  </p>
                </div>
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
                
                <Button 
                  size="lg" 
                  onClick={handleSubmit}
                  disabled={isSubmitting || !formData.fullName || !formData.title || !formData.companyName || !formData.modelName}
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
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MaturitySetup;