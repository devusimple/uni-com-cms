import { api } from '@/lib/api/client'
import type { Coupon, CouponType } from '@/lib/api/types'

export interface CouponInput {
  code: string
  type: CouponType
  value: number
  minSubtotalCents?: number
  maxUses?: number | null
  startsAt?: number | null
  endsAt?: number | null
  isActive?: boolean
}

export function listCoupons() {
  return api.get<Coupon[]>('/api/coupons')
}

export function createCoupon(input: CouponInput) {
  return api.post<Coupon>('/api/coupons', input)
}

export function updateCoupon(
  id: string,
  input: {
    isActive?: boolean
    maxUses?: number | null
    endsAt?: number | null
  },
) {
  return api.patch<Coupon>(`/api/coupons/${id}`, input)
}
