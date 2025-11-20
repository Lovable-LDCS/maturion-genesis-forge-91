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
import { AppLayout } from "@/components/layout/AppLayout";
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
import AdminHealthChecker from "./pages/AdminHealthChecker";
import QADashboard from "./pages/QADashboard";
import QATestDashboard from "./pages/QATestDashboard";
import DataSourcesManagement from "./pages/DataSourcesManagement";
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

const App = () => {
  // Set basename for GitHub Pages deployment
  const basename = import.meta.env.BASE_URL || '/';
  
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AuthGuard>
            <BrowserRouter basename={basename}>
              <Routes>
              {/* Public routes without sidebar */}
              <Route path={ROUTES.HOME} element={<Index />} />
              <Route path={ROUTES.AUTH} element={<LoginForm />} />
              <Route path={ROUTES.INVITATION_ACCEPTANCE} element={<InvitationAcceptance />} />
              
              {/* App routes with sidebar */}
              <Route path={ROUTES.MODULES} element={<AppLayout><ModulesOverview /></AppLayout>} />
              <Route path={ROUTES.MATURITY_SETUP} element={<AppLayout><MaturitySetup /></AppLayout>} />
              {/* Legacy redirect: /maturity/build -> /maturity/setup */}
              <Route path={ROUTES.MATURITY_BUILD_LEGACY} element={<Navigate to={ROUTES.MATURITY_SETUP} replace />} />
              <Route path={ROUTES.DASHBOARD} element={<AppLayout><Dashboard /></AppLayout>} />
              <Route path={ROUTES.ASSESSMENT} element={<AppLayout><Assessment /></AppLayout>} />
              <Route path={ROUTES.QA_SIGNOFF} element={<AppLayout><QASignOff /></AppLayout>} />
              <Route path={ROUTES.ASSESSMENT_FRAMEWORK} element={<AppLayout><AuditStructureConfig /></AppLayout>} />
              <Route path="/audit/domain/:domainId" element={<AppLayout><DomainAuditBuilder /></AppLayout>} />
              <Route path="/assessment-framework" element={<AppLayout><AssessmentFramework /></AppLayout>} />
              <Route path="/domain-management" element={<AppLayout><AssessmentFramework /></AppLayout>} />
              <Route path={ROUTES.TEAM} element={<AppLayout><TeamPage /></AppLayout>} />
              <Route path={ROUTES.ORGANIZATION_SETTINGS} element={<AppLayout><OrganizationSettings /></AppLayout>} />
              <Route path={ROUTES.MATURION_KNOWLEDGE_BASE} element={<AppLayout><MaturionKnowledgeBase /></AppLayout>} />
              <Route path="/maturion-knowledge-base" element={<AppLayout><MaturionKnowledgeBase /></AppLayout>} />
              <Route path={ROUTES.MATURION_UPLOADS} element={<AppLayout><MaturionUploads /></AppLayout>} />
              <Route path="/maturion-uploads" element={<Navigate to={ROUTES.MATURION_UPLOADS} replace />} />
              <Route path="/knowledge-base" element={<Navigate to={ROUTES.MATURION_KNOWLEDGE_BASE} replace />} />
              <Route path="/uploads" element={<Navigate to={ROUTES.MATURION_UPLOADS} replace />} />
              <Route path={ROUTES.JOURNEY} element={<AppLayout><Journey /></AppLayout>} />
              <Route path={ROUTES.SUBSCRIBE} element={<Subscribe />} />
              <Route path={ROUTES.SUBSCRIBE_CHECKOUT} element={<SubscribeCheckout />} />
              <Route path={ROUTES.ADMIN_CONFIG} element={<AppLayout><AdminConfig /></AppLayout>} />
              <Route path="/admin/health-checker" element={<AppLayout><AdminHealthChecker /></AppLayout>} />
              <Route path={ROUTES.QA_DASHBOARD} element={<AppLayout><QADashboard /></AppLayout>} />
              <Route path="/qa-test-dashboard" element={<AppLayout><QATestDashboard /></AppLayout>} />
              <Route path="/data-sources" element={<AppLayout><DataSourcesManagement /></AppLayout>} />
              <Route path={ROUTES.WATCHDOG} element={<AppLayout><WatchdogDashboard /></AppLayout>} />
              <Route path="/test-suite" element={<AppLayout><TestSuite /></AppLayout>} />
              <Route path="/milestones/:id" element={<AppLayout><MilestoneDetail /></AppLayout>} />
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
};

export default App;
