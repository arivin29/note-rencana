#!/usr/bin/env node
// scripts/fetch-spec.mjs
// Download, filter, dan patch Swagger spec dari backend
// Hanya ambil endpoint SCADA dan Auth
// Jalankan: node scripts/fetch-spec.mjs
// Atau: npm run sdk:update (fetch + generate)

import { writeFileSync } from 'fs'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3000'
const OUTPUT = process.env.SPEC_OUTPUT ?? '/tmp/scada-api-spec.json'

console.log(`📡 Fetching Swagger spec from ${BACKEND_URL}/api-json...`)
const res = await fetch(`${BACKEND_URL}/api-json`)
if (!res.ok) throw new Error(`Failed to fetch spec: ${res.status}`)
const spec = await res.json()
console.log(`📋 Total paths: ${Object.keys(spec.paths || {}).length}`)

// Step 1: Filter hanya SCADA + Auth paths
const scadaPaths = {}
for (const [path, methods] of Object.entries(spec.paths || {})) {
  const filteredMethods = {}
  for (const [method, op] of Object.entries(methods)) {
    const tags = op.tags || []
    if (tags.some(t => t.includes('SCADA') || t.includes('Auth'))) {
      filteredMethods[method] = op
    }
  }
  if (Object.keys(filteredMethods).length > 0) {
    scadaPaths[path] = filteredMethods
  }
}

// Step 2: Deep patch semua array schema tanpa items
function deepPatch(obj) {
  if (!obj || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(deepPatch)
  const result = {}
  for (const [k, v] of Object.entries(obj)) {
    result[k] = deepPatch(v)
  }
  // Fix: array tanpa items
  if (result.type === 'array' && !result.items) {
    result.items = { type: 'object' }
  }
  return result
}

const filtered = deepPatch({
  ...spec,
  paths: scadaPaths,
})

writeFileSync(OUTPUT, JSON.stringify(filtered, null, 2))
console.log(`✅ Filtered + patched spec: ${OUTPUT}`)
console.log(`📊 SCADA+Auth paths: ${Object.keys(scadaPaths).length}`)
console.log(`🔧 Run: npm run sdk:generate`)
