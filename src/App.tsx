import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { LoginForm } from "@/components/auth/LoginForm";
import { MaturionChat } from "@/components/ai/MaturionChat";
import { useMaturionContext } from "@/hooks/useMaturionContext";
import Index from "./pages/Index";
import ModulesOverview from "./pages/ModulesOverview";
import MaturitySetup from "./pages/MaturitySetup";
import MaturityBuild from "./pages/MaturityBuild";
import Dashboard from "./pages/Dashboard";
import Assessment from "./pages/Assessment";
import AssessmentFramework from "./pages/AssessmentFramework";
import AuditStructureConfig from "./pages/AuditStructureConfig";
import DomainAuditBuilder from "./pages/DomainAuditBuilder";
import QASignOff from "./pages/QASignOffDynamic";
import TeamPage from "./pages/TeamPage";
import InvitationAcceptance from "./pages/InvitationAcceptance";
import OrganizationSettings from "./pages/OrganizationSettings";
import MilestoneDetail from "./pages/MilestoneDetail";
import MaturionKnowledgeBase from "./pages/MaturionKnowledgeBase";
import MaturionUploads from "./pages/MaturionUploads";
import Journey from "./pages/Journey";
import Subscribe from "./pages/Subscribe";
import AdminConfig from "./pages/AdminConfig";
import QADashboard from "./pages/QADashboard";
import NotFound from "./pages/NotFound";
import SubscribeCheckout from "./pages/SubscribeCheckout";

const queryClient = new QueryClient();

// Global Maturion Chat Component
const GlobalMaturionChat = () => {
  const { context, currentDomain } = useMaturionContext();
  
  return (
    <MaturionChat 
      context={context}
      currentDomain={currentDomain}
    />
  );
};

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
              <Route path="/modules" element={<ModulesOverview />} />
              <Route path="/maturity/setup" element={<MaturitySetup />} />
              <Route path="/maturity/build" element={<MaturityBuild />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/assessment" element={<Assessment />} />
              <Route path="/qa-signoff" element={<QASignOff />} />
              <Route path="/assessment/framework" element={<AuditStructureConfig />} />
              <Route path="/audit/domain/:domainId" element={<DomainAuditBuilder />} />
              <Route path="/assessment-framework" element={<AssessmentFramework />} />
              <Route path="/domain-management" element={<AssessmentFramework />} />
              <Route path="/team" element={<TeamPage />} />
              <Route path="/organization/settings" element={<OrganizationSettings />} />
              <Route path="/maturion/knowledge-base" element={<MaturionKnowledgeBase />} />
              <Route path="/maturion/uploads" element={<MaturionUploads />} />
              <Route path="/accept-invitation" element={<InvitationAcceptance />} />
              <Route path="/journey" element={<Journey />} />
              <Route path="/subscribe" element={<Subscribe />} />
              <Route path="/subscribe/checkout" element={<SubscribeCheckout />} />
              <Route path="/admin/config" element={<AdminConfig />} />
              <Route path="/qa-dashboard" element={<QADashboard />} />
              <Route path="/milestones/:id" element={<MilestoneDetail />} />
              <Route path="/auth" element={<LoginForm />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            
            {/* Global Maturion Chat Assistant */}
            <GlobalMaturionChat />
          </BrowserRouter>
        </AuthGuard>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
