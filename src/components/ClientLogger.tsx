'use client'
import { useEffect } from 'react'

export default function ClientLogger() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if ((window as any).__appLogs) return
    const max = 200
    const logs: Array<{ level: string; args: any[]; ts: number }> = []
    ;(window as any).__appLogs = logs
    const wrap = (level: string, orig: any) => (...args: any[]) => {
      try {
        logs.push({ level, args, ts: Date.now() })
        if (logs.length > max) logs.shift()
      } catch (e) {}
      try { orig.apply(console, args) } catch (e) {}
    }
    const origConsole = { ...console }
    console.log = wrap('log', origConsole.log)
    console.info = wrap('info', origConsole.info)
    console.warn = wrap('warn', origConsole.warn)
    console.error = wrap('error', origConsole.error)
    // expose a helper to get logs
    ;(window as any).getAppLogs = () => (window as any).__appLogs || []
    return () => {
      try {
        console.log = origConsole.log
        console.info = origConsole.info
        console.warn = origConsole.warn
        console.error = origConsole.error
      } catch (e) {}
    }
  }, [])
  return null
}
