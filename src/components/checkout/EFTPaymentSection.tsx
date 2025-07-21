
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface EFTPaymentSectionProps {
  totalAmount: number;
  isYearly: boolean;
  selectedModules: string[];
  isBundle: boolean;
}

export const EFTPaymentSection = ({ 
  totalAmount, 
  isYearly, 
  selectedModules, 
  isBundle 
}: EFTPaymentSectionProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Generate reference code
  const referenceCode = `MATURION-${user?.id?.substring(0, 8).toUpperCase()}-${Date.now().toString().slice(-6)}`;

  const bankDetails = {
    bankName: "APGI Corporate Bank",
    accountName: "Maturion ISMS Platform",
    accountNumber: "123-456-789",
    routingNumber: "987654321",
    swiftCode: "APGICA23",
    reference: referenceCode
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      toast({
        title: "Copied",
        description: `${label} copied to clipboard`,
      });
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Please copy the details manually",
        variant: "destructive",
      });
    }
  };

  const handleMarkAsPaid = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to continue",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.functions.invoke('create-eft-payment-request', {
        body: {
          amount: totalAmount,
          isYearly,
          selectedModules: isBundle ? 'bundle' : selectedModules,
          referenceCode,
          userId: user.id,
          userEmail: user.email
        }
      });

      if (error) throw error;

      toast({
        title: "Payment Request Submitted",
        description: "We'll activate your subscription once your transfer is confirmed by our team.",
      });

      // Redirect to confirmation page
      window.location.href = '/subscribe/eft-pending';
    } catch (error: any) {
      console.error('EFT request error:', error);
      toast({
        title: "Request Failed",
        description: error.message || "Failed to submit payment request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Building2 className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <h3 className="font-medium text-orange-800 mb-2">Bank Transfer Instructions</h3>
              <p className="text-orange-700 mb-2">
                Transfer the exact amount using the bank details below. Include the reference 
                code to ensure quick processing.
              </p>
              <Badge variant="outline" className="text-orange-700 border-orange-300">
                Processing Time: 1-2 business days
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bank Details */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="font-semibold text-lg mb-4">Bank Transfer Details</h3>
          
          {Object.entries(bankDetails).map(([key, value]) => {
            const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
            return (
              <div key={key} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{label}</p>
                  <p className="font-mono text-sm">{value}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(value, label)}
                  className="ml-2"
                >
                  {copied === label ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            );
          })}

          {/* Amount to Transfer */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div>
                <p className="text-sm font-medium text-primary">Amount to Transfer</p>
                <p className="text-2xl font-bold text-primary">
                  ${totalAmount.toLocaleString()} USD
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(totalAmount.toString(), 'Amount')}
              >
                {copied === 'Amount' ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Button */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="text-center space-y-3">
            <p className="text-sm text-green-700">
              After making the transfer, click the button below to notify our team.
            </p>
            <Button 
              onClick={handleMarkAsPaid}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Submitting...
                </div>
              ) : (
                "Mark as Paid & Notify Support"
              )}
            </Button>
            <p className="text-xs text-green-600">
              Access will be granted once your payment is confirmed by our team
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
