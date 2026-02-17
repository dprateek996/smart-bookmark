import { createClient } from '@/lib/supabase/server-client'
import { NextResponse } from 'next/server'
import { handleRoute } from '@/lib/http/handle-route'

export async function GET(request: Request) {
  return handleRoute(request, async () => {
    const { searchParams, origin } = new URL(request.url)

    const code = searchParams.get('code')

    if (code) {
      const supabase = await createClient()
      await supabase.auth.exchangeCodeForSession(code)
    }

    return NextResponse.redirect(origin)
  })
}
