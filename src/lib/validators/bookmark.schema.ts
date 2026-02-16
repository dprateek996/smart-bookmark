import { z } from 'zod'

export const bookmarkSchema = z.object({
  title: z.string().min(1).trim(),
  url: z.string().url().trim()
})