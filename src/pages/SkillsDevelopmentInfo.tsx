import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, CheckCircle2, ArrowRight, Shield, Target, BarChart } from 'lucide-react';

/**
 * Skills Development Portal - Marketing/Information Page
 * Pre-subscription page explaining the Skills Development module
 */
const SkillsDevelopmentInfo = () => {
  const navigate = useNavigate();

  const features = [
    "Structured learning pathways for security professionals",
    "Industry-recognized certifications and qualifications",
    "Hands-on practical exercises and simulations",
    "Progress tracking and competency assessments",
    "Expert-led training content",
    "Global standards alignment (ASIS, ISO, NIST)"
  ];

  const benefits = [
    {
      icon: Shield,
      title: "Professional Excellence",
      description: "Develop world-class security professionals"
    },
    {
      icon: Target,
      title: "Career Advancement",
      description: "Clear pathways for professional growth and development"
    },
    {
      icon: BarChart,
      title: "Organizational Capability",
      description: "Build a skilled, certified security workforce"
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="text-center mb-12">
        <Badge className="mb-4" variant="secondary">
          Coming Soon
        </Badge>
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full mb-6">
          <GraduationCap className="h-10 w-10 text-green-600 dark:text-green-400" />
        </div>
        <h1 className="text-4xl font-bold mb-4">Skills Development Portal</h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          A globally recognized development track designed to upskill the next generation of security professionals
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 gap-6 mb-12">
        <Card>
          <CardHeader>
            <CardTitle>Key Features</CardTitle>
            <CardDescription>
              Comprehensive professional development capabilities
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
            <CardTitle>Why Skills Development?</CardTitle>
            <CardDescription>
              Invest in your most valuable asset - your people
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
            Structured learning pathways for professional growth
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: 1, title: "Assess", desc: "Evaluate current skills and competencies" },
              { step: 2, title: "Learn", desc: "Access structured training content" },
              { step: 3, title: "Practice", desc: "Apply knowledge in practical exercises" },
              { step: 4, title: "Certify", desc: "Earn industry-recognized certifications" }
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
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold mb-2">Ready to Get Started?</h3>
              <p className="text-muted-foreground">
                Subscribe to unlock the Skills Development Portal and build a world-class security team
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

export default SkillsDevelopmentInfo;
