import { File, FileText, Loader2 } from 'lucide-react'
import { useMediaObjectUrl } from '@/hooks/use-media-object-url'
import type { Media } from '@/lib/api/types'
import { cn } from '@/lib/utils'

interface MediaPreviewProps {
  media: Media
  className?: string
}

/**
 * Renders a media thumbnail. Public files stream from their CDN URL; private
 * files are fetched with the session token so they still preview correctly.
 */
export function MediaPreview({ media, className }: MediaPreviewProps) {
  const url = useMediaObjectUrl(media)
  const isImage = media.mimeType.startsWith('image/')
  const isDocument =
    media.mimeType === 'application/pdf' || media.mimeType.startsWith('text/')

  if (isImage) {
    if (!url) {
      return (
        <div
          className={cn(
            'flex size-full items-center justify-center bg-muted/40 text-muted-foreground',
            className,
          )}
        >
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          <span className="sr-only">Loading preview</span>
        </div>
      )
    }
    return (
      <img
        src={url}
        alt={media.filename}
        className={cn('size-full object-cover', className)}
        loading="lazy"
      />
    )
  }

  return (
    <div
      className={cn(
        'flex size-full flex-col items-center justify-center gap-2 text-muted-foreground',
        className,
      )}
    >
      {isDocument ? (
        <FileText className="size-8" aria-hidden="true" />
      ) : (
        <File className="size-8" aria-hidden="true" />
      )}
      <span className="text-xs uppercase">
        {media.mimeType.split('/')[1] ?? 'FILE'}
      </span>
    </div>
  )
}
