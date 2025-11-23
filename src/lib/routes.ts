/**
 * Centralized route constants for the application
 * Use these constants instead of hardcoded strings to maintain consistency
 */
export const ROUTES = {
  // Core navigation
  HOME: '/',
  MODULES: '/modules',
  DASHBOARD: '/dashboard',
  
  // Maturity system - canonical routes
  MATURITY_SETUP: '/maturity/setup', // Canonical onboarding route
  
  // Assessment system
  FREE_ASSESSMENT: '/free-assessment', // Pre-subscription free assessment
  ASSESSMENT: '/assessment',
  ASSESSMENT_FRAMEWORK: '/assessment/framework',
  DOMAIN_AUDIT_BUILDER: (domainId: string) => `/audit/domain/${domainId}`,
  
  // Team & Organization
  TEAM: '/team',
  ORGANIZATION_SETTINGS: '/organization/settings',
  
  // Maturion AI
  MATURION_KNOWLEDGE_BASE: '/maturion/knowledge-base',
  MATURION_UPLOADS: '/maturion/uploads',
  
  // Admin & QA
  ADMIN_CONFIG: '/admin/config',
  ADMIN_HEALTH_CHECKER: '/admin/health-checker',
  ADMIN_WORKFLOW: '/admin/workflow',
  ADMIN_USER_MATRIX: '/admin/user-matrix',
  QA_DASHBOARD: '/qa-dashboard',
  QA_SIGNOFF: '/qa-signoff',
  WATCHDOG: '/watchdog',
  DATA_SOURCES: '/data-sources',
  
  // Pre-subscription module info pages
  RISK_MANAGEMENT_INFO: '/risk-management-info',
  PIT_INFO: '/pit-info',
  DATA_ANALYTICS_INFO: '/data-analytics-info',
  SKILLS_DEVELOPMENT_INFO: '/skills-development-info',
  INCIDENT_MANAGEMENT_INFO: '/incident-management-info',
  DATA_EXTRACTION_INFO: '/data-extraction-info',
  
  // Other
  JOURNEY: '/journey',
  SUBSCRIBE: '/subscribe',
  SUBSCRIBE_CHECKOUT: '/subscribe/checkout',
  INVITATION_ACCEPTANCE: '/accept-invitation',
  MILESTONE_DETAIL: (id: string) => `/milestones/${id}`,
  AUTH: '/auth',
  
  // Legacy redirect paths (deprecated - will redirect to canonical)
  MATURITY_BUILD_LEGACY: '/maturity/build', // Redirects to MATURITY_SETUP
} as const;

// Type for route values
export type Route = typeof ROUTES[keyof typeof ROUTES];
