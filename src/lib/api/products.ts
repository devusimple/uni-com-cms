import { api } from '@/lib/api/client'
import { toQueryString } from '@/lib/api/query'
import type {
  Product,
  ProductCard,
  ProductListParams,
  ProductStatus,
  ProductVariation,
} from '@/lib/api/types'

export interface ProductInput {
  name: string
  slug?: string
  description?: string
  status?: ProductStatus
  attributes: Array<{ name: string; values: string[] }>
  categoryIds?: string[]
}

export interface VariationInput {
  sku: string
  priceCents: number
  compareAtCents?: number | null
  stockQuantity?: number
  isActive?: boolean
  options: Record<string, string>
}

export interface ProductUpdateInput {
  name?: string
  slug?: string
  description?: string | null
  status?: ProductStatus
  categoryIds?: string[]
}

export interface VariationUpdateInput {
  sku?: string
  priceCents?: number
  compareAtCents?: number | null
  stockQuantity?: number
  isActive?: boolean
}

export function listProducts(params: ProductListParams = {}) {
  return api.get<ProductCard[]>(`/api/products${toQueryString(params)}`)
}

export function getProduct(id: string) {
  return api.get<Product>(`/api/products/${id}`)
}

export function createProduct(input: ProductInput) {
  return api.post<Product>('/api/products', input)
}

export function updateProduct(
  id: string,
  input: ProductUpdateInput,
) {
  return api.patch<Product>(`/api/products/${id}`, input)
}

export function deleteProduct(id: string) {
  return api.del<{ deleted: true }>(`/api/products/${id}`)
}

export function addVariation(productId: string, input: VariationInput) {
  return api.post<ProductVariation>(`/api/products/${productId}/variations`, input)
}

export function updateVariation(
  productId: string,
  variationId: string,
  input: VariationUpdateInput,
) {
  return api.patch<ProductVariation>(
    `/api/products/${productId}/variations/${variationId}`,
    input,
  )
}

export function deleteVariation(productId: string, variationId: string) {
  return api.del<{ deleted: true }>(
    `/api/products/${productId}/variations/${variationId}`,
  )
}

export function attachProductImage(productId: string, mediaId: string) {
  return api.post<{ id: string; url: string }[]>(
    `/api/products/${productId}/images`,
    { mediaId },
  )
}

export function detachProductImage(productId: string, mediaId: string) {
  return api.del<{ deleted: true }>(`/api/products/${productId}/images/${mediaId}`)
}
