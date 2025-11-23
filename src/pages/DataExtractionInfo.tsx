import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Database, CheckCircle2, ArrowRight, Shield, Target, BarChart } from 'lucide-react';

/**
 * Systems Data Extraction Tool - Marketing/Information Page
 * Pre-subscription page explaining the Data Extraction module
 */
const DataExtractionInfo = () => {
  const navigate = useNavigate();

  const features = [
    "Connect to multiple data sources and systems",
    "Automated data extraction and transformation",
    "Real-time data synchronization",
    "Custom extraction rules and filters",
    "Secure data handling and encryption",
    "Integration with analytics and reporting tools"
  ];

  const benefits = [
    {
      icon: Shield,
      title: "Data Accessibility",
      description: "Access data from any system, anytime"
    },
    {
      icon: Target,
      title: "Operational Efficiency",
      description: "Automate manual data extraction tasks"
    },
    {
      icon: BarChart,
      title: "Unified View",
      description: "Consolidate data from disparate systems"
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="text-center mb-12">
        <Badge className="mb-4" variant="secondary">
          Coming Soon
        </Badge>
        <div className="inline-flex items-center justify-center w-20 h-20 bg-cyan-100 dark:bg-cyan-900/20 rounded-full mb-6">
          <Database className="h-10 w-10 text-cyan-600 dark:text-cyan-400" />
        </div>
        <h1 className="text-4xl font-bold mb-4">Systems Data Extraction Tool</h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Seamlessly extract, transform, and integrate data from your operational systems
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 gap-6 mb-12">
        <Card>
          <CardHeader>
            <CardTitle>Key Features</CardTitle>
            <CardDescription>
              Powerful data extraction and integration capabilities
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
            <CardTitle>Why Data Extraction?</CardTitle>
            <CardDescription>
              Break down data silos and unlock insights
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
            From connection to integration in four simple steps
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: 1, title: "Connect", desc: "Link to your data sources" },
              { step: 2, title: "Extract", desc: "Pull data using custom rules" },
              { step: 3, title: "Transform", desc: "Cleanse and format data" },
              { step: 4, title: "Integrate", desc: "Load into target systems" }
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
      <Card className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 border-cyan-200 dark:border-cyan-800">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold mb-2">Ready to Get Started?</h3>
              <p className="text-muted-foreground">
                Subscribe to unlock the Systems Data Extraction Tool and unify your operational data
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

export default DataExtractionInfo;
