import { useAuthStore } from '@/lib/auth-store'

export function useAuth() {
  const user = useAuthStore((state) => state.user)
  const status = useAuthStore((state) => state.status)
  return { user, status }
}
