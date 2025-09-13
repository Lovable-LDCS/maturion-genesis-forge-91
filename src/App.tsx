import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { LoginForm } from "@/components/auth/LoginForm";
import { MaturionChat } from "@/components/ai/MaturionChat";
import { useMaturionContext } from "@/hooks/useMaturionContext";
import { ROUTES } from "@/lib/routes";
import Index from "./pages/Index";
import ModulesOverview from "./pages/ModulesOverview";
import MaturitySetup from "./pages/MaturitySetup";
import Dashboard from "./pages/Dashboard";
import Assessment from "./pages/Assessment";
import AssessmentFramework from "./pages/AssessmentFramework";
import AuditStructureConfig from "./pages/AuditStructureConfig";
import DomainAuditBuilder from "./pages/DomainAuditBuilder";
import QASignOff from "./pages/QASignOffDynamic";
import TestSuite from "./pages/TestSuite";
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
import WatchdogDashboard from "./pages/WatchdogDashboard";
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
              <Route path={ROUTES.HOME} element={<Index />} />
              <Route path={ROUTES.MODULES} element={<ModulesOverview />} />
              <Route path={ROUTES.MATURITY_SETUP} element={<MaturitySetup />} />
              {/* Legacy redirect: /maturity/build -> /maturity/setup */}
              <Route path={ROUTES.MATURITY_BUILD_LEGACY} element={<Navigate to={ROUTES.MATURITY_SETUP} replace />} />
              <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
              <Route path={ROUTES.ASSESSMENT} element={<Assessment />} />
              <Route path={ROUTES.QA_SIGNOFF} element={<QASignOff />} />
              <Route path={ROUTES.ASSESSMENT_FRAMEWORK} element={<AuditStructureConfig />} />
              <Route path="/audit/domain/:domainId" element={<DomainAuditBuilder />} />
              <Route path="/assessment-framework" element={<AssessmentFramework />} />
              <Route path="/domain-management" element={<AssessmentFramework />} />
              <Route path={ROUTES.TEAM} element={<TeamPage />} />
              <Route path={ROUTES.ORGANIZATION_SETTINGS} element={<OrganizationSettings />} />
              <Route path={ROUTES.MATURION_KNOWLEDGE_BASE} element={<Navigate to={ROUTES.MATURION_UPLOADS} replace />} />
              <Route path={ROUTES.MATURION_UPLOADS} element={<MaturionUploads />} />
              <Route path="/knowledge-base" element={<Navigate to={ROUTES.MATURION_UPLOADS} replace />} />
              <Route path="/uploads" element={<Navigate to={ROUTES.MATURION_UPLOADS} replace />} />
              <Route path={ROUTES.INVITATION_ACCEPTANCE} element={<InvitationAcceptance />} />
              <Route path={ROUTES.JOURNEY} element={<Journey />} />
              <Route path={ROUTES.SUBSCRIBE} element={<Subscribe />} />
              <Route path={ROUTES.SUBSCRIBE_CHECKOUT} element={<SubscribeCheckout />} />
              <Route path={ROUTES.ADMIN_CONFIG} element={<AdminConfig />} />
              <Route path={ROUTES.QA_DASHBOARD} element={<QADashboard />} />
              <Route path={ROUTES.WATCHDOG} element={<WatchdogDashboard />} />
              <Route path="/test-suite" element={<TestSuite />} />
              <Route path="/milestones/:id" element={<MilestoneDetail />} />
              <Route path={ROUTES.AUTH} element={<LoginForm />} />
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
