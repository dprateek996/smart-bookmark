import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth/get-user'
import { success } from '@/lib/response/formatter'
import { deleteBookmark } from '@/services/bookmark.service'
import { bookmarkIdParamSchema } from '@/lib/validators/bookmark.schema'
import { handleRoute } from '@/lib/http/handle-route'
import { enforceRateLimit } from '@/lib/security/rate-limit'

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handleRoute(request, async () => {
    enforceRateLimit(request, 'bookmarks:delete', {
      limit: 30,
      windowMs: 60_000
    })

    const params = await context.params
    const { id } = bookmarkIdParamSchema.parse(params)

    const user = await getUser()

    const data = await deleteBookmark(id, user.id)

    return NextResponse.json(success(data), {
      status: 200,
      headers: {
        'Cache-Control': 'no-store'
      }
    })
  })
}
