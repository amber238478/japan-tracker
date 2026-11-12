import { NextRequest, NextResponse } from 'next/server'
import { getRemoteSettings, saveRemoteSettings } from '@/lib/notion'

export const dynamic = 'force-dynamic'

// 各裝置共用的 App 設定（旅行清單、兩人名字），存在 Notion
export async function GET() {
  try {
    const data = await getRemoteSettings()
    return NextResponse.json({ success: true, data }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const s = await req.json()
    if (!Array.isArray(s?.trips) || !s.trips.length || !s.user1 || !s.user2) {
      return NextResponse.json({ success: false, error: 'invalid settings' }, { status: 400 })
    }
    await saveRemoteSettings({ trips: s.trips, user1: s.user1, user2: s.user2, activeTrip: s.activeTrip, updatedAt: new Date().toISOString() })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
