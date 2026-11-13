// ============================================================
// AuthGate — Wrapper yang cek auth sebelum render children
// ============================================================

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { ScadaAuthUser } from '@/types/scada'
import { getMe, isAuthenticated, setToken } from '@/services/auth.service'

interface AuthContextType {
  user: ScadaAuthUser | null
  setUser: (u: ScadaAuthUser | null) => void
  isReady: boolean
  /** True when a token was received (postMessage) but /auth/me rejected it. */
  authFailed: boolean
  /** Embed: ask the parent to (re)send the token — re-posts the same `scada-ready`. */
  requestToken: () => void
}

function postReady() {
  if (window.parent !== window) {
    window.parent.postMessage({ type: 'scada-ready' }, '*')
  }
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  isReady: false,
  authFailed: false,
  requestToken: () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ScadaAuthUser | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [authFailed, setAuthFailed] = useState(false)

  // ── Authenticate with a token (called from postMessage or initial check) ──
  const authenticateWithToken = useCallback(async (token: string) => {
    setToken(token)
    try {
      const u = await getMe()
      setUser(u)
      setAuthFailed(false)
    } catch {
      setUser(null)
      setAuthFailed(true)
    } finally {
      setIsReady(true)
    }
  }, [])

  // ── Listen for postMessage from Angular parent (embed mode) ──
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      // Accept scada-auth messages
      if (event.data?.type === 'scada-auth' && typeof event.data.token === 'string') {
        console.debug('[SCADA] Received token via postMessage from', event.origin)
        authenticateWithToken(event.data.token)
      }
    }
    window.addEventListener('message', handler)

    // Notify parent that SCADA app is ready to receive token (fixes mobile Chrome race condition)
    postReady()

    return () => window.removeEventListener('message', handler)
  }, [authenticateWithToken])

  // ── Initial auth check ──
  useEffect(() => {
    if (!isAuthenticated()) {
      setIsReady(true)
      return
    }

    getMe()
      .then((u) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setIsReady(true))
  }, [])

  return (
    <AuthContext.Provider value={{ user, setUser, isReady, authFailed, requestToken: postReady }}>
      {children}
    </AuthContext.Provider>
  )
}
