import { HttpError } from '@/lib/errors/http-error'

export function requireEnv(name: string) {
  const value = process.env[name]

  if (!value) {
    throw new HttpError(
      500,
      'CONFIGURATION_ERROR',
      `Missing required environment variable: ${name}`
    )
  }

  return value
}
