import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Target, ChevronRight, ArrowLeft, Shield, Settings, Users, Lock, BarChart, Rocket, Eye, Database, Search, Crosshair, AlertTriangle, Zap, MonitorSpeaker, HeartHandshake, Key, CalendarCheck, LifeBuoy, Wrench, Info, Ban, Clock, CheckCircle, Play, Zap as ZapIcon, BarChart2, Cog } from 'lucide-react';

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

// Principles That Drive Loss Prevention - 12 Key Areas
const OPERATIONAL_DRIVERS = [
  {
    title: "The Security Control Environment",
    icon: Shield,
    color: "from-emerald-500 to-green-600",
    insight: "Integrated framework combining people, processes, and tech for protection.",
    description: "Security controls must be integrated, consistent, and adaptive. People, process, and technology must operate in unison to reduce risks and enable transparent assurance."
  },
  {
    title: "Risk-Based Decisions",
    icon: Target,
    color: "from-blue-500 to-cyan-600",
    insight: "Data-driven actions that balance threats with impact and cost.",
    description: "Move beyond guesswork—every security control must be backed by quantified risk, ensuring that security spend delivers measurable value and ROI."
  },
  {
    title: "Security Systems Optimisation",
    icon: Settings,
    color: "from-purple-500 to-violet-600",
    insight: "Align systems with performance and detection outcomes.",
    description: "Security isn't about more hardware—it's about ensuring existing systems are aligned with threats, performance indicators, and loss prevention."
  },
  {
    title: "Data Mining Approach",
    icon: Database,
    color: "from-orange-500 to-red-600",
    insight: "Turn operational data into actionable intelligence.",
    description: "Security thrives on analytics. When you mine access logs, shift data, camera feeds, and HR inputs—you can predict and prevent losses."
  },
  {
    title: "Protection at Source",
    icon: Crosshair,
    color: "from-teal-500 to-cyan-600",
    insight: "Address risk at the earliest opportunity.",
    description: "The longer a vulnerability exists, the harder it is to manage. Effective security intercepts threats before they develop into loss events."
  },
  {
    title: "Malicious and Non-Malicious Loss",
    icon: AlertTriangle,
    color: "from-red-500 to-pink-600",
    insight: "Not all losses are criminal—some are systemic.",
    description: "Preventing malicious loss is important, but so is tackling inefficiencies, negligence, and accidental failures that enable loss."
  },
  {
    title: "Black Screen Surveillance Technology",
    icon: MonitorSpeaker,
    color: "from-indigo-500 to-purple-600",
    insight: "Intelligent alerting from invisible monitoring.",
    description: "Rather than watching screens passively, use AI-driven surveillance to alert operators to anomalies and let people focus only on what matters."
  },
  {
    title: "Teamwork – No More Working in Silos",
    icon: HeartHandshake,
    color: "from-green-500 to-emerald-600",
    insight: "Security is a team sport.",
    description: "Loss prevention is not owned by the security team alone—every department, process, and manager plays a role. Break the silos."
  },
  {
    title: "Rules-Based Access",
    icon: Key,
    color: "from-yellow-500 to-orange-600",
    insight: "Restrict access using policies, not personalities.",
    description: "Access should follow logic—based on roles, responsibilities, risk. No exceptions, no guesswork. Every entry must be justifiable."
  },
  {
    title: "Plan, Plan, Plan",
    icon: CalendarCheck,
    color: "from-blue-500 to-indigo-600",
    insight: "No plan = predictable failure.",
    description: "Most security failures are predictable. You need a plan, a test, and a backup for every operational vulnerability."
  },
  {
    title: "Have a Backup Plan",
    icon: LifeBuoy,
    color: "from-emerald-500 to-teal-600",
    insight: "Assume failure. Then beat it.",
    description: "Even the best plan can fail. Layer your defenses, document contingencies, and rehearse responses to reduce impact."
  },
  {
    title: "Be a Problem Solver, Not a Problem Generator",
    icon: Wrench,
    color: "from-violet-500 to-purple-600",
    insight: "Build a solution culture.",
    description: "When problems arise, fix them. Security should be seen as a source of solutions, not friction. Own your influence."
  }
];

// Elements of Security - 7 Key Elements
const SECURITY_ELEMENTS = [
  {
    title: "Intelligence",
    icon: Info,
    color: "from-blue-500 to-indigo-600",
    insight: "Awareness of internal and external threats.",
    description: "Security begins with understanding your environment. Intelligence gathering enables anticipation of threats before they act."
  },
  {
    title: "Deterrence",
    icon: Ban,
    color: "from-red-500 to-rose-600",
    insight: "Discourage hostile action before it starts.",
    description: "The visibility and credibility of your security systems must deter would-be threats. People don't act if they believe they'll be caught."
  },
  {
    title: "Detection",
    icon: Search,
    color: "from-orange-500 to-amber-600",
    insight: "Spot problems early.",
    description: "Real-time detection through surveillance, analytics, and access control is essential. The quicker you spot, the quicker you stop."
  },
  {
    title: "Delay",
    icon: Clock,
    color: "from-yellow-500 to-orange-600",
    insight: "Slow the attacker.",
    description: "When incidents occur, delays—physical or procedural—buy you time to respond. Delay is a critical window for intervention."
  },
  {
    title: "Verification/Validation",
    icon: CheckCircle,
    color: "from-green-500 to-emerald-600",
    insight: "Trust, but verify.",
    description: "Assumptions are dangerous. All alerts, anomalies, and breaches must be verified before action is taken. Accuracy is everything."
  },
  {
    title: "Response",
    icon: Play,
    color: "from-teal-500 to-cyan-600",
    insight: "Take action, fast.",
    description: "Incident response must be trained, resourced, and practiced. The effectiveness of your reaction determines outcome."
  },
  {
    title: "Resilience",
    icon: ZapIcon,
    color: "from-purple-500 to-violet-600",
    insight: "Bounce back stronger.",
    description: "Resilience isn't just recovery—it's learning. Build processes that can take a hit, adapt, and return stronger."
  }
];

// Process Efficiencies - 1 Key Area
const PROCESS_EFFICIENCIES = [
  {
    title: "Process Efficiencies",
    icon: Cog,
    color: "from-indigo-500 to-blue-600",
    insight: "Secure processes are efficient processes.",
    description: "Every loss event originates from a process. By mapping operations, identifying weak points, and linking them to threat models, you secure both security and productivity. Use structured risk tools like WRAC, Bowtie, and Incident Trees."
  }
];

// Internalising Security - 5 Key Areas
const INTERNALIZATION_AREAS = [
  {
    title: "Security – a Weakest Link Problem",
    icon: Shield,
    color: "from-red-500 to-orange-600",
    insight: "Security is only as strong as its weakest point. Everyone is responsible.",
    description: "Security failures often occur at the weakest link in your chain. Every person, process, and system must be considered part of your security posture. Individual responsibility and collective accountability create true organizational resilience."
  },
  {
    title: "Security Programme Trade-Offs",
    icon: BarChart2,
    color: "from-blue-500 to-cyan-600",
    insight: "Design is a compromise. Costs, convenience, and coverage must be balanced.",
    description: "No security program is perfect. Every decision involves trade-offs between cost, user convenience, and security coverage. The key is making informed decisions about acceptable risk while maintaining operational effectiveness."
  },
  {
    title: "Internalisation of Security",
    icon: HeartHandshake,
    color: "from-green-500 to-emerald-600",
    insight: "Security norms must be learned, accepted, and lived. Make it personal.",
    description: "True security culture happens when security practices become second nature. People must understand why security matters to them personally and how their actions impact the organization's overall security posture."
  },
  {
    title: "Security in Project Management",
    icon: CalendarCheck,
    color: "from-purple-500 to-violet-600",
    insight: "Involve security from Day 1 of every project—never as an afterthought.",
    description: "Security considerations must be embedded into project planning from the beginning. When security is added later, it's more expensive, less effective, and creates friction. Build security into your project methodology."
  },
  {
    title: "Risk-Based Culture",
    icon: Target,
    color: "from-yellow-500 to-orange-600",
    insight: "All actions must be traceable to risk. If you can't explain it, don't approve it.",
    description: "Every decision should be backed by risk assessment. Create a culture where people naturally consider risk implications and can articulate why they're taking specific actions. Risk awareness should become instinctive."
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
  const [hoveredElement, setHoveredElement] = useState<number | null>(null);

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
      <section className="container mx-auto px-4 py-8 overflow-visible">
         <div className="max-w-4xl mx-auto relative overflow-visible">
           <div className="flex flex-col items-center space-y-6 mb-8 relative z-0 overflow-visible">
            
            {/* Leadership & Governance - Roof (Triangle) */}
            <div className="relative z-10">
              {MATURITY_DOMAINS.filter(d => d.position === "top").map((domain, index) => (
                <Dialog key={index}>
                  <DialogTrigger asChild>
                    <div
                      className="relative cursor-pointer transition-all duration-300 hover:scale-105 group"
                      onMouseEnter={() => setHoveredDomain(index)}
                      onMouseLeave={() => setHoveredDomain(null)}
                    >
                      {/* Triangle Shape - Final Size with Overlap */}
                      <div className="w-0 h-0 border-l-[220px] border-r-[220px] border-b-[130px] border-l-transparent border-r-transparent border-b-emerald-500 shadow-lg">
                      </div>
                      
                      {/* Content Overlay */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-white pt-6">
                        <h3 className="text-base font-bold text-center leading-tight px-4">{domain.name}</h3>
                        <p className="text-xs text-emerald-100 mt-1">- {domain.currentLevel}</p>
                      </div>
                      
                      {/* Hover Tooltip */}
                      {hoveredDomain === index && (
                        <div className="absolute z-50 top-full left-1/2 transform -translate-x-1/2 mt-5 p-4 bg-white border rounded-lg shadow-xl w-72 animate-fade-in">
                          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white border-l border-t rotate-45"></div>
                          <p className="text-sm text-gray-700">
                            {domain.description}
                          </p>
                        </div>
                      )}
                    </div>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                        <span>{domain.name}</span>
                      </DialogTitle>
                      <DialogDescription>
                        {domain.description}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div className="space-y-2">
                        <h4 className="font-semibold text-red-600">Current State</h4>
                        <p className="text-sm text-muted-foreground">{domain.currentDescription}</p>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-semibold text-green-600">Working Toward</h4>
                        <p className="text-sm text-muted-foreground">{domain.nextDescription}</p>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              ))}
            </div>

            {/* Middle Row - Three Pillars */}
            <div className="flex justify-center space-x-6 relative z-10">
              {MATURITY_DOMAINS.filter(d => d.position.startsWith("middle")).map((domain, index) => {
                const colors = [
                  { bg: "from-red-500 to-red-600", text: "text-red-100" },
                  { bg: "from-emerald-500 to-emerald-600", text: "text-emerald-100" },
                  { bg: "from-blue-500 to-blue-600", text: "text-blue-100" }
                ];
                const color = colors[index] || colors[0];
                
                return (
                  <Dialog key={index}>
                    <DialogTrigger asChild>
                      <Card 
                        className={`relative transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer group w-32 h-32 bg-gradient-to-r ${color.bg} text-white border-0 rounded-lg`}
                        onMouseEnter={() => setHoveredDomain(index + 10)}
                        onMouseLeave={() => setHoveredDomain(null)}
                      >
                        <CardHeader className="text-center p-3">
                          <CardTitle className="text-sm font-bold leading-tight">{domain.name}</CardTitle>
                          <CardDescription className={`${color.text} text-xs`}>
                            - {domain.currentLevel}
                          </CardDescription>
                        </CardHeader>
                        
                        {/* Hover Tooltip */}
                        {hoveredDomain === index + 10 && (
                          <div className="absolute z-50 top-full left-1/2 transform -translate-x-1/2 mt-3 p-4 bg-white border rounded-lg shadow-xl w-64 animate-fade-in">
                            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white border-l border-t rotate-45"></div>
                            <p className="text-sm text-gray-700">
                              {domain.description}
                            </p>
                          </div>
                        )}
                      </Card>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle className="flex items-center space-x-2">
                          <div className={`w-3 h-3 ${color.bg.includes('red') ? 'bg-red-500' : color.bg.includes('emerald') ? 'bg-emerald-500' : 'bg-blue-500'} rounded-full`}></div>
                          <span>{domain.name}</span>
                        </DialogTitle>
                        <DialogDescription>
                          {domain.description}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="space-y-2">
                          <h4 className="font-semibold text-red-600">Current State</h4>
                          <p className="text-sm text-muted-foreground">{domain.currentDescription}</p>
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-semibold text-green-600">Working Toward</h4>
                          <p className="text-sm text-muted-foreground">{domain.nextDescription}</p>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                );
              })}
            </div>

            {/* Foundation - Proof it Works */}
            <div className="w-full max-w-md relative z-10 overflow-visible">
              {MATURITY_DOMAINS.filter(d => d.position === "bottom").map((domain, index) => (
                <Dialog key={index}>
                  <DialogTrigger asChild>
                    <Card 
                      className="relative transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer group w-full bg-gradient-to-r from-red-500 to-red-600 text-white border-0 rounded-lg"
                      onMouseEnter={() => setHoveredDomain(index + 20)}
                      onMouseLeave={() => setHoveredDomain(null)}
                    >
                      <CardHeader className="text-center pb-3">
                        <CardTitle className="text-lg font-bold">{domain.name}</CardTitle>
                        <CardDescription className="text-red-100 text-sm">
                          - {domain.currentLevel}
                        </CardDescription>
                      </CardHeader>
                      
                      {/* Hover Tooltip */}
                      {hoveredDomain === index + 20 && (
                        <div className="absolute z-50 top-full left-1/2 transform -translate-x-1/2 mt-3 p-4 bg-white border rounded-lg shadow-xl w-64 animate-fade-in">
                          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white border-l border-t rotate-45"></div>
                          <p className="text-sm text-gray-700">
                            {domain.description}
                          </p>
                        </div>
                      )}
                    </Card>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span>{domain.name}</span>
                      </DialogTitle>
                      <DialogDescription>
                        {domain.description}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div className="space-y-2">
                        <h4 className="font-semibold text-red-600">Current State</h4>
                        <p className="text-sm text-muted-foreground">{domain.currentDescription}</p>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-semibold text-green-600">Working Toward</h4>
                        <p className="text-sm text-muted-foreground">{domain.nextDescription}</p>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              ))}
            </div>

          </div>

          {/* Maturity Level Bar */}
          <div className="flex justify-center mb-8 relative z-20 overflow-visible">
            <div className="flex space-x-4 relative overflow-visible">
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
                    <div className="absolute z-50 top-full left-1/2 transform -translate-x-1/2 mt-2 p-3 bg-white border rounded-lg shadow-xl w-48">
                      <p className="text-xs text-gray-700 text-center">
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

          {/* Current State / Working Toward - Centered Under Foundation */}
          <div className="flex justify-center">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 max-w-2xl w-full">
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

      {/* Elements of Security */}
      <section className="container mx-auto px-4 py-16 bg-gradient-to-br from-white to-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-slate-800">
              Elements of Security
            </h2>
            <p className="text-lg text-muted-foreground">
              Seven fundamental elements that create a comprehensive security framework
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {SECURITY_ELEMENTS.map((element, index) => (
              <Dialog key={index}>
                <DialogTrigger asChild>
                  <Card 
                    className="relative transition-all duration-300 hover:shadow-xl hover:scale-105 cursor-pointer group border-2 bg-white"
                    onMouseEnter={() => setHoveredElement(index)}
                    onMouseLeave={() => setHoveredElement(null)}
                  >
                    <CardHeader className="text-center pb-4">
                      <div className={`mx-auto mb-4 w-16 h-16 bg-gradient-to-r ${element.color} rounded-full flex items-center justify-center shadow-lg`}>
                        <element.icon className="h-8 w-8 text-white" />
                      </div>
                      <CardTitle className="text-sm font-semibold group-hover:scale-105 transition-transform leading-tight">
                        {element.title}
                      </CardTitle>
                    </CardHeader>
                    
                    {hoveredElement === index && (
                      <CardContent className="pt-0">
                        <CardDescription className="text-xs leading-relaxed">
                          {element.insight}
                        </CardDescription>
                      </CardContent>
                    )}
                  </Card>
                </DialogTrigger>
                
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <div className={`mx-auto mb-4 w-16 h-16 bg-gradient-to-r ${element.color} rounded-full flex items-center justify-center shadow-lg`}>
                      <element.icon className="h-8 w-8 text-white" />
                    </div>
                    <DialogTitle className="text-center">{element.title}</DialogTitle>
                    <DialogDescription className="text-center text-sm font-medium text-primary">
                      {element.insight}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="mt-4">
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {element.description}
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
            ))}
          </div>
        </div>
      </section>

      {/* Process Efficiencies */}
      <section className="container mx-auto px-4 py-16 bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-slate-800">
              Process Efficiencies
            </h2>
            <p className="text-lg text-muted-foreground">
              Secure processes are efficient processes
            </p>
          </div>
          
          <div className="flex justify-center">
            {PROCESS_EFFICIENCIES.map((item, index) => (
              <Dialog key={index}>
                <DialogTrigger asChild>
                  <Card className="relative transition-all duration-300 hover:shadow-xl hover:scale-105 cursor-pointer group border-2 bg-white max-w-md">
                    <CardHeader className="text-center pb-4">
                      <div className={`mx-auto mb-4 w-16 h-16 bg-gradient-to-r ${item.color} rounded-full flex items-center justify-center shadow-lg`}>
                        <item.icon className="h-8 w-8 text-white" />
                      </div>
                      <CardTitle className="text-lg font-semibold group-hover:scale-105 transition-transform leading-tight">
                        {item.title}
                      </CardTitle>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      <CardDescription className="text-sm leading-relaxed text-center">
                        {item.insight}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </DialogTrigger>
                
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <div className={`mx-auto mb-4 w-16 h-16 bg-gradient-to-r ${item.color} rounded-full flex items-center justify-center shadow-lg`}>
                      <item.icon className="h-8 w-8 text-white" />
                    </div>
                    <DialogTitle className="text-center">{item.title}</DialogTitle>
                    <DialogDescription className="text-center text-sm font-medium text-primary">
                      {item.insight}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="mt-4">
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
            ))}
          </div>
        </div>
      </section>

      {/* Internalising Security */}
      <section className="container mx-auto px-4 py-16 bg-gradient-to-br from-violet-50 to-purple-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-slate-800">
              Internalising Security
            </h2>
            <p className="text-lg text-muted-foreground">
              Building a security mindset as cultural norm, not imposed procedure
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {INTERNALIZATION_AREAS.map((area, index) => (
              <Dialog key={index}>
                <DialogTrigger asChild>
                  <Card className="relative transition-all duration-300 hover:shadow-xl hover:scale-105 cursor-pointer group border-2 bg-white">
                    <CardHeader className="text-center pb-4">
                      <div className={`mx-auto mb-4 w-16 h-16 bg-gradient-to-r ${area.color} rounded-full flex items-center justify-center shadow-lg`}>
                        <area.icon className="h-8 w-8 text-white" />
                      </div>
                      <CardTitle className="text-sm font-semibold group-hover:scale-105 transition-transform leading-tight">
                        {area.title}
                      </CardTitle>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      <CardDescription className="text-xs leading-relaxed text-center">
                        {area.insight}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </DialogTrigger>
                
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <div className={`mx-auto mb-4 w-16 h-16 bg-gradient-to-r ${area.color} rounded-full flex items-center justify-center shadow-lg`}>
                      <area.icon className="h-8 w-8 text-white" />
                    </div>
                    <DialogTitle className="text-center">{area.title}</DialogTitle>
                    <DialogDescription className="text-center text-sm font-medium text-primary">
                      {area.insight}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="mt-4">
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {area.description}
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