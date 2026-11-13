// ============================================================
// App.tsx — Root router
// ============================================================

import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import { AuthProvider, useAuth } from '@/components/AuthGate'
import { LoginPage }         from '@/pages/LoginPage'
import { DiagramListPage }   from '@/pages/DiagramListPage'
import { DiagramPage }       from '@/pages/DiagramPage'
import { useUiStore }        from '@/stores/useUiStore'
import { readKioskConfig, applyKioskDocument } from '@/kiosk/kiosk'

// When embedded (iframe), the native Fullscreen API is unreliable on mobile — instead
// tell the parent (Angular) to expand the iframe to fill the device screen.
function EmbedFullscreenBridge() {
  const isFullscreen = useUiStore((s) => s.isFullscreen)
  useEffect(() => {
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'scada-fullscreen', value: isFullscreen }, '*')
    }
  }, [isFullscreen])
  return null
}

// ── Kiosk auth wait / error (minimal, Bahasa Indonesia) ───────

const KIOSK_AUTH_HINT_MS = 15_000

function KioskAuthScreen({ failed, onRetry, transparent }: { failed: boolean; onRetry: () => void; transparent: boolean }) {
  // After a while without a token, offer a manual retry (re-posts scada-ready)
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), KIOSK_AUTH_HINT_MS)
    return () => clearTimeout(t)
  }, [])
  return (
    <div className={`h-full w-full flex items-center justify-center p-4 ${transparent ? '' : 'bg-canvas'}`}>
      <div className="text-center max-w-sm">
        {failed ? (
          <>
            <p className="text-base font-semibold text-[var(--text-primary)] mb-1">Sesi Helios tidak valid</p>
            <p className="text-sm text-[var(--text-secondary)] mb-4">Sesi kedaluwarsa atau ditolak. Muat ulang dasbor bila masalah berlanjut.</p>
          </>
        ) : (
          <div className="flex items-center justify-center gap-3 text-sm text-[var(--text-secondary)] mb-4">
            <span className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            Menunggu sesi Helios…
          </div>
        )}
        {(failed || slow) && (
          <button onClick={onRetry} className="btn-primary min-h-[40px] px-5">Coba lagi</button>
        )}
      </div>
    </div>
  )
}

// Kiosk theme/background classes on <html> — applied before auth so the wait
// screen already matches (iframe URL is static, read once).
function KioskDocumentBridge() {
  useEffect(() => applyKioskDocument(readKioskConfig()), [])
  return null
}

// ── Protected route wrapper ───────────────────────────────────

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isReady, authFailed, requestToken } = useAuth()
  const kiosk = readKioskConfig()

  if (kiosk.enabled && (!isReady || !user)) {
    return <KioskAuthScreen failed={isReady && authFailed} onRetry={requestToken} transparent={kiosk.transparent} />
  }

  if (!isReady) {
    return (
      <div className="h-full w-full bg-canvas flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    // In embed mode, don't redirect to login — just show waiting state
    if (window.location.pathname.startsWith('/embed/')) {
      return (
        <div className="h-full w-full bg-canvas flex items-center justify-center text-white/50 text-sm">
          Waiting for authentication…
        </div>
      )
    }
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

// ── App ───────────────────────────────────────────────────────

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected */}
      <Route
        path="/"
        element={
          <RequireAuth>
            <DiagramListPage />
          </RequireAuth>
        }
      />

      <Route
        path="/diagrams/:diagramId/view"
        element={
          <RequireAuth>
            <DiagramPage initialMode="view" />
          </RequireAuth>
        }
      />

      <Route
        path="/diagrams/:diagramId/edit"
        element={
          <RequireAuth>
            <DiagramPage initialMode="edit" />
          </RequireAuth>
        }
      />

      {/* ── Embed routes (loaded inside Angular iframe) ── */}
      <Route
        path="/embed/:projectId/diagrams/:diagramId/view"
        element={
          <RequireAuth>
            <DiagramPage initialMode="view" allowKiosk />
          </RequireAuth>
        }
      />
      <Route
        path="/embed/:projectId/diagrams/:diagramId/edit"
        element={
          <RequireAuth>
            <DiagramPage initialMode="edit" />
          </RequireAuth>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <EmbedFullscreenBridge />
      <KioskDocumentBridge />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
