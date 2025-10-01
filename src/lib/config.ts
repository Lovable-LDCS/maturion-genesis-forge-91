// Global app config
// APGI org UUID set from provisioning step.
export const DEFAULT_BACKOFFICE_ORG_ID: string | null = '92d8da24-c757-4172-bfd0-42c6e2ede85f';

// Control whether superusers auto-scope to APGI when no org is selected
export const ENABLE_SUPERUSER_DEFAULT_SCOPE = true;

// Feature flags for new AI generation surfaces
export const FEATURE_FLAGS = {
  intents_generation_enabled: true,
  criteria_generation_enabled: true,
  gap_followup_enabled: true,
} as const;

// Routes where the sidebar should be hidden (e.g., auth pages)
export const SIDEBAR_HIDDEN_ROUTES = new Set<string>(['/auth']);
