import { HttpError } from '@/lib/errors/http-error'

type ParseJsonOptions = {
  maxBytes: number
}

function parseContentLength(value: string | null): number | null {
  if (!value) {
    return null
  }

  const parsed = Number.parseInt(value, 10)

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null
  }

  return parsed
}

export async function parseJsonBody<T>(
  request: Request,
  options: ParseJsonOptions
): Promise<T> {
  const contentType = request.headers.get('content-type')?.toLowerCase() ?? ''

  if (!contentType.includes('application/json')) {
    throw new HttpError(
      415,
      'UNSUPPORTED_MEDIA_TYPE',
      'Content-Type must be application/json'
    )
  }

  const contentLength = parseContentLength(request.headers.get('content-length'))

  if (contentLength !== null && contentLength > options.maxBytes) {
    throw new HttpError(
      413,
      'PAYLOAD_TOO_LARGE',
      `Request body exceeds ${options.maxBytes} bytes limit`
    )
  }

  const rawBody = await request.text()
  const bytes = new TextEncoder().encode(rawBody).length

  if (bytes > options.maxBytes) {
    throw new HttpError(
      413,
      'PAYLOAD_TOO_LARGE',
      `Request body exceeds ${options.maxBytes} bytes limit`
    )
  }

  if (!rawBody.trim()) {
    throw new HttpError(400, 'INVALID_JSON', 'Request body must not be empty')
  }

  try {
    return JSON.parse(rawBody) as T
  } catch {
    throw new HttpError(400, 'INVALID_JSON', 'Request body must be valid JSON')
  }
}
