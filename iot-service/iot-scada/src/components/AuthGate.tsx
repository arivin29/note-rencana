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
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  isReady: false,
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ScadaAuthUser | null>(null)
  const [isReady, setIsReady] = useState(false)

  // ── Authenticate with a token (called from postMessage or initial check) ──
  const authenticateWithToken = useCallback(async (token: string) => {
    setToken(token)
    try {
      const u = await getMe()
      setUser(u)
    } catch {
      setUser(null)
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
    <AuthContext.Provider value={{ user, setUser, isReady }}>
      {children}
    </AuthContext.Provider>
  )
}
