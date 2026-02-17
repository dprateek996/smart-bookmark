import { describe, expect, it } from 'vitest'
import { bookmarkSchema } from './bookmark.schema'

describe('bookmarkSchema', () => {
  it('accepts a valid title and URL', () => {
    const parsed = bookmarkSchema.parse({
      title: '  Next.js Docs  ',
      url: 'https://nextjs.org/docs'
    })

    expect(parsed).toEqual({
      title: 'Next.js Docs',
      url: 'https://nextjs.org/docs'
    })
  })

  it('rejects invalid URL values', () => {
    const result = bookmarkSchema.safeParse({
      title: 'My Link',
      url: 'not-a-valid-url'
    })

    expect(result.success).toBe(false)
  })

  it('rejects empty title values', () => {
    const result = bookmarkSchema.safeParse({
      title: '   ',
      url: 'https://example.com'
    })

    expect(result.success).toBe(false)
  })

  it('enforces title and URL length limits', () => {
    const overLimitTitle = 'a'.repeat(201)
    const overLimitUrl = `https://example.com/${'a'.repeat(2050)}`

    const titleResult = bookmarkSchema.safeParse({
      title: overLimitTitle,
      url: 'https://example.com'
    })
    const urlResult = bookmarkSchema.safeParse({
      title: 'Valid title',
      url: overLimitUrl
    })

    expect(titleResult.success).toBe(false)
    expect(urlResult.success).toBe(false)
  })
})
