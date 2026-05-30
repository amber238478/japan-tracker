'use client'
import React from 'react'
import { exportReport } from '@/lib/report'

export default function FloatingReportButton() {
  const handleClick = async () => {
    const include = window.confirm('要包含螢幕截圖嗎？系統會要求你分享畫面以擷取影像。')
    try {
      await exportReport(include)
      alert('報告已建立並下載（同時嘗試複製到剪貼簿）。')
    } catch (e) {
      console.error('Export failed', e)
      alert('建立報告失敗，請查看 console 或稍後再試。')
    }
  }

  return (
    <button onClick={handleClick}
      title="回報錯誤 / 匯出報告"
      style={{
        position: 'fixed',
        right: 18,
        bottom: 18,
        zIndex: 1000,
        padding: '10px 12px',
        borderRadius: 999,
        border: 'none',
        background: 'var(--accent)',
        color: 'white',
        boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
        cursor: 'pointer',
      }}>
      🐞 回報
    </button>
  )
}
