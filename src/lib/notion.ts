import { Client } from '@notionhq/client'
import { Receipt } from './types'

const notion = new Client({ auth: process.env.NOTION_TOKEN })
const DB_ID = process.env.NOTION_DB_ID!

let schemaCache: Set<string> | null = null
async function getPropertyNames(): Promise<Set<string>> {
  if (schemaCache) return schemaCache
  const db = await notion.databases.retrieve({ database_id: DB_ID })
  schemaCache = new Set(Object.keys((db as any).properties ?? {}))
  return schemaCache
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
      const p = (page as any).properties
      const currency = p['幣別']?.select?.name === 'TWD' ? 'TWD' : 'JPY'
      results.push({
        notionId: page.id,
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
        splitWith: p['分帳對象']?.rich_text?.[0]?.plain_text ?? null,
        splitRatio: p['分帳比例']?.number ?? 0.5,
        notes: p['備註']?.rich_text?.[0]?.plain_text ?? '',
      })
    }

    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined
  } while (cursor)

  return results
}

export async function addReceipt(r: Receipt): Promise<string> {
  const currency = r.currency ?? 'JPY'
  const propNames = await getPropertyNames()
  const hasCurrencyField = propNames.has('幣別')
  const hasTwdField = propNames.has('金額TWD')

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

  const page = await notion.pages.create({ parent: { database_id: DB_ID }, properties })
  return page.id
}

export async function updateReceipt(notionId: string, r: Partial<Receipt>) {
  const propNames = await getPropertyNames()
  const hasCurrencyField = propNames.has('幣別')
  const hasTwdField = propNames.has('金額TWD')

  const props: any = {}
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
  if (r.notes !== undefined) props['備註'] = { rich_text: [{ text: { content: r.notes } }] }

  await notion.pages.update({ page_id: notionId, properties: props })
}

export async function deleteReceipt(notionId: string) {
  await notion.pages.update({ page_id: notionId, archived: true })
}
