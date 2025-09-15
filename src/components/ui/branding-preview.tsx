import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useOrganizationContext } from '@/hooks/useOrganizationContext';

interface BrandingPreviewProps {
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  companyName: string;
}

export const BrandingPreview: React.FC<BrandingPreviewProps> = ({
  primaryColor,
  secondaryColor,
  textColor,
  companyName
}) => {
  const { toast } = useToast();
  const { currentContext } = useOrganizationContext();
  
  const handlePrimaryClick = () => {
    toast({
      title: "Primary Action",
      description: "This demonstrates your primary button interaction",
    });
    
    // Telemetry
    console.log('[TELEMETRY] branding_preview_primary_clicked', {
      orgId: currentContext?.organization_id,
      sessionId: crypto.randomUUID(),
      timestamp: new Date().toISOString()
    });
  };
  
  const handleSecondaryClick = () => {
    toast({
      title: "Secondary Action", 
      description: "This demonstrates your secondary button interaction",
    });
    
    // Telemetry
    console.log('[TELEMETRY] branding_preview_secondary_clicked', {
      orgId: currentContext?.organization_id,
      sessionId: crypto.randomUUID(),
      timestamp: new Date().toISOString()
    });
  };
  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="text-sm">Live Preview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Header preview */}
        <div 
          className="p-4 rounded-lg"
          style={{ backgroundColor: primaryColor, color: textColor }}
        >
          <h3 className="font-bold text-lg">{companyName || 'Your Company'}</h3>
          <p className="text-sm opacity-90">Dashboard Header</p>
        </div>

        {/* Button preview */}
        <div className="flex gap-3">
          <Button 
            data-testid="branding-preview-primary"
            aria-label="Primary Button preview"
            size="sm"
            onClick={handlePrimaryClick}
            style={{ 
              backgroundColor: primaryColor, 
              color: textColor,
              borderColor: primaryColor 
            }}
          >
            Primary Button
          </Button>
          <Button 
            data-testid="branding-preview-secondary"
            aria-label="Secondary Button preview"
            variant="outline"
            size="sm"
            onClick={handleSecondaryClick}
            style={{ 
              borderColor: secondaryColor,
              color: secondaryColor 
            }}
          >
            Secondary Button
          </Button>
        </div>

        {/* Badge preview */}
        <div className="flex gap-2">
          <Badge style={{ backgroundColor: primaryColor, color: textColor }}>
            Status Badge
          </Badge>
          <Badge 
            variant="outline"
            style={{ borderColor: secondaryColor, color: secondaryColor }}
          >
            Info Badge
          </Badge>
        </div>

        {/* Text preview */}
        <div className="space-y-2">
          <h4 style={{ color: primaryColor }} className="font-semibold">
            Section Header
          </h4>
          <p className="text-sm text-muted-foreground">
            Body text remains neutral for readability
          </p>
          <p style={{ color: secondaryColor }} className="text-sm">
            Accent text using secondary color
          </p>
        </div>
      </CardContent>
    </Card>
  );
};