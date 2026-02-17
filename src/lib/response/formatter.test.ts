import { describe, expect, it } from 'vitest'
import { failure, success } from './formatter'

describe('response formatter', () => {
  it('formats success responses with the expected contract', () => {
    const payload = {
      id: 'abc123',
      title: 'Next.js',
      url: 'https://nextjs.org'
    }

    const result = success(payload)

    expect(result).toEqual({
      success: true,
      data: payload,
      error: null
    })
  })

  it('formats failure responses with code, message, and details', () => {
    const details = {
      field: 'url',
      reason: 'Invalid format'
    }

    const result = failure(
      'VALIDATION_ERROR',
      'Request validation failed',
      details
    )

    expect(result).toEqual({
      success: false,
      data: null,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details
      }
    })
  })
})
