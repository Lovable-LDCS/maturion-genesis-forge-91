import {
  Home,
  Target,
  ClipboardList,
  BarChart3,
  Users,
  Settings,
  BookOpen,
  Upload,
  FileText,
  Shield,
  Activity,
  Brain,
  Workflow,
  Lock,
  ClipboardCheck,
  Map,
  AlertTriangle,
  Wrench,
  LineChart,
  GraduationCap,
  AlertCircle,
  Database,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ROUTES } from "@/lib/routes";

// Navigation items visible to all authenticated users
// These are the core workflow items accessible based on user assignments
const navigationItems = [
  // Pre-subscription - Marketing and exploration pages
  {
    title: "Landing Page",
    icon: Home,
    url: ROUTES.HOME,
    group: "pre-subscription",
  },
  {
    title: "Free Assessment",
    icon: ClipboardCheck,
    url: ROUTES.FREE_ASSESSMENT,
    group: "pre-subscription",
  },
  {
    title: "Journey",
    icon: Map,
    url: ROUTES.JOURNEY,
    group: "pre-subscription",
  },
  {
    title: "Risk Management",
    icon: AlertTriangle,
    url: "/risk-management-info",
    group: "pre-subscription",
  },
  {
    title: "PIT",
    icon: Wrench,
    url: "/pit-info",
    group: "pre-subscription",
  },
  {
    title: "Data Analytics",
    icon: LineChart,
    url: "/data-analytics-info",
    group: "pre-subscription",
  },
  {
    title: "Skills Development",
    icon: GraduationCap,
    url: "/skills-development-info",
    group: "pre-subscription",
  },
  {
    title: "Incident Management",
    icon: AlertCircle,
    url: "/incident-management-info",
    group: "pre-subscription",
  },
  {
    title: "Data Extraction Tool",
    icon: Database,
    url: "/data-extraction-info",
    group: "pre-subscription",
  },
  // Maturity Roadmap - Accessible by users based on assignments (post-subscription)
  {
    title: "Audit Structure Setup",
    icon: BarChart3,
    url: ROUTES.MATURITY_SETUP,
    group: "maturity-roadmap",
  },
  {
    title: "Assessment",
    icon: ClipboardList,
    url: ROUTES.ASSESSMENT,
    group: "maturity-roadmap",
  },
  {
    title: "Assessment Framework",
    icon: Shield,
    url: ROUTES.ASSESSMENT_FRAMEWORK,
    group: "maturity-roadmap",
  },
  {
    title: "QA Sign-Off",
    icon: FileText,
    url: ROUTES.QA_SIGNOFF,
    group: "maturity-roadmap",
  },
  {
    title: "Team",
    icon: Users,
    url: ROUTES.TEAM,
    group: "maturity-roadmap",
  },
];

// Admin-only navigation items
// These items are ONLY visible to users with admin access (checked via useAdminAccess hook)
// Includes: Maturion (AI config), Settings (org hierarchy), Admin pages, and Watchdog
// All admin sections are styled with orange labels for visual distinction
const adminNavigationItems = [
  // Dashboard - moved to admin
  {
    title: "Dashboard",
    icon: Home,
    url: ROUTES.DASHBOARD,
    group: "admin",
  },
  // Maturion - AI Configuration
  {
    title: "Knowledge Base",
    icon: BookOpen,
    url: ROUTES.MATURION_KNOWLEDGE_BASE,
    group: "maturion",
  },
  {
    title: "Uploads",
    icon: Upload,
    url: ROUTES.MATURION_UPLOADS,
    group: "maturion",
  },
  // Settings - includes organization hierarchy
  {
    title: "Settings",
    icon: Settings,
    url: ROUTES.ORGANIZATION_SETTINGS,
    group: "settings",
  },
  // Admin Pages
  {
    title: "Workflow Dashboard",
    icon: Workflow,
    url: ROUTES.ADMIN_WORKFLOW,
    group: "admin",
  },
  {
    title: "User Matrix",
    icon: Lock,
    url: ROUTES.ADMIN_USER_MATRIX,
    group: "admin",
  },
  {
    title: "Admin Config",
    icon: Settings,
    url: ROUTES.ADMIN_CONFIG,
    group: "admin",
  },
  {
    title: "Health Checker",
    icon: Activity,
    url: ROUTES.ADMIN_HEALTH_CHECKER,
    group: "admin",
  },
  // Watchdog
  {
    title: "Watchdog",
    icon: Brain,
    url: ROUTES.WATCHDOG,
    group: "watchdog",
  },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { isAdmin } = useAdminAccess();

  const userInitials = profile?.full_name
    ?.split(" ")
    .map((name) => name.charAt(0))
    .join("")
    .toUpperCase() || "U";

  const groupedItems = {
    preSubscription: navigationItems.filter((item) => item.group === "pre-subscription"),
    maturityRoadmap: navigationItems.filter((item) => item.group === "maturity-roadmap"),
    // Admin-only groups
    maturion: adminNavigationItems.filter((item) => item.group === "maturion"),
    settings: adminNavigationItems.filter((item) => item.group === "settings"),
    admin: adminNavigationItems.filter((item) => item.group === "admin"),
    watchdog: adminNavigationItems.filter((item) => item.group === "watchdog"),
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b">
        <div className="flex items-center space-x-2 px-2 py-2">
          <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
            <Target className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold">Maturion</span>
            <span className="text-xs text-muted-foreground">Genesis Forge</span>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        {/* Pre-subscription - Marketing and exploration pages */}
        <SidebarGroup>
          <SidebarGroupLabel>Pre-subscription</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {groupedItems.preSubscription.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.url)}
                    isActive={location.pathname === item.url}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Maturity Roadmap - Accessible by users based on assignments */}
        <SidebarGroup>
          <SidebarGroupLabel>Maturity Roadmap</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {groupedItems.maturityRoadmap.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.url)}
                    isActive={location.pathname === item.url}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin-only sections */}
        {isAdmin && (
          <>
            {/* Maturion - AI Configuration (Admin-only) */}
            {groupedItems.maturion.length > 0 && (
              <SidebarGroup>
                <SidebarGroupLabel className="text-orange-600">Maturion</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {groupedItems.maturion.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          onClick={() => navigate(item.url)}
                          isActive={location.pathname === item.url}
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* Settings - Organization hierarchy (Admin-only) */}
            {groupedItems.settings.length > 0 && (
              <SidebarGroup>
                <SidebarGroupLabel className="text-orange-600">Settings</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {groupedItems.settings.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          onClick={() => navigate(item.url)}
                          isActive={location.pathname === item.url}
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* Admin Pages (Admin-only) */}
            {groupedItems.admin.length > 0 && (
              <SidebarGroup>
                <SidebarGroupLabel className="text-orange-600">Admin</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {groupedItems.admin.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          onClick={() => navigate(item.url)}
                          isActive={location.pathname === item.url}
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* Watchdog (Admin-only) */}
            {groupedItems.watchdog.length > 0 && (
              <SidebarGroup>
                <SidebarGroupLabel className="text-orange-600">Watchdog</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {groupedItems.watchdog.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          onClick={() => navigate(item.url)}
                          isActive={location.pathname === item.url}
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t">
        <div className="flex items-center space-x-2 px-2 py-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback>{userInitials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-sm font-medium truncate">{profile?.full_name || "User"}</span>
            <span className="text-xs text-muted-foreground truncate">{profile?.email || ""}</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
