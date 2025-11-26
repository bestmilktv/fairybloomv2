/**
 * Supabase Client Helper
 * Creates and manages Supabase client instances
 */

import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL) {
  console.error('[Supabase] Missing SUPABASE_URL environment variable');
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[Supabase] Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
}

/**
 * Get Supabase client with service role (server-side only, full access)
 * Use this in API endpoints for admin operations
 */
export function getSupabaseAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase credentials not configured');
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Get Supabase client with anon key (for client-side or limited access)
 * Use this when you need RLS (Row Level Security) policies
 */
export function getSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase credentials not configured');
  }

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

