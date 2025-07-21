
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface CheckoutFormProps {
  totalAmount: number;
  isYearly: boolean;
  selectedModules: string[];
  isBundle: boolean;
}

export const CheckoutForm = ({ 
  totalAmount, 
  isYearly, 
  selectedModules, 
  isBundle 
}: CheckoutFormProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: user?.email || '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    name: '',
    acceptTerms: false
  });

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.acceptTerms) {
      toast({
        title: "Terms Required",
        description: "Please accept the Terms & Conditions to continue.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Call Stripe checkout edge function
      const { data, error } = await supabase.functions.invoke('create-subscription-checkout', {
        body: {
          amount: totalAmount,
          isYearly,
          selectedModules: isBundle ? 'bundle' : selectedModules,
          customerEmail: formData.email,
          customerName: formData.name
        }
      });

      if (error) throw error;

      if (data?.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to process payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          placeholder="Enter your email"
          required
          disabled={!!user?.email}
        />
        <p className="text-xs text-muted-foreground">
          Receipt will be sent to this email address
        </p>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          placeholder="Enter your full name"
          required
        />
      </div>

      {/* Card Number */}
      <div className="space-y-2">
        <Label htmlFor="cardNumber">Card Number</Label>
        <Input
          id="cardNumber"
          type="text"
          value={formData.cardNumber}
          onChange={(e) => handleInputChange('cardNumber', e.target.value)}
          placeholder="1234 5678 9012 3456"
          maxLength={19}
          required
        />
      </div>

      {/* Expiry and CVV */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="expiryDate">Expiry Date</Label>
          <Input
            id="expiryDate"
            type="text"
            value={formData.expiryDate}
            onChange={(e) => handleInputChange('expiryDate', e.target.value)}
            placeholder="MM/YY"
            maxLength={5}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cvv">CVV</Label>
          <Input
            id="cvv"
            type="text"
            value={formData.cvv}
            onChange={(e) => handleInputChange('cvv', e.target.value)}
            placeholder="123"
            maxLength={4}
            required
          />
        </div>
      </div>

      {/* Terms Checkbox */}
      <div className="flex items-start space-x-2">
        <Checkbox
          id="terms"
          checked={formData.acceptTerms}
          onCheckedChange={(checked) => handleInputChange('acceptTerms', checked)}
          required
        />
        <Label htmlFor="terms" className="text-sm leading-normal">
          I agree to the{' '}
          <a href="#" className="text-primary hover:underline">
            Terms & Conditions
          </a>{' '}
          and{' '}
          <a href="#" className="text-primary hover:underline">
            Privacy Policy
          </a>
        </Label>
      </div>

      {/* Submit Button */}
      <Button 
        type="submit" 
        className="w-full" 
        size="lg"
        disabled={loading || !formData.acceptTerms}
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            Processing...
          </div>
        ) : (
          `Complete Payment - $${totalAmount.toLocaleString()}`
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        Your payment is secured by 256-bit SSL encryption
      </p>
    </form>
  );
};
