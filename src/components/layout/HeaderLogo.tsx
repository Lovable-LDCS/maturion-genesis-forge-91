import { OrgTheme } from "@/hooks/useOrgTheme";

interface HeaderLogoProps {
  theme: OrgTheme | null;
  className?: string;
}

export function HeaderLogo({ theme, className = "h-8 w-auto" }: HeaderLogoProps) {
  if (!theme) return null;
  
  // Choose logo based on header mode
  const logoUrl = theme.headerMode === "dark" 
    ? theme.logoDarkUrl || theme.logoLightUrl 
    : theme.logoLightUrl || theme.logoDarkUrl;
  
  if (!logoUrl) return null;

  return (
    <img 
      src={logoUrl} 
      alt="Organization logo" 
      className={className}
      onError={(e) => {
        // Hide broken images gracefully
        e.currentTarget.style.display = 'none';
      }}
    />
  );
}