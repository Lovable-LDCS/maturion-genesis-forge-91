import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
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
import AdminWorkflowDashboard from "./pages/AdminWorkflowDashboard";
import UserFieldMatrix from "./pages/UserFieldMatrix";
import QADashboard from "./pages/QADashboard";
import UnifiedQADashboard from "./pages/UnifiedQADashboard";
import QATestDashboard from "./pages/QATestDashboard";
import DataSourcesManagement from "./pages/DataSourcesManagement";
import WatchdogDashboard from "./pages/WatchdogDashboard";
import NotFound from "./pages/NotFound";
import SubscribeCheckout from "./pages/SubscribeCheckout";

const queryClient = new QueryClient();

// Global Maturion Chat Component - only for authenticated users
const GlobalMaturionChat = () => {
  const { context, currentDomain } = useMaturionContext();
  const { user } = useAuth();
  
  // Only render chat for authenticated users
  if (!user) return null;
  
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
          <BrowserRouter basename={basename}>
            <Routes>
              {/* Public routes without authentication (Pre-subscription - no sidebar) */}
              <Route path={ROUTES.HOME} element={<Index />} />
              <Route path={ROUTES.AUTH} element={<LoginForm />} />
              <Route path={ROUTES.INVITATION_ACCEPTANCE} element={<InvitationAcceptance />} />
              <Route path={ROUTES.SUBSCRIBE} element={<Subscribe />} />
              <Route path={ROUTES.SUBSCRIBE_CHECKOUT} element={<SubscribeCheckout />} />
              <Route path={ROUTES.JOURNEY} element={<Journey />} />
              
              {/* Protected routes with authentication */}
              <Route path={ROUTES.MODULES} element={<ProtectedRoute><AppLayout><ModulesOverview /></AppLayout></ProtectedRoute>} />
              <Route path={ROUTES.MATURITY_SETUP} element={<ProtectedRoute><AppLayout><MaturitySetup /></AppLayout></ProtectedRoute>} />
              {/* Legacy redirect: /maturity/build -> /maturity/setup */}
              <Route path={ROUTES.MATURITY_BUILD_LEGACY} element={<Navigate to={ROUTES.MATURITY_SETUP} replace />} />
              <Route path={ROUTES.DASHBOARD} element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
              <Route path={ROUTES.ASSESSMENT} element={<ProtectedRoute><AppLayout><Assessment /></AppLayout></ProtectedRoute>} />
              <Route path={ROUTES.QA_SIGNOFF} element={<ProtectedRoute><AppLayout><QASignOff /></AppLayout></ProtectedRoute>} />
              <Route path={ROUTES.ASSESSMENT_FRAMEWORK} element={<ProtectedRoute><AppLayout><AuditStructureConfig /></AppLayout></ProtectedRoute>} />
              <Route path="/audit/domain/:domainId" element={<ProtectedRoute><AppLayout><DomainAuditBuilder /></AppLayout></ProtectedRoute>} />
              <Route path="/assessment-framework" element={<ProtectedRoute><AppLayout><AssessmentFramework /></AppLayout></ProtectedRoute>} />
              <Route path="/domain-management" element={<ProtectedRoute><AppLayout><AssessmentFramework /></AppLayout></ProtectedRoute>} />
              <Route path={ROUTES.TEAM} element={<ProtectedRoute><AppLayout><TeamPage /></AppLayout></ProtectedRoute>} />
              <Route path={ROUTES.ORGANIZATION_SETTINGS} element={<ProtectedRoute><AppLayout><OrganizationSettings /></AppLayout></ProtectedRoute>} />
              <Route path={ROUTES.MATURION_KNOWLEDGE_BASE} element={<ProtectedRoute><AppLayout><MaturionKnowledgeBase /></AppLayout></ProtectedRoute>} />
              <Route path="/maturion-knowledge-base" element={<ProtectedRoute><AppLayout><MaturionKnowledgeBase /></AppLayout></ProtectedRoute>} />
              <Route path={ROUTES.MATURION_UPLOADS} element={<ProtectedRoute><AppLayout><MaturionUploads /></AppLayout></ProtectedRoute>} />
              <Route path="/maturion-uploads" element={<ProtectedRoute><Navigate to={ROUTES.MATURION_UPLOADS} replace /></ProtectedRoute>} />
              <Route path="/knowledge-base" element={<ProtectedRoute><Navigate to={ROUTES.MATURION_KNOWLEDGE_BASE} replace /></ProtectedRoute>} />
              <Route path="/uploads" element={<ProtectedRoute><Navigate to={ROUTES.MATURION_UPLOADS} replace /></ProtectedRoute>} />
              <Route path={ROUTES.ADMIN_CONFIG} element={<ProtectedRoute><AppLayout><AdminConfig /></AppLayout></ProtectedRoute>} />
              <Route path={ROUTES.ADMIN_HEALTH_CHECKER} element={<ProtectedRoute><AppLayout><AdminHealthChecker /></AppLayout></ProtectedRoute>} />
              <Route path={ROUTES.ADMIN_WORKFLOW} element={<ProtectedRoute><AppLayout><AdminWorkflowDashboard /></AppLayout></ProtectedRoute>} />
              <Route path={ROUTES.ADMIN_USER_MATRIX} element={<ProtectedRoute><AppLayout><UserFieldMatrix /></AppLayout></ProtectedRoute>} />
              <Route path={ROUTES.QA_DASHBOARD} element={<ProtectedRoute><AppLayout><UnifiedQADashboard /></AppLayout></ProtectedRoute>} />
              <Route path="/qa-dashboard-legacy" element={<ProtectedRoute><AppLayout><QADashboard /></AppLayout></ProtectedRoute>} />
              <Route path="/qa-test-dashboard" element={<ProtectedRoute><AppLayout><QATestDashboard /></AppLayout></ProtectedRoute>} />
              <Route path="/data-sources" element={<ProtectedRoute><AppLayout><DataSourcesManagement /></AppLayout></ProtectedRoute>} />
              <Route path={ROUTES.WATCHDOG} element={<ProtectedRoute><AppLayout><WatchdogDashboard /></AppLayout></ProtectedRoute>} />
              <Route path="/test-suite" element={<ProtectedRoute><AppLayout><TestSuite /></AppLayout></ProtectedRoute>} />
              <Route path="/milestones/:id" element={<ProtectedRoute><AppLayout><MilestoneDetail /></AppLayout></ProtectedRoute>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            
            {/* Global Maturion Chat Assistant - only for authenticated users */}
            <GlobalMaturionChat />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
