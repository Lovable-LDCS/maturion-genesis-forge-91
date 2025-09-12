import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import TeamManagement from '@/components/team/TeamManagement';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  ArrowRight,
  ChevronDown, 
  LogOut, 
  Lock, 
  Users, 
  Building,
  FileText
} from 'lucide-react';

const TeamPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  // Check if maturity model has been approved
  const isModelApproved = localStorage.getItem('maturion_model_approved') === 'true';

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out successfully",
      description: "You have been logged out.",
    });
  };

  const userInitials = user?.email
    ?.split('@')[0]
    .charAt(0)
    .toUpperCase() || 'U';

  // If model not approved, show locked state
  if (!isModelApproved) {
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
              
              <div className="flex items-center space-x-4">
                <Badge variant="outline">Team Management</Badge>
                <Badge variant="secondary">Locked</Badge>
              </div>
            </div>
          </div>
        </header>

        {/* Locked State Content */}
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-8">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="h-8 w-8 text-muted-foreground" />
              </div>
              <h1 className="text-3xl font-bold mb-4">Team Management Locked</h1>
              <p className="text-xl text-muted-foreground">
                Team invitation features are available after your maturity model is approved and signed off.
              </p>
            </div>

            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-2">What you can do once unlocked:</h3>
                <div className="space-y-2 text-left mb-6">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="text-sm">Invite internal team members to help with evidence collection</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-primary" />
                    <span className="text-sm">Manage role-based access for audit management</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-sm">Collaborate on maturity assessments</span>
                  </div>
                </div>
                
                <Button onClick={() => navigate('/maturity/setup')}>
                  Complete Maturity Model Setup
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

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
            
            <div className="flex items-center space-x-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{userInitials}</AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline">{user?.email}</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <TeamManagement />
      </main>
    </div>
  );
};

export default TeamPage;