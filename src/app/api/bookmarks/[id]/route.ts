import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth/get-user'
import { success, failure } from '@/lib/response/formatter'
import { deleteBookmark } from '@/services/bookmark.service'

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUser()

    const data = await deleteBookmark(
      params.id,
      user.id
    )

    return NextResponse.json(success(data), {
      status: 200
    })
  } catch (e: any) {
    return NextResponse.json(failure(e.message), {
      status: 400
    })
  }
}