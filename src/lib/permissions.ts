import type { Role } from '@/lib/api/types'

export function isAdmin(role: Role | undefined) {
  return role === 'admin'
}

export function canModerate(role: Role | undefined) {
  return role === 'admin' || role === 'moderator'
}

export function canManageCatalog(role: Role | undefined) {
  return role === 'admin' || role === 'seller'
}
