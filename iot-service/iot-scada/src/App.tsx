// ============================================================
// App.tsx — Root router
// ============================================================

import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import { AuthProvider, useAuth } from '@/components/AuthGate'
import { LoginPage }         from '@/pages/LoginPage'
import { DiagramListPage }   from '@/pages/DiagramListPage'
import { DiagramPage }       from '@/pages/DiagramPage'
import { useUiStore }        from '@/stores/useUiStore'

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

// ── Protected route wrapper ───────────────────────────────────

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isReady } = useAuth()

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
            <DiagramPage initialMode="view" />
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
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
