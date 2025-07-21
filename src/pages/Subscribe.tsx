import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ArrowRight, Star, Shield, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AssessmentResult {
  overallLevel: string;
  highestDomain: string;
  lowestDomain: string;
  completedAt: string;
}

const Subscribe = () => {
  const navigate = useNavigate();
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);

  useEffect(() => {
    // Check if user has completed assessment and get results
    const hasCompleted = localStorage.getItem('maturion_assessment_completed');
    const results = localStorage.getItem('maturion_assessment_results');
    
    if (hasCompleted && results) {
      try {
        const parsedResults = JSON.parse(results);
        setAssessmentResult(parsedResults);
      } catch (error) {
        console.error('Error parsing assessment results:', error);
      }
    }
  }, []);

  const plans = [
    {
      name: "Essential",
      price: "$29",
      period: "/month",
      description: "Perfect for small teams getting started",
      features: [
        "Complete maturity assessment",
        "Basic journey tracking",
        "Standard reporting",
        "Email support"
      ],
      popular: false
    },
    {
      name: "Professional",
      price: "$89",
      period: "/month",
      description: "Ideal for growing organizations",
      features: [
        "Everything in Essential",
        "Advanced analytics",
        "Custom domain milestones", 
        "AI-powered insights",
        "Priority support",
        "Team collaboration"
      ],
      popular: true
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      description: "For large organizations with complex needs",
      features: [
        "Everything in Professional",
        "Dedicated account manager",
        "Custom integrations",
        "Advanced security",
        "On-premise deployment",
        "24/7 phone support"
      ],
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container max-w-6xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="mb-6"
          >
            ← Back
          </Button>
          
          <h1 className="text-4xl font-bold mb-4">
            Transform Your Organization's Maturity
          </h1>
          <p className="text-xl text-muted-foreground mb-6">
            Choose the plan that fits your organization's journey to operational excellence
          </p>

          {/* Assessment Results Badge */}
          {assessmentResult && (
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-8">
              <Star className="h-4 w-4" />
              <span className="text-sm font-medium">
                Based on your Free Assessment Results
              </span>
            </div>
          )}
        </div>

        {/* Assessment Summary */}
        {assessmentResult && (
          <Card className="mb-12 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Your Assessment Summary
              </CardTitle>
              <CardDescription>
                Here's what we discovered about your organization's maturity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary mb-1">
                    {assessmentResult.overallLevel}
                  </div>
                  <div className="text-sm text-muted-foreground">Overall Level</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-green-600 mb-1">
                    {assessmentResult.highestDomain}
                  </div>
                  <div className="text-sm text-muted-foreground">Strongest Domain</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-orange-600 mb-1">
                    {assessmentResult.lowestDomain}
                  </div>
                  <div className="text-sm text-muted-foreground">Growth Opportunity</div>
                </div>
              </div>
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-center">
                  <strong>Subscribe now</strong> to unlock detailed action plans and tailored maturity upgrades 
                  specifically designed for your organization's current level.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pricing Plans */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan, index) => (
            <Card 
              key={plan.name} 
              className={`relative ${plan.popular ? 'border-primary shadow-lg scale-105' : ''}`}
            >
              {plan.popular && (
                <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary">
                  Most Popular
                </Badge>
              )}
              
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
              </CardHeader>

              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button 
                  className="w-full" 
                  variant={plan.popular ? "default" : "outline"}
                  size="lg"
                >
                  {plan.price === "Custom" ? "Contact Sales" : "Start Free Trial"}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Benefits Section */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <Card>
            <CardHeader>
              <Shield className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Proven Framework</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Built on industry-standard maturity models with real-world validation 
                across hundreds of organizations.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <TrendingUp className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Measurable Results</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Track your progress with clear metrics and milestones that demonstrate 
                ROI to stakeholders.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Star className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Expert Guidance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Access to maturity experts and AI-powered recommendations tailored 
                to your organization's specific context.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            Ready to start your maturity journey? All plans include a 14-day free trial.
          </p>
          <Button 
            size="lg"
            onClick={() => navigate('/journey')}
            variant="outline"
          >
            Explore the Journey Map First
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Subscribe;