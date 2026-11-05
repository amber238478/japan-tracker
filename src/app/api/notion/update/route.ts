import { NextRequest, NextResponse } from 'next/server'
import { updateReceipt, deleteReceipt, getReceipt } from '@/lib/notion'
import { invalidateCache } from '@/lib/receiptsCache'

export const dynamic = 'force-dynamic'

// 讀取單筆（直接問 Notion，不經快取）— 編輯頁使用
export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'missing id' }, { status: 400 })
    const data = await getReceipt(id)
    return NextResponse.json({ success: true, data }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { notionId, data } = await req.json()
    await updateReceipt(notionId, data)
    invalidateCache()
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { notionId } = await req.json()
    await deleteReceipt(notionId)
    invalidateCache()
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
