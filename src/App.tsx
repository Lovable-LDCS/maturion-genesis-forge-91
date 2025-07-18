import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthGuard } from "@/components/auth/AuthGuard";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Assessment from "./pages/Assessment";
import AssessmentFramework from "./pages/AssessmentFramework";
import QASignOff from "./pages/QASignOffDynamic";
import TeamPage from "./pages/TeamPage";
import InvitationAcceptance from "./pages/InvitationAcceptance";
import OrganizationSettings from "./pages/OrganizationSettings";
import MilestoneDetail from "./pages/MilestoneDetail";
import AIKnowledgeBase from "./pages/AIKnowledgeBase";
import Journey from "./pages/Journey";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthGuard>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/assessment" element={<Assessment />} />
              <Route path="/qa-signoff" element={<QASignOff />} />
              <Route path="/assessment-framework" element={<AssessmentFramework />} />
              <Route path="/domain-management" element={<AssessmentFramework />} />
              <Route path="/team" element={<TeamPage />} />
              <Route path="/organization/settings" element={<OrganizationSettings />} />
              <Route path="/ai/knowledge-base" element={<AIKnowledgeBase />} />
              <Route path="/accept-invitation" element={<InvitationAcceptance />} />
              <Route path="/journey" element={<Journey />} />
              <Route path="/milestones/:id" element={<MilestoneDetail />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthGuard>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
