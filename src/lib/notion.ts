import { Client } from '@notionhq/client'
import { LineItem, Receipt } from './types'

const notion = new Client({ auth: process.env.NOTION_TOKEN })
const DB_ID = process.env.NOTION_DB_ID!

let schemaCache: Set<string> | null = null
async function getPropertyNames(): Promise<Set<string>> {
  if (schemaCache) return schemaCache
  const db = await notion.databases.retrieve({ database_id: DB_ID })
  schemaCache = new Set(Object.keys((db as any).properties ?? {}))
  return schemaCache
}

const LINE_ITEMS_PROP = '明細'

// 明細以 JSON 存在 rich_text 欄位；資料庫沒有這個欄位時自動建立
async function ensureLineItemsProp(propNames: Set<string>): Promise<boolean> {
  if (propNames.has(LINE_ITEMS_PROP)) return true
  try {
    await notion.databases.update({ database_id: DB_ID, properties: { [LINE_ITEMS_PROP]: { rich_text: {} } } as any })
    propNames.add(LINE_ITEMS_PROP)
    return true
  } catch (e) {
    console.error('無法自動建立「明細」欄位，請手動在 Notion 新增（文字類型）', e)
    return false
  }
}

function lineItemsToRichText(items: LineItem[] | undefined) {
  const json = items && items.length ? JSON.stringify(items) : ''
  const chunks: { text: { content: string } }[] = []
  for (let i = 0; i < json.length; i += 1900) chunks.push({ text: { content: json.slice(i, i + 1900) } })
  return { rich_text: chunks }
}

function parseLineItems(prop: any): LineItem[] {
  const raw = (prop?.rich_text ?? []).map((t: any) => t.plain_text ?? '').join('')
  if (!raw) return []
  try {
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr
      .filter((x: any) => x && typeof x.name === 'string')
      .map((x: any) => ({ name: x.name, nameJa: x.nameJa ?? '', qty: Number(x.qty) || 1, price: Number(x.price) || 0 }))
  } catch {
    return []
  }
}

function parsePage(page: any): Receipt {
  const p = page.properties
  const currency = p['幣別']?.select?.name === 'TWD' ? 'TWD' : 'JPY'
  return {
    notionId: page.id,
    trip: p['行程']?.select?.name ?? '',
    storeName: p['商店名稱']?.rich_text?.[0]?.plain_text ?? '',
    storeNameJa: p['商店日文']?.rich_text?.[0]?.plain_text ?? '',
    items: p['項目']?.title?.[0]?.plain_text ?? '',
    itemsJa: p['商品日文']?.rich_text?.[0]?.plain_text ?? '',
    amount: currency === 'TWD' ? (p['金額TWD']?.number ?? 0) : (p['金額JPY']?.number ?? 0),
    currency,
    category: p['類別']?.select?.name ?? '其他',
    paymentMethod: p['支付方式']?.select?.name ?? '現金',
    date: p['日期']?.date?.start ?? '',
    region: p['地區']?.rich_text?.[0]?.plain_text ?? '',
    paidBy: p['付款人']?.rich_text?.[0]?.plain_text ?? '',
    // 空字串 = 不分帳（計算也是這樣看），統一成 null，避免畫面誤顯示成 AA 分帳
    splitWith: p['分帳對象']?.rich_text?.[0]?.plain_text || null,
    splitRatio: p['分帳比例']?.number ?? 0.5,
    proxyFor: p['代買對象']?.rich_text?.[0]?.plain_text ?? '',
    notes: p['備註']?.rich_text?.[0]?.plain_text ?? '',
    lineItems: parseLineItems(p[LINE_ITEMS_PROP]),
  }
}

export async function getReceipts(): Promise<Receipt[]> {
  const results: Receipt[] = []
  let cursor: string | undefined = undefined

  do {
    const res = await notion.databases.query({
      database_id: DB_ID,
      sorts: [{ property: '日期', direction: 'descending' }],
      start_cursor: cursor,
      page_size: 100,
    })

    for (const page of res.results) {
      if (page.object !== 'page') continue
      results.push(parsePage(page))
    }

    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined
  } while (cursor)

  return results
}

export async function getReceipt(notionId: string): Promise<Receipt> {
  const page = await notion.pages.retrieve({ page_id: notionId })
  return parsePage(page)
}

export async function addReceipt(r: Receipt): Promise<string> {
  const currency = r.currency ?? 'JPY'
  const propNames = await getPropertyNames()
  const hasCurrencyField = propNames.has('幣別')
  const hasTwdField = propNames.has('金額TWD')
  const hasTripField = propNames.has('行程')

  const properties: any = {
    '項目': { title: [{ text: { content: r.items ?? '' } }] },
    '商店名稱': { rich_text: [{ text: { content: r.storeName ?? '' } }] },
    '商店日文': { rich_text: [{ text: { content: r.storeNameJa ?? '' } }] },
    '商品日文': { rich_text: [{ text: { content: r.itemsJa ?? '' } }] },
    '日期': { date: { start: r.date } },
    // 沒有 金額TWD 欄位時，TWD 金額暫存於 金額JPY 以免遺失（之後新增欄位即可正確分流）
    '金額JPY': { number: (currency === 'JPY' || !hasTwdField) ? r.amount : 0 },
    '類別': { select: { name: r.category } },
    '支付方式': { select: { name: r.paymentMethod } },
    '地區': { rich_text: [{ text: { content: r.region ?? '' } }] },
    '付款人': { rich_text: [{ text: { content: r.paidBy ?? '' } }] },
    '分帳對象': { rich_text: [{ text: { content: r.splitWith ?? '' } }] },
    '分帳比例': { number: r.splitRatio },
    '備註': { rich_text: [{ text: { content: r.notes ?? '' } }] },
  }
  if (hasCurrencyField) properties['幣別'] = { select: { name: currency } }
  if (hasTwdField) properties['金額TWD'] = { number: currency === 'TWD' ? r.amount : 0 }
  if (hasTripField && r.trip) properties['行程'] = { select: { name: r.trip } }
  if (propNames.has('代買對象')) properties['代買對象'] = { rich_text: [{ text: { content: r.proxyFor ?? '' } }] }
  if (r.lineItems?.length && await ensureLineItemsProp(propNames)) properties[LINE_ITEMS_PROP] = lineItemsToRichText(r.lineItems)

  const page = await notion.pages.create({ parent: { database_id: DB_ID }, properties })
  return page.id
}

export async function updateReceipt(notionId: string, r: Partial<Receipt>) {
  const propNames = await getPropertyNames()
  const hasCurrencyField = propNames.has('幣別')
  const hasTwdField = propNames.has('金額TWD')
  const hasTripField = propNames.has('行程')

  const props: any = {}
  if (r.trip !== undefined && hasTripField) props['行程'] = { select: { name: r.trip } }
  if (r.items !== undefined) props['項目'] = { title: [{ text: { content: r.items } }] }
  if (r.storeName !== undefined) props['商店名稱'] = { rich_text: [{ text: { content: r.storeName } }] }
  if (r.amount !== undefined && r.currency !== undefined) {
    if (hasCurrencyField) props['幣別'] = { select: { name: r.currency } }
    props['金額JPY'] = { number: (r.currency === 'JPY' || !hasTwdField) ? r.amount : 0 }
    if (hasTwdField) props['金額TWD'] = { number: r.currency === 'TWD' ? r.amount : 0 }
  }
  if (r.category !== undefined) props['類別'] = { select: { name: r.category } }
  if (r.paymentMethod !== undefined) props['支付方式'] = { select: { name: r.paymentMethod } }
  if (r.date !== undefined) props['日期'] = { date: { start: r.date } }
  if (r.paidBy !== undefined) props['付款人'] = { rich_text: [{ text: { content: r.paidBy } }] }
  if (r.splitWith !== undefined) props['分帳對象'] = { rich_text: [{ text: { content: r.splitWith ?? '' } }] }
  if (r.splitRatio !== undefined) props['分帳比例'] = { number: r.splitRatio }
  if (r.proxyFor !== undefined && propNames.has('代買對象')) props['代買對象'] = { rich_text: [{ text: { content: r.proxyFor ?? '' } }] }
  if (r.notes !== undefined) props['備註'] = { rich_text: [{ text: { content: r.notes } }] }
  if (r.lineItems !== undefined && (propNames.has(LINE_ITEMS_PROP) || (r.lineItems.length && await ensureLineItemsProp(propNames)))) {
    props[LINE_ITEMS_PROP] = lineItemsToRichText(r.lineItems)
  }

  await notion.pages.update({ page_id: notionId, properties: props })
}

export async function deleteReceipt(notionId: string) {
  await notion.pages.update({ page_id: notionId, archived: true })
}
