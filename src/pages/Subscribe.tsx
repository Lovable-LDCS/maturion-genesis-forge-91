import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { CheckCircle, ArrowRight, Star, Shield, TrendingUp, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSubscriptionModules } from "@/hooks/useSubscriptionModules";

interface AssessmentResult {
  overallLevel: string;
  highestDomain: string;
  lowestDomain: string;
  completedAt: string;
}

const Subscribe = () => {
  const navigate = useNavigate();
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);
  const [isYearly, setIsYearly] = useState(false);
  const { modules, loading } = useSubscriptionModules();

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

  // Calculate pricing
  const calculatePrice = (monthlyPrice: number, yearlyDiscount: number) => {
    if (isYearly) {
      const yearlyPrice = monthlyPrice * 12;
      const discountAmount = yearlyPrice * (yearlyDiscount / 100);
      return Math.round(yearlyPrice - discountAmount);
    }
    return monthlyPrice;
  };

  const calculateBundlePrice = () => {
    if (!modules.length) return 0;
    
    const totalMonthly = modules.reduce((sum, module) => sum + module.monthly_price, 0);
    const bundleDiscount = 10; // 10% bundle discount as mentioned in brief
    
    if (isYearly) {
      const yearlyTotal = totalMonthly * 12;
      const yearlyDiscount = yearlyTotal * 0.1; // 10% yearly discount
      const bundleDiscountAmount = (yearlyTotal - yearlyDiscount) * (bundleDiscount / 100);
      return Math.round(yearlyTotal - yearlyDiscount - bundleDiscountAmount);
    }
    
    const bundleDiscountAmount = totalMonthly * (bundleDiscount / 100);
    return Math.round(totalMonthly - bundleDiscountAmount);
  };

  const individualTotal = modules.reduce((sum, module) => 
    sum + calculatePrice(module.monthly_price, module.yearly_discount_percentage), 0
  );

  const bundlePrice = calculateBundlePrice();
  const savings = Math.round(((individualTotal - bundlePrice) / individualTotal) * 100);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading subscription options...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container max-w-7xl mx-auto py-8 px-4">
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
            Transform Your Security Maturity Journey
          </h1>
          <p className="text-xl text-muted-foreground mb-6">
            Subscribe to the modules that matter. Or get everything in one simple bundle.
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

          {/* Pricing Toggle */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <span className={`text-sm ${!isYearly ? 'font-semibold' : 'text-muted-foreground'}`}>
              Monthly
            </span>
            <Switch 
              checked={isYearly}
              onCheckedChange={setIsYearly}
              aria-label="Toggle yearly pricing"
            />
            <span className={`text-sm ${isYearly ? 'font-semibold' : 'text-muted-foreground'}`}>
              Yearly
              <Badge variant="secondary" className="ml-2">Save 10%</Badge>
            </span>
          </div>
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

        {/* Individual Modules */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-center mb-8">Individual Modules</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {modules.map((module) => {
              const price = calculatePrice(module.monthly_price, module.yearly_discount_percentage);
              return (
                <Card key={module.id} className="relative">
                  <CardHeader>
                    <CardTitle className="text-lg leading-tight">{module.name}</CardTitle>
                    <div className="mt-4">
                      <span className="text-3xl font-bold">${price.toLocaleString()}</span>
                      <span className="text-muted-foreground">/{isYearly ? 'year' : 'month'}</span>
                    </div>
                    {isYearly && (
                      <Badge variant="secondary" className="w-fit">
                        Save {module.yearly_discount_percentage}%
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Included in Bundle</span>
                    </div>
                    <Button className="w-full">
                      Subscribe
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Bundle Option */}
        <div className="mb-12">
          <Card className="border-primary shadow-lg">
            <CardHeader className="text-center">
              <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary">
                Best Value
              </Badge>
              <CardTitle className="text-2xl mt-4">Full ISMS Access</CardTitle>
              <CardDescription>Complete security maturity solution</CardDescription>
              <div className="mt-6">
                <span className="text-5xl font-bold">${bundlePrice.toLocaleString()}</span>
                <span className="text-muted-foreground">/{isYearly ? 'year' : 'month'}</span>
              </div>
              <div className="mt-2">
                <Badge variant="secondary">
                  Save {savings}% compared to individual subscriptions
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="text-center">
              <div className="mb-6">
                <h4 className="font-semibold mb-3">All Modules Included:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {modules.map((module) => (
                    <div key={module.id} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span>{module.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Button size="lg" className="w-full">
                Subscribe to Full Bundle
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Training Note */}
        <Card className="mb-12 bg-muted/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Training Modules Not Included
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Maturion includes smart tools and operational guidance. However, training modules are paid for separately through our partner platform.
            </p>
            <Button variant="outline" size="sm">
              Visit APGI Training Portal
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        {/* Transparency Section */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle>Transparent Pricing. No Hidden Fees.</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              All pricing is listed clearly. You only pay for the capabilities you choose to use. 
              Discounts and offers are openly shown.
            </p>
          </CardContent>
        </Card>

        {/* Footer Actions */}
        <div className="grid md:grid-cols-3 gap-6 text-center">
          <Button variant="outline" size="lg">
            Talk to Sales
          </Button>
          <Button variant="outline" size="lg">
            Book a Demo
          </Button>
          <Button 
            variant="outline" 
            size="lg"
            onClick={() => navigate('/journey')}
          >
            Explore Journey Map
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Subscribe;