import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LineChart, CheckCircle2, ArrowRight, Shield, Target, BarChart } from 'lucide-react';

/**
 * Data Analytics and Assurance - Marketing/Information Page
 * Pre-subscription page explaining the Data Analytics module
 */
const DataAnalyticsInfo = () => {
  const navigate = useNavigate();

  const features = [
    "Real-time operational dashboards",
    "Predictive analytics and trend analysis",
    "Automated anomaly detection",
    "Custom reporting and visualizations",
    "Integration with existing data sources",
    "AI-powered insights and recommendations"
  ];

  const benefits = [
    {
      icon: Shield,
      title: "Data-Driven Assurance",
      description: "Make confident decisions backed by comprehensive data analysis"
    },
    {
      icon: Target,
      title: "Proactive Insights",
      description: "Identify trends and issues before they become problems"
    },
    {
      icon: BarChart,
      title: "Executive Visibility",
      description: "Clear visibility into organizational performance"
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="text-center mb-12">
        <Badge className="mb-4" variant="secondary">
          Coming Soon
        </Badge>
        <div className="inline-flex items-center justify-center w-20 h-20 bg-purple-100 dark:bg-purple-900/20 rounded-full mb-6">
          <LineChart className="h-10 w-10 text-purple-600 dark:text-purple-400" />
        </div>
        <h1 className="text-4xl font-bold mb-4">Data Analytics and Assurance</h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Transform operational data into actionable insights with AI-powered analytics and assurance
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 gap-6 mb-12">
        <Card>
          <CardHeader>
            <CardTitle>Key Features</CardTitle>
            <CardDescription>
              Enterprise-grade analytics and assurance capabilities
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
            <CardTitle>Why Data Analytics?</CardTitle>
            <CardDescription>
              Unlock the power of your operational data
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
            From data collection to actionable insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: 1, title: "Connect", desc: "Integrate with your data sources" },
              { step: 2, title: "Analyze", desc: "AI-powered analysis and pattern detection" },
              { step: 3, title: "Visualize", desc: "Interactive dashboards and reports" },
              { step: 4, title: "Act", desc: "Data-driven decision making" }
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
      <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-purple-200 dark:border-purple-800">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold mb-2">Ready to Get Started?</h3>
              <p className="text-muted-foreground">
                Subscribe to unlock Data Analytics and Assurance for data-driven operational excellence
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

export default DataAnalyticsInfo;
