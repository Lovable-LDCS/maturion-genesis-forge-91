
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, ArrowLeft, Shield, CreditCard, Building2 } from "lucide-react";
import { useSubscriptionModules } from "@/hooks/useSubscriptionModules";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { EFTPaymentSection } from "@/components/checkout/EFTPaymentSection";

const SubscribeCheckout = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { modules, loading } = useSubscriptionModules();
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'eft'>('card');
  const [isYearly, setIsYearly] = useState(false);

  // Parse selected modules from URL params
  const selectedModules = searchParams.get('modules')?.split(',') || [];
  const isBundle = searchParams.get('bundle') === 'true';
  const yearlyParam = searchParams.get('yearly') === 'true';

  useEffect(() => {
    setIsYearly(yearlyParam);
  }, [yearlyParam]);

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
    const bundleMonthly = 1000;
    const bundleYearly = 10800;
    return isYearly ? bundleYearly : bundleMonthly;
  };

  // Get selected modules data
  const selectedModuleData = modules.filter(module => 
    selectedModules.includes(module.id) || isBundle
  );

  const totalPrice = isBundle 
    ? calculateBundlePrice()
    : selectedModuleData.reduce((sum, module) => 
        sum + calculatePrice(module.monthly_price, module.yearly_discount_percentage), 0
      );

  const yearlyDiscount = isYearly ? 10 : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (!isBundle && selectedModules.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Modules Selected</CardTitle>
            <CardDescription>
              Please select modules before proceeding to checkout.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/subscribe')} className="w-full">
              Return to Module Selection
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container max-w-6xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/subscribe')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Module Selection
          </Button>
          
          <h1 className="text-3xl font-bold mb-2">Complete Your Subscription</h1>
          <p className="text-muted-foreground">
            Secure checkout for your ISMS platform access
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Order Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Subscription Summary</CardTitle>
                <CardDescription>
                  Review your selected modules and pricing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isBundle ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">Full ISMS Access Bundle</h3>
                        <p className="text-sm text-muted-foreground">
                          All modules included
                        </p>
                      </div>
                      <Badge variant="secondary">Best Value</Badge>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      {modules.map((module) => (
                        <div key={module.id} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>{module.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedModuleData.map((module) => (
                      <div key={module.id} className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">{module.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            ${calculatePrice(module.monthly_price, module.yearly_discount_percentage).toLocaleString()}
                            /{isYearly ? 'year' : 'month'}
                          </p>
                        </div>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </div>
                    ))}
                  </div>
                )}

                <Separator />

                {/* Pricing Breakdown */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Billing Period:</span>
                    <span className="font-medium">
                      {isYearly ? 'Yearly' : 'Monthly'}
                    </span>
                  </div>
                  {isYearly && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Yearly Discount ({yearlyDiscount}%):</span>
                      <span>Applied</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span>Total:</span>
                    <span>${totalPrice.toLocaleString()}/{isYearly ? 'year' : 'month'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security Notice */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-primary mb-1">Secure Payment Processing</p>
                    <p className="text-muted-foreground">
                      Payments are secure and processed through Stripe. Your data is protected 
                      under our ISO/IEC 27001-compliant platform.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Payment Method */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
                <CardDescription>
                  Choose your preferred payment option
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Payment Method Selection */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="card"
                      name="payment-method"
                      value="card"
                      checked={paymentMethod === 'card'}
                      onChange={(e) => setPaymentMethod(e.target.value as 'card')}
                      className="w-4 h-4 text-primary"
                    />
                    <label htmlFor="card" className="flex items-center gap-2 text-sm font-medium">
                      <CreditCard className="h-4 w-4" />
                      Credit/Debit Card
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="eft"
                      name="payment-method"
                      value="eft"
                      checked={paymentMethod === 'eft'}
                      onChange={(e) => setPaymentMethod(e.target.value as 'eft')}
                      className="w-4 h-4 text-primary"
                    />
                    <label htmlFor="eft" className="flex items-center gap-2 text-sm font-medium">
                      <Building2 className="h-4 w-4" />
                      Bank Transfer (EFT)
                    </label>
                  </div>
                </div>

                <Separator />

                {/* Payment Forms */}
                {paymentMethod === 'card' ? (
                  <CheckoutForm 
                    totalAmount={totalPrice}
                    isYearly={isYearly}
                    selectedModules={selectedModules}
                    isBundle={isBundle}
                  />
                ) : (
                  <EFTPaymentSection
                    totalAmount={totalPrice}
                    isYearly={isYearly}
                    selectedModules={selectedModules}
                    isBundle={isBundle}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscribeCheckout;
