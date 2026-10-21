export type Role = 'user' | 'admin'

export interface SafeUser {
  id: string
  email: string
  name: string | null
  role: Role
  avatarUrl: string | null
  isActive: boolean
  emailVerifiedAt: number | null
  lastLoginAt: number | null
  createdAt: number
  updatedAt: number
}

export interface PublicUser {
  id: string
  name: string | null
  avatarUrl: string | null
}

export interface SessionPair {
  user: SafeUser
  accessToken: string
  refreshToken: string
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  createdAt: number
}

export type CouponType = 'percent' | 'fixed'

export interface Coupon {
  id: string
  code: string
  type: CouponType
  value: number
  minSubtotalCents: number
  maxUses: number | null
  usedCount: number
  startsAt: number | null
  endsAt: number | null
  isActive: boolean
  createdAt: number
}

export type ProductStatus = 'draft' | 'published' | 'archived'

export interface ProductImage {
  id: string
  url: string
}

export interface ProductAttributeValue {
  id: string
  value: string
}

export interface ProductAttribute {
  id: string
  name: string
  values: ProductAttributeValue[]
}

export interface ProductVariation {
  id: string
  sku: string
  priceCents: number
  compareAtCents: number | null
  stockQuantity: number
  isActive: boolean
  options: Record<string, string>
  createdAt: number
  updatedAt: number
}

export interface Product {
  id: string
  ownerId: string
  name: string
  slug: string
  description: string | null
  status: ProductStatus
  images: ProductImage[]
  attributes: ProductAttribute[]
  variations: ProductVariation[]
  createdAt: number
  updatedAt: number
}

export interface ProductCard {
  id: string
  ownerId: string
  name: string
  slug: string
  description: string | null
  status: ProductStatus
  coverImage: string | null
  createdAt: number
  updatedAt: number
}

export interface ShippingAddress {
  fullName: string
  phone: string | null
  line1: string
  line2: string | null
  city: string
  state: string | null
  postalCode: string
  country: string
}

export interface OrderItem {
  id: string
  variationId: string
  productId: string
  productName: string
  sku: string
  unitPriceCents: number
  options: Record<string, string>
  quantity: number
}

export interface Order {
  id: string
  buyerId: string
  status: string
  subtotalCents: number
  totalCents: number
  currency: string
  paymentMethod: string
  couponCode: string | null
  discountCents: number
  shippingAddress: ShippingAddress | null
  items: OrderItem[]
  createdAt: number
  updatedAt: number
}

export interface Media {
  id: string
  filename: string
  mimeType: string
  sizeBytes: number
  isPublic: boolean
  url: string
  createdAt: number
}

export type OrderScope = 'mine' | 'all'
export type ProductSort = 'newest' | 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc'

export interface PageParams {
  limit?: number
  offset?: number
}

export interface ProductListParams extends PageParams {
  status?: ProductStatus
  ownerId?: string
  search?: string
  /** Category slug, not the category id. */
  category?: string
  sort?: ProductSort
  /** Price bounds are integer cents. */
  minPrice?: number
  maxPrice?: number
  mine?: boolean
}

export interface OrderListParams extends PageParams {
  scope?: OrderScope
}

export interface UserListParams extends PageParams {
  role?: Role
}

export interface MediaListParams extends PageParams {
  limit?: number
  offset?: number
}
