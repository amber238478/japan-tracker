'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { resizeImageToBase64 } from '@/lib/image'

/** 送出收據照片給 AI 辨識，成功後進確認頁（底部掃描按鈕、手動新增頁的相簿上傳共用） */
export function useReceiptScan() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [stage, setStage] = useState('')

  const scan = async (file: File) => {
    setBusy(true)
    setStage('壓縮圖片中')
    let done = false
    try {
      const { base64, mimeType } = await resizeImageToBase64(file)
      setStage('AI 辨識收據中')
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
        signal: AbortSignal.timeout(65000),
      })
      const data = await res.json()
      if (data.success) {
        setStage('整理結果中')
        sessionStorage.setItem('scanned-receipt', JSON.stringify(data.data))
        done = true // 讀取畫面保留到確認頁出現
        router.push('/scan/confirm')
      } else {
        if (data.detail) console.error('analyze detail:', data.detail)
        alert(data.error || '辨識失敗，請重試或改用手動輸入')
      }
    } catch (err) {
      console.error(err)
      alert('辨識逾時或網路不穩，請再試一次')
    } finally {
      if (!done) setBusy(false)
    }
  }

  return { busy, stage, scan }
}
