// ============================================================
// Sensor Categories — Derived from sensorType database
// Maps ~20 sensor categories to default icon, color, unit
// ============================================================

import React from 'react'

export interface SensorCategoryDef {
  key: string
  label: string
  icon: React.ReactNode
  color: string   // default accent color (hex)
  unit: string    // default unit string
}

const cls = 'w-full h-full'

export const SENSOR_CATEGORIES: Record<string, SensorCategoryDef> = {
  // ── Chemical ────────────────────────────────────────────────
  chlorine: {
    key: 'chlorine',
    label: 'Chlorine',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className={cls} stroke="currentColor" strokeWidth={1.5}>
        <path d="M12 2C8 8 5 11 5 15a7 7 0 0014 0c0-4-3-7-7-13z" />
        <path d="M10 16h4M12 14v4" strokeLinecap="round" />
      </svg>
    ),
    color: '#22c55e',
    unit: 'mg/L',
  },

  ph: {
    key: 'ph',
    label: 'pH',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className={cls} stroke="currentColor" strokeWidth={1.5}>
        <rect x="6" y="3" width="12" height="18" rx="2" />
        <path d="M6 9h12M6 15h12" />
        <circle cx="12" cy="12" r="2.5" fill="currentColor" opacity={0.25} />
      </svg>
    ),
    color: '#84cc16',
    unit: 'pH',
  },

  dissolved_oxygen: {
    key: 'dissolved_oxygen',
    label: 'Dissolved Oxygen',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className={cls} stroke="currentColor" strokeWidth={1.5}>
        <circle cx="12" cy="15" r="6" />
        <circle cx="8" cy="9" r="2.5" />
        <circle cx="16" cy="7" r="1.5" />
        <circle cx="12" cy="4" r="1" />
      </svg>
    ),
    color: '#10b981',
    unit: 'mg/L',
  },

  tds: {
    key: 'tds',
    label: 'TDS',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className={cls} stroke="currentColor" strokeWidth={1.5}>
        <circle cx="12" cy="12" r="9" />
        <circle cx="8" cy="10" r="1" fill="currentColor" />
        <circle cx="14" cy="8" r="1" fill="currentColor" />
        <circle cx="10" cy="15" r="1" fill="currentColor" />
        <circle cx="15" cy="14" r="1" fill="currentColor" />
        <circle cx="12" cy="12" r="1" fill="currentColor" />
      </svg>
    ),
    color: '#67e8f9',
    unit: 'ppm',
  },

  // ── Water Quality ───────────────────────────────────────────

  conductivity: {
    key: 'conductivity',
    label: 'Conductivity',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className={cls} stroke="currentColor" strokeWidth={1.5}>
        <path d="M8 4v6M16 4v6" strokeLinecap="round" strokeWidth={2} />
        <path d="M8 10c0 4 8 4 8 0" />
        <path d="M5 18h14" strokeLinecap="round" />
      </svg>
    ),
    color: '#06b6d4',
    unit: 'μS/cm',
  },

  turbidity: {
    key: 'turbidity',
    label: 'Turbidity',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className={cls} stroke="currentColor" strokeWidth={1.5}>
        <path d="M6 16c0-2.5 2-4 4-4 .5-2.5 3-4.5 6-4.5s5 2 5.5 4.5c1 .5 1.5 1.5 1.5 2.5" strokeLinecap="round" />
        <path d="M3 16h18" />
        <path d="M7 19l2-2 2 2 2-2 2 2 2-2 2 2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    color: '#d97706',
    unit: 'NTU',
  },

  // ── Flow & Volume ───────────────────────────────────────────

  flow: {
    key: 'flow',
    label: 'Flow / Debit',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className={cls} stroke="currentColor" strokeWidth={1.5}>
        <path d="M4 12h16M16 8l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 7h8M4 17h8" strokeLinecap="round" strokeDasharray="2 2" />
      </svg>
    ),
    color: '#3b82f6',
    unit: 'm³/h',
  },

  velocity: {
    key: 'velocity',
    label: 'Velocity',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className={cls} stroke="currentColor" strokeWidth={1.5}>
        <path d="M5 12h14M15 8l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 7h6M3 17h6" strokeLinecap="round" />
      </svg>
    ),
    color: '#60a5fa',
    unit: 'm/s',
  },

  volume: {
    key: 'volume',
    label: 'Volume',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className={cls} stroke="currentColor" strokeWidth={1.5}>
        <ellipse cx="12" cy="6" rx="7" ry="3" />
        <path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6" />
        <path d="M5 14c0 1.7 3.1 3 7 3s7-1.3 7-3" strokeDasharray="3 2" />
      </svg>
    ),
    color: '#2563eb',
    unit: 'm³',
  },

  // ── Pressure & Level ────────────────────────────────────────

  pressure: {
    key: 'pressure',
    label: 'Pressure / Tekanan',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className={cls} stroke="currentColor" strokeWidth={1.5}>
        <circle cx="12" cy="14" r="7" />
        <path d="M12 7V5M9 8.3L7.5 6.8M15 8.3l1.5-1.5" />
        <path d="M12 14l2.5-3" strokeLinecap="round" />
      </svg>
    ),
    color: '#f97316',
    unit: 'bar',
  },

  diff_pressure: {
    key: 'diff_pressure',
    label: 'Differential Pressure',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className={cls} stroke="currentColor" strokeWidth={1.5}>
        <circle cx="8" cy="12" r="5" />
        <circle cx="16" cy="12" r="5" />
        <path d="M8 12l1.5-2M16 12l1.5-2" strokeLinecap="round" />
      </svg>
    ),
    color: '#fb923c',
    unit: 'mbar',
  },

  level: {
    key: 'level',
    label: 'Level',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className={cls} stroke="currentColor" strokeWidth={1.5}>
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="M5 12h14" />
        <rect x="5" y="12" width="14" height="9" rx="0" fill="currentColor" opacity={0.15} />
        <path d="M9 7v3M12 5v5M15 7v3" strokeLinecap="round" />
      </svg>
    ),
    color: '#14b8a6',
    unit: 'm',
  },

  // ── Electrical ──────────────────────────────────────────────

  current: {
    key: 'current',
    label: 'Current / Arus',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className={cls} stroke="currentColor" strokeWidth={1.5}>
        <circle cx="12" cy="12" r="9" />
        <path d="M9 16l3-10 3 10M10 13h4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    color: '#f59e0b',
    unit: 'A',
  },

  voltage: {
    key: 'voltage',
    label: 'Voltage / Tegangan',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className={cls} stroke="currentColor" strokeWidth={1.5}>
        <circle cx="12" cy="12" r="9" />
        <path d="M8 8l4 8 4-8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    color: '#fbbf24',
    unit: 'V',
  },

  power: {
    key: 'power',
    label: 'Power / Energy',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className={cls} stroke="currentColor" strokeWidth={1.5}>
        <path d="M13 2L4 14h6l-2 8 9-12h-6z" strokeLinejoin="round" />
      </svg>
    ),
    color: '#eab308',
    unit: 'kW',
  },

  frequency: {
    key: 'frequency',
    label: 'Frequency',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className={cls} stroke="currentColor" strokeWidth={1.5}>
        <path d="M2 12c2-5 4-5 5 0s3 5 5 0 3-5 5 0 3 5 5 0" strokeLinecap="round" />
      </svg>
    ),
    color: '#a855f7',
    unit: 'Hz',
  },

  // ── Mechanical ──────────────────────────────────────────────

  rpm: {
    key: 'rpm',
    label: 'RPM',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className={cls} stroke="currentColor" strokeWidth={1.5}>
        <circle cx="12" cy="12" r="8" strokeDasharray="4 2" />
        <path d="M12 4a8 8 0 016.9 4" strokeLinecap="round" />
        <path d="M18.9 8l-.5-2.5 2.5-.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="2" fill="currentColor" />
      </svg>
    ),
    color: '#6366f1',
    unit: 'RPM',
  },

  pump_current: {
    key: 'pump_current',
    label: 'Pump Current',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className={cls} stroke="currentColor" strokeWidth={1.5}>
        <circle cx="12" cy="12" r="9" />
        <path d="M8 12l4-4 4 4M12 8v8" />
        <path d="M7 18h10" strokeLinecap="round" strokeWidth={2} />
      </svg>
    ),
    color: '#e67e22',
    unit: 'A',
  },

  pump_speed: {
    key: 'pump_speed',
    label: 'Pump Speed',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className={cls} stroke="currentColor" strokeWidth={1.5}>
        <circle cx="12" cy="12" r="9" />
        <path d="M8 12l4-4 4 4M12 8v8" />
        <path d="M4 12h3M17 12h3" strokeLinecap="round" />
      </svg>
    ),
    color: '#c084fc',
    unit: 'Hz',
  },

  // ── Environmental ───────────────────────────────────────────

  temperature: {
    key: 'temperature',
    label: 'Temperature / Suhu',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className={cls} stroke="currentColor" strokeWidth={1.5}>
        <path d="M14 4a2 2 0 00-4 0v10.17A3 3 0 0012 20a3 3 0 002-5.83V4z" />
        <path d="M12 14v3" strokeLinecap="round" strokeWidth={2} />
      </svg>
    ),
    color: '#ef4444',
    unit: '°C',
  },

  humidity: {
    key: 'humidity',
    label: 'Humidity / Kelembapan',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className={cls} stroke="currentColor" strokeWidth={1.5}>
        <path d="M12 2c-3 5-6 8-6 11a6 6 0 0012 0c0-3-3-6-6-11z" />
        <path d="M10 15a2.5 2.5 0 003.5-2" strokeLinecap="round" />
      </svg>
    ),
    color: '#38bdf8',
    unit: '%',
  },

  // ── Fallback ────────────────────────────────────────────────

  generic: {
    key: 'generic',
    label: 'Sensor (Generic)',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className={cls} stroke="currentColor" strokeWidth={1.5}>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="3" fill="currentColor" />
        <path d="M12 4v3M12 17v3M4 12h3M17 12h3" strokeLinecap="round" />
      </svg>
    ),
    color: '#9ca3af',
    unit: '',
  },

  // ── PDAM Water Quality (Extended) ───────────────────────────

  orp: {
    key: 'orp',
    label: 'ORP (Redox)',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className={cls} stroke="currentColor" strokeWidth={1.5}>
        <circle cx="12" cy="12" r="9" />
        <path d="M8 8l8 8M16 8l-8 8" strokeLinecap="round" opacity={0.5} />
        <circle cx="12" cy="12" r="3.5" strokeWidth={2} />
        <path d="M10 12h4M12 10v4" strokeLinecap="round" strokeWidth={1.5} />
      </svg>
    ),
    color: '#8b5cf6',
    unit: 'mV',
  },

  color_ptco: {
    key: 'color_ptco',
    label: 'Water Color',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className={cls} stroke="currentColor" strokeWidth={1.5}>
        <path d="M12 2c-3 5-7 8-7 12a7 7 0 0014 0c0-4-4-7-7-12z" />
        <path d="M8 14c0 2.2 1.8 4 4 4s4-1.8 4-4" strokeDasharray="2 2" opacity={0.5} />
        <circle cx="12" cy="13" r="2" fill="currentColor" opacity={0.2} />
      </svg>
    ),
    color: '#a78bfa',
    unit: 'Pt-Co',
  },

  iron: {
    key: 'iron',
    label: 'Iron (Fe)',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className={cls} stroke="currentColor" strokeWidth={1.5}>
        <circle cx="12" cy="12" r="9" />
        <text x="12" y="16" textAnchor="middle" fill="currentColor" fontSize="10" stroke="none" fontWeight="bold">Fe</text>
      </svg>
    ),
    color: '#d97706',
    unit: 'mg/L',
  },

  manganese: {
    key: 'manganese',
    label: 'Manganese (Mn)',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className={cls} stroke="currentColor" strokeWidth={1.5}>
        <circle cx="12" cy="12" r="9" />
        <text x="12" y="16" textAnchor="middle" fill="currentColor" fontSize="9" stroke="none" fontWeight="bold">Mn</text>
      </svg>
    ),
    color: '#b45309',
    unit: 'mg/L',
  },

  ammonia: {
    key: 'ammonia',
    label: 'Ammonia (NH₃)',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className={cls} stroke="currentColor" strokeWidth={1.5}>
        <circle cx="12" cy="12" r="9" />
        <text x="12" y="10" textAnchor="middle" fill="currentColor" fontSize="7" stroke="none" fontWeight="bold">NH</text>
        <text x="15" y="16" textAnchor="middle" fill="currentColor" fontSize="6" stroke="none">₃</text>
      </svg>
    ),
    color: '#65a30d',
    unit: 'mg/L',
  },

  hardness: {
    key: 'hardness',
    label: 'Water Hardness',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className={cls} stroke="currentColor" strokeWidth={1.5}>
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M4 12h16" opacity={0.3} />
        <path d="M8 8l4 8 4-8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="8" cy="16" r="1" fill="currentColor" opacity={0.4} />
        <circle cx="12" cy="17" r="1" fill="currentColor" opacity={0.4} />
        <circle cx="16" cy="16" r="1" fill="currentColor" opacity={0.4} />
      </svg>
    ),
    color: '#78716c',
    unit: 'mg/L CaCO₃',
  },

  alkalinity: {
    key: 'alkalinity',
    label: 'Alkalinity',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className={cls} stroke="currentColor" strokeWidth={1.5}>
        <rect x="6" y="3" width="12" height="18" rx="2" />
        <path d="M6 9h12" opacity={0.3} />
        <path d="M10 6h4" strokeLinecap="round" strokeWidth={2} />
        <path d="M8 13c1.5-1 3 1 4 0s2.5 1 4 0" strokeLinecap="round" opacity={0.6} />
        <path d="M8 16c1.5-1 3 1 4 0s2.5 1 4 0" strokeLinecap="round" opacity={0.4} />
      </svg>
    ),
    color: '#0891b2',
    unit: 'mg/L',
  },

  bod: {
    key: 'bod',
    label: 'BOD',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className={cls} stroke="currentColor" strokeWidth={1.5}>
        <circle cx="12" cy="12" r="9" />
        <text x="12" y="9" textAnchor="middle" fill="currentColor" fontSize="5" stroke="none" fontWeight="bold">BOD</text>
        <circle cx="8" cy="14" r="1.5" fill="currentColor" opacity={0.2} />
        <circle cx="12" cy="16" r="1" fill="currentColor" opacity={0.15} />
        <circle cx="16" cy="13" r="1.5" fill="currentColor" opacity={0.2} />
      </svg>
    ),
    color: '#b91c1c',
    unit: 'mg/L',
  },

  cod: {
    key: 'cod',
    label: 'COD',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className={cls} stroke="currentColor" strokeWidth={1.5}>
        <circle cx="12" cy="12" r="9" />
        <text x="12" y="9" textAnchor="middle" fill="currentColor" fontSize="5" stroke="none" fontWeight="bold">COD</text>
        <path d="M8 14l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
      </svg>
    ),
    color: '#dc2626',
    unit: 'mg/L',
  },

  residual_chlorine: {
    key: 'residual_chlorine',
    label: 'Residual Chlorine',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className={cls} stroke="currentColor" strokeWidth={1.5}>
        <path d="M12 2c-3 5-6 8-6 11a6 6 0 0012 0c0-3-3-6-6-11z" />
        <text x="12" y="16" textAnchor="middle" fill="currentColor" fontSize="6" stroke="none" fontWeight="bold">Cl</text>
        <circle cx="16" cy="10" r="1" fill="currentColor" opacity={0.3} />
      </svg>
    ),
    color: '#16a34a',
    unit: 'mg/L',
  },

  // ── Operational / Mechanical ────────────────────────────────

  run_hours: {
    key: 'run_hours',
    label: 'Run Hours',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className={cls} stroke="currentColor" strokeWidth={1.5}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 6v6l3 3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      </svg>
    ),
    color: '#6366f1',
    unit: 'hrs',
  },

  energy: {
    key: 'energy',
    label: 'Energy',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className={cls} stroke="currentColor" strokeWidth={1.5}>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M13 6L9 13h4l-2 5" strokeLinejoin="round" fill="currentColor" opacity={0.15} />
        <path d="M13 6L9 13h4l-2 5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    color: '#f59e0b',
    unit: 'kWh',
  },

  vibration: {
    key: 'vibration',
    label: 'Vibration',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className={cls} stroke="currentColor" strokeWidth={1.5}>
        <path d="M2 12c1.5-4 3-4 4 0s2.5 4 4 0 2.5-4 4 0 2.5 4 4 0 2.5-4 4 0" strokeLinecap="round" />
        <circle cx="12" cy="12" r="2" fill="currentColor" opacity={0.3} />
        <path d="M12 4v4M12 16v4" strokeLinecap="round" opacity={0.3} />
      </svg>
    ),
    color: '#ec4899',
    unit: 'mm/s',
  },

  head_loss: {
    key: 'head_loss',
    label: 'Head Loss',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className={cls} stroke="currentColor" strokeWidth={1.5}>
        <rect x="4" y="3" width="7" height="18" rx="1" />
        <rect x="13" y="7" width="7" height="14" rx="1" />
        <path d="M4 10h7" strokeWidth={1} opacity={0.4} />
        <path d="M13 12h7" strokeWidth={1} opacity={0.4} />
        <rect x="5" y="10" width="5" height="10" fill="currentColor" opacity={0.08} stroke="none" />
        <rect x="14" y="12" width="5" height="8" fill="currentColor" opacity={0.08} stroke="none" />
        <path d="M9 13l3-1M9 16l3-1" strokeLinecap="round" opacity={0.4} strokeDasharray="1 1" />
      </svg>
    ),
    color: '#0d9488',
    unit: 'm',
  },

  ssi: {
    key: 'ssi',
    label: 'SSI (Silt Density)',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className={cls} stroke="currentColor" strokeWidth={1.5}>
        <circle cx="12" cy="12" r="9" />
        <path d="M7 17V9l3 4 2-6 2 6 3-4v8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    color: '#92400e',
    unit: '',
  },

  totalizer: {
    key: 'totalizer',
    label: 'Totalizer / Volume',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className={cls} stroke="currentColor" strokeWidth={1.5}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <rect x="5" y="7" width="14" height="6" rx="1" fill="currentColor" opacity={0.06} stroke="currentColor" />
        <text x="12" y="12" textAnchor="middle" fill="currentColor" fontSize="5" stroke="none" fontWeight="bold" fontFamily="monospace">9876</text>
        <path d="M7 16h10" strokeLinecap="round" opacity={0.3} />
      </svg>
    ),
    color: '#2563eb',
    unit: 'm³',
  },

  valve_position: {
    key: 'valve_position',
    label: 'Valve Position',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className={cls} stroke="currentColor" strokeWidth={1.5}>
        <polygon points="4,8 12,12 4,16" fill="currentColor" opacity={0.1} stroke="currentColor" />
        <polygon points="20,8 12,12 20,16" fill="currentColor" opacity={0.1} stroke="currentColor" />
        <line x1="12" y1="12" x2="12" y2="4" strokeWidth={2} />
        <path d="M8 4h8" strokeLinecap="round" strokeWidth={2} />
        <text x="12" y="22" textAnchor="middle" fill="currentColor" fontSize="5" stroke="none" opacity={0.5}>%</text>
      </svg>
    ),
    color: '#0ea5e9',
    unit: '%',
  },

  pump_status: {
    key: 'pump_status',
    label: 'Pump Status',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className={cls} stroke="currentColor" strokeWidth={1.5}>
        <circle cx="12" cy="12" r="8" />
        <polygon points="12,6 18,14 6,14" fill="currentColor" opacity={0.15} stroke="currentColor" />
        <circle cx="12" cy="12" r="2" fill="currentColor" opacity={0.3} />
        <circle cx="12" cy="3" r="1.5" fill="currentColor" opacity={0.4} />
      </svg>
    ),
    color: '#059669',
    unit: '',
  },
}

// Ordered list for UI pickers
export const SENSOR_CATEGORY_LIST = Object.values(SENSOR_CATEGORIES)

// Lookup helper — returns 'generic' fallback if not found
export function getSensorCategory(key: string | undefined | null): SensorCategoryDef {
  if (!key) return SENSOR_CATEGORIES.generic
  return SENSOR_CATEGORIES[key] ?? SENSOR_CATEGORIES.generic
}
