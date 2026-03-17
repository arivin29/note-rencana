// ============================================================
// useTrendStore — Stores sparkline history per channel
// useTrendPolling — Hook that fetches trend data for channels
//                   with showTrend=true, at a slower interval
// ============================================================

import { create } from 'zustand'
import { useEffect, useRef } from 'react'
import { useDiagramStore } from './useDiagramStore'
import type { SparklinePoint } from '@/components/Sparkline'

// ── Types ─────────────────────────────────────────────────────

interface ChannelTrendData {
  points: SparklinePoint[]
  fetchedAt: number               // epoch ms of last fetch
  hours: number                   // window that was fetched
}

interface TrendState {
  /** channelId -> trend data */
  trends: Record<string, ChannelTrendData>
  /** Set trend data for a channel */
  setTrend: (channelId: string, data: ChannelTrendData) => void
  /** Clear all trends */
  clearTrends: () => void
}

export const useTrendStore = create<TrendState>((set) => ({
  trends: {},
  setTrend: (channelId, data) =>
    set((s) => ({ trends: { ...s.trends, [channelId]: data } })),
  clearTrends: () => set({ trends: {} }),
}))

// ── Selector ──────────────────────────────────────────────────

export const selectTrend = (channelId: string | undefined) =>
  (s: TrendState): SparklinePoint[] | null =>
    channelId ? s.trends[channelId]?.points ?? null : null

// ── Fetch helper ──────────────────────────────────────────────

function getToken(): string | null {
  const devBearer = import.meta.env.VITE_SCADA_DEV_BEARER as string | undefined
  if (devBearer) return devBearer
  return localStorage.getItem('scada_token')
}

async function fetchChannelTrend(
  channelId: string,
  hours: number,
): Promise<SparklinePoint[]> {
  const token = getToken()
  const startDate = new Date(Date.now() - hours * 3600_000).toISOString()
  const params = new URLSearchParams({
    idSensorChannel: channelId,
    startDate,
    limit: '120',
  })
  const url = `/api/sensor-logs?${params}`
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) return []
  const json = await res.json()
  // Backend returns { data: [...logs], total, page, limit, totalPages }
  const logs: Array<{ ts: string; valueEngineered?: number; value_engineered?: number }> =
    Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : []

  return logs
    .map((l) => ({
      ts: l.ts,
      value: l.valueEngineered ?? l.value_engineered ?? 0,
    }))
    .filter((p) => p.value != null)
    .reverse()  // backend returns DESC, sparkline needs chronological ASC
}

// ── Polling hook ──────────────────────────────────────────────

const TREND_POLL_INTERVAL_MS = 60_000   // fetch trends every 60s (slower than runtime)

/**
 * Polls trend data for all channels that have showTrend=true.
 * Runs at a slower cadence than real-time polling to save bandwidth.
 */
export function useTrendPolling(enabled = true) {
  const setTrend   = useTrendStore((s) => s.setTrend)
  const clearTrends = useTrendStore((s) => s.clearTrends)
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const activeRef  = useRef(true)

  useEffect(() => {
    if (!enabled) {
      clearTrends()
      return
    }
    activeRef.current = true

    const poll = async () => {
      if (!activeRef.current) return

      // Gather all channels that need trend data
      const nodes = useDiagramStore.getState().nodes
      const channelsToFetch: Array<{ channelId: string; hours: number }> = []

      for (const node of nodes) {
        for (const binding of node.bindings ?? []) {
          if (binding.showTrend && binding.sensorChannelId) {
            channelsToFetch.push({
              channelId: binding.sensorChannelId,
              hours: binding.trendHours ?? 1,
            })
          }
        }
      }

      if (channelsToFetch.length === 0) return

      // Deduplicate by channelId (pick largest hours window)
      const deduped = new Map<string, number>()
      for (const c of channelsToFetch) {
        const existing = deduped.get(c.channelId) ?? 0
        deduped.set(c.channelId, Math.max(existing, c.hours))
      }

      // Fetch in parallel (max 6 concurrent)
      const entries = [...deduped.entries()]
      const batchSize = 6
      for (let i = 0; i < entries.length; i += batchSize) {
        if (!activeRef.current) break
        const batch = entries.slice(i, i + batchSize)
        const results = await Promise.allSettled(
          batch.map(([chId, hrs]) => fetchChannelTrend(chId, hrs).then((pts) => ({ chId, hrs, pts }))),
        )
        for (const r of results) {
          if (r.status === 'fulfilled' && activeRef.current) {
            setTrend(r.value.chId, {
              points: r.value.pts,
              fetchedAt: Date.now(),
              hours: r.value.hrs,
            })
          }
        }
      }
    }

    // Track which channels currently need trend data so we can
    // detect new ones and fetch immediately (e.g. user just toggled showTrend).
    let prevTrendChannels = new Set<string>()

    const collectTrendChannels = (nodes: typeof useDiagramStore extends { getState: () => { nodes: infer N } } ? N : never) => {
      const channels = new Set<string>()
      for (const node of nodes as any[]) {
        for (const binding of node.bindings ?? []) {
          if (binding.showTrend && binding.sensorChannelId) {
            channels.add(binding.sensorChannelId)
          }
        }
      }
      return channels
    }

    const unsub = useDiagramStore.subscribe((state) => {
      if (!activeRef.current) return
      const current = collectTrendChannels(state.nodes)
      // Check if there's any new channel not in prev set
      let hasNew = false
      for (const ch of current) {
        if (!prevTrendChannels.has(ch)) { hasNew = true; break }
      }
      prevTrendChannels = current
      if (hasNew) poll()
    })

    // Try immediate fetch in case nodes are already loaded
    const initNodes = useDiagramStore.getState().nodes
    prevTrendChannels = collectTrendChannels(initNodes)
    if (initNodes.length > 0) {
      poll()
    }

    timerRef.current = setInterval(poll, TREND_POLL_INTERVAL_MS)

    return () => {
      activeRef.current = false
      unsub()
      if (timerRef.current) clearInterval(timerRef.current)
      clearTrends()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])
}
