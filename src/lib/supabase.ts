import { createClient } from "@supabase/supabase-js";
export const SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";
export const SUPABASE_SERVICE_ROLE_KEY = "YOUR_SERVICE_ROLE_KEY";
export const SUPABASE_ANON_KEY = "YOUR_ANON_KEY";
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false }});
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { autoRefreshToken: true, persistSession: true }});
