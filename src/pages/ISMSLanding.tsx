import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  Shield, 
  FileText, 
  Eye, 
  GraduationCap,
  AlertTriangle,
  Database,
  Lock,
  ChevronRight
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

// ISMS Module definitions with subscription status
const ismsModules = [
  {
    id: 'maturity-roadmap',
    name: 'Maturity Roadmap',
    description: 'Build and assess your organizational security maturity framework across six operational domains',
    icon: TrendingUp,
    isSubscribed: true, // This would come from actual subscription data
    route: '/maturity/setup',
    features: ['Six Domains Assessment', 'Audit Structure Setup', 'QA Sign-Off', 'Team Management']
  },
  {
    id: 'risk-management',
    name: 'Risk Management',
    description: 'Comprehensive risk identification, assessment, and mitigation strategies',
    icon: Shield,
    isSubscribed: false,
    route: '/risk-management',
    features: ['Risk Assessment', 'Threat Modeling', 'Control Registers', 'Compliance Tracking']
  },
  {
    id: 'project-implementation',
    name: 'Project Implementation',
    description: 'Streamline security project planning, execution, and delivery',
    icon: FileText,
    isSubscribed: false,
    route: '/project-implementation',
    features: ['Project Planning', 'Resource Management', 'Timeline Tracking', 'Deliverable Management']
  },
  {
    id: 'data-analytics',
    name: 'Data Analytics & Assurance',
    description: 'AI-driven insights from access control, video surveillance, and operational data',
    icon: Eye,
    isSubscribed: false,
    route: '/data-analytics',
    features: ['Access Analytics', 'Video Surveillance', 'Anomaly Detection', 'Compliance Reporting']
  },
  {
    id: 'skills-development',
    name: 'Skills Development Portal',
    description: 'Upskill your security team with globally recognized training and certification programs',
    icon: GraduationCap,
    isSubscribed: false,
    route: '/skills-development',
    features: ['Training Programs', 'Certification Tracking', 'Skill Assessments', 'Learning Paths']
  },
  {
    id: 'incident-management',
    name: 'Incident Management',
    description: 'Rapid incident response, tracking, and resolution workflows',
    icon: AlertTriangle,
    isSubscribed: false,
    route: '/incident-management',
    features: ['Incident Logging', 'Response Workflows', 'Root Cause Analysis', 'Corrective Actions']
  },
  {
    id: 'systems-extraction',
    name: 'Systems Data Extraction Tool',
    description: 'Extract, transform, and analyze data from multiple security and operational systems',
    icon: Database,
    isSubscribed: false,
    route: '/systems-extraction',
    features: ['Data Extraction', 'System Integration', 'Data Transformation', 'Export & Reporting']
  }
];

const ISMSLanding = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const handleModuleClick = (module: typeof ismsModules[0]) => {
    if (module.isSubscribed) {
      navigate(module.route);
    } else {
      navigate('/subscribe');
    }
  };

  const subscribedCount = ismsModules.filter(m => m.isSubscribed).length;
  const totalCount = ismsModules.length;

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div>
        <h1 className="text-4xl font-bold mb-4">
          Integrated Security Management System
        </h1>
        <p className="text-xl text-muted-foreground mb-6">
          Welcome, {profile?.full_name || 'User'}. Your comprehensive ISMS platform with {subscribedCount} of {totalCount} modules active.
        </p>
        
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="text-base px-4 py-2">
            {subscribedCount} Active Module{subscribedCount !== 1 ? 's' : ''}
          </Badge>
          {subscribedCount < totalCount && (
            <Button variant="outline" onClick={() => navigate('/subscribe')}>
              View All Modules
            </Button>
          )}
        </div>
      </div>

      {/* Modules Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ismsModules.map((module) => {
          const IconComponent = module.icon;
          
          return (
            <Card 
              key={module.id}
              className={`relative cursor-pointer transition-all duration-200 hover:shadow-lg ${
                !module.isSubscribed ? 'opacity-60 hover:opacity-70' : 'hover:border-primary'
              }`}
              onClick={() => handleModuleClick(module)}
            >
              {!module.isSubscribed && (
                <div className="absolute top-4 right-4 z-10">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              
              <CardHeader className="pb-4">
                <div className={`mb-4 p-3 rounded-lg inline-flex ${
                  module.isSubscribed 
                    ? 'bg-primary/10 text-primary' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  <IconComponent className="h-6 w-6" />
                </div>
                
                <CardTitle className="text-xl">{module.name}</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  {module.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Features List */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Key Features:</p>
                  <ul className="text-sm space-y-1">
                    {module.features.slice(0, 3).map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <div className={`h-1.5 w-1.5 rounded-full ${
                          module.isSubscribed ? 'bg-primary' : 'bg-muted-foreground'
                        }`} />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Status Badge */}
                <div className="pt-3 border-t flex items-center justify-between">
                  {module.isSubscribed ? (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Not Subscribed
                    </Badge>
                  )}
                  
                  <div className="flex items-center text-sm">
                    <span className="text-muted-foreground mr-1">
                      {module.isSubscribed ? 'Enter' : 'Subscribe'}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>

                {!module.isSubscribed && (
                  <div className="p-3 bg-muted/50 rounded-md">
                    <p className="text-sm text-muted-foreground">
                      Subscribe to unlock this module and enhance your security maturity journey.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Help Section */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Getting Started with Your ISMS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Your Integrated Security Management System brings together all the tools you need for comprehensive 
            security maturity. Start with the Maturity Roadmap to assess your current state, then expand to 
            other modules as your program grows.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" onClick={() => navigate('/journey')}>
              View Journey Map
            </Button>
            <Button variant="outline">
              Schedule Consultation
            </Button>
            <Button variant="outline">
              View Documentation
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ISMSLanding;
