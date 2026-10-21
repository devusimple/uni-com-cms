import { create } from 'zustand'
import type { SafeUser } from '@/lib/api/types'

const REFRESH_TOKEN_KEY = 'uni-com.console.refresh-token'

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface AuthState {
  user: SafeUser | null
  accessToken: string | null
  refreshToken: string | null
  status: AuthStatus
  setSession: (session: {
    user: SafeUser
    accessToken: string
    refreshToken: string
  }) => void
  setUser: (user: SafeUser) => void
  setStatus: (status: AuthStatus) => void
  clear: () => void
}

function readRefreshToken() {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(REFRESH_TOKEN_KEY)
  } catch {
    return null
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: readRefreshToken(),
  status: 'loading',
  setSession: ({ user, accessToken, refreshToken }) => {
    try {
      window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    } catch {
      // Storage can be unavailable in private browsing; the session still works
      // for this tab because the token remains in memory.
    }
    set({ user, accessToken, refreshToken, status: 'authenticated' })
  },
  setUser: (user) => set({ user }),
  setStatus: (status) => set({ status }),
  clear: () => {
    try {
      window.localStorage.removeItem(REFRESH_TOKEN_KEY)
    } catch {
      // Ignore storage failures while clearing.
    }
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      status: 'unauthenticated',
    })
  },
}))
