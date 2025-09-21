import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://nkyqchpxvwbalxlrlfxg.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5reXFjaHB4dndiYWx4bHJsZnhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyMjc2MTMsImV4cCI6MjA3MzgwMzYxM30.9Kp77XSseKuhdoMU8mcdJIWwsv8kKn8Df2nje7AxN5s'

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: localStorage
  },
  global: {
    headers: {
      'x-application-name': 'fairy-bloom-eshop'
    }
  }
})

export type Profile = {
  id: string
  email: string
  first_name: string
  last_name: string
  gender: 'male' | 'female' | 'other'
  newsletter_consent: boolean
  role?: 'user' | 'admin'
  created_at: string
  updated_at: string
}