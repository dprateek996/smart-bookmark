import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { requireEnv } from '@/lib/env'

export async function createClient() {
  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const supabaseKey = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  const cookieStore = await cookies()

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value
      },
      set(name, value, options) {
        try {
          cookieStore.set({ name, value, ...options })
        } catch {
          // Server Components can read cookies but cannot always mutate them.
        }
      },
      remove(name, options) {
        try {
          cookieStore.set({ name, value: '', ...options })
        } catch {
          // Server Components can read cookies but cannot always mutate them.
        }
      }
    }
  })
}
