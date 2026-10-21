import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ImageOff, Images, Loader2, Upload } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { MediaPreview } from '@/components/media-preview'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { listMedia } from '@/lib/api/media'
import { attachProductImage } from '@/lib/api/products'
import type { Product } from '@/lib/api/types'
import { getErrorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'

interface AttachImageDialogProps {
  product: Product
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AttachImageDialog({
  product,
  open,
  onOpenChange,
}: AttachImageDialogProps) {
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mediaQuery = useQuery({
    queryKey: ['media', 'attach-picker'],
    queryFn: () => listMedia({ limit: 100 }),
    enabled: open,
  })

  const images = (mediaQuery.data ?? []).filter((media) =>
    media.mimeType.startsWith('image/'),
  )

  const mutation = useMutation({
    mutationFn: () => {
      if (!selectedId) throw new Error('Choose an image from your media library.')
      return attachProductImage(product.id, selectedId)
    },
    onSuccess: () => {
      toast.success('Image attached to product')
      void queryClient.invalidateQueries({ queryKey: ['product', product.id] })
      void queryClient.invalidateQueries({ queryKey: ['products'] })
      setSelectedId(null)
      onOpenChange(false)
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setSelectedId(null)
          setError(null)
        }
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Attach product image</DialogTitle>
          <DialogDescription>
            Choose an upload from your media library. Attaching an image marks the
            media file public so the storefront can load it.
          </DialogDescription>
        </DialogHeader>

        {mediaQuery.isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="aspect-square rounded-lg" />
            ))}
          </div>
        ) : mediaQuery.isError ? (
          <ErrorState
            title="Media unavailable"
            message={getErrorMessage(mediaQuery.error)}
            onRetry={() => void mediaQuery.refetch()}
          />
        ) : images.length === 0 ? (
          <EmptyState
            icon={Images}
            title="No image uploads"
            description="Upload an image first, then return here to attach it to the product."
            action={
              <Button variant="outline" size="sm" asChild>
                <Link to="/media" onClick={() => onOpenChange(false)}>
                  <Upload className="size-4" aria-hidden="true" />
                  Open media library
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="grid max-h-[55vh] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3">
            {images.map((media) => {
              const selected = selectedId === media.id
              return (
                <button
                  key={media.id}
                  type="button"
                  className={cn(
                    'group relative aspect-square overflow-hidden rounded-lg border bg-muted text-left outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    selected ? 'border-primary ring-2 ring-primary/30' : 'border-border',
                  )}
                  onClick={() => setSelectedId(media.id)}
                  aria-pressed={selected}
                  aria-label={`Select ${media.filename}`}
                >
                  <MediaPreview media={media} />
                  <span className="absolute inset-x-0 bottom-0 truncate bg-background/90 px-2 py-1 text-xs">
                    {media.filename}
                  </span>
                  {selected ? (
                    <span className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="size-3" aria-hidden="true" />
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        )}

        {images.length === 0 && !mediaQuery.isLoading && !mediaQuery.isError ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ImageOff className="size-4" aria-hidden="true" />
            Only image uploads can be attached to products.
          </div>
        ) : null}

        {error ? (
          <div
            role="alert"
            className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive"
          >
            {error}
          </div>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              setError(null)
              mutation.mutate()
            }}
            disabled={!selectedId || mutation.isPending}
          >
            {mutation.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : null}
            Attach image
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
