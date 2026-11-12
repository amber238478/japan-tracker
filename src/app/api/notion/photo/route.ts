import { NextRequest, NextResponse } from 'next/server'
import { attachPhoto } from '@/lib/notion'
import { invalidateCache } from '@/lib/receiptsCache'

export const dynamic = 'force-dynamic'

// 幫已存在的紀錄附上（或更換）收據照片
export async function POST(req: NextRequest) {
  try {
    const { notionId, photo, filename } = await req.json()
    if (!notionId || !photo) return NextResponse.json({ success: false, error: 'missing notionId or photo' }, { status: 400 })
    await attachPhoto(notionId, photo, filename || 'receipt.jpg')
    invalidateCache()
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
