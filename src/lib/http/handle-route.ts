import { NextResponse } from 'next/server'
import { failure } from '@/lib/response/formatter'
import { mapError } from '@/lib/errors/map-error'
import { log } from '@/lib/logging/logger'

export async function handleRoute(
  request: Request,
  handler: () => Promise<Response>
) {
  const startedAt = Date.now()
  const { pathname } = new URL(request.url)
  const requestId =
    request.headers.get('x-request-id') ??
    request.headers.get('x-correlation-id') ??
    crypto.randomUUID()

  log('info', {
    event: 'request.received',
    requestId,
    method: request.method,
    path: pathname
  })

  try {
    const response = await handler()

    response.headers.set('Cache-Control', 'no-store')
    response.headers.set('x-request-id', requestId)

    log('info', {
      event: 'request.completed',
      requestId,
      method: request.method,
      path: pathname,
      status: response.status,
      durationMs: Date.now() - startedAt
    })

    return response
  } catch (error) {
    const mapped = mapError(error)

    log('error', {
      event: 'request.failed',
      requestId,
      method: request.method,
      path: pathname,
      status: mapped.status,
      code: mapped.code,
      message: mapped.message,
      durationMs: Date.now() - startedAt
    })

    const response = NextResponse.json(
      failure(mapped.code, mapped.message, mapped.details),
      {
        status: mapped.status
      }
    )

    response.headers.set('Cache-Control', 'no-store')
    response.headers.set('x-request-id', requestId)
    return response
  }
}
