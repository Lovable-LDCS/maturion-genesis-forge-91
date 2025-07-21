import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  TrendingUp, 
  Eye, 
  FileText, 
  Users, 
  Settings,
  ChevronRight,
  Lock
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';

// Mock data for ISMS modules - in production this would come from the subscription system
const ismsModules = [
  {
    id: 'maturity-development',
    name: 'Maturity Development',
    description: 'Build and assess your organizational security maturity framework',
    icon: TrendingUp,
    isSubscribed: true, // This would be determined by actual subscription status
    route: '/maturity/setup'
  },
  {
    id: 'risk-management',
    name: 'Risk Management Framework', 
    description: 'Comprehensive risk identification and mitigation strategies',
    icon: Shield,
    isSubscribed: false,
    route: '/risk-management'
  },
  {
    id: 'action-management',
    name: 'Action Management System',
    description: 'Streamline corrective actions and tracking',
    icon: FileText,
    isSubscribed: false,
    route: '/action-management'
  },
  {
    id: 'video-surveillance',
    name: 'Video Surveillance Analysis',
    description: 'AI-driven insights from video surveillance data',
    icon: Eye,
    isSubscribed: false,
    route: '/surveillance'
  }
];

const ModulesOverview = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { currentOrganization } = useOrganization();

  const handleModuleClick = (module: typeof ismsModules[0]) => {
    if (module.isSubscribed) {
      navigate(module.route);
    } else {
      navigate('/subscribe');
    }
  };

  const handleLogout = () => {
    // Handle logout logic
    navigate('/');
  };

  const userInitials = profile?.full_name
    ?.split(' ')
    .map((name) => name.charAt(0))
    .join('')
    .toUpperCase() || 'U';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold">Maturion</h1>
              {currentOrganization && (
                <Badge variant="secondary">
                  {currentOrganization.name}
                </Badge>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/organization/settings')}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-medium text-sm">
                  {userInitials}
                </div>
                <span className="text-sm font-medium">{profile?.full_name}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            Welcome to Your ISMS Platform
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Choose from our comprehensive Information Security Management System modules 
            to build and maintain your organization's security maturity.
          </p>
        </div>

        {/* Modules Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {ismsModules.map((module) => {
            const IconComponent = module.icon;
            
            return (
              <Card 
                key={module.id}
                className={`relative cursor-pointer transition-all duration-200 hover:shadow-lg ${
                  !module.isSubscribed ? 'opacity-60' : ''
                }`}
                onClick={() => handleModuleClick(module)}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-lg ${
                      module.isSubscribed 
                        ? 'bg-primary/10 text-primary' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      <IconComponent className="h-6 w-6" />
                    </div>
                    {!module.isSubscribed && (
                      <Lock className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <CardTitle className="text-xl">{module.name}</CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    {module.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      {module.isSubscribed ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          Not Subscribed
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center">
                      {module.isSubscribed ? (
                        <>
                          <span className="text-sm text-muted-foreground mr-2">
                            Enter Module
                          </span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </>
                      ) : (
                        <>
                          <span className="text-sm text-muted-foreground mr-2">
                            Subscribe
                          </span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </>
                      )}
                    </div>
                  </div>
                  
                  {!module.isSubscribed && (
                    <div className="mt-4 p-3 bg-muted/50 rounded-md">
                      <p className="text-sm text-muted-foreground">
                        You are not yet subscribed to this module. Click here to subscribe.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Help Section */}
        <div className="mt-16 text-center">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2">
                <Users className="h-5 w-5" />
                Need Help Getting Started?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Our team is ready to help you maximize the value of your ISMS investment.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="outline">
                  Schedule Onboarding Call
                </Button>
                <Button variant="outline">
                  View Documentation
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ModulesOverview;