import type { Coupon } from '@/lib/api/types'
import { formatMoney } from '@/lib/format'

export const COUPON_CODE_PATTERN = /^[a-zA-Z0-9-_]+$/

export function couponValue(coupon: Coupon) {
  return coupon.type === 'percent'
    ? `${coupon.value}%`
    : formatMoney(coupon.value)
}

export function toDateTimeLocal(timestamp: number | null) {
  if (!timestamp) return ''
  const date = new Date(timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export function toUnixSeconds(value: string) {
  if (!value) return null
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? null : Math.floor(time / 1000)
}
