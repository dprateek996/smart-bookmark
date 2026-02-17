import { NextResponse } from 'next/server'
import { success } from '@/lib/response/formatter'
import { handleRoute } from '@/lib/http/handle-route'

export async function GET(request: Request) {
  return handleRoute(request, async () =>
    NextResponse.json(
      success({
        status: 'alive',
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store'
        }
      }
    )
  )
}
