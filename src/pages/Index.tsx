import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Target, Clock, Bot, Eye, ChevronRight, LogIn } from 'lucide-react';

const ISMS_JOURNEY_COMPONENTS = [
  {
    name: "Maturity Development Journey",
    description: "Begin with maturity assessment, then activate smart tools to protect your progress",
    category: "foundation",
    highlighted: true,
    icon: Target
  },
  {
    name: "Risk Management Framework", 
    description: "Comprehensive risk identification, assessment, and mitigation strategies",
    category: "enablement",
    highlighted: false,
    icon: Eye
  },
  {
    name: "Action Management System",
    description: "Track, prioritize, and execute improvement initiatives systematically",
    category: "enablement",
    highlighted: false,
    icon: Bot
  },
  {
    name: "Access Analytics",
    description: "Monitor and analyze user access patterns and security compliance",
    category: "enablement",
    highlighted: false,
    icon: Clock
  },
  {
    name: "Video Surveillance Analysis",
    description: "AI-powered video analysis for security and operational insights",
    category: "enablement",
    highlighted: false,
    icon: Eye
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

    return () => {
      console.log('Landing Page - Exit:', {
        timestamp: new Date().toISOString()
      });
    };
  }, [toast]);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-violet-50/40">
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
            
            {user ? (
              <Button 
                onClick={() => navigate('/dashboard')} 
                className="flex items-center space-x-2"
              >
                <Target className="h-4 w-4" />
                <span>Go to Dashboard</span>
              </Button>
            ) : (
              <Button variant="outline" onClick={handleLogin} className="flex items-center space-x-2">
                <LogIn className="h-4 w-4" />
                <span>Sign In</span>
              </Button>
            )}
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
            className="text-lg px-8 py-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0"
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

      {/* ISMS Journey Section */}
      <section className="container mx-auto px-4 py-16 bg-gradient-to-r from-violet-50/50 to-blue-50/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">
              🌐 Your Integrated ISMS Journey
            </h2>
            <p className="text-lg text-muted-foreground">
              Begin with maturity assessment, then activate smart tools to protect your progress
            </p>
          </div>
          
          {/* Foundation Component */}
          <div className="mb-8">
            {ISMS_JOURNEY_COMPONENTS.filter(component => component.highlighted).map((component, index) => (
              <Card 
                key={index}
                className="relative transition-all duration-300 hover:shadow-xl border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 cursor-pointer group"
                onClick={() => navigate('/journey')}
              >
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 w-20 h-20 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center shadow-lg">
                    <component.icon className="h-10 w-10 text-white" />
                  </div>
                  <CardTitle className="text-2xl text-emerald-700 group-hover:text-emerald-800 transition-colors">
                    {component.name}
                  </CardTitle>
                  <CardDescription className="text-base text-emerald-600">
                    {component.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>

          {/* Enable Resilience Tools */}
          <div className="text-center mb-6">
            <h3 className="text-xl font-semibold text-slate-700">Enable Resilience</h3>
            <p className="text-sm text-muted-foreground">Smart tools to strengthen and accelerate your path to operational resilience</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {ISMS_JOURNEY_COMPONENTS.filter(component => !component.highlighted).map((component, index) => (
              <Card 
                key={index}
                className="relative transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer group border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50"
                onMouseEnter={() => {
                  setHoveredDomain(index);
                  console.log('Landing Page - Tool Hover:', {
                    tool: component.name,
                    index
                  });
                }}
                onMouseLeave={() => setHoveredDomain(null)}
              >
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-3 w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                    <component.icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-sm font-medium text-blue-700 group-hover:text-blue-800 transition-colors">
                    {component.name}
                  </CardTitle>
                </CardHeader>
                
                {/* Tool description on hover */}
                {hoveredDomain === index && (
                  <CardContent className="pt-0">
                    <CardDescription className="text-xs text-blue-600">
                      {component.description}
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
            className="text-lg px-8 py-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0"
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