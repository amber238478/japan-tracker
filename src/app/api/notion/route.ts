import { NextRequest, NextResponse } from 'next/server'
import { getReceipts, addReceipt, attachPhoto } from '@/lib/notion'
import { getCached, setCached, invalidateCache } from '@/lib/receiptsCache'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const since = Number(req.nextUrl.searchParams.get('since') ?? 0) || 0
    const cached = getCached(since)
    if (cached) {
      return NextResponse.json({ success: true, data: cached }, { headers: { 'Cache-Control': 'no-store' } })
    }
    const receipts = await getReceipts()
    setCached(receipts)
    return NextResponse.json({ success: true, data: receipts }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { photo, ...receipt } = await req.json()
    const id = await addReceipt(receipt)
    // 照片另外上傳；失敗也不影響紀錄本身
    let photoError: string | undefined
    if (photo) {
      try {
        await attachPhoto(id, photo, `${receipt.date || 'receipt'}-${(receipt.storeName || 'receipt').slice(0, 20)}.jpg`)
      } catch (e) {
        photoError = String(e)
        console.error('photo upload failed', e)
      }
    }
    invalidateCache()
    return NextResponse.json({ success: true, id, photoSaved: !!photo && !photoError, photoError })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
