import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DomainManagement } from '@/components/assessment/DomainManagement';
import { MPSManagement } from '@/components/assessment/MPSManagement';
import AdminMPSRunner from '@/components/assessment/AdminMPSRunner';

import { BulkImportExport } from '@/components/assessment/BulkImportExport';
import { ISOComplianceValidation } from '@/components/assessment/ISOComplianceValidation';
import { useDomainProgress } from '@/hooks/useDomainProgress';

import { Settings, Database, CheckSquare, Upload, Shield, Target, CheckCircle, Clock, AlertCircle, Lock } from 'lucide-react';

export default function AssessmentFramework() {
  const navigate = useNavigate();
  const { domainProgress, loading } = useDomainProgress();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'locked':
        return <Lock className="h-5 w-5 text-muted-foreground" />;
      default:
        return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (domain: any) => {
    switch (domain.status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-200">✅ All Approved</Badge>;
      case 'in_progress':
        return <Badge variant="secondary">🟡 In Progress</Badge>;
      case 'locked':
        return <Badge variant="outline" className="opacity-60">🔒 Locked</Badge>;
      default:
        return <Badge variant="outline">❌ Not Started</Badge>;
    }
  };

  const getActionButton = (domain: any) => {
    if (domain.status === 'locked') {
      return (
        <Button size="sm" variant="outline" disabled className="opacity-60">
          Locked
        </Button>
      );
    }

    let buttonText = 'Create MPSs';
    if (domain.currentStep === 'intent') {
      buttonText = 'Create Intent';
    } else if (domain.currentStep === 'criteria') {
      buttonText = 'Create Criteria';
    } else if (domain.status === 'completed') {
      buttonText = 'Edit Framework';
    }

    const isNext = domain.status === 'not_started' && domain.isUnlocked;

    return (
      <Button 
        size="sm" 
        variant={domain.status === 'completed' ? 'outline' : isNext ? 'default' : 'secondary'}
        className={isNext ? 'bg-primary hover:bg-primary/90' : ''}
        onClick={() => navigate(`/audit/domain/${domain.id}`)}
      >
        {buttonText}
      </Button>
    );
  };

  const getNextSuggestedDomain = () => {
    return domainProgress.find(d => d.status === 'in_progress') || 
           domainProgress.find(d => d.status === 'not_started' && d.isUnlocked);
  };

  const nextSuggestedDomain = getNextSuggestedDomain();
  const totalProgress = domainProgress.length > 0 
    ? Math.round(domainProgress.reduce((sum, domain) => sum + domain.completionPercentage, 0) / domainProgress.length)
    : 0;

  return (
    <div className="container mx-auto p-6 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Assessment Framework</h1>
          <p className="text-lg text-muted-foreground">
            Configure and manage your organizational assessment framework
          </p>
        </div>

        <Tabs defaultValue="domains" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="domains" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Domains
            </TabsTrigger>
            <TabsTrigger value="mps" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              MPS
            </TabsTrigger>
            <TabsTrigger value="criteria" className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              Criteria
            </TabsTrigger>
            <TabsTrigger value="import-export" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Import/Export
            </TabsTrigger>
            <TabsTrigger value="compliance" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              ISO Compliance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="domains" className="space-y-6">
            {/* Overall Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Audit Structure Setup
                  <Badge variant="secondary" className="text-sm">
                    {domainProgress.filter(d => d.status === 'completed').reduce((sum, d) => sum + d.mpsCount, 0)} MPSs • {domainProgress.filter(d => d.status === 'completed').reduce((sum, d) => sum + d.criteriaCount, 0)} Criteria
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Configure Mini Performance Standards (MPSs) for each LDCS audit domain. Only shows completed MPSs and criteria.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Overall Progress</span>
                    <span className="text-sm text-muted-foreground">{totalProgress}% complete</span>
                  </div>
                  <Progress value={totalProgress} className="h-3" />
                  
                  {nextSuggestedDomain && (
                    <div className="text-center">
                      <div className="inline-flex items-center gap-2 px/4 py-2 bg-primary/10 border border-primary/20 rounded-full text-sm text-primary">
                        <span className="animate-pulse">💡</span>
                        <span>Continue with <strong>{nextSuggestedDomain.name}</strong></span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Domain Cards */}
            {loading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-48 bg-muted rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {domainProgress.map((domain) => {
                  const isNextSuggested = nextSuggestedDomain?.id === domain.id;
                  return (
                    <Card 
                      key={domain.id}
                      className={`transition-all duration-300 ${
                        !domain.isUnlocked ? 
                          'opacity-50 cursor-not-allowed bg-muted/30 border-muted' :
                          `cursor-pointer hover:shadow-lg ${
                            domain.status === 'completed' ? 'border-green-200 bg-green-50/30' :
                            domain.status === 'in_progress' ? 'border-blue-200 bg-blue-50/30' :
                            isNextSuggested ? 'border-primary/40 bg-primary/5 shadow-lg ring-2 ring-primary/20' :
                            'hover:border-primary/50'
                          }`
                      }`}
                      onClick={() => {
                        if (domain.isUnlocked) {
                          navigate(`/audit/domain/${domain.id}`);
                        }
                      }}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <Target className="h-5 w-5 text-primary" />
                            <CardTitle className="text-lg">{domain.name}</CardTitle>
                          </div>
                          <div className="flex items-center gap-2">
                            {isNextSuggested && domain.status !== 'completed' && (
                              <Badge variant="outline" className="text-xs bg-primary/10 border-primary/30 text-primary">
                                Next
                              </Badge>
                            )}
                            {getStatusIcon(domain.status)}
                          </div>
                        </div>
                        <CardDescription className="text-sm leading-relaxed">
                          {domain.description}
                        </CardDescription>
                        <Badge variant="secondary" className="text-xs w-fit mt-2">
                          {domain.mpsRange}
                        </Badge>
                      </CardHeader>
                      
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          {/* Progress Bar */}
                          {domain.status === 'in_progress' && (
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span>Progress</span>
                                <span>{domain.completionPercentage}%</span>
                              </div>
                              <Progress value={domain.completionPercentage} className="h-2" />
                            </div>
                          )}

                          {/* Stats */}
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">MPSs:</span>
                            <span className="font-medium">{domain.mpsCount}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Criteria:</span>
                            <span className="font-medium">{domain.criteriaCount}</span>
                          </div>
                          
                          {/* Status Badge and Action */}
                          <div className="flex justify-between items-center pt-2">
                            {getStatusBadge(domain)}
                            {getActionButton(domain)}
                          </div>
                          
                          {/* Helper Text */}
                          {domain.status === 'locked' && (
                            <div className="text-xs text-center text-muted-foreground pt-1">
                              Complete previous domain first
                            </div>
                          )}
                          
                          {isNextSuggested && domain.status === 'not_started' && (
                            <div className="text-xs text-center text-primary pt-1 font-medium">
                              👈 Start here
                            </div>
                          )}

                          {domain.status === 'in_progress' && (
                            <div className="text-xs text-center text-blue-600 pt-1">
                              Current Step: {domain.currentStep === 'intent' ? 'Create Intent' : 
                                           domain.currentStep === 'criteria' ? 'Create Criteria' : 'In Progress'}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="mps" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Maturity Practice Statements (MPS)</CardTitle>
                <CardDescription>
                  Configure MPS with auto-numbering and AI-generated summaries
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MPSManagement />
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Admin MPS Runner</CardTitle>
              </CardHeader>
              <CardContent>
                <AdminMPSRunner />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="criteria" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Criteria Configuration</CardTitle>
                <CardDescription>
                  Criteria management has been moved to the individual domain audit builders.
                  Use the "Domain Audit Builder" for each domain to configure criteria.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Criteria are now managed within each domain's audit workflow
                  </p>
                  <Button onClick={() => navigate('/assessment/framework')} variant="outline">
                    Go to Domain Selection
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="import-export" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Bulk Import & Export</CardTitle>
                <CardDescription>
                  Import and export assessment frameworks using CSV/XLSX files
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BulkImportExport />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compliance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>ISO Compliance Validation</CardTitle>
                <CardDescription>
                  Verify framework alignment with ISO 31000, NIST, and ISO 27001 standards
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ISOComplianceValidation />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    </div>
  );
}

