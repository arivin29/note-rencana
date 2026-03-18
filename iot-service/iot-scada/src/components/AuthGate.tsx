// ============================================================
// AuthGate — Wrapper yang cek auth sebelum render children
// ============================================================

import React, { createContext, useContext, useEffect, useState } from 'react'
import type { ScadaAuthUser } from '@/types/scada'
import { getMe, isAuthenticated } from '@/services/auth.service'

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
