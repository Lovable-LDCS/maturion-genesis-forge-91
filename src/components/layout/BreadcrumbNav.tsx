import { useLocation } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ROUTES } from "@/lib/routes";

const routeNameMap: Record<string, string> = {
  [ROUTES.HOME]: "Home",
  [ROUTES.DASHBOARD]: "Dashboard",
  [ROUTES.MODULES]: "Modules",
  [ROUTES.ASSESSMENT]: "Assessment",
  [ROUTES.MATURITY_SETUP]: "Maturity Setup",
  [ROUTES.ASSESSMENT_FRAMEWORK]: "Assessment Framework",
  [ROUTES.QA_SIGNOFF]: "QA Sign-Off",
  [ROUTES.TEAM]: "Team",
  [ROUTES.ORGANIZATION_SETTINGS]: "Organization Settings",
  [ROUTES.MATURION_KNOWLEDGE_BASE]: "Knowledge Base",
  [ROUTES.MATURION_UPLOADS]: "Uploads",
  [ROUTES.JOURNEY]: "Journey",
  [ROUTES.WATCHDOG]: "Watchdog",
  [ROUTES.ADMIN_CONFIG]: "Admin Config",
  [ROUTES.QA_DASHBOARD]: "QA Dashboard",
};

export function BreadcrumbNav() {
  const location = useLocation();
  const pathSegments = location.pathname.split("/").filter(Boolean);
  
  // Get the current page name
  const currentPageName = routeNameMap[location.pathname] || 
    pathSegments[pathSegments.length - 1]?.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) ||
    "Home";

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/">Home</BreadcrumbLink>
        </BreadcrumbItem>
        {location.pathname !== "/" && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{currentPageName}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
