import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Generate a stable device ID for anonymous usage
export function getDeviceId(): string {
  let id = localStorage.getItem('earth-online-device-id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('earth-online-device-id', id)
  }
  return id
}
