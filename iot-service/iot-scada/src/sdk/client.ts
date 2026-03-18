// ============================================================
// Custom Fetch Mutator untuk Orval SDK
// Inject Authorization header ke setiap request generated SDK
// ============================================================

export interface ErrorType<Error> {
  status: number
  data: Error
}

export type BodyType<BodyData> = BodyData

function getToken(): string | null {
  const devBearer = import.meta.env.VITE_SCADA_DEV_BEARER as string | undefined
  if (devBearer) return devBearer
  return localStorage.getItem('scada_token')
}

/**
 * Custom fetch mutator — dipanggil oleh setiap generated service function.
 * Otomatis inject Authorization header dan handle error response.
 *
 * Orval generated types mengharapkan response shape: { data, status, headers }
 * Jadi kita wrap response.json() agar sesuai.
 */
export const customFetch = async <T>(
  url: string,
  options: RequestInit,
): Promise<T> => {
  const token = getToken()

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers ?? {}),
  }

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }

  const baseUrl = import.meta.env.VITE_API_BASE_URL ?? ''
  const response = await fetch(`${baseUrl}${url}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}` }))
    throw { status: response.status, data: errorData }
  }

  // 204 No Content
  if (response.status === 204) {
    return { data: undefined, status: response.status, headers: response.headers } as T
  }

  const data = await response.json()
  return { data, status: response.status, headers: response.headers } as T
}

// Setup function (untuk kompatibilitas dengan main.tsx)
export function setupSdkClient() {
  console.debug('[SDK] Orval custom fetch mutator aktif')
}
