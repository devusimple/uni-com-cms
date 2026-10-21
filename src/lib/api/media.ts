import { api } from '@/lib/api/client'
import { toQueryString } from '@/lib/api/query'
import type { Media, MediaListParams } from '@/lib/api/types'

export function listMedia(params: MediaListParams = {}) {
  return api.get<Media[]>(`/api/media${toQueryString(params)}`)
}

export function getMedia(id: string) {
  return api.get<Media>(`/api/media/${id}`)
}

export function uploadMedia(file: File) {
  const body = new FormData()
  body.append('file', file)
  return api.post<Media>('/api/media/upload', body)
}

export function updateMediaVisibility(id: string, isPublic: boolean) {
  return api.patch<Media>(`/api/media/${id}`, { isPublic })
}

export function deleteMedia(id: string) {
  return api.del<{ deleted: true }>(`/api/media/${id}`)
}

export function mediaFileUrl(id: string) {
  return `${import.meta.env.VITE_API_URL || 'https://uni-com.devusimple.workers.dev'}/api/media/${id}/file`
}
