import { useAuthStore } from '@/lib/auth-store'
import type { SessionPair } from '@/lib/api/types'

export const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 'https://uni-com.devusimple.workers.dev'
)
  .trim()
  .replace(/\/+$/, '')

interface ErrorBody {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
  auth?: boolean
  retryOn401?: boolean
}

let refreshInFlight: Promise<void> | null = null
let bootstrapInFlight: Promise<void> | null = null
let bootstrapped = false

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

function errorFromResponse(response: Response, payload: unknown) {
  const body = payload as ErrorBody | null
  return new ApiError(
    response.status,
    body?.error?.code ?? `HTTP_${response.status}`,
    body?.error?.message ?? response.statusText ?? 'Request failed',
    body?.error?.details,
  )
}

async function refreshSession() {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const refreshToken = useAuthStore.getState().refreshToken
      if (!refreshToken) {
        throw new ApiError(401, 'NO_REFRESH_TOKEN', 'Your session has expired.')
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      const payload = await readJson(response)

      if (!response.ok) {
        useAuthStore.getState().clear()
        throw errorFromResponse(response, payload)
      }

      const session = (payload as { data: SessionPair }).data
      useAuthStore.getState().setSession(session)
    })().finally(() => {
      refreshInFlight = null
    })
  }

  return refreshInFlight
}

async function send(path: string, options: RequestOptions = {}) {
  const { body, auth = true, headers, ...init } = options
  const requestHeaders = new Headers(headers)
  const isFormData = body instanceof FormData

  if (body !== undefined && !isFormData && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json')
  }

  const accessToken = useAuthStore.getState().accessToken
  if (auth && accessToken) {
    requestHeaders.set('Authorization', `Bearer ${accessToken}`)
  }

  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: requestHeaders,
    body:
      body === undefined
        ? undefined
        : isFormData
          ? body
          : JSON.stringify(body),
  })
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true, retryOn401 = true } = options
  const response = await send(path, options)
  const payload = await readJson(response)

  if (response.status === 401 && auth && retryOn401) {
    try {
      await refreshSession()
    } catch {
      useAuthStore.getState().clear()
      throw errorFromResponse(response, payload)
    }
    return apiRequest<T>(path, { ...options, retryOn401: false })
  }

  if (!response.ok) {
    throw errorFromResponse(response, payload)
  }

  if (payload && typeof payload === 'object' && 'success' in payload) {
    const envelope = payload as { success: boolean; data: T }
    if (!envelope.success) {
      throw new ApiError(response.status, 'REQUEST_FAILED', 'Request failed')
    }
    return envelope.data
  }

  return payload as T
}

/**
 * Fetches a binary response (media bytes) with the bearer token attached.
 * Private files cannot be opened in a new tab because the browser cannot send
 * the Authorization header, so they are streamed through the app instead.
 */
export async function apiBlob(path: string): Promise<Blob> {
  let response = await send(path)

  if (response.status === 401) {
    const payload = await readJson(response)
    try {
      await refreshSession()
    } catch {
      useAuthStore.getState().clear()
      throw errorFromResponse(response, payload)
    }
    response = await send(path)
  }

  if (!response.ok) {
    const payload = await readJson(response)
    throw errorFromResponse(response, payload)
  }

  return response.blob()
}

export async function bootstrapSession() {
  if (bootstrapped) return
  if (!bootstrapInFlight) {
    bootstrapInFlight = (async () => {
      const refreshToken = useAuthStore.getState().refreshToken
      if (!refreshToken) {
        useAuthStore.getState().setStatus('unauthenticated')
        return
      }

      try {
        await refreshSession()
      } catch {
        useAuthStore.getState().clear()
      }
    })().finally(() => {
      bootstrapInFlight = null
      bootstrapped = true
    })
  }

  return bootstrapInFlight
}

export const api = {
  get: <T>(path: string) => apiRequest<T>(path),
  post: <T>(path: string, body?: unknown, auth = true) =>
    apiRequest<T>(path, { method: 'POST', body, auth }),
  patch: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: 'PATCH', body }),
  del: <T>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
}
