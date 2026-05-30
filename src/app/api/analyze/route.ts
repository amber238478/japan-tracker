import { NextRequest, NextResponse } from 'next/server'

const MODELS = [
  'gemini-2.0-flash-001',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
]

const PROMPT = `你是一個日本收據辨識助手。分析這張收據圖片，回傳 JSON 格式資料。

規則：
- storeName: 店名翻譯成繁體中文
- storeNameJa: 店名日文原文
- items: 所有品項用繁體中文，逗號分隔（簡短描述）
- itemsJa: 品項日文原文，逗號分隔
- amountJPY: 最終付款金額（整數，日幣）
- category: 只能是以下其中一個：餐飲、交通、購物、門票、住宿、藥品、其他
- paymentMethod: 只能是：現金、信用卡、Suica、PayPay、其他
- date: 收據日期 YYYY-MM-DD 格式，若看不出來用今天
- notes: 稅制或折扣資訊（若無則空字串）

只回傳 JSON，不要其他文字。格式：
{"storeName":"","storeNameJa":"","items":"","itemsJa":"","amountJPY":0,"category":"餐飲","paymentMethod":"現金","date":"","notes":""}`

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mimeType } = await req.json()
    const apiKey = process.env.GEMINI_API_KEY

    let lastError = ''
    for (const model of MODELS) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: PROMPT },
                  { inline_data: { mime_type: mimeType || 'image/jpeg', data: imageBase64 } }
                ]
              }],
              generationConfig: { temperature: 0.1, maxOutputTokens: 1024 }
            })
          }
        )

        if (!res.ok) {
          lastError = await res.text()
          continue
        }

        const data = await res.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
        const clean = text.replace(/```json|```/g, '').trim()
        const parsed = JSON.parse(clean)
        return NextResponse.json({ success: true, data: parsed })
      } catch (e) {
        lastError = String(e)
      }
    }

    return NextResponse.json({ success: false, error: lastError }, { status: 500 })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
