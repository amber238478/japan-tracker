import { NextRequest, NextResponse } from 'next/server'
import { updateReceipt, deleteReceipt } from '@/lib/notion'

export async function POST(req: NextRequest) {
  try {
    const { notionId, data } = await req.json()
    await updateReceipt(notionId, data)
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { notionId } = await req.json()
    await deleteReceipt(notionId)
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
