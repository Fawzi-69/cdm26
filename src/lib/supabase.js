import { createClient } from '@supabase/supabase-js'

// Surchargables via .env (VITE_*), avec valeurs par défaut du projet CDM26.
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://opilqjghbbmcdubgdwjs.supabase.co'
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_8tLrjinmNDQiYsiX8uKrLA_a0baf4XE'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})
