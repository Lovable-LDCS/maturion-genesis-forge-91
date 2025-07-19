import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Target, ChevronRight, ArrowLeft, Shield, Settings, Users, Lock, BarChart, Rocket, Eye, Database, Search, Crosshair, AlertTriangle, Zap, MonitorSpeaker, HeartHandshake, Key, CalendarCheck, LifeBuoy, Wrench } from 'lucide-react';

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
  { 
    level: 1, 
    name: "Basic", 
    color: "from-orange-400 to-red-500", 
    description: "Informal processes with limited oversight",
    tooltip: "Starting point with ad-hoc approaches and minimal documentation"
  },
  { 
    level: 2, 
    name: "Reactive", 
    color: "from-yellow-400 to-orange-500", 
    description: "Documented processes with basic controls",
    tooltip: "Response-driven with documented procedures and basic risk awareness"
  },
  { 
    level: 3, 
    name: "Compliant", 
    color: "from-blue-400 to-indigo-500", 
    description: "Systematic approach with compliance focus",
    tooltip: "Standards-based operations with regulatory compliance and monitoring"
  },
  { 
    level: 4, 
    name: "Proactive", 
    color: "from-green-400 to-emerald-500", 
    description: "Optimized processes with predictive capabilities",
    tooltip: "Risk-anticipating with continuous improvement and strategic planning"
  },
  { 
    level: 5, 
    name: "Resilient", 
    color: "from-purple-400 to-violet-500", 
    description: "Self-adapting systems with continuous innovation",
    tooltip: "Adaptive excellence with autonomous optimization and industry leadership"
  }
];

// What Drives Loss Prevention and Operational Integrity - 12 Key Areas
const OPERATIONAL_DRIVERS = [
  {
    title: "The Security Control Environment",
    icon: Shield,
    color: "from-emerald-500 to-green-600",
    insight: "Integrated framework combining people, processes, and technology for comprehensive protection.",
    description: "A holistic security environment that doesn't rely on single points of failure but creates layered, interconnected defenses. This approach ensures that when one control fails, others compensate, maintaining operational continuity and asset protection."
  },
  {
    title: "Risk-Based Decisions",
    icon: Target,
    color: "from-blue-500 to-cyan-600",
    insight: "Data-driven choices that balance threat probability with business impact and mitigation costs.",
    description: "Moving beyond intuition to evidence-based decision making. Every security investment, policy change, and resource allocation is justified through quantifiable risk assessment, ensuring optimal resource deployment and measurable ROI."
  },
  {
    title: "Security Systems Optimisation",
    icon: Settings,
    color: "from-purple-500 to-violet-600",
    insight: "Continuous refinement of security technologies for maximum effectiveness and efficiency.",
    description: "Regular evaluation and enhancement of security systems to ensure they remain effective against evolving threats while minimizing false alarms and operational disruption. This includes system integration, performance monitoring, and strategic upgrades."
  },
  {
    title: "Data Mining Approach",
    icon: Database,
    color: "from-orange-500 to-red-600",
    insight: "Extracting actionable intelligence from security data to predict and prevent incidents.",
    description: "Leveraging advanced analytics to identify patterns, anomalies, and trends in security data. This proactive approach enables early threat detection, predictive maintenance, and continuous improvement of security measures based on empirical evidence."
  },
  {
    title: "Protection at Source",
    icon: Crosshair,
    color: "from-teal-500 to-cyan-600",
    insight: "Implementing security measures at the point of origin to prevent issues before they escalate.",
    description: "Rather than reactive responses, this strategy focuses on identifying and mitigating risks at their source. Whether it's access control at entry points, quality control in manufacturing, or data protection at creation, prevention is always more cost-effective than remediation."
  },
  {
    title: "Malicious and Non-Malicious Loss",
    icon: AlertTriangle,
    color: "from-red-500 to-pink-600",
    insight: "Comprehensive approach addressing both intentional threats and accidental incidents.",
    description: "Recognizing that losses come from multiple sources - from deliberate theft and fraud to honest mistakes and system failures. Effective protection requires different strategies for different loss types, but similar detection and response capabilities."
  },
  {
    title: "Black Screen Surveillance Technology",
    icon: MonitorSpeaker,
    color: "from-indigo-500 to-purple-600",
    insight: "Advanced monitoring systems that operate transparently without disrupting normal operations.",
    description: "Next-generation surveillance that provides comprehensive coverage while remaining unobtrusive to legitimate operations. These systems use AI and analytics to distinguish between normal and suspicious behavior, reducing false alarms while increasing detection accuracy."
  },
  {
    title: "Teamwork – No More Working in Silos",
    icon: HeartHandshake,
    color: "from-green-500 to-emerald-600",
    insight: "Breaking down departmental barriers to create unified security awareness and response.",
    description: "Security is everyone's responsibility, not just the security department's. This approach fosters cross-functional collaboration, shared accountability, and integrated communication systems that ensure rapid, coordinated responses to threats and incidents."
  },
  {
    title: "Rules-Based Access",
    icon: Key,
    color: "from-yellow-500 to-orange-600",
    insight: "Automated access control systems that enforce policies consistently and transparently.",
    description: "Moving beyond manual, subjective access decisions to automated, rule-based systems. These ensure consistent application of access policies, reduce human error, provide audit trails, and can adapt quickly to changing security requirements or organizational structures."
  },
  {
    title: "Plan, Plan, Plan",
    icon: CalendarCheck,
    color: "from-blue-500 to-indigo-600",
    insight: "Strategic planning across all timescales ensures preparedness for known and unknown challenges.",
    description: "Comprehensive planning that covers daily operations, incident response, business continuity, and strategic development. This includes scenario planning, regular plan testing and updates, and ensuring all stakeholders understand their roles in various situations."
  },
  {
    title: "Have a Backup Plan",
    icon: LifeBuoy,
    color: "from-emerald-500 to-teal-600",
    insight: "Redundancy and contingency planning ensure operations continue even when primary systems fail.",
    description: "Building resilience through multiple layers of backup systems, alternative processes, and contingency procedures. This includes technology backups, alternative suppliers, cross-trained staff, and tested recovery procedures for various failure scenarios."
  },
  {
    title: "Be a Problem Solver, Not a Problem Generator",
    icon: Wrench,
    color: "from-violet-500 to-purple-600",
    insight: "Proactive mindset that focuses on solutions and continuous improvement rather than blame.",
    description: "Cultivating a culture where team members are empowered to identify issues early and propose solutions. This approach reduces defensive behavior, encourages transparency, and transforms potential problems into opportunities for system improvement and organizational learning."
  }
];

const Journey = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [hoveredDomain, setHoveredDomain] = useState<number | null>(null);
  const [hoveredLevel, setHoveredLevel] = useState<number | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [lockedLevel, setLockedLevel] = useState<number | null>(null);
  const [hoveredDriver, setHoveredDriver] = useState<number | null>(null);

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

  const handleLevelClick = (level: number) => {
    if (lockedLevel === level) {
      setLockedLevel(null);
      setSelectedLevel(1);
    } else {
      setLockedLevel(level);
      setSelectedLevel(level);
    }
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

      {/* Lead-in Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold tracking-tight mb-6 bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">
              From Reactive to Resilient: Why This Journey Matters
            </h1>
            <div className="max-w-4xl mx-auto text-lg text-muted-foreground leading-relaxed">
              <p className="mb-4">
                Most organisations treat security as a cost—until the cost of a breach proves otherwise. Our maturity journey replaces outdated, reactive mindsets with an integrated system built on data-driven decisions, predictive insights, and embedded integrity.
              </p>
              <p>
                This isn't just about preventing losses. It's about demonstrating ROI, building resilience, and developing the next generation of globally in-demand security professionals.
              </p>
            </div>
          </div>
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
                   onClick={() => handleLevelClick(level.level)}
                >
                  <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${level.color} flex items-center justify-center shadow-lg ${
                    lockedLevel === level.level ? 'ring-4 ring-white ring-opacity-50' : ''
                  }`}>
                    <div className="text-center">
                      <div className="text-xs font-bold text-white">Level {level.level}</div>
                      <div className="text-xs text-white">{level.name}</div>
                    </div>
                  </div>
                  
                  {(hoveredLevel === index || lockedLevel === level.level) && (
                    <div className="absolute z-10 top-full left-1/2 transform -translate-x-1/2 mt-2 p-3 bg-popover border rounded-lg shadow-lg w-48">
                      <p className="text-xs text-popover-foreground text-center">
                        {level.tooltip}
                      </p>
                      {lockedLevel === level.level && (
                        <p className="text-xs text-primary text-center mt-2 font-medium">
                          Click again to unlock
                        </p>
                      )}
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

        </div>
      </section>

      {/* What Drives Loss Prevention and Operational Integrity */}
      <section className="container mx-auto px-4 py-16 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-slate-800">
              What Drives Loss Prevention and Operational Integrity?
            </h2>
            <p className="text-lg text-muted-foreground">
              Twelve foundational areas that transform reactive security into resilient operations
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {OPERATIONAL_DRIVERS.map((driver, index) => (
              <Dialog key={index}>
                <DialogTrigger asChild>
                  <Card 
                    className="relative transition-all duration-300 hover:shadow-xl hover:scale-105 cursor-pointer group border-2 bg-white"
                    onMouseEnter={() => setHoveredDriver(index)}
                    onMouseLeave={() => setHoveredDriver(null)}
                  >
                    <CardHeader className="text-center pb-4">
                      <div className={`mx-auto mb-4 w-16 h-16 bg-gradient-to-r ${driver.color} rounded-full flex items-center justify-center shadow-lg`}>
                        <driver.icon className="h-8 w-8 text-white" />
                      </div>
                      <CardTitle className="text-sm font-semibold group-hover:scale-105 transition-transform leading-tight">
                        {driver.title}
                      </CardTitle>
                    </CardHeader>
                    
                    {hoveredDriver === index && (
                      <CardContent className="pt-0">
                        <CardDescription className="text-xs leading-relaxed">
                          {driver.insight}
                        </CardDescription>
                      </CardContent>
                    )}
                  </Card>
                </DialogTrigger>
                
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <div className={`mx-auto mb-4 w-16 h-16 bg-gradient-to-r ${driver.color} rounded-full flex items-center justify-center shadow-lg`}>
                      <driver.icon className="h-8 w-8 text-white" />
                    </div>
                    <DialogTitle className="text-center">{driver.title}</DialogTitle>
                    <DialogDescription className="text-center text-sm font-medium text-primary">
                      {driver.insight}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="mt-4">
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {driver.description}
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-8">
            <h3 className="text-2xl font-bold mb-4 text-slate-800">
              Ready to Begin Your Journey?
            </h3>
            <p className="text-lg text-slate-600 mb-6">
              Start your free 15-minute assessment and discover your current maturity level across all domains.
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