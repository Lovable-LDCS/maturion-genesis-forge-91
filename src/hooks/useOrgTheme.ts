import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type OrgTheme = {
  primary?: string; 
  secondary?: string; 
  text?: string;
  headerMode?: "light" | "dark";
  logoLightUrl?: string; 
  logoDarkUrl?: string;
  wordmarkBlackUrl?: string;
  wordmarkWhiteUrl?: string;
  faviconUrl?: string;
};

export function useOrgTheme(orgId: string | null) {
  const [theme, setTheme] = useState<OrgTheme | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }

    let cancel = false;
    
    const loadTheme = async () => {
      try {
        const { data, error } = await supabase
          .from("organizations")
          .select(`
            brand_primary_hex, 
            brand_secondary_hex, 
            brand_text_hex, 
            brand_header_mode, 
            brand_logo_light_path, 
            brand_logo_dark_path,
            brand_wordmark_black_path,
            brand_wordmark_white_path,
            brand_favicon_path
          `)
          .eq("id", orgId)
          .single();
        
        if (error || !data || cancel) return;

        const createSignedUrl = async (path?: string | null) => {
          if (!path) return null;
          try {
            const { data: urlData, error } = await supabase.storage
              .from("org_branding")
              .createSignedUrl(path, 3600);
            
            if (error) {
              console.warn(`Failed to create signed URL for ${path}:`, error);
              return null;
            }
            
            return urlData?.signedUrl ?? null;
          } catch (error) {
            console.warn(`Error creating signed URL for ${path}:`, error);
            return null;
          }
        };

        const [lightLogo, darkLogo, blackWordmark, whiteWordmark, favicon] = await Promise.all([
          createSignedUrl(data.brand_logo_light_path),
          createSignedUrl(data.brand_logo_dark_path),
          createSignedUrl(data.brand_wordmark_black_path),
          createSignedUrl(data.brand_wordmark_white_path),
          createSignedUrl(data.brand_favicon_path),
        ]);

        if (!cancel) {
          setTheme({
            primary: data.brand_primary_hex || undefined,
            secondary: data.brand_secondary_hex || undefined,
            text: data.brand_text_hex || undefined,
            headerMode: (data.brand_header_mode as "light" | "dark") || "light",
            logoLightUrl: lightLogo || undefined,
            logoDarkUrl: darkLogo || undefined,
            wordmarkBlackUrl: blackWordmark || undefined,
            wordmarkWhiteUrl: whiteWordmark || undefined,
            faviconUrl: favicon || undefined,
          });
        }
      } catch (error) {
        console.error("Error loading org theme:", error);
      } finally {
        if (!cancel) {
          setLoading(false);
        }
      }
    };

    loadTheme();
    
    return () => { 
      cancel = true; 
    };
  }, [orgId]);

  return { theme, loading };
}