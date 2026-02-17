import { ZodError } from 'zod'
import { HttpError } from '@/lib/errors/http-error'

type MappedError = {
  status: number
  code: string
  message: string
  details?: unknown
}

type SupabaseLikeError = {
  code?: string
  message: string
  details?: string | null
  hint?: string | null
}

function isSupabaseLikeError(error: unknown): error is SupabaseLikeError {
  if (!error || typeof error !== 'object') {
    return false
  }

  return (
    'message' in error &&
    typeof error.message === 'string' &&
    ('code' in error || 'details' in error || 'hint' in error)
  )
}

export function mapError(error: unknown): MappedError {
  if (error instanceof HttpError) {
    return {
      status: error.status,
      code: error.code,
      message: error.message,
      details: error.details
    }
  }

  if (error instanceof ZodError) {
    return {
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: error.flatten()
    }
  }

  if (error instanceof SyntaxError) {
    return {
      status: 400,
      code: 'INVALID_JSON',
      message: 'Request body must be valid JSON'
    }
  }

  if (error instanceof DOMException && error.name === 'TimeoutError') {
    return {
      status: 504,
      code: 'UPSTREAM_TIMEOUT',
      message: 'Upstream dependency timed out'
    }
  }

  if (isSupabaseLikeError(error)) {
    if (error.code === 'PGRST116') {
      return {
        status: 404,
        code: 'NOT_FOUND',
        message: 'Resource not found'
      }
    }

    return {
      status: 500,
      code: 'DATABASE_ERROR',
      message: error.message || 'Database operation failed',
      details: error.details
    }
  }

  if (error instanceof Error) {
    if (error.message.toLowerCase().includes('fetch failed')) {
      return {
        status: 503,
        code: 'DEPENDENCY_UNAVAILABLE',
        message: 'Upstream dependency is unavailable'
      }
    }

    return {
      status: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: error.message || 'Unexpected server error'
    }
  }

  return {
    status: 500,
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Unexpected server error'
  }
}
