'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { resizeImageToBase64 } from '@/lib/image'
import ScanOverlay from '@/components/ScanOverlay'

export default function ScanPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)     // 從相簿／檔案上傳
  const cameraRef = useRef<HTMLInputElement>(null)   // 直接開相機
  const [preview, setPreview] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const [stage, setStage] = useState('')

  const handleFile = async (file: File) => {
    // 選完照片立刻顯示讀取中（iPhone 大圖讀取也要時間）
    setAnalyzing(true)
    setStage('讀取照片中')
    setError('')
    const reader = new FileReader()
    reader.onerror = () => { setError('照片讀取失敗，請重試'); setAnalyzing(false) }
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string
      setPreview(dataUrl)

      try {
        setStage('壓縮圖片中')
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
          router.push('/scan/confirm')
        } else {
          if (data.detail) console.error('analyze detail:', data.detail)
          setError(data.error || '辨識失敗，請重試或手動輸入')
          setAnalyzing(false)
        }
      } catch {
        setError('辨識逾時或網路不穩，請再試一次')
        setAnalyzing(false)
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <main style={{ padding: '20px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-secondary)' }}>←</button>
        <div>
          <div style={{ fontSize: 18, fontWeight: 500 }}>掃描收據</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>拍照或上傳收據圖片</div>
        </div>
      </div>

      <div
        style={{ border: '0.5px dashed var(--border)', borderRadius: 14, overflow: 'hidden', minHeight: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}
        onClick={() => !analyzing && fileRef.current?.click()}
      >
        {preview ? (
          <img src={preview} style={{ width: '100%', objectFit: 'contain', maxHeight: 400 }} />
        ) : (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>◎</div>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>點擊從相簿上傳收據</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>也可以用下方按鈕直接拍照 · 支援 JPG、PNG、HEIC</div>
          </div>
        )}

      </div>

      {analyzing && <ScanOverlay stage={stage} />}

      {error && <div style={{ color: 'var(--red)', fontSize: 13, marginTop: 12, textAlign: 'center' }}>{error}</div>}

      {/* 上傳：不加 capture，iPhone 可選照片圖庫或檔案 */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) handleFile(f) }}
      />
      {/* 拍照：直接開後鏡頭 */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) handleFile(f) }}
      />

      <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 10 }}>
        <button
          className="btn-primary"
          onClick={() => cameraRef.current?.click()}
          disabled={analyzing}
          style={{ opacity: analyzing ? 0.5 : 1 }}
        >
          📷 拍照
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={analyzing}
          style={{ opacity: analyzing ? 0.5 : 1, width: '100%', padding: '14px', borderRadius: 12, border: '1px solid var(--accent)', background: 'var(--accent-light)', color: 'var(--accent)', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          🖼️ 從相簿上傳
        </button>
      </div>

      <div style={{ marginTop: 10, textAlign: 'center' }}>
        <a href="/add" style={{ fontSize: 13, color: 'var(--text-muted)' }}>沒有收據？手動輸入 →</a>
      </div>
    </main>
  )
}
