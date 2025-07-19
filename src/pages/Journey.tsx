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
    description: "A well-defined security control environment forms the foundation of effective loss prevention. It aligns leadership commitment, employee accountability, and system capability to ensure coordinated protection. This environment must be understood as a cultural and structural anchor that shifts security from isolated effort to integrated resilience."
  },
  {
    title: "Risk-Based Decisions",
    icon: Target,
    color: "from-blue-500 to-cyan-600",
    insight: "Data-driven choices that balance threat probability with business impact and mitigation costs.",
    description: "Moving beyond intuition to evidence-based decision making. Every security investment, policy change, and resource allocation is justified through quantifiable risk assessment, ensuring optimal resource deployment and measurable ROI. This approach forms the backbone of modern, cost-efficient protection."
  },
  {
    title: "Security Systems Optimisation",
    icon: Settings,
    color: "from-purple-500 to-violet-600",
    insight: "Ensure each system performs its intended function without overlap or waste.",
    description: "Effective systems don't rely on volume—they rely on purpose. Optimisation means analyzing the coverage, performance, and integration of each system to eliminate duplication, detect blind spots, and streamline surveillance and access control operations. Every dollar spent must return value in deterrence, detection, and response."
  },
  {
    title: "Data Mining Approach",
    icon: Database,
    color: "from-orange-500 to-red-600",
    insight: "Unlock hidden patterns in behavior, transactions, and movements.",
    description: "Data is the new frontline in security. From incident logs to access records and surveillance analytics, every action leaves a trail. Mining this data uncovers loss trends, insider threats, and vulnerabilities long before they become incidents. The goal: predict and prevent, not just react."
  },
  {
    title: "Protection at Source",
    icon: Crosshair,
    color: "from-teal-500 to-cyan-600",
    insight: "Secure assets where they originate, not just where they're stored.",
    description: "Loss prevention must begin at the point of creation—whether it's raw material, a document, or a digital credential. Protecting the source reduces dependency on back-end controls and reduces opportunity for manipulation, substitution, or diversion. Every source point becomes a checkpoint."
  },
  {
    title: "Malicious and Non-Malicious Loss",
    icon: AlertTriangle,
    color: "from-red-500 to-pink-600",
    insight: "Recognize that loss isn't always caused by bad actors.",
    description: "Losses can be intentional (malicious) or unintentional (non-malicious). Mistakes, negligence, fatigue, and flawed processes can cause as much damage as theft. A balanced security posture anticipates both types and implements interventions like training, automation, and process clarity to reduce human error."
  },
  {
    title: "Black Screen Surveillance Technology",
    icon: MonitorSpeaker,
    color: "from-indigo-500 to-purple-600",
    insight: "Empower surveillance teams through AI-assisted anomaly detection.",
    description: "Traditional screen-watching has limited value. Black screen surveillance shifts focus to what matters. The AI monitors thousands of data points in real time—flagging anomalies, alerting to risk, and freeing up human operators to act rather than watch. It's the future of proactive surveillance."
  },
  {
    title: "Teamwork – No More Working in Silos",
    icon: HeartHandshake,
    color: "from-green-500 to-emerald-600",
    insight: "Loss prevention requires cross-functional collaboration.",
    description: "Security is not a department—it's a discipline. Engineering, operations, HR, and finance all influence the risk landscape. Breaking silos ensures aligned goals, shared data, and collective accountability. One integrated effort outperforms ten isolated ones. The strongest defense is a united one."
  },
  {
    title: "Rules-Based Access",
    icon: Key,
    color: "from-yellow-500 to-orange-600",
    insight: "Control access with logic, not status or convenience.",
    description: "Access must be defined by role, task, and risk—not by rank or routine. Rules-based access assigns permissions based on logic and necessity. Every exception creates an opening for misuse. Eliminate legacy habits and replace them with access rules that adapt to risk, time, and context."
  },
  {
    title: "Plan, Plan, Plan",
    icon: CalendarCheck,
    color: "from-blue-500 to-indigo-600",
    insight: "Prevention starts with clarity, coordination, and continuity.",
    description: "Failing to plan means planning to fail. Whether it's a routine process or emergency response, having defined, rehearsed, and documented plans ensures consistency under pressure. Planning includes risk mapping, SOPs, task delegation, and response timing. Real security is premeditated."
  },
  {
    title: "Have a Backup Plan",
    icon: LifeBuoy,
    color: "from-emerald-500 to-teal-600",
    insight: "If plan A fails, plan B must already be active.",
    description: "Redundancy is resilience. Backup plans cover power loss, staff absence, system failure, or sabotage. Every failure point must have a fallback—and it must be tested. Recovery speed determines reputation, cost, and continuity. A smart plan fails safe, not hard."
  },
  {
    title: "Be a Problem Solver, Not a Problem Generator",
    icon: Wrench,
    color: "from-violet-500 to-purple-600",
    insight: "A resilient team solves problems early, not late.",
    description: "Loss prevention is a mindset. It thrives in organizations where individuals feel ownership, speak up, and act early. Teams must be trained and empowered to solve problems on the ground before they escalate. This principle transforms security from reactive enforcement to proactive enablement."
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