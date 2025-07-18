import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Target, ChevronRight, Home, ArrowLeft } from 'lucide-react';

const MATURITY_DOMAINS = [
  {
    name: "Leadership & Governance",
    position: "top",
    description: "Strategic direction, risk management, and organizational accountability",
    currentLevel: "Basic",
    currentDescription: "Informal governance structure with limited strategic oversight of operational risks.",
    nextLevel: "Reactive", 
    nextDescription: "Establish clear governance structure and define leadership roles in risk management."
  },
  {
    name: "Process Integrity", 
    position: "middle-left",
    description: "Operational effectiveness, quality control, and process optimization",
    currentLevel: "Basic",
    currentDescription: "Ad-hoc processes with minimal documentation and control mechanisms.",
    nextLevel: "Reactive",
    nextDescription: "Document key processes and implement basic quality control measures."
  },
  {
    name: "People & Culture",
    position: "middle-center", 
    description: "Team capability, training, awareness, and cultural maturity",
    currentLevel: "Basic",
    currentDescription: "Limited awareness programs with informal training approaches.",
    nextLevel: "Reactive",
    nextDescription: "Develop structured training programs and awareness initiatives."
  },
  {
    name: "Protection",
    position: "middle-right",
    description: "Security measures, incident response, and resilience planning", 
    currentLevel: "Basic",
    currentDescription: "Basic security measures with limited incident response capabilities.",
    nextLevel: "Reactive",
    nextDescription: "Implement comprehensive security framework and incident response procedures."
  },
  {
    name: "Proof it Works",
    position: "bottom",
    description: "Monitoring, measurement, and continuous improvement validation",
    currentLevel: "Basic", 
    currentDescription: "Minimal monitoring with limited measurement frameworks.",
    nextLevel: "Reactive",
    nextDescription: "Establish key performance indicators and regular monitoring processes."
  },
  {
    name: "Enablement",
    position: "foundation",
    description: "Technology, tools, and infrastructure supporting operations",
    currentLevel: "Basic",
    currentDescription: "Basic technology infrastructure with limited integration capabilities.",
    nextLevel: "Reactive", 
    nextDescription: "Upgrade technology platform and improve system integration."
  }
];

const MATURITY_LEVELS = [
  { level: 1, name: "Basic", color: "from-orange-400 to-red-500", description: "Informal processes with limited oversight" },
  { level: 2, name: "Reactive", color: "from-yellow-400 to-orange-500", description: "Documented processes with basic controls" },
  { level: 3, name: "Compliant", color: "from-blue-400 to-indigo-500", description: "Systematic approach with compliance focus" },
  { level: 4, name: "Proactive", color: "from-green-400 to-emerald-500", description: "Optimized processes with predictive capabilities" },
  { level: 5, name: "Resilient", color: "from-purple-400 to-violet-500", description: "Self-adapting systems with continuous innovation" }
];

const Journey = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [hoveredDomain, setHoveredDomain] = useState<number | null>(null);
  const [hoveredLevel, setHoveredLevel] = useState<number | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<number>(1);

  useEffect(() => {
    console.log('Journey Page - Entry:', {
      timestamp: new Date().toISOString(),
      route: '/journey'
    });

    toast({
      title: "Explore Your Maturity Journey",
      description: "Click on different areas to explore your current maturity levels",
    });

    return () => {
      console.log('Journey Page - Exit:', {
        timestamp: new Date().toISOString()
      });
    };
  }, [toast]);

  const handleStartAssessment = () => {
    console.log('Journey Page - CTA Click:', {
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

  const handleBackToHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={handleBackToHome} className="flex items-center space-x-2">
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Home</span>
              </Button>
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                  <Target className="h-5 w-5 text-primary-foreground" />
                </div>
                <h1 className="text-2xl font-bold">Maturion</h1>
              </div>
            </div>
            
            <Button onClick={handleStartAssessment} className="flex items-center space-x-2">
              <Target className="h-4 w-4" />
              <span>Start Assessment</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 text-center">
        <div className="max-w-4xl mx-auto mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-4 bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">
            Explore Your Maturity Journey
          </h1>
          <p className="text-lg text-muted-foreground">
            Click on different areas to explore your current maturity levels
          </p>
        </div>
      </section>

      {/* Maturity House */}
      <section className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-12 gap-4 mb-8">
            
            {/* Leadership & Governance - Top */}
            <div className="col-span-12 flex justify-center">
              {MATURITY_DOMAINS.filter(d => d.position === "top").map((domain, index) => (
                <Card 
                  key={index}
                  className="relative transition-all duration-300 hover:shadow-lg cursor-pointer group w-80 bg-gradient-to-r from-emerald-500 to-green-600 text-white border-0"
                  onMouseEnter={() => setHoveredDomain(index)}
                  onMouseLeave={() => setHoveredDomain(null)}
                >
                  <CardHeader className="text-center pb-2">
                    <CardTitle className="text-lg font-bold">{domain.name}</CardTitle>
                    <CardDescription className="text-emerald-100 text-sm">
                      - {domain.currentLevel}
                    </CardDescription>
                  </CardHeader>
                  
                  {hoveredDomain === index && (
                    <CardContent className="pt-0">
                      <p className="text-xs text-emerald-50 mb-2">{domain.currentDescription}</p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>

            {/* Middle Row - Process Integrity, People & Culture, Protection */}
            <div className="col-span-12 grid grid-cols-3 gap-4">
              {MATURITY_DOMAINS.filter(d => d.position.startsWith("middle")).map((domain, index) => (
                <Card 
                  key={index}
                  className="relative transition-all duration-300 hover:shadow-lg cursor-pointer group bg-gradient-to-r from-red-500 to-orange-600 text-white border-0"
                  onMouseEnter={() => setHoveredDomain(index + 10)}
                  onMouseLeave={() => setHoveredDomain(null)}
                >
                  <CardHeader className="text-center pb-2">
                    <CardTitle className="text-base font-bold">{domain.name}</CardTitle>
                    <CardDescription className="text-red-100 text-sm">
                      - {domain.currentLevel}
                    </CardDescription>
                  </CardHeader>
                  
                  {hoveredDomain === index + 10 && (
                    <CardContent className="pt-0">
                      <p className="text-xs text-red-50 mb-2">{domain.currentDescription}</p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>

            {/* Bottom Row - Proof it Works */}
            <div className="col-span-12 flex justify-center">
              {MATURITY_DOMAINS.filter(d => d.position === "bottom").map((domain, index) => (
                <Card 
                  key={index}
                  className="relative transition-all duration-300 hover:shadow-lg cursor-pointer group w-80 bg-gradient-to-r from-red-500 to-orange-600 text-white border-0"
                  onMouseEnter={() => setHoveredDomain(index + 20)}
                  onMouseLeave={() => setHoveredDomain(null)}
                >
                  <CardHeader className="text-center pb-2">
                    <CardTitle className="text-lg font-bold">{domain.name}</CardTitle>
                    <CardDescription className="text-red-100 text-sm">
                      - {domain.currentLevel}
                    </CardDescription>
                  </CardHeader>
                  
                  {hoveredDomain === index + 20 && (
                    <CardContent className="pt-0">
                      <p className="text-xs text-red-50 mb-2">{domain.currentDescription}</p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>

          </div>

          {/* Maturity Level Bar */}
          <div className="flex justify-center mb-8">
            <div className="flex space-x-4">
              {MATURITY_LEVELS.map((level, index) => (
                <div
                  key={index}
                  className={`relative cursor-pointer transition-all duration-300 ${
                    selectedLevel === level.level ? 'scale-110' : 'hover:scale-105'
                  }`}
                  onMouseEnter={() => setHoveredLevel(index)}
                  onMouseLeave={() => setHoveredLevel(null)}
                  onClick={() => setSelectedLevel(level.level)}
                >
                  <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${level.color} flex items-center justify-center shadow-lg`}>
                    <div className="text-center">
                      <div className="text-xs font-bold text-white">Level {level.level}</div>
                      <div className="text-xs text-white">{level.name}</div>
                    </div>
                  </div>
                  
                  {hoveredLevel === index && (
                    <div className="absolute z-10 top-full left-1/2 transform -translate-x-1/2 mt-2 p-3 bg-popover border rounded-lg shadow-lg w-48">
                      <p className="text-xs text-popover-foreground text-center">
                        {level.description}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Side Boxes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {/* Current State */}
            <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
              <CardHeader>
                <CardTitle className="text-slate-700 flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>Current State</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 mb-3">
                  You are currently at <strong>Level 1 - Basic</strong> across most domains.
                </p>
                <p className="text-xs text-slate-500">
                  Informal governance structure with limited strategic oversight of operational risks.
                </p>
              </CardContent>
            </Card>

            {/* Working Toward */}
            <Card className="bg-gradient-to-br from-emerald-50 to-green-100 border-emerald-200">
              <CardHeader>
                <CardTitle className="text-emerald-700 flex items-center space-x-2">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                  <span>Working Toward</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-emerald-600 mb-3">
                  We are working on moving to <strong>Level 2 - Reactive</strong>.
                </p>
                <p className="text-xs text-emerald-500">
                  Establish clear governance structure and define leadership roles in risk management.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Call to Action */}
          <div className="text-center bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-8">
            <h3 className="text-2xl font-bold mb-4 text-slate-800">
              Curious where you stand?
            </h3>
            <p className="text-lg text-slate-600 mb-6">
              Start your free 15-minute assessment and discover your current level.
            </p>
            
            <Button 
              size="lg" 
              onClick={handleStartAssessment}
              className="text-lg px-8 py-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0"
            >
              Start Free Assessment
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-secondary/5 py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2024 Maturion. Complete transparency in your operational maturity journey.</p>
        </div>
      </footer>
    </div>
  );
};

export default Journey;