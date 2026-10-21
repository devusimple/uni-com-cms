import { api } from '@/lib/api/client'
import type { SafeUser, SessionPair } from '@/lib/api/types'

export async function login(email: string, password: string) {
  return api.post<SessionPair>('/api/auth/login', { email, password }, false)
}

export async function getMe() {
  const result = await api.get<{ user: SafeUser }>('/api/auth/me')
  return result.user
}

export async function updateProfile(input: { name?: string | null; avatarUrl?: string | null }) {
  const result = await api.patch<{ user: SafeUser }>('/api/auth/me', input)
  return result.user
}

export async function logout(refreshToken: string) {
  return api.post<{ loggedOut: true }>('/api/auth/logout', { refreshToken })
}

export async function logoutAll() {
  return api.post<{ loggedOut: true }>('/api/auth/logout-all')
}

export async function requestPasswordReset(email: string) {
  return api.post<{ sent: true; devToken?: string }>('/api/auth/forgot', { email }, false)
}

export async function requestEmailVerification() {
  return api.post<{ sent: true; devToken?: string }>('/api/auth/verify-request')
}
