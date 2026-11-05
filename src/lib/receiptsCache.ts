// 伺服器端 /api/notion 的記憶體快取（新增、編輯、刪除後都要清除）
let cache: { data: any; ts: number } | null = null
const TTL = 3 * 60 * 1000

export function getCached(since = 0) {
  if (!cache) return null
  if (Date.now() - cache.ts >= TTL) return null
  if (since && cache.ts < since) return null // 客戶端在快取之後有寫入 → 不用舊快取
  return cache.data
}
export function setCached(data: any) { cache = { data, ts: Date.now() } }
export function invalidateCache() { cache = null }
