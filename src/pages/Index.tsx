import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { OrganizationSetup } from '@/components/organization/OrganizationSetup';
import { MilestoneTracker } from '@/components/milestones/MilestoneTracker';
import { AssessmentFramework } from '@/components/assessment/AssessmentFramework';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Building, LogOut, Settings, ChevronDown, Target, Users, BarChart3, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const { user, signOut, profile } = useAuth();
  const { organizations, currentOrganization, loading } = useOrganization();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showOrgSetup, setShowOrgSetup] = useState(false);

  useEffect(() => {
    if (!loading && organizations.length === 0) {
      setShowOrgSetup(true);
    }
  }, [loading, organizations]);

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully.",
    });
  };

  const handleOrgSetupComplete = () => {
    setShowOrgSetup(false);
    window.location.reload(); // Refresh to load new organization
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (showOrgSetup) {
    return <OrganizationSetup onComplete={handleOrgSetupComplete} />;
  }

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
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                  <Target className="h-5 w-5 text-primary-foreground" />
                </div>
                <h1 className="text-2xl font-bold">Maturion</h1>
              </div>
              
              {currentOrganization && (
                <div className="flex items-center space-x-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {currentOrganization.name}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {currentOrganization.user_role}
                  </Badge>
                </div>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback>{userInitials}</AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline">{profile?.full_name}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate('/team')}>
                  <Users className="mr-2 h-4 w-4" />
                  Team Management
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/organization/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Organization Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/qa-signoff')}>
                  <FileText className="mr-2 h-4 w-4" />
                  QA Sign-Off
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Dashboard Overview */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-3xl font-bold tracking-tight mb-2">
                Welcome back, {profile?.full_name?.split(' ')[0]}!
              </h2>
              <p className="text-muted-foreground">
                Phase 1 Foundation Setup is in progress. Here's your current status.
              </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Organizations</CardTitle>
                  <Building className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{organizations.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Active organizations
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Assessments</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground">
                    Completed assessments
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Team Members</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">1</div>
                  <p className="text-xs text-muted-foreground">
                    Active team members
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Getting Started */}
            <Card>
              <CardHeader>
                <CardTitle>Getting Started</CardTitle>
                <CardDescription>
                  Complete these steps to set up your maturity assessment framework
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">✓ Create organization</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm">Configure assessment domains (Coming in Week 2)</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                    <span className="text-sm">Set up maturity criteria (Coming in Week 2)</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                    <span className="text-sm">Begin first assessment (Coming in Week 2)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Milestone Tracker */}
          <div className="space-y-6">
            <MilestoneTracker />
            <AssessmentFramework />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
