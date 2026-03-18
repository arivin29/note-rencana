// ============================================================
// useRuntimePolling — Polling runtime via generated SDK
// ============================================================

import { useEffect, useRef } from 'react'
import { scadaRuntimeControllerGetRuntime } from '@/sdk/services.gen'
import { useRuntimeStore } from '@/stores/useRuntimeStore'
import type { ScadaRuntimeResponse } from '@/types/scada'

const POLL_INTERVAL_MS = 5_000

export function useRuntimePolling(
  diagramId: string | undefined,
  enabled = true,
) {
  const setRuntime   = useRuntimeStore((s) => s.setRuntime)
  const setError     = useRuntimeStore((s) => s.setPollingError)
  const setIsPolling = useRuntimeStore((s) => s.setIsPolling)
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!diagramId || !enabled) return

    let active = true

    const poll = async () => {
      if (!active) return
      setIsPolling(true)
      try {
        const res = await scadaRuntimeControllerGetRuntime(diagramId)
        if (active && res.data) {
          setRuntime(res.data as unknown as ScadaRuntimeResponse)
        }
      } catch (err: unknown) {
        if (active) {
          const msg = err instanceof Error ? err.message : 'Runtime poll failed'
          setError(msg)
        }
      } finally {
        if (active) setIsPolling(false)
      }
    }

    poll()
    timerRef.current = setInterval(poll, POLL_INTERVAL_MS)

    return () => {
      active = false
      if (timerRef.current) clearInterval(timerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagramId, enabled])
}
