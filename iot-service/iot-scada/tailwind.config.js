/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        // SCADA Industrial Dark Palette
        canvas: {
          DEFAULT: '#0d1117',
          100: '#161b22',
          200: '#1c2128',
          300: '#21262d',
        },
        surface: {
          DEFAULT: '#1c2128',
          hover: '#21262d',
          active: '#2d333b',
          border: '#30363d',
        },
        // Status colors — SCADA
        status: {
          ok:      '#22c55e', // green-500
          warn:    '#f59e0b', // amber-500
          alert:   '#ef4444', // red-500
          off:     '#6b7280', // gray-500
          offline: '#374151', // gray-700
          stale:   '#d97706', // amber-600
          unknown: '#4b5563', // gray-600
        },
        // Pipe colors
        pipe: {
          raw:     '#3b82f6', // blue-500
          treated: '#22c55e', // green-500
        },
        // Accent
        accent: {
          DEFAULT: '#0ea5e9', // sky-500
          hover:   '#38bdf8', // sky-400
          dim:     '#0c4a6e', // sky-900
        },
        brand: {
          DEFAULT: '#6366f1', // indigo-500
          dim:     '#1e1b4b',
        },
      },
      backgroundImage: {
        'grid-pattern': "radial-gradient(circle, #30363d 1px, transparent 1px)",
      },
      backgroundSize: {
        'grid': '24px 24px',
      },
      boxShadow: {
        'node': '0 2px 8px rgba(0,0,0,0.5), 0 0 0 1px rgba(48,54,61,0.8)',
        'node-selected': '0 0 0 2px #0ea5e9, 0 4px 16px rgba(14,165,233,0.3)',
        'panel': '0 8px 32px rgba(0,0,0,0.6)',
        'status-ok': '0 0 8px rgba(34,197,94,0.4)',
        'status-alert': '0 0 8px rgba(239,68,68,0.4)',
        'status-warn': '0 0 8px rgba(245,158,11,0.4)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flow': 'flow 2s linear infinite',
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-in-right': 'slideInRight 0.25s ease-out',
      },
      keyframes: {
        flow: {
          '0%': { strokeDashoffset: '24' },
          '100%': { strokeDashoffset: '0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(16px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
