import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Diamond } from "lucide-react";

interface DeBeersBrandingDemoProps {
  orgId: string;
}

export function DeBeersBrandingDemo({ orgId }: DeBeersBrandingDemoProps) {
  const [seeding, setSeeding] = useState(false);
  const { toast } = useToast();

  const seedDeBeersBranding = async () => {
    try {
      setSeeding(true);
      
      // Update organization with De Beers theme colors
      const { error: dbErr } = await supabase
        .from("organizations")
        .update({
          brand_primary_hex: "#000000",      // Black
          brand_secondary_hex: "#f8f9fa",    // Light gray
          brand_text_hex: "#ffffff",         // White
          brand_header_mode: "dark",         // Dark header
          name: "De Beers Group"             // Update org name if needed
        })
        .eq("id", orgId);
      
      if (dbErr) throw dbErr;
      
      toast({
        title: "De Beers Branding Applied",
        description: "Organization themed with De Beers brand colors. Upload logo files to complete the branding.",
      });
      
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message ?? "Failed to apply De Beers branding",
        variant: "destructive",
      });
    } finally {
      setSeeding(false);
    }
  };

  return (
    <Card className="border-2 border-dashed border-gray-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Diamond className="h-5 w-5" />
          De Beers Demo Setup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Apply De Beers brand theme to demonstrate the enterprise branding system.
          This will set the organization colors and theme, ready for logo uploads.
        </p>
        
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Demo Theme Settings:</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Primary: #000000 (Black)</li>
            <li>• Secondary: #f8f9fa (Light Gray)</li>
            <li>• Text: #ffffff (White)</li>
            <li>• Header Mode: Dark</li>
          </ul>
        </div>
        
        <Button 
          onClick={seedDeBeersBranding}
          disabled={seeding}
          className="w-full bg-black hover:bg-gray-800 text-white"
        >
          {seeding ? "Applying Theme..." : "Apply De Beers Theme"}
        </Button>
        
        <p className="text-xs text-muted-foreground">
          After applying the theme, upload your De Beers logo files above to complete the branding setup.
        </p>
      </CardContent>
    </Card>
  );
}