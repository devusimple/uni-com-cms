import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Download,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Trash2,
  Upload,
  UploadCloud,
} from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { CopyButton } from '@/components/copy-button'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { MediaPreview } from '@/components/media-preview'
import { PageHeader } from '@/components/page-header'
import { Pagination } from '@/components/pagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  clearMediaObjectUrlCache,
} from '@/hooks/use-media-object-url'
import {
  deleteMedia,
  fetchMediaFile,
  listMedia,
  updateMediaVisibility,
  uploadMedia,
} from '@/lib/api/media'
import type { Media } from '@/lib/api/types'
import { getErrorMessage } from '@/lib/errors'
import { formatDateShort, formatFileSize } from '@/lib/format'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 24
const MAX_FILE_SIZE = 10 * 1024 * 1024

async function resolveFileUrl(media: Media) {
  if (media.isPublic && media.url) return media.url
  const blob = await fetchMediaFile(media.id)
  return URL.createObjectURL(blob)
}

export function MediaPage() {
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1)
  const [dragActive, setDragActive] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Media | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const mediaQuery = useQuery({
    queryKey: ['media', 'list', page],
    queryFn: () =>
      listMedia({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
  })

  const media = mediaQuery.data ?? []

  function setPage(nextPage: number) {
    const next = new URLSearchParams(params)
    if (nextPage <= 1) next.delete('page')
    else next.set('page', String(nextPage))
    setParams(next)
  }

  function invalidateMedia() {
    void queryClient.invalidateQueries({ queryKey: ['media'] })
  }

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadMedia(file),
    onSuccess: () => {
      toast.success('File uploaded')
      invalidateMedia()
      setPage(1)
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const visibilityMutation = useMutation({
    mutationFn: (mediaItem: Media) =>
      updateMediaVisibility(mediaItem.id, !mediaItem.isPublic),
    onSuccess: (_result, mediaItem) => {
      toast.success(mediaItem.isPublic ? 'File made private' : 'File made public')
      clearMediaObjectUrlCache(mediaItem.id)
      invalidateMedia()
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMedia(id),
    onSuccess: () => {
      toast.success('File deleted')
      setDeleteTarget(null)
      clearMediaObjectUrlCache(deleteTarget?.id)
      invalidateMedia()
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  function handleFiles(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Files must be 10 MB or smaller.')
      return
    }
    uploadMutation.mutate(file)
  }

  async function openFile(mediaItem: Media) {
    setBusyId(mediaItem.id)
    try {
      const url = await resolveFileUrl(mediaItem)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setBusyId(null)
    }
  }

  async function downloadFile(mediaItem: Media) {
    setBusyId(mediaItem.id)
    try {
      const url = await resolveFileUrl(mediaItem)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = mediaItem.filename
      anchor.rel = 'noopener noreferrer'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      if (url.startsWith('blob:')) {
        setTimeout(() => URL.revokeObjectURL(url), 30_000)
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <PageHeader
        title="Media"
        description="Upload product imagery and storefront assets. Private files stay behind your session, so only you can preview or download them."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void mediaQuery.refetch()}
              disabled={mediaQuery.isFetching}
            >
              <RefreshCw
                className={mediaQuery.isFetching ? 'size-4 animate-spin' : 'size-4'}
                aria-hidden="true"
              />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={uploadMutation.isPending}
            >
              {uploadMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Upload className="size-4" aria-hidden="true" />
              )}
              Upload file
            </Button>
          </>
        }
      />

      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        onChange={(event) => {
          handleFiles(event.target.files)
          event.target.value = ''
        }}
      />

      <div
        role="button"
        tabIndex={0}
        className={cn(
          'flex min-h-32 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card px-6 py-8 text-center outline-none transition-colors hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring',
          dragActive && 'border-primary bg-muted/50',
        )}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragOver={(event) => {
          event.preventDefault()
          setDragActive(true)
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragActive(false)
          handleFiles(event.dataTransfer.files)
        }}
      >
        {uploadMutation.isPending ? (
          <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
        ) : (
          <UploadCloud className="size-6 text-muted-foreground" aria-hidden="true" />
        )}
        <div>
          <p className="text-sm font-medium">
            {uploadMutation.isPending
              ? `Uploading ${uploadMutation.variables?.name ?? 'file'}…`
              : 'Drop a file here or click to upload'}
          </p>
          <p className="text-xs text-muted-foreground">
            Maximum file size 10 MB. Files are uploaded to your UNI-COM media library.
          </p>
        </div>
      </div>

      {mediaQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : mediaQuery.isError ? (
        <div className="rounded-xl border border-border bg-card">
          <ErrorState
            title="Media unavailable"
            message={getErrorMessage(mediaQuery.error)}
            onRetry={() => void mediaQuery.refetch()}
          />
        </div>
      ) : media.length === 0 ? (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState
            icon={ImageIcon}
            title={page > 1 ? 'No files on this page' : 'No media uploaded'}
            description={
              page > 1
                ? 'Go back to see earlier uploads.'
                : 'Upload product photos, documents, or other storefront assets.'
            }
            action={
              page > 1 ? (
                <Button variant="outline" size="sm" onClick={() => setPage(page - 1)}>
                  Back to previous page
                </Button>
              ) : (
                <Button size="sm" onClick={() => inputRef.current?.click()}>
                  <Upload className="size-4" aria-hidden="true" />
                  Upload file
                </Button>
              )
            }
          />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {media.map((mediaItem) => (
              <Card key={mediaItem.id} className="gap-0 pt-0">
                <div className="relative aspect-[4/3] overflow-hidden border-b border-border bg-muted">
                  <MediaPreview media={mediaItem} />
                  <Badge
                    variant="secondary"
                    className="absolute left-2 top-2 text-[10px] uppercase"
                  >
                    {mediaItem.isPublic ? 'Public' : 'Private'}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="secondary"
                        size="icon-sm"
                        className="absolute right-2 top-2"
                        aria-label="File actions"
                      >
                        <MoreHorizontal className="size-4" aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        disabled={busyId === mediaItem.id}
                        onClick={() => void openFile(mediaItem)}
                      >
                        {busyId === mediaItem.id ? (
                          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <ExternalLink className="size-4" aria-hidden="true" />
                        )}
                        Open file
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={busyId === mediaItem.id}
                        onClick={() => void downloadFile(mediaItem)}
                      >
                        <Download className="size-4" aria-hidden="true" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setDeleteTarget(mediaItem)}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                        Delete file
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardHeader className="gap-1 py-3">
                  <CardTitle className="truncate text-sm" title={mediaItem.filename}>
                    {mediaItem.filename}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(mediaItem.sizeBytes)} ·{' '}
                    {formatDateShort(mediaItem.createdAt)}
                  </p>
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="flex items-center gap-2 rounded-md bg-muted/40 px-2 py-1.5">
                    <p className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground">
                      {mediaItem.url}
                    </p>
                    <CopyButton value={mediaItem.url} label="Copy file URL" />
                  </div>
                </CardContent>
                <CardFooter className="justify-between py-3">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Switch
                      checked={mediaItem.isPublic}
                      disabled={visibilityMutation.isPending}
                      onCheckedChange={() => visibilityMutation.mutate(mediaItem)}
                      aria-label={`Toggle visibility for ${mediaItem.filename}`}
                    />
                    Public
                  </label>
                  <span className="text-[10px] uppercase text-muted-foreground">
                    {mediaItem.mimeType.split('/')[1] ?? mediaItem.mimeType}
                  </span>
                </CardFooter>
              </Card>
            ))}
          </div>
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            itemCount={media.length}
            onPageChange={setPage}
          />
        </>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this file?"
        description={
          deleteTarget
            ? `${deleteTarget.filename} and its metadata will be permanently deleted. Products using this file will lose the image.`
            : ''
        }
        confirmLabel="Delete file"
        destructive
        pending={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </>
  )
}
