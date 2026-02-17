import { NextResponse } from 'next/server'
import { success } from '@/lib/response/formatter'
import { handleRoute } from '@/lib/http/handle-route'
import { requireEnv } from '@/lib/env'
import { HttpError } from '@/lib/errors/http-error'
import { createClient } from '@/lib/supabase/server-client'
import {
  getDependencyCircuitState,
  runWithDependencyGuard
} from '@/lib/http/dependency-guard'

const DEPENDENCY_GUARD_OPTIONS = {
  retries: 2,
  retryDelayMs: 250,
  failureThreshold: 3,
  cooldownMs: 15_000
}

function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new HttpError(503, 'DEPENDENCY_UNAVAILABLE', timeoutMessage))
    }, timeoutMs)
  })

  return Promise.race([operation, timeoutPromise]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  })
}

export async function GET(request: Request) {
  return handleRoute(request, async () => {
    const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
    const anonKey = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

    const response = await runWithDependencyGuard(
      'supabase-rest',
      async () => {
        const upstreamResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
          method: 'GET',
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`
          },
          cache: 'no-store',
          signal: AbortSignal.timeout(3_000)
        })

        if (upstreamResponse.status >= 500) {
          throw new HttpError(
            503,
            'DEPENDENCY_UNAVAILABLE',
            'Supabase dependency is unavailable'
          )
        }

        if (!upstreamResponse.ok) {
          throw new HttpError(
            503,
            'DEPENDENCY_UNAVAILABLE',
            `Supabase dependency returned status ${upstreamResponse.status}`
          )
        }

        return upstreamResponse
      },
      DEPENDENCY_GUARD_OPTIONS
    )

    try {
      await runWithDependencyGuard(
        'supabase-auth',
        async () => {
          const supabase = await createClient()
          const authResult = await withTimeout(
            supabase.auth.getSession(),
            3_000,
            'Supabase Auth dependency timed out'
          )

          if (authResult.error) {
            throw new HttpError(
              503,
              'DEPENDENCY_UNAVAILABLE',
              'Supabase Auth dependency is unavailable',
              { message: authResult.error.message }
            )
          }

          return authResult
        },
        DEPENDENCY_GUARD_OPTIONS
      )
    } catch (error) {
      if (error instanceof HttpError && error.status === 503) {
        throw error
      }

      throw new HttpError(
        503,
        'DEPENDENCY_UNAVAILABLE',
        'Supabase Auth dependency is unavailable'
      )
    }

    const circuitState = getDependencyCircuitState('supabase-rest')
    const authCircuitState = getDependencyCircuitState('supabase-auth')

    return NextResponse.json(
      success({
        status: 'ready',
        dependency: {
          supabase: 'reachable',
          auth: 'reachable',
          statusCode: response.status,
          circuitOpen: circuitState.isOpen,
          authCircuitOpen: authCircuitState.isOpen
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
