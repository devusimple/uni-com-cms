import { useEffect, useState } from 'react'
import { fetchMediaFile } from '@/lib/api/media'
import type { Media } from '@/lib/api/types'

/**
 * Public media can be rendered straight from its CDN URL. Private media needs
 * the bearer token, which a browser cannot attach to an <img> request, so the
 * bytes are streamed through the app and cached as an object URL.
 *
 * The cache stores the in-flight promise so that concurrent mounts share a
 * single request instead of downloading the same file twice.
 */
const objectUrls = new Map<string, Promise<string>>()

export function clearMediaObjectUrlCache(id?: string) {
  if (id) {
    const pending = objectUrls.get(id)
    objectUrls.delete(id)
    void pending?.then((url) => URL.revokeObjectURL(url)).catch(() => undefined)
    return
  }

  for (const pending of objectUrls.values()) {
    void pending.then((url) => URL.revokeObjectURL(url)).catch(() => undefined)
  }
  objectUrls.clear()
}

function loadPrivateMedia(id: string) {
  const cached = objectUrls.get(id)
  if (cached) return cached

  const pending = fetchMediaFile(id).then((blob) => {
    const url = URL.createObjectURL(blob)
    // The entry may have been cleared while the request was in flight.
    if (!objectUrls.has(id)) URL.revokeObjectURL(url)
    return url
  })

  objectUrls.set(id, pending)
  return pending
}

export function useMediaObjectUrl(media: Media | null | undefined) {
  const [privateUrl, setPrivateUrl] = useState<string | null>(null)
  const id = media?.id
  const isPublic = media?.isPublic ?? false
  const directUrl = media?.url ?? null

  useEffect(() => {
    if (!id || isPublic) return

    let cancelled = false

    void loadPrivateMedia(id)
      .then((url) => {
        if (!cancelled) setPrivateUrl(url)
      })
      .catch(() => {
        if (!cancelled) setPrivateUrl(null)
      })

    return () => {
      cancelled = true
    }
  }, [id, isPublic])

  if (isPublic && directUrl) return directUrl
  return privateUrl
}
