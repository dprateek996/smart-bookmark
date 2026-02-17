import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { requireEnv } from '@/lib/env'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request
  })

  const supabase = createServerClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        }
      }
    }
  )

  // Keep session cookies synchronized for authenticated and anonymous requests.
  await supabase.auth.getUser()

  return supabaseResponse
}
