import { NextRequest, NextResponse } from 'next/server'
import { getReceipts, addReceipt } from '@/lib/notion'
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
    const receipt = await req.json()
    const id = await addReceipt(receipt)
    invalidateCache()
    return NextResponse.json({ success: true, id })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
