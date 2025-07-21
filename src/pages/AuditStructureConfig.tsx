import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Target, CheckCircle, Clock, AlertCircle } from 'lucide-react';

const AuditStructureConfig = () => {
  const navigate = useNavigate();

  // Domain data in logical MPS progression order
  const domains = [
    {
      id: 'leadership-governance',
      name: 'Leadership & Governance',
      description: 'Strategic oversight, risk management, and compliance frameworks',
      mpsCount: 0,
      criteriaCount: 0,
      status: 'not_started' as const,
      completionPercentage: 0,
      mpsRange: 'MPS 1–5'
    },
    {
      id: 'process-integrity',
      name: 'Process Integrity',
      description: 'Document management, version control, and quality assurance processes',
      mpsCount: 2,
      criteriaCount: 6,
      status: 'completed' as const,
      completionPercentage: 100,
      mpsRange: 'MPS 6–10'
    },
    {
      id: 'people-culture',
      name: 'People & Culture',
      description: 'Training, awareness, and organizational behavior standards',
      mpsCount: 0,
      criteriaCount: 0,
      status: 'in_progress' as const,
      completionPercentage: 0,
      mpsRange: 'MPS 11–14'
    },
    {
      id: 'protection',
      name: 'Protection',
      description: 'Security controls, access management, and data protection',
      mpsCount: 0,
      criteriaCount: 0,
      status: 'not_started' as const,
      completionPercentage: 0,
      mpsRange: 'MPS 15–20'
    },
    {
      id: 'proof-it-works',
      name: 'Proof it Works',
      description: 'Monitoring, testing, and validation mechanisms',
      mpsCount: 0,
      criteriaCount: 0,
      status: 'not_started' as const,
      completionPercentage: 0,
      mpsRange: 'MPS 21–25'
    }
  ];

  // Determine next suggested domain for guidance
  const getNextSuggestedDomain = () => {
    const firstNotStarted = domains.find(d => d.status === 'not_started');
    const firstInProgress = domains.find(d => d.status === 'in_progress');
    return firstInProgress || firstNotStarted;
  };

  const nextSuggestedDomain = getNextSuggestedDomain();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-200">✔ All Approved</Badge>;
      case 'in_progress':
        return <Badge variant="secondary">🟡 In Progress</Badge>;
      default:
        return <Badge variant="outline">❌ Not Started</Badge>;
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
              onClick={() => navigate('/maturity/build')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Audit Journey
            </Button>
            
            <Badge variant="outline">Audit Structure Setup</Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Title Section */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">Audit Structure Setup</h1>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Configure Mini Performance Standards (MPSs) for each LDCS audit domain
            </p>
            <div className="flex justify-center mt-4">
              <Badge variant="secondary" className="text-sm">
                2 MPSs • 6 Criteria
              </Badge>
            </div>
          </div>

          {/* Next Suggested Domain Guidance */}
          {nextSuggestedDomain && (
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-sm text-primary">
                <span className="animate-pulse">💡</span>
                <span>Continue with <strong>{nextSuggestedDomain.name}</strong></span>
              </div>
            </div>
          )}

          {/* Domain Cards Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {domains.map((domain) => {
              const isNextSuggested = nextSuggestedDomain?.id === domain.id;
              return (
                <Card 
                  key={domain.id}
                  className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
                    domain.status === 'completed' ? 'border-green-200 bg-green-50/30' :
                    domain.status === 'in_progress' ? 'border-blue-200 bg-blue-50/30' :
                    isNextSuggested ? 'border-primary/40 bg-primary/5 shadow-lg ring-2 ring-primary/20 animate-pulse' :
                    'hover:border-primary/50'
                  }`}
                  onClick={() => navigate(`/audit/domain/${domain.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">{domain.name}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        {isNextSuggested && (
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
                      {/* Stats */}
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">MPSs:</span>
                        <span className="font-medium">{domain.mpsCount}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Criteria:</span>
                        <span className="font-medium">{domain.criteriaCount}</span>
                      </div>
                      
                      {/* Status Badge */}
                      <div className="flex justify-between items-center pt-2">
                        {getStatusBadge(domain.status)}
                        <Button 
                          size="sm" 
                          variant={domain.status === 'completed' ? 'outline' : isNextSuggested ? 'default' : 'secondary'}
                          className={`text-xs ${isNextSuggested ? 'bg-primary hover:bg-primary/90' : ''}`}
                        >
                          {domain.status === 'completed' ? 'Edit MPSs' : 'Create MPSs'}
                        </Button>
                      </div>
                      
                      {domain.status === 'in_progress' && (
                        <div className="text-xs text-center text-muted-foreground pt-1">
                          In Progress
                        </div>
                      )}
                      
                      {isNextSuggested && domain.status === 'not_started' && (
                        <div className="text-xs text-center text-primary pt-1 font-medium">
                          👈 Start here
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AuditStructureConfig;