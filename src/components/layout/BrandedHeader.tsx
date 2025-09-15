import { useEffect } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { useOrgTheme } from "@/hooks/useOrgTheme";
import { HeaderLogo } from "./HeaderLogo";

interface BrandedHeaderProps {
  children?: React.ReactNode;
  className?: string;
}

export function BrandedHeader({ children, className }: BrandedHeaderProps) {
  const { currentOrganization } = useOrganization();
  const { theme } = useOrgTheme(currentOrganization?.id || null);

  useEffect(() => {
    if (!theme) return;

    // Apply CSS custom properties for theme colors
    const root = document.documentElement.style;
    if (theme.primary) root.setProperty("--brand-primary", theme.primary);
    if (theme.secondary) root.setProperty("--brand-secondary", theme.secondary);
    if (theme.text) root.setProperty("--brand-text", theme.text);

    // Update favicon dynamically
    if (theme.faviconUrl) {
      let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = theme.faviconUrl;
    }

    // Set data attribute for conditional styling
    document.body.dataset.headerMode = theme.headerMode || "light";
  }, [theme]);

  const headerClasses = theme?.headerMode === "dark" 
    ? "bg-black text-white border-gray-800" 
    : "bg-white text-black border-gray-200";

  return (
    <header className={`w-full border-b ${headerClasses} ${className || ""}`}>
      <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <HeaderLogo theme={theme} />
          {/* Add company name as fallback if no logo */}
          {!theme?.logoLightUrl && !theme?.logoDarkUrl && currentOrganization?.name && (
            <h1 className="text-xl font-bold">{currentOrganization.name}</h1>
          )}
        </div>
        <div className="flex items-center gap-4">
          {children}
        </div>
      </div>
    </header>
  );
}