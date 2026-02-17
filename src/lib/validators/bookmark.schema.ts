import { z } from 'zod'

export const bookmarkSchema = z.object({
  title: z.string().trim().min(1).max(200),
  url: z.string().trim().url().max(2_048)
})

export const bookmarkIdParamSchema = z.object({
  id: z.string().trim().min(1).max(128)
})
