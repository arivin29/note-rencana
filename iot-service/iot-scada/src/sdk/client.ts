// ============================================================
// Custom Fetch Mutator untuk orval SDK
// Inject Authorization header ke setiap request generated SDK
//
// JANGAN edit file ini — file ini adalah entrypoint konfigurasi
// ============================================================

export interface ErrorType<Error> {
  status: number
  data: Error
}

export type BodyType<BodyData> = BodyData

function getToken(): string | null {
  // Fallback dev bearer dari env
  const devBearer = import.meta.env.VITE_SCADA_DEV_BEARER as string | undefined
  if (devBearer) return devBearer
  return localStorage.getItem('scada_token')
}

/**
 * Custom fetch mutator — dipanggil oleh setiap generated service function
 * Otomatis inject Authorization header dan handle error response
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

  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}` }))
    throw {
      status: response.status,
      data: errorData,
    }
  }

  // 204 No Content
  if (response.status === 204) {
    return {} as T
  }

  return response.json()
}

// setup function (untuk kompatibilitas)
export function setupSdkClient() {
  // No-op saat pakai orval custom mutator
  // Auth dihandle di customFetch di atas
  console.debug('[SDK] Custom fetch mutator aktif')
}
