import { createClient } from '@supabase/supabase-js'

// Chave publishable (pública, segura no cliente) — substitui a antiga anon key.
export const supabase = createClient(
  'https://drhhimvxtqrvuumqhkgr.supabase.co',
  'sb_publishable_1VsbwGktXROXZhMH0QL2xA_GKeFSWVM'
)
