// Central Supabase client for the web app
// Reads credentials from Vite env. Do NOT hardcode project refs or keys here.
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

// Configure via .env[.local] with VITE_ prefix (Vite requirement)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  // Surface a clear warning in dev if env is missing
  // The app will likely fail to auth/query until these are provided
  console.warn('[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment.\n' +
    'Create a .env.local file in project root with:\n' +
    '  VITE_SUPABASE_URL=https://<your-project>.supabase.co\n' +
    '  VITE_SUPABASE_ANON_KEY=<your-anon-key>')
}

export const supabase = createClient<Database>(SUPABASE_URL ?? '', SUPABASE_PUBLISHABLE_KEY ?? '', {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
})
