// 客戶端：取得紀錄，並在本機有寫入後強制略過伺服器快取
const KEY = 'receipts:lastWrite'

export function markReceiptsDirty() {
  try { localStorage.setItem(KEY, String(Date.now())) } catch {}
}

export function fetchReceipts(): Promise<Response> {
  let since = ''
  try { since = localStorage.getItem(KEY) ?? '' } catch {}
  const url = since ? `/api/notion?since=${since}` : '/api/notion'
  return fetch(url, { cache: 'no-store' })
}
