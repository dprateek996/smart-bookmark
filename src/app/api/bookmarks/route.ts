import { NextResponse } from 'next/server'
import { bookmarkSchema } from '@/lib/validators/bookmark.schema'
import { success } from '@/lib/response/formatter'
import { getUser } from '@/lib/auth/get-user'
import {
  getBookmarks,
  createBookmark
} from '@/services/bookmark.service'
import { handleRoute } from '@/lib/http/handle-route'
import { enforceRateLimit } from '@/lib/security/rate-limit'
import { parseJsonBody } from '@/lib/http/parse-json-body'

const CREATE_BOOKMARK_BODY_LIMIT_BYTES = 16 * 1024

export async function GET(request: Request) {
  return handleRoute(request, async () => {
    enforceRateLimit(request, 'bookmarks:read', {
      limit: 120,
      windowMs: 60_000
    })

    const user = await getUser()
    const data = await getBookmarks(user.id)

    return NextResponse.json(success(data), {
      status: 200,
      headers: {
        'Cache-Control': 'no-store'
      }
    })
  })
}

export async function POST(req: Request) {
  return handleRoute(req, async () => {
    enforceRateLimit(req, 'bookmarks:create', {
      limit: 30,
      windowMs: 60_000
    })

    const body = await parseJsonBody<unknown>(req, {
      maxBytes: CREATE_BOOKMARK_BODY_LIMIT_BYTES
    })

    const parsed = bookmarkSchema.parse(body)

    const user = await getUser()

    const data = await createBookmark(
      parsed.title,
      parsed.url,
      user.id
    )

    return NextResponse.json(success(data), {
      status: 201,
      headers: {
        'Cache-Control': 'no-store'
      }
    })
  })
}
