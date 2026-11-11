import { NextRequest, NextResponse } from 'next/server'

// 模型清單：gemini-flash-latest 是 Google 維護的別名，舊模型下架時會自動指到新版。
// 可在 Vercel 設定 GEMINI_MODELS（逗號分隔）覆寫，不用改程式。
const DEFAULT_MODELS = [
  'gemini-flash-latest',
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-2.5-flash',
]
const MODELS = (process.env.GEMINI_MODELS || '').split(',').map(s => s.trim()).filter(Boolean)
const modelList = () => (MODELS.length ? MODELS : DEFAULT_MODELS)

// 伺服器上限 60 秒；整體 50 秒內要有結果
export const maxDuration = 60
const TOTAL_MS = 50000
// 第一個模型超過這個時間還沒回，就「同時」再問下一個模型，誰先回用誰
const HEDGE_MS = 9000

// 測試時可指向假伺服器
const API_BASE = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com'

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// 收據辨識不需要深度思考：Gemini 2.5 關掉思考，Gemini 3 之後用最低思考
function thinkingConfig(model: string) {
  return model.startsWith('gemini-2.5') ? { thinkingBudget: 0 } : { thinkingLevel: 'minimal' }
}

function buildBody(model: string, imageBase64: string, mimeType: string, withThinking: boolean) {
  // 新版模型已不支援 temperature 等取樣參數，所以不設定
  const generationConfig: any = { maxOutputTokens: 8192, responseMimeType: 'application/json' }
  if (withThinking) generationConfig.thinkingConfig = thinkingConfig(model)
  return JSON.stringify({
    contents: [{
      parts: [
        { text: PROMPT },
        { inline_data: { mime_type: mimeType || 'image/jpeg', data: imageBase64 } }
      ]
    }],
    generationConfig,
  })
}

type Attempt =
  | { ok: true; model: string; data: any }
  | { ok: false; model: string; status?: number; timeout?: boolean; err: string }

// 問一個模型：太忙（503／429）稍等再試一次；思考設定不被接受（400）就拿掉再試
async function tryModel(model: string, apiKey: string, imageBase64: string, mimeType: string,
  deadline: number, cancel: AbortSignal): Promise<Attempt> {
  let withThinking = true
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const remaining = deadline - Date.now()
      if (remaining < 2000) return { ok: false, model, timeout: true, err: 'no time left' }
      const res = await fetch(
        `${API_BASE}/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: buildBody(model, imageBase64, mimeType, withThinking),
          signal: AbortSignal.any([cancel, AbortSignal.timeout(remaining)]),
        }
      )
      if (res.status === 400 && withThinking) { withThinking = false; continue }
      if ((res.status === 503 || res.status === 429) && attempt === 0) { await sleep(1500); continue }
      if (!res.ok) {
        return { ok: false, model, status: res.status, err: `HTTP ${res.status}: ${(await res.text()).slice(0, 300)}` }
      }

      const data = await res.json()
      // 新版模型可能先回「思考」段落，只取非思考的文字
      const parts: any[] = data.candidates?.[0]?.content?.parts ?? []
      const text = parts.filter(p => p?.text && !p.thought).map(p => p.text).join('')
      if (!text) return { ok: false, model, err: `空白回應（finishReason: ${data.candidates?.[0]?.finishReason}）` }

      const match = text.match(/\{[\s\S]*\}/)
      const clean = (match ? match[0] : text).replace(/```json|```/g, '').trim()
      return { ok: true, model, data: JSON.parse(clean) }
    }
    return { ok: false, model, err: 'retries exhausted' }
  } catch (e) {
    const name = (e as any)?.name
    return { ok: false, model, timeout: name === 'TimeoutError' || name === 'AbortError', err: String(e) }
  }
}

// 先問第一個模型；超過 HEDGE_MS 沒回或失敗，就加問下一個模型（同時進行），誰先成功用誰
function raceModels(apiKey: string, imageBase64: string, mimeType: string) {
  const models = modelList()
  const deadline = Date.now() + TOTAL_MS
  const cancel = new AbortController()
  const failures: Attempt[] = []

  return new Promise<{ win?: Attempt; failures: Attempt[]; timedOut: boolean }>(resolve => {
    let next = 0, pending = 0, done = false
    const finish = (win?: Attempt, timedOut = false) => {
      if (done) return
      done = true
      clearInterval(hedge); clearTimeout(overall)
      cancel.abort() // 停掉其他還在跑的模型
      resolve({ win, failures, timedOut })
    }
    const launch = () => {
      if (done) return
      if (next >= models.length || deadline - Date.now() < 3000) {
        if (pending === 0) finish(undefined, deadline - Date.now() < 3000)
        return
      }
      const model = models[next++]
      pending++
      tryModel(model, apiKey, imageBase64, mimeType, deadline, cancel.signal).then(r => {
        pending--
        if (done) return
        if (r.ok) return finish(r)
        failures.push(r)
        console.error('Gemini attempt failed', r.model, r.err)
        launch()
      })
    }
    const hedge = setInterval(launch, HEDGE_MS)
    const overall = setTimeout(() => finish(undefined, true), TOTAL_MS)
    launch()
  })
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

    const started = Date.now()
    const { win, failures, timedOut } = await raceModels(apiKey, imageBase64, mimeType)
    const ms = Date.now() - started
    if (win && win.ok) {
      console.log(`analyze ok: ${win.model} in ${ms}ms`)
      return NextResponse.json({ success: true, data: win.data, meta: { model: win.model, ms } })
    }

    const statuses = failures.map(f => (f.ok ? 0 : f.status ?? 0)).filter(Boolean)
    const errors = failures.map(f => `[${f.model}] ${f.ok ? '' : f.err}`)
    const anyTimeout = timedOut || failures.some(f => !f.ok && f.timeout)
    const busy = statuses.some(s => s === 503 || s === 429)
    const gone = statuses.length > 0 && statuses.every(s => s === 404)
    const message = anyTimeout ? 'AI 回應太慢，請再試一次'
      : busy ? 'AI 目前太忙，請過幾秒再試一次'
      : gone ? 'AI 模型已下架，需要更新設定（GEMINI_MODELS）'
      : '辨識失敗，請重拍清楚一點或改用手動輸入'
    return NextResponse.json({ success: false, error: message, detail: errors.join(' | ') }, { status: 500 })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
