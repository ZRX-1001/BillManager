import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

registerSW({
  onNeedRefresh() {
    if (confirm('有新版本可用，是否刷新？')) {
      window.location.reload()
    }
  },
  onOfflineReady() {
    console.log('✅ 应用已可离线使用')
  },
})

// ---- Safe area: read native status bar height (Capacitor) ----
async function initSafeArea() {
  try {
    const { StatusBar } = await import('@capacitor/status-bar')
    const info = await StatusBar.getInfo()
    // On Android, status bar is ≥24px; notched devices may need more.
    // Use native height as base, env(safe-area-inset-top) adds extra for notch.
    const base = Math.max(info.statusBarHeight || 0, 24)
    document.documentElement.style.setProperty('--statusbar-h', base + 'px')
    // Let WebView extend under status bar (transparent overlay)
    await StatusBar.setOverlaysWebView({ overlay: true })
  } catch {
    // Browser fallback: env() only
    document.documentElement.style.setProperty('--statusbar-h', '0px')
  }
}

initSafeArea()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
