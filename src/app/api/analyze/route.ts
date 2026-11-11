import { NextRequest, NextResponse } from 'next/server'

// 依序嘗試。gemini-flash-latest 是 Google 維護的別名，舊模型下架時會自動指到新版。
// 可在 Vercel 設定 GEMINI_MODELS（逗號分隔）覆寫，不用改程式。
// 多個模型＋重試可能超過預設時限，放寬到 60 秒
export const maxDuration = 60

const DEFAULT_MODELS = [
  'gemini-flash-latest',
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-2.5-flash',
]
const MODELS = (process.env.GEMINI_MODELS || '').split(',').map(s => s.trim()).filter(Boolean)
const modelList = () => (MODELS.length ? MODELS : DEFAULT_MODELS)

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// 太忙（503）或額度（429）時，同一個模型稍等再試一次
async function callGemini(model: string, apiKey: string, body: string) {
  let res: Response | null = null
  for (let attempt = 0; attempt < 2; attempt++) {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }
    )
    if (res.status !== 503 && res.status !== 429) break
    if (attempt === 0) await sleep(1500)
  }
  return res!
}

const PROMPT = `你是一個日本收據辨識助手。分析這張收據圖片，回傳 JSON 格式資料。

規則：
- storeName: 店名翻譯成繁體中文
- storeNameJa: 店名日文原文
- items: 所有品項用繁體中文，逗號分隔（簡短描述）
- itemsJa: 品項日文原文，逗號分隔
- amountJPY: 最終付款金額（整數，日幣）
- category: 只能是以下其中一個：餐飲、交通、購物、門票、住宿、藥品、代買、其他
- paymentMethod: 只能是：現金、信用卡-星展、信用卡-熊本熊、Suica、PayPay、其他
- date: 收據日期 YYYY-MM-DD 格式，若看不出來用今天
- notes: 稅制或折扣資訊（若無則空字串）
- lineItems: 收據上的每一個品項（陣列），每項包含：
  - name: 繁體中文品名（簡短）
  - nameJa: 日文原文
  - qty: 數量（整數，沒寫就 1）
  - price: 該行的小計金額（整數日幣，已乘上數量，照收據印的數字）
  - 折扣、割引、クーポン 也列成一項，price 用負數
  - 若收據品項是「税抜」價格，另外加一項 {"name":"消費稅","nameJa":"消費税","qty":1,"price":稅額}，讓所有 price 加總等於 amountJPY
  - 不要列小計、合計、找零、付款金額這類行

只回傳 JSON，不要其他文字。格式：
{"storeName":"","storeNameJa":"","items":"","itemsJa":"","amountJPY":0,"category":"餐飲","paymentMethod":"現金","date":"","notes":"","lineItems":[{"name":"","nameJa":"","qty":1,"price":0}]}`

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mimeType } = await req.json()
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'GEMINI_API_KEY 未設定，請到 Vercel 專案的 Environment Variables 新增' }, { status: 500 })
    }

    // 新版模型已不支援 temperature 等取樣參數，所以不設定
    const body = JSON.stringify({
      contents: [{
        parts: [
          { text: PROMPT },
          { inline_data: { mime_type: mimeType || 'image/jpeg', data: imageBase64 } }
        ]
      }],
      generationConfig: { maxOutputTokens: 8192, responseMimeType: 'application/json' }
    })

    const errors: string[] = []
    const statuses: number[] = []
    for (const model of modelList()) {
      try {
        const res = await callGemini(model, apiKey, body)

        if (!res.ok) {
          statuses.push(res.status)
          const errText = `[${model}] HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`
          errors.push(errText)
          console.error('Gemini API error', errText)
          continue
        }

        const data = await res.json()
        // 新版模型可能先回「思考」段落，只取非思考的文字
        const parts: any[] = data.candidates?.[0]?.content?.parts ?? []
        const text = parts.filter(p => p?.text && !p.thought).map(p => p.text).join('')
        const finishReason = data.candidates?.[0]?.finishReason
        if (!text) {
          const errText = `[${model}] 空白回應（finishReason: ${finishReason}）`
          errors.push(errText)
          console.error(errText, JSON.stringify(data))
          continue
        }

        const match = text.match(/\{[\s\S]*\}/)
        const clean = (match ? match[0] : text).replace(/```json|```/g, '').trim()
        const parsed = JSON.parse(clean)
        return NextResponse.json({ success: true, data: parsed })
      } catch (e) {
        const errText = `[${model}] ${String(e)}`
        errors.push(errText)
        console.error('analyze failed', errText)
      }
    }

    const busy = statuses.some(s => s === 503 || s === 429)
    const gone = statuses.length > 0 && statuses.every(s => s === 404)
    const message = busy ? 'AI 目前太忙，請過幾秒再試一次'
      : gone ? 'AI 模型已下架，需要更新設定（GEMINI_MODELS）'
      : '辨識失敗，請重拍清楚一點或改用手動輸入'
    return NextResponse.json({ success: false, error: message, detail: errors.join(' | ') }, { status: 500 })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
