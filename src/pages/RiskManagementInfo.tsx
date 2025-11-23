import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, ArrowRight, Shield, Target, BarChart } from 'lucide-react';

/**
 * Risk Management Framework - Marketing/Information Page
 * Pre-subscription page explaining the Risk Management module
 */
const RiskManagementInfo = () => {
  const navigate = useNavigate();

  const features = [
    "Comprehensive risk identification and assessment",
    "Automated risk scoring and prioritization",
    "Real-time risk monitoring and alerts",
    "Integration with compliance frameworks (ISO 27001, NIST)",
    "Custom risk registers and mitigation plans",
    "Executive dashboards and reporting"
  ];

  const benefits = [
    {
      icon: Shield,
      title: "Proactive Protection",
      description: "Identify and mitigate risks before they become incidents"
    },
    {
      icon: Target,
      title: "Strategic Focus",
      description: "Prioritize resources on the most critical risks"
    },
    {
      icon: BarChart,
      title: "Data-Driven Decisions",
      description: "Make informed decisions with comprehensive risk analytics"
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="text-center mb-12">
        <Badge className="mb-4" variant="secondary">
          Coming Soon
        </Badge>
        <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-100 dark:bg-orange-900/20 rounded-full mb-6">
          <AlertTriangle className="h-10 w-10 text-orange-600 dark:text-orange-400" />
        </div>
        <h1 className="text-4xl font-bold mb-4">Risk Management Framework</h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Comprehensive risk identification, assessment, and mitigation strategies to protect your organization
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 gap-6 mb-12">
        <Card>
          <CardHeader>
            <CardTitle>Key Features</CardTitle>
            <CardDescription>
              Enterprise-grade risk management capabilities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Why Risk Management?</CardTitle>
            <CardDescription>
              Transform how you manage organizational risks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <benefit.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* How It Works */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
          <CardDescription>
            A systematic approach to organizational risk management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: 1, title: "Identify", desc: "Discover and catalog organizational risks" },
              { step: 2, title: "Assess", desc: "Evaluate likelihood and impact of each risk" },
              { step: 3, title: "Mitigate", desc: "Develop and implement mitigation strategies" },
              { step: 4, title: "Monitor", desc: "Track risk status and effectiveness" }
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto mb-3">
                  {item.step}
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <Card className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-orange-200 dark:border-orange-800">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold mb-2">Ready to Get Started?</h3>
              <p className="text-muted-foreground">
                Subscribe to unlock the Risk Management Framework and take control of your organizational risks
              </p>
            </div>
            <Button 
              size="lg" 
              className="flex-shrink-0"
              onClick={() => navigate('/subscribe')}
            >
              Subscribe Now
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RiskManagementInfo;
