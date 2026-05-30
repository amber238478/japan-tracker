'use client'
import React from 'react'
import { exportReport } from '@/lib/report'

export default function FloatingReportButton() {
  return (
    <button onClick={() => exportReport()}
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
