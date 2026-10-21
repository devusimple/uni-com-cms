import { api } from '@/lib/api/client'
import { toQueryString } from '@/lib/api/query'
import type { PublicUser, Role, UserListParams } from '@/lib/api/types'

export function listUsers(params: UserListParams = {}) {
  return api.get<PublicUser[]>(`/api/users${toQueryString(params)}`)
}

export function setUserRole(id: string, role: Role) {
  return api.patch<{ id: string; role: Role }>(`/api/users/${id}/role`, { role })
}

export function setUserStatus(id: string, isActive: boolean) {
  return api.patch<{ id: string; isActive: boolean }>(`/api/users/${id}/status`, {
    isActive,
  })
}
