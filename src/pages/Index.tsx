import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Target, Clock, Bot, Eye, ChevronRight, LogIn } from 'lucide-react';

const LDCS_DOMAINS = [
  {
    name: "Leadership & Governance",
    description: "Strategic direction, risk management, and organizational accountability"
  },
  {
    name: "Process Integrity", 
    description: "Operational effectiveness, quality control, and process optimization"
  },
  {
    name: "People & Culture",
    description: "Team capability, training, awareness, and cultural maturity"
  },
  {
    name: "Protection",
    description: "Security measures, incident response, and resilience planning"
  },
  {
    name: "Proof it Works",
    description: "Monitoring, measurement, and continuous improvement validation"
  },
  {
    name: "Enablement",
    description: "Technology, tools, and infrastructure supporting operations"
  }
];

const FEATURE_PROMISES = [
  {
    icon: Clock,
    title: "15-Minute Start",
    description: "Begin with a quick assessment and get immediate insight",
    tooltip: "Complete our free operational maturity assessment in just 15 minutes and receive instant results showing your organization's current state across all domains."
  },
  {
    icon: Bot,
    title: "Expert Guidance", 
    description: "AI analysis + auditor escalation when needed",
    tooltip: "Our AI provides intelligent recommendations based on industry best practices, with the option to escalate complex issues to certified auditors."
  },
  {
    icon: Eye,
    title: "Complete Transparency",
    description: "See every step, requirement, and benefit upfront",
    tooltip: "No hidden fees or surprise requirements. See exactly what's involved in your maturity journey from assessment to certification."
  }
];

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [hoveredDomain, setHoveredDomain] = useState<number | null>(null);
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  useEffect(() => {
    // Console debug log for landing page entry
    console.log('Landing Page - Entry:', {
      timestamp: new Date().toISOString(),
      userAuthenticated: !!user,
      route: '/'
    });

    // Toast notification for page load
    toast({
      title: "Welcome to Maturion",
      description: "Your complete audit & improvement journey starts here",
    });

    // Redirect authenticated users to dashboard
    if (user) {
      console.log('Landing Page - Authenticated user detected, redirecting to dashboard');
      navigate('/dashboard');
    }

    return () => {
      console.log('Landing Page - Exit:', {
        timestamp: new Date().toISOString()
      });
    };
  }, [user, navigate, toast]);

  const handleStartAssessment = () => {
    console.log('Landing Page - CTA Click:', {
      timestamp: new Date().toISOString(),
      action: 'Start Free Assessment',
      targetRoute: '/assessment'
    });

    toast({
      title: "Assessment Starting",
      description: "Navigating to your free operational maturity assessment",
    });

    navigate('/assessment');
  };

  const handleLogin = () => {
    console.log('Landing Page - Login Click:', {
      timestamp: new Date().toISOString(),
      action: 'Login',
      targetRoute: '/auth'
    });
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                <Target className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold">Maturion</h1>
            </div>
            
            <Button variant="outline" onClick={handleLogin} className="flex items-center space-x-2">
              <LogIn className="h-4 w-4" />
              <span>Sign In</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold tracking-tight mb-6">
            Your Complete Audit & Improvement Journey
          </h1>
          <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
            See exactly what you're signing up for. Complete transparency from free assessment 
            to operational excellence. No hidden steps, no surprises.
          </p>
          
          <Button 
            size="lg" 
            onClick={handleStartAssessment}
            className="text-lg px-8 py-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
          >
            Start Your Free Assessment
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Feature Promises */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {FEATURE_PROMISES.map((feature, index) => (
            <Card 
              key={index}
              className="relative transition-all duration-300 hover:shadow-lg cursor-pointer"
              onMouseEnter={() => setHoveredFeature(index)}
              onMouseLeave={() => setHoveredFeature(null)}
            >
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <feature.icon className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-base">
                  {feature.description}
                </CardDescription>
                
                {/* Tooltip on hover */}
                {hoveredFeature === index && (
                  <div className="absolute z-10 top-full left-0 right-0 mt-2 p-4 bg-popover border rounded-lg shadow-lg">
                    <p className="text-sm text-popover-foreground">
                      {feature.tooltip}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* LDCS Domains Grid */}
      <section className="container mx-auto px-4 py-16 bg-secondary/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Six Domains of Operational Excellence
            </h2>
            <p className="text-lg text-muted-foreground">
              Hover over each domain to understand what it covers in your maturity journey
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {LDCS_DOMAINS.map((domain, index) => (
              <Card 
                key={index}
                className="relative transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer group"
                onMouseEnter={() => {
                  setHoveredDomain(index);
                  console.log('Landing Page - Domain Hover:', {
                    domain: domain.name,
                    index
                  });
                }}
                onMouseLeave={() => setHoveredDomain(null)}
              >
                <CardHeader>
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">
                    {domain.name}
                  </CardTitle>
                </CardHeader>
                
                {/* Domain description on hover */}
                {hoveredDomain === index && (
                  <CardContent className="pt-0">
                    <CardDescription className="text-sm">
                      {domain.description}
                    </CardDescription>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Begin Your Journey?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Start with our free 15-minute assessment and discover your organization's 
            current maturity level across all six domains.
          </p>
          
          <Button 
            size="lg" 
            onClick={handleStartAssessment}
            className="text-lg px-8 py-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
          >
            Start Your Free Assessment
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-secondary/5 py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2024 Maturion. Complete transparency in your operational maturity journey.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;