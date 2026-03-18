// ============================================================
// LoginPage — Halaman login SCADA
// ============================================================

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '@/services/auth.service'
import { useAuth } from '@/components/AuthGate'

export function LoginPage() {
  const { setUser } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const user = await login({ email, password })
      setUser(user)
      navigate('/', { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full w-full bg-canvas flex items-center justify-center">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-30 pointer-events-none" />

      <div className="relative w-full max-w-sm mx-4">
        {/* Card */}
        <div className="bg-surface border border-surface-border rounded-2xl p-8 shadow-panel">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-accent/15 border border-accent/30 flex items-center justify-center mb-4">
              <svg viewBox="0 0 32 32" className="w-8 h-8 text-accent" fill="currentColor">
                <rect x="3" y="16" width="12" height="12" rx="2" />
                <rect x="17" y="4" width="12" height="12" rx="2" />
                <path d="M9 16V10M23 16v6M9 10h14" stroke="currentColor" strokeWidth="2" fill="none" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">SCADA Monitor</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">Sistem Monitoring Operasional</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="scada-label">Email</label>
              <input
                id="email"
                type="email"
                className="scada-input"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="scada-label">Password</label>
              <input
                id="password"
                type="password"
                className="scada-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                <p className="text-sm text-status-alert">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary h-10 w-full flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-xs text-[var(--text-muted)] mt-6">
            SCADA v0.1 · IoT Monitoring Platform
          </p>
        </div>
      </div>
    </div>
  )
}
