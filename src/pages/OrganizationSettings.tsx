import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { OrganizationManagement } from '@/components/organization/OrganizationManagement';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  ArrowRight,
  Lock, 
  Users, 
  Building,
  FileText
} from 'lucide-react';

const OrganizationSettings = () => {
  const navigate = useNavigate();
  
  // Check if maturity model has been approved
  const isModelApproved = localStorage.getItem('maturion_model_approved') === 'true';

  // If model not approved, show locked state
  if (!isModelApproved) {
    return (
      <AuthGuard>
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
                  <Badge variant="outline">Organization Settings</Badge>
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
                <h1 className="text-3xl font-bold mb-4">Organization Management Locked</h1>
                <p className="text-xl text-muted-foreground">
                  Sub-organization invitation features are available after your maturity model is approved and signed off.
                </p>
              </div>

              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-2">What you can do once unlocked:</h3>
                  <div className="space-y-2 text-left mb-6">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-primary" />
                      <span className="text-sm">Invite sub-organizations (branches, regions, departments)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="text-sm">Share your approved maturity model with subsidiaries</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="text-sm">Manage corporate-wide security standards</span>
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
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <OrganizationManagement />
    </AuthGuard>
  );
};

export default OrganizationSettings;