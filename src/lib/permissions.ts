import type { Role } from '@/lib/api/types'

/**
 * The API only knows two roles: `user` and `admin`. Every catalog, coupon,
 * category, order-management, and user-management capability is admin-only.
 */
export function isAdmin(role: Role | undefined) {
  return role === 'admin'
}
