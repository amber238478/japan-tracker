import { NextRequest, NextResponse } from 'next/server'
import { getReceipts, addReceipt } from '@/lib/notion'

let cache: { data: any; ts: number } | null = null
const TTL = 3 * 60 * 1000

export async function GET() {
  try {
    if (cache && Date.now() - cache.ts < TTL) {
      return NextResponse.json({ success: true, data: cache.data })
    }
    const receipts = await getReceipts()
    cache = { data: receipts, ts: Date.now() }
    return NextResponse.json({ success: true, data: receipts })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const receipt = await req.json()
    const id = await addReceipt(receipt)
    cache = null // invalidate
    return NextResponse.json({ success: true, id })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
