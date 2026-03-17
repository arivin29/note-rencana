// ============================================================
// Toast — Non-blocking notification system
// Usage: toast.success('Saved!') / toast.error('Failed') / toast.info('...')
// ============================================================

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { create } from 'zustand'

// ── Types ───────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastItem {
  id: string
  type: ToastType
  message: string
  duration: number
  createdAt: number
}

interface ToastStore {
  items: ToastItem[]
  add: (type: ToastType, message: string, duration?: number) => void
  remove: (id: string) => void
}

// ── Store ───────────────────────────────────────────────────
const useToastStore = create<ToastStore>((set) => ({
  items: [],
  add: (type, message, duration = 4000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    set((s) => ({
      items: [...s.items.slice(-4), { id, type, message, duration, createdAt: Date.now() }],
    }))
  },
  remove: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
}))

// ── Public API ──────────────────────────────────────────────
export const toast = {
  success: (msg: string, duration?: number) => useToastStore.getState().add('success', msg, duration),
  error:   (msg: string, duration?: number) => useToastStore.getState().add('error', msg, duration ?? 6000),
  info:    (msg: string, duration?: number) => useToastStore.getState().add('info', msg, duration),
  warning: (msg: string, duration?: number) => useToastStore.getState().add('warning', msg, duration ?? 5000),
}

// ── Icon per type ───────────────────────────────────────────
const ToastIcon: Record<ToastType, React.ReactNode> = {
  success: (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="10" cy="10" r="7" />
      <path d="M7 10l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="10" cy="10" r="7" />
      <path d="M10 7v4M10 13h.01" strokeLinecap="round" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M10 3L2 17h16L10 3z" strokeLinejoin="round" />
      <path d="M10 8v4M10 14h.01" strokeLinecap="round" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="10" cy="10" r="7" />
      <path d="M10 9v4M10 7h.01" strokeLinecap="round" />
    </svg>
  ),
}

const ToastColor: Record<ToastType, { bg: string; border: string; text: string; icon: string }> = {
  success: { bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.25)',  text: '#22c55e', icon: '#22c55e' },
  error:   { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.25)',  text: '#ef4444', icon: '#ef4444' },
  warning: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', text: '#f59e0b', icon: '#f59e0b' },
  info:    { bg: 'rgba(14,165,233,0.08)', border: 'rgba(14,165,233,0.25)', text: '#0ea5e9', icon: '#0ea5e9' },
}

// ── Single Toast Item ───────────────────────────────────────
function ToastItemView({ item }: { item: ToastItem }) {
  const remove  = useToastStore((s) => s.remove)
  const [exiting, setExiting] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const dismiss = useCallback(() => {
    setExiting(true)
    setTimeout(() => remove(item.id), 200)
  }, [item.id, remove])

  useEffect(() => {
    timerRef.current = setTimeout(dismiss, item.duration)
    return () => clearTimeout(timerRef.current)
  }, [item.duration, dismiss])

  const colors = ToastColor[item.type]

  return (
    <div
      className={`flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl shadow-lg backdrop-blur-sm max-w-sm pointer-events-auto ${
        exiting ? 'toast-exit' : 'toast-enter'
      }`}
      style={{
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
      }}
    >
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5" style={{ color: colors.icon }}>
        {ToastIcon[item.type]}
      </div>

      {/* Message */}
      <p className="text-sm font-medium flex-1 min-w-0" style={{ color: colors.text }}>
        {item.message}
      </p>

      {/* Close button */}
      <button
        onClick={dismiss}
        className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 transition-colors opacity-50 hover:opacity-100"
        style={{ color: colors.text }}
      >
        <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M2 2l8 8M10 2l-8 8" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}

// ── Toast Container (portal) ────────────────────────────────
export function ToastContainer() {
  const items = useToastStore((s) => s.items)

  if (items.length === 0) return null

  return createPortal(
    <div
      className="fixed top-14 right-4 z-[99999] flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
    >
      {items.map((item) => (
        <ToastItemView key={item.id} item={item} />
      ))}
    </div>,
    document.body,
  )
}
