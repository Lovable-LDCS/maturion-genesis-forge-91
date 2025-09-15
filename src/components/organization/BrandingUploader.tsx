import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

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

async function uploadToBranding(orgId: string, filename: string, file: File) {
  const path = `org/${orgId}/branding/${filename}`;
  const { error } = await supabase.storage
    .from("org_branding")
    .upload(path, file, { upsert: true });
  if (error) throw error;
  return path;
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
  const { toast } = useToast();

  const onFile = (key: keyof FormDataMap, f?: File) => 
    setForm(prev => ({ ...prev, [key]: f }));

  const save = async () => {
    try {
      setBusy(true);
      const updates: Record<string, string | null> = {};

      // Upload any provided files and map to org columns
      for (const spec of SPECS) {
        const f = form[spec.key];
        if (f) {
          const storagePath = await uploadToBranding(orgId, spec.filename, f);
          if (spec.key === "logoLight") updates.brand_logo_light_path = storagePath;
          if (spec.key === "logoDark") updates.brand_logo_dark_path = storagePath;
          if (spec.key === "wordmarkBlack") updates.brand_wordmark_black_path = storagePath;
          if (spec.key === "wordmarkWhite") updates.brand_wordmark_white_path = storagePath;
          if (spec.key === "favicon") updates.brand_favicon_path = storagePath;
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
      
      toast({
        title: "Success",
        description: "Branding assets and theme saved successfully.",
      });
      
      // Clear form
      setForm({});
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message ?? "Upload failed",
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
        >
          {busy ? "Saving..." : "Save Branding"}
        </Button>
      </CardContent>
    </Card>
  );
}