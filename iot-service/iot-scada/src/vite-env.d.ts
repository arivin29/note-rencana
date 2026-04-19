/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_SCADA_DEV_BEARER?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
