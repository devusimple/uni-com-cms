import { api } from '@/lib/api/client'
import type { Category } from '@/lib/api/types'

export function listCategories() {
  return api.get<Category[]>('/api/categories')
}

export function createCategory(input: {
  name: string
  slug?: string
  description?: string
}) {
  return api.post<Category>('/api/categories', input)
}

export function deleteCategory(id: string) {
  return api.del<{ deleted: true }>(`/api/categories/${id}`)
}
