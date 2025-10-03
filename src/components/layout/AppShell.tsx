import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { HeaderLogo } from "@/components/layout/HeaderLogo";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;
  const { user } = useAuth();
  const { organizations, currentOrganization, switchOrganization } = useOrganization();

  // Main Admin heuristic: APGI owner email domain
  const isMainAdmin = Boolean(user?.email && user.email.endsWith("@apginc.ca"));

  return (
    <SidebarProvider>
      <Sidebar variant="sidebar" collapsible="offcanvas">
        <SidebarHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HeaderLogo />
            <span className="text-sm font-semibold">Maturion</span>
          </div>
          <SidebarTrigger />
        </SidebarHeader>
        <SidebarSeparator />
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/")}> 
                    <Link to="/">Home</Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/journey")}> 
                    <Link to="/journey">Journey</Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/subscribe")}> 
                    <Link to="/subscribe">Subscribe</Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/maturity/setup")}> 
                    <Link to="/maturity/setup">Maturity Setup</Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/assessment-framework")}> 
                    <Link to="/assessment-framework">Assessment Framework</Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {isMainAdmin && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/maturion-uploads")}> 
                      <Link to="/maturion-uploads">Documents</Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/organization/settings")}> 
                    <Link to="/organization/settings">Organization</Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {isMainAdmin && (
                  <>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={isActive("/watchdog")}> 
                        <Link to="/watchdog">Watchdog</Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={isActive("/backoffice/access-matrix")}> 
                        <Link to="/backoffice/access-matrix">Backoffice Access Matrix</Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="p-2">
          <Button asChild variant="outline" className="w-full">
            <Link to="/auth">Sign In / Switch</Link>
          </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        {/* Header-wide organization selector */}
        <div className="w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto max-w-7xl px-6 py-2 flex items-center justify-between text-sm">
            <div>
              Active Organization: <span className="font-medium">{currentOrganization?.name || 'Unselected'}</span>
            </div>
            <div className="flex items-center gap-2 min-w-[18rem]">
              <Select value={currentOrganization?.id || ''} onValueChange={(v) => switchOrganization(v)}>
                <SelectTrigger className="w-72 h-8">
                  <SelectValue placeholder="Switch organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map(org => (
                    <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
};

export default AppShell;

