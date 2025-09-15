import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { getContrastAnalysis } from "@/lib/colorUtils";

type FileSpec = {
  key: keyof FormDataMap; 
  label: string; 
  filename: string; 
  accept: string;
  description: string;
};

type FormDataMap = {
  logoLight?: File; 
  logoDark?: File;
  wordmarkBlack?: File; 
  wordmarkWhite?: File;
  favicon?: File;
};

const SPECS: FileSpec[] = [
  { 
    key: "logoLight", 
    label: "Logo (Light Background)", 
    filename: "logo-light.svg", 
    accept: ".svg",
    description: "Logo with dark text for light backgrounds"
  },
  { 
    key: "logoDark", 
    label: "Logo (Dark Background)", 
    filename: "logo-dark.svg", 
    accept: ".svg",
    description: "Logo with white/light text for dark backgrounds" 
  },
  { 
    key: "wordmarkBlack", 
    label: "Wordmark (Black)", 
    filename: "wordmark-black.svg", 
    accept: ".svg",
    description: "Text-only logo in black"
  },
  { 
    key: "wordmarkWhite", 
    label: "Wordmark (White)", 
    filename: "wordmark-white.svg", 
    accept: ".svg",
    description: "Text-only logo in white"
  },
  { 
    key: "favicon", 
    label: "Favicon", 
    filename: "favicon.png", 
    accept: ".png",
    description: "32x32 or 48x48 transparent PNG"
  },
];

async function uploadToBranding(orgId: string, filename: string, file: File, retryCount: number = 0): Promise<string> {
  const path = `org/${orgId}/branding/${filename}`;
  
  try {
    const { error } = await supabase.storage
      .from("org_branding")
      .upload(path, file, { 
        upsert: true,
        cacheControl: '3600' // 1 hour cache
      });
    
    if (error) throw error;
    
    // Log successful upload to audit trail
    await supabase.from('audit_trail').insert({
      organization_id: orgId,
      table_name: 'org_branding_storage',
      record_id: orgId,
      action: 'BRANDING_ASSET_UPLOADED',
      changed_by: '00000000-0000-0000-0000-000000000000', // System upload
      change_reason: `Uploaded ${filename} (${(file.size / 1024).toFixed(1)}KB)`,
      new_value: path,
      field_name: 'file_path'
    });
    
    return path;
  } catch (error: any) {
    // Retry on 429 or 5xx errors
    if ((error.status === 429 || error.status >= 500) && retryCount < 2) {
      const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
      return uploadToBranding(orgId, filename, file, retryCount + 1);
    }
    throw error;
  }
}

interface BrandingUploaderProps {
  orgId: string;
}

export function BrandingUploader({ orgId }: BrandingUploaderProps) {
  const [form, setForm] = useState<FormDataMap>({});
  const [busy, setBusy] = useState(false);
  const [colors, setColors] = useState({
    primary: "#000000",
    secondary: "#faf9f9", 
    text: "#ffffff",
    headerMode: "dark"
  });
  const [retryCount, setRetryCount] = useState(0);
  const { toast } = useToast();

  // Calculate contrast analysis
  const contrastAnalysis = getContrastAnalysis(colors.text, colors.primary);
  const isValidContrast = contrastAnalysis.passAA;

  const onFile = (key: keyof FormDataMap, f?: File) => 
    setForm(prev => ({ ...prev, [key]: f }));

  const save = async () => {
    // Check contrast before saving
    if (!isValidContrast) {
      toast({
        title: "Contrast Warning",
        description: `Text color fails WCAG contrast requirements (${contrastAnalysis.ratio}:1). Consider adjusting colors for better accessibility.`,
        variant: "destructive",
      });
      return;
    }

    try {
      setBusy(true);
      setRetryCount(0);
      const updates: Record<string, string | null> = {};

      // Upload any provided files and map to org columns
      for (const spec of SPECS) {
        const f = form[spec.key];
        if (f) {
          try {
            const storagePath = await uploadToBranding(orgId, spec.filename, f, retryCount);
            
            // Calculate file checksum for audit trail
            const fileBuffer = await f.arrayBuffer();
            const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
            const checksum = Array.from(new Uint8Array(hashBuffer))
              .map(b => b.toString(16).padStart(2, '0')).join('');
            
            // Map storage path to database column
            if (spec.key === "logoLight") updates.brand_logo_light_path = storagePath;
            if (spec.key === "logoDark") updates.brand_logo_dark_path = storagePath;
            if (spec.key === "wordmarkBlack") updates.brand_wordmark_black_path = storagePath;
            if (spec.key === "wordmarkWhite") updates.brand_wordmark_white_path = storagePath;
            if (spec.key === "favicon") updates.brand_favicon_path = storagePath;
            
            // Enhanced audit trail for each file upload
            const { data: currentUser } = await supabase.auth.getUser();
            await supabase.from('audit_trail').insert({
              organization_id: orgId,
              table_name: 'org_branding_storage',
              record_id: orgId,
              action: 'BRANDING_ASSET_UPLOADED',
              changed_by: currentUser?.user?.id || '00000000-0000-0000-0000-000000000000',
              change_reason: `Uploaded ${spec.label}: ${f.name} (${(f.size / 1024).toFixed(1)}KB, SHA256: ${checksum.slice(0, 16)}...)`,
              new_value: storagePath,
              field_name: spec.key,
              session_id: crypto.randomUUID()
            });

            // Telemetry event for asset upload
            console.log(`[TELEMETRY] branding_asset_uploaded: ${spec.key}`, {
              orgId,
              fileName: f.name,
              fileSize: f.size,
              fileType: spec.key,
              timestamp: new Date().toISOString()
            });
            
          } catch (uploadError: any) {
            if (uploadError.status === 429 || uploadError.status >= 500) {
              setRetryCount(prev => prev + 1);
              toast({
                title: "Upload Retry",
                description: `Retrying upload for ${spec.label}... (${retryCount + 1}/3)`,
              });
              throw uploadError;
            }
            throw uploadError;
          }
        }
      }

      // Set theme colors
      updates.brand_primary_hex = colors.primary;
      updates.brand_secondary_hex = colors.secondary;
      updates.brand_text_hex = colors.text;
      updates.brand_header_mode = colors.headerMode;

      const { error: dbErr } = await supabase
        .from("organizations")
        .update(updates)
        .eq("id", orgId);
      
      if (dbErr) throw dbErr;

      // Enhanced audit trail for theme changes
      const { data: currentUser } = await supabase.auth.getUser();
      const sessionId = crypto.randomUUID();
      
      // Log each theme property change individually
      const themeChanges = [
        { field: 'brand_primary_hex', value: colors.primary },
        { field: 'brand_secondary_hex', value: colors.secondary },
        { field: 'brand_text_hex', value: colors.text },
        { field: 'brand_header_mode', value: colors.headerMode }
      ];

      for (const change of themeChanges) {
        await supabase.from('audit_trail').insert({
          organization_id: orgId,
          table_name: 'organizations',
          record_id: orgId,
          action: 'BRANDING_THEME_UPDATED',
          changed_by: currentUser?.user?.id || '00000000-0000-0000-0000-000000000000',
          change_reason: `Theme color updated: ${change.field} (WCAG contrast: ${contrastAnalysis.ratio}:1)`,
          new_value: change.value,
          field_name: change.field,
          session_id: sessionId
        });
      }

      // Telemetry event for theme save
      console.log('[TELEMETRY] branding_theme_saved', {
        orgId,
        contrastRatio: contrastAnalysis.ratio,
        headerMode: colors.headerMode,
        timestamp: new Date().toISOString(),
        sessionId
      });
      
      toast({
        title: "Success",
        description: "Branding assets and theme saved successfully.",
      });
      
      // Clear form
      setForm({});
    } catch (e: any) {
      const isRetryable = e.status === 429 || e.status >= 500;
      toast({
        title: "Error",
        description: isRetryable 
          ? `Upload failed. ${retryCount < 2 ? 'Retrying...' : 'Please try again later.'}`
          : e.message ?? "Upload failed",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Organization Branding</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File uploads */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Brand Assets</h3>
          {SPECS.map(spec => (
            <div key={spec.key} className="space-y-2">
              <Label htmlFor={spec.key} className="text-sm font-medium">
                {spec.label}
              </Label>
              <p className="text-xs text-muted-foreground">{spec.description}</p>
              <Input
                id={spec.key}
                type="file"
                accept={spec.accept}
                onChange={(e) => onFile(spec.key, e.target.files?.[0])}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
            </div>
          ))}
        </div>

        {/* Theme colors */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Theme Colors</h3>
          
          {/* Contrast validation alert */}
          <Alert variant={isValidContrast ? "default" : "destructive"}>
            <div className="flex items-center gap-2">
              {isValidContrast ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <AlertDescription>
                Contrast ratio: {contrastAnalysis.ratio}:1 ({contrastAnalysis.level})
                {isValidContrast ? ' - Meets WCAG AA standards' : ' - Fails WCAG standards (needs 4.5:1)'}
              </AlertDescription>
            </div>
          </Alert>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primary">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primary"
                  type="color"
                  value={colors.primary}
                  onChange={(e) => setColors(prev => ({ ...prev, primary: e.target.value }))}
                  className="w-12 h-10 p-1 rounded border"
                />
                <Input
                  type="text"
                  value={colors.primary}
                  onChange={(e) => setColors(prev => ({ ...prev, primary: e.target.value }))}
                  className="flex-1"
                  placeholder="#000000"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="secondary">Secondary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="secondary"
                  type="color"
                  value={colors.secondary}
                  onChange={(e) => setColors(prev => ({ ...prev, secondary: e.target.value }))}
                  className="w-12 h-10 p-1 rounded border"
                />
                <Input
                  type="text"
                  value={colors.secondary}
                  onChange={(e) => setColors(prev => ({ ...prev, secondary: e.target.value }))}
                  className="flex-1"
                  placeholder="#faf9f9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="text">Text Color</Label>
              <div className="flex gap-2">
                <Input
                  id="text"
                  type="color"
                  value={colors.text}
                  onChange={(e) => setColors(prev => ({ ...prev, text: e.target.value }))}
                  className="w-12 h-10 p-1 rounded border"
                />
                <Input
                  type="text"
                  value={colors.text}
                  onChange={(e) => setColors(prev => ({ ...prev, text: e.target.value }))}
                  className="flex-1"
                  placeholder="#ffffff"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="headerMode">Header Mode</Label>
              <select
                id="headerMode"
                value={colors.headerMode}
                onChange={(e) => setColors(prev => ({ ...prev, headerMode: e.target.value }))}
                className="w-full h-10 px-3 rounded border bg-background"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
          </div>
        </div>

        <Button 
          onClick={save} 
          disabled={busy}
          className="w-full"
          variant={isValidContrast ? "default" : "secondary"}
        >
          {busy ? (
            retryCount > 0 ? `Retrying... (${retryCount}/3)` : "Saving..."
          ) : (
            isValidContrast ? "Save Branding" : "Save Anyway (Contrast Warning)"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}