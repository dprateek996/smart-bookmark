import { NextResponse } from 'next/server'
import { success } from '@/lib/response/formatter'
import { handleRoute } from '@/lib/http/handle-route'
import { getDependencyCircuitState } from '@/lib/http/dependency-guard'

export async function GET(request: Request) {
  return handleRoute(request, async () => {
    const supabaseCircuit = getDependencyCircuitState('supabase-rest')

    return NextResponse.json(
      success({
        status: 'ok',
        uptimeSeconds: Math.round(process.uptime()),
        dependency: {
          supabaseCircuitOpen: supabaseCircuit.isOpen,
          retryAfterMs: supabaseCircuit.retryAfterMs
        },
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store'
        }
      }
    )
  })
}
