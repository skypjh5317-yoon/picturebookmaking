import { createClient } from '@supabase/supabase-js'

// Seoul (ap-northeast-2) project. These are public client values; access is enforced by RLS.
const supabaseUrl = 'https://hhdduvviuzcsjxpjyhvq.supabase.co'
const supabaseAnonKey = 'sb_publishable_YxeLs1itu6uBd3s1hf_vjw_qoym5kwS'

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)
export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null
