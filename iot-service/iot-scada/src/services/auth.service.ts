// ============================================================
// auth.service.ts — Token management dan auth login
// Login via generated SDK (authControllerLogin/Me)
// Token disimpan di localStorage
// ============================================================

import type { ScadaAuthUser } from '@/types/scada'

const STORAGE_KEY = 'scada_token'
const BASE_URL = `${import.meta.env.VITE_API_BASE_URL ?? ''}/api`

// In-memory fallback for environments where localStorage is blocked (e.g. cross-origin iframes on mobile Chrome)
let memoryToken: string | null = null

export function getToken(): string | null {
  const devBearer = import.meta.env.VITE_SCADA_DEV_BEARER as string | undefined
  if (devBearer) return devBearer
  try {
    return localStorage.getItem(STORAGE_KEY) || memoryToken
  } catch {
    return memoryToken
  }
}

export function setToken(token: string): void {
  memoryToken = token
  try {
    localStorage.setItem(STORAGE_KEY, token)
  } catch {
    // localStorage blocked (cross-origin iframe on mobile Chrome) — memory fallback used
  }
}

export function clearToken(): void {
  memoryToken = null
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

export function isAuthenticated(): boolean {
  return Boolean(getToken())
}

export function getAuthHeaders(): Record<string, string> {
  const token = getToken()
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

// ── Login (manual fetch — SDK auth belum di-scope ke generator) ──

export interface LoginPayload {
  email: string
  password: string
}

export async function login(payload: LoginPayload): Promise<ScadaAuthUser> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Login failed' }))
    throw new Error(err.message || 'Login failed')
  }

  const data = await res.json()
  setToken(data.access_token)
  return await getMe()
}

export async function getMe(): Promise<ScadaAuthUser> {
  const token = getToken()
  if (!token) throw new Error('Not authenticated')

  const res = await fetch(`${BASE_URL}/auth/me`, {
    headers: getAuthHeaders(),
  })

  if (!res.ok) {
    clearToken()
    throw new Error('Session expired')
  }

  return await res.json()
}

export function logout(): void {
  clearToken()
  window.location.href = '/login'
}
