import { api } from '@/lib/api/client'
import { toQueryString } from '@/lib/api/query'
import type { Order, OrderListParams } from '@/lib/api/types'

export function listOrders(params: OrderListParams = {}) {
  return api.get<Order[]>(`/api/orders${toQueryString(params)}`)
}

export function getOrder(id: string) {
  return api.get<Order>(`/api/orders/${id}`)
}

export function cancelOrder(id: string) {
  return api.patch<Order>(`/api/orders/${id}/cancel`)
}

export function fulfillOrder(id: string) {
  return api.patch<Order>(`/api/orders/${id}/fulfill`)
}
