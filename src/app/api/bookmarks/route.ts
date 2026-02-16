import { NextResponse } from 'next/server'
import { bookmarkSchema } from '@/lib/validators/bookmark.schema'
import { success, failure } from '@/lib/response/formatter'
import { getUser } from '@/lib/auth/get-user'
import {
  getBookmarks,
  createBookmark
} from '@/services/bookmark.service'

export async function GET() {
  try {
    const user = await getUser()

    const data = await getBookmarks(user.id)

    return NextResponse.json(success(data), {
      status: 200
    })
  } catch (e: any) {
    return NextResponse.json(failure(e.message), {
      status: 401
    })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const parsed = bookmarkSchema.parse(body)

    const user = await getUser()

    const data = await createBookmark(
      parsed.title,
      parsed.url,
      user.id
    )

    return NextResponse.json(success(data), {
      status: 201
    })
  } catch (e: any) {
    return NextResponse.json(failure(e.message), {
      status: 400
    })
  }
}