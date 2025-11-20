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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ROUTES } from "@/lib/routes";

const navigationItems = [
  {
    title: "Dashboard",
    icon: Home,
    url: ROUTES.DASHBOARD,
    group: "main",
  },
  {
    title: "Modules",
    icon: Target,
    url: ROUTES.MODULES,
    group: "main",
  },
  {
    title: "Assessment",
    icon: ClipboardList,
    url: ROUTES.ASSESSMENT,
    group: "assessment",
  },
  {
    title: "Maturity Setup",
    icon: BarChart3,
    url: ROUTES.MATURITY_SETUP,
    group: "assessment",
  },
  {
    title: "Assessment Framework",
    icon: Shield,
    url: ROUTES.ASSESSMENT_FRAMEWORK,
    group: "assessment",
  },
  {
    title: "QA Sign-Off",
    icon: FileText,
    url: ROUTES.QA_SIGNOFF,
    group: "assessment",
  },
  {
    title: "Team",
    icon: Users,
    url: ROUTES.TEAM,
    group: "organization",
  },
  {
    title: "Organization Settings",
    icon: Settings,
    url: ROUTES.ORGANIZATION_SETTINGS,
    group: "organization",
  },
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
  {
    title: "Journey",
    icon: Activity,
    url: ROUTES.JOURNEY,
    group: "maturion",
  },
  {
    title: "Watchdog",
    icon: Brain,
    url: ROUTES.WATCHDOG,
    group: "tools",
  },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const userInitials = profile?.full_name
    ?.split(" ")
    .map((name) => name.charAt(0))
    .join("")
    .toUpperCase() || "U";

  const groupedItems = {
    main: navigationItems.filter((item) => item.group === "main"),
    assessment: navigationItems.filter((item) => item.group === "assessment"),
    organization: navigationItems.filter((item) => item.group === "organization"),
    maturion: navigationItems.filter((item) => item.group === "maturion"),
    tools: navigationItems.filter((item) => item.group === "tools"),
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
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {groupedItems.main.map((item) => (
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

        {/* Assessment */}
        <SidebarGroup>
          <SidebarGroupLabel>Assessment</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {groupedItems.assessment.map((item) => (
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

        {/* Organization */}
        <SidebarGroup>
          <SidebarGroupLabel>Organization</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {groupedItems.organization.map((item) => (
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

        {/* Maturion */}
        <SidebarGroup>
          <SidebarGroupLabel>Maturion</SidebarGroupLabel>
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

        {/* Tools */}
        {groupedItems.tools.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Tools</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {groupedItems.tools.map((item) => (
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
