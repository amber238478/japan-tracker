'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ScanPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')

  const handleFile = async (file: File) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string
      setPreview(dataUrl)
      setAnalyzing(true)
      setError('')

      const base64 = dataUrl.split(',')[1]
      const mimeType = file.type

      try {
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, mimeType })
        })
        const data = await res.json()
        if (data.success) {
          sessionStorage.setItem('scanned-receipt', JSON.stringify(data.data))
          router.push('/scan/confirm')
        } else {
          setError('辨識失敗，請重試或手動輸入')
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

        {analyzing && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(250,248,245,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--accent)' }}>AI 正在辨識收據...</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>請稍候，這可能需要幾秒鐘</div>
          </div>
        )}
      </div>

      {error && <div style={{ color: 'var(--red)', fontSize: 13, marginTop: 12, textAlign: 'center' }}>{error}</div>}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
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
