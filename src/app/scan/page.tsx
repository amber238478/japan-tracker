'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { resizeImageToBase64 } from '@/lib/image'

export default function ScanPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const [stage, setStage] = useState('')
  const [seconds, setSeconds] = useState(0)

  // 讀取中每秒更新經過時間
  useEffect(() => {
    if (!analyzing) return
    setSeconds(0)
    const t = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [analyzing])

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
          body: JSON.stringify({ imageBase64: base64, mimeType })
        })
        const data = await res.json()
        if (data.success) {
          setStage('整理結果中')
          sessionStorage.setItem('scanned-receipt', JSON.stringify(data.data))
          router.push('/scan/confirm')
        } else {
          setError(data.error ? `辨識失敗：${data.error}` : '辨識失敗，請重試或手動輸入')
          setAnalyzing(false)
        }
      } catch {
        setError('網路錯誤，請重試')
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
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>點擊上傳收據</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>支援 JPG、PNG、HEIC</div>
          </div>
        )}

      </div>

      {analyzing && (
        <div role="status" aria-live="polite"
          style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24, textAlign: 'center' }}>
          <div className="spinner" />
          <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--accent)' }}>讀取中…</div>
          <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{stage}<span style={{ color: 'var(--text-muted)' }}> · 已 {seconds} 秒</span></div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {seconds < 15 ? '通常需要 5–15 秒，請不要關閉畫面' : '收據比較長，還在努力辨識中…'}
          </div>
        </div>
      )}

      {error && <div style={{ color: 'var(--red)', fontSize: 13, marginTop: 12, textAlign: 'center' }}>{error}</div>}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) handleFile(f) }}
      />

      <div style={{ marginTop: 16 }}>
        <button
          className="btn-primary"
          onClick={() => fileRef.current?.click()}
          disabled={analyzing}
          style={{ opacity: analyzing ? 0.5 : 1 }}
        >
          {analyzing ? '辨識中...' : '選擇圖片'}
        </button>
      </div>

      <div style={{ marginTop: 10, textAlign: 'center' }}>
        <a href="/add" style={{ fontSize: 13, color: 'var(--text-muted)' }}>沒有收據？手動輸入 →</a>
      </div>
    </main>
  )
}
