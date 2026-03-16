import { defineConfig } from 'orval'

export default defineConfig({
  'iot-scada': {
    input: {
      // Gunakan filtered spec file (hanya SCADA + Auth endpoints)
      // Generate file ini dengan: node scripts/fetch-spec.mjs
      target: '/tmp/scada-api-spec.json',
    },
    output: {
      target: 'src/sdk/services.gen.ts',
      schemas: 'src/sdk/models',
      client: 'fetch',
      override: {
        mutator: {
          path: 'src/sdk/client.ts',
          name: 'customFetch',
        },
      },
    },
  },
})
