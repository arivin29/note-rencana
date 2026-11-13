// ============================================================
// Kiosk viewport helpers — rendered INSIDE <ReactFlow> (need RF context).
//
// KioskTextBoost  — writes `--kiosk-text-boost` on `.react-flow` from the
//                   viewport zoom (store subscription + rAF, no React re-render).
// KioskControls   — corner −/+/"Seluruh bagan", vmin-sized, auto-hide after
//                   KIOSK_CONTROLS_IDLE_MS without pointer/touch/key activity.
// ============================================================

import { useEffect, useRef, useState } from 'react'
import { Controls, ControlButton, useReactFlow, useStoreApi } from '@xyflow/react'
import {
  KIOSK_CONTROLS_IDLE_MS,
  KIOSK_FIT_MAX_ZOOM,
  KIOSK_FIT_PADDING,
  KIOSK_MIN_ZOOM,
  KIOSK_TEXT_BOOST_VAR,
  kioskTextBoost,
} from './kiosk'

export function KioskTextBoost() {
  const storeApi = useStoreApi()

  useEffect(() => {
    let raf = 0
    let applied = -1
    const apply = () => {
      raf = 0
      const { transform, domNode } = storeApi.getState()
      if (!domNode) return
      const boost = kioskTextBoost(transform[2])
      if (boost === applied) return
      applied = boost
      domNode.style.setProperty(KIOSK_TEXT_BOOST_VAR, String(boost))
    }
    const schedule = () => { if (!raf) raf = requestAnimationFrame(apply) }
    apply()
    const unsub = storeApi.subscribe(schedule)
    return () => {
      unsub()
      if (raf) cancelAnimationFrame(raf)
      storeApi.getState().domNode?.style.removeProperty(KIOSK_TEXT_BOOST_VAR)
    }
  }, [storeApi])

  return null
}

const ACTIVITY_EVENTS = ['pointermove', 'pointerdown', 'touchstart', 'wheel', 'keydown'] as const

export function KioskControls() {
  const { fitView, zoomIn, zoomOut } = useReactFlow()
  const [visible, setVisible] = useState(true)
  const visibleRef = useRef(true)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const arm = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        visibleRef.current = false
        setVisible(false)
      }, KIOSK_CONTROLS_IDLE_MS)
    }
    const onActivity = () => {
      if (!visibleRef.current) {
        visibleRef.current = true
        setVisible(true)
      }
      arm()
    }
    arm() // visible on load, then hide when idle
    for (const ev of ACTIVITY_EVENTS) window.addEventListener(ev, onActivity, { passive: true })
    return () => {
      clearTimeout(timer)
      for (const ev of ACTIVITY_EVENTS) window.removeEventListener(ev, onActivity)
    }
  }, [])

  return (
    <Controls
      className={visible ? 'kiosk-controls' : 'kiosk-controls kiosk-controls--idle'}
      position="bottom-right"
      orientation="horizontal"
      showZoom={false}
      showFitView={false}
      showInteractive={false}
      aria-label="Kontrol tampilan bagan"
    >
      <ControlButton onClick={() => zoomOut({ duration: 200 })} title="Perkecil" aria-label="Perkecil">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75}><path d="M3 8h10" strokeLinecap="round" /></svg>
      </ControlButton>
      <ControlButton onClick={() => zoomIn({ duration: 200 })} title="Perbesar" aria-label="Perbesar">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75}><path d="M3 8h10M8 3v10" strokeLinecap="round" /></svg>
      </ControlButton>
      <ControlButton
        onClick={() => fitView({ padding: KIOSK_FIT_PADDING, minZoom: KIOSK_MIN_ZOOM, maxZoom: KIOSK_FIT_MAX_ZOOM, duration: 300 })}
        title="Tampilkan seluruh bagan"
        aria-label="Tampilkan seluruh bagan"
        className="kiosk-controls__fit"
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>Seluruh bagan</span>
      </ControlButton>
    </Controls>
  )
}
