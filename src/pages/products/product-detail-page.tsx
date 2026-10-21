import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  ImageOff,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { CopyButton } from '@/components/copy-button'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { PageHeader } from '@/components/page-header'
import { ProductDescription } from '@/components/product-description'
import { StatusBadge } from '@/components/status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAuth } from '@/hooks/use-auth'
import {
  deleteProduct,
  deleteVariation,
  detachProductImage,
  getProduct,
} from '@/lib/api/products'
import type { ProductImage, ProductVariation } from '@/lib/api/types'
import { getErrorMessage } from '@/lib/errors'
import { formatDate, formatMoney, shortId } from '@/lib/format'
import { isAdmin } from '@/lib/permissions'
import { AttachImageDialog } from '@/pages/products/attach-image-dialog'

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [attachOpen, setAttachOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteVariationTarget, setDeleteVariationTarget] =
    useState<ProductVariation | null>(null)
  const [detachTarget, setDetachTarget] = useState<ProductImage | null>(null)

  const productQuery = useQuery({
    queryKey: ['product', id],
    queryFn: () => getProduct(id as string),
    enabled: Boolean(id),
  })

  const product = productQuery.data
  const canEdit = Boolean(
    product && (isAdmin(user?.role) || product.sellerId === user?.id),
  )

  const deleteProductMutation = useMutation({
    mutationFn: () => deleteProduct(id as string),
    onSuccess: () => {
      toast.success('Product deleted')
      void queryClient.invalidateQueries({ queryKey: ['products'] })
      navigate('/products', { replace: true })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const deleteVariationMutation = useMutation({
    mutationFn: (variationId: string) =>
      deleteVariation(id as string, variationId),
    onSuccess: () => {
      toast.success('Variation deleted')
      setDeleteVariationTarget(null)
      void queryClient.invalidateQueries({ queryKey: ['product', id] })
      void queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const detachImageMutation = useMutation({
    mutationFn: (mediaId: string) => detachProductImage(id as string, mediaId),
    onSuccess: () => {
      toast.success('Image detached')
      setDetachTarget(null)
      void queryClient.invalidateQueries({ queryKey: ['product', id] })
      void queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  if (!id) return null

  if (productQuery.isLoading) return <DetailSkeleton />

  if (productQuery.isError || !product) {
    return (
      <>
        <PageHeader
          title="Product"
          description="Unable to load this product."
          actions={
            <Button variant="outline" size="sm" asChild>
              <Link to="/products">
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back to products
              </Link>
            </Button>
          }
        />
        <div className="rounded-xl border border-border bg-card">
          <ErrorState
            title="Product not found"
            message={getErrorMessage(productQuery.error)}
            onRetry={() => void productQuery.refetch()}
          />
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={product.name}
        description={`${product.slug} · ${product.variations.length} ${
          product.variations.length === 1 ? 'variation' : 'variations'
        }`}
        actions={
          <>
            <StatusBadge status={product.status} />
            {canEdit ? (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/products/${product.id}/edit`}>
                    <Pencil className="size-4" aria-hidden="true" />
                    Edit
                  </Link>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Product actions">
                      <MoreHorizontal className="size-4" aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to="/products">
                        <ArrowLeft className="size-4" aria-hidden="true" />
                        Back to products
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setDeleteOpen(true)}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                      Delete product
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button variant="outline" size="sm" asChild>
                <Link to="/products">
                  <ArrowLeft className="size-4" aria-hidden="true" />
                  Back to products
                </Link>
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Images</CardTitle>
              <CardDescription>
                {product.images.length === 0
                  ? 'No images attached to this product.'
                  : `${product.images.length} ${
                      product.images.length === 1 ? 'image' : 'images'
                    } attached.`}
              </CardDescription>
              {canEdit ? (
                <CardAction>
                  <Button variant="outline" size="sm" onClick={() => setAttachOpen(true)}>
                    <Plus className="size-4" aria-hidden="true" />
                    Attach image
                  </Button>
                </CardAction>
              ) : null}
            </CardHeader>
            <CardContent>
              {product.images.length === 0 ? (
                <EmptyState
                  icon={ImageOff}
                  title="No product images"
                  description="Attach an image from your media library to improve the storefront listing."
                  className="py-10"
                  action={
                    canEdit ? (
                      <Button variant="outline" size="sm" onClick={() => setAttachOpen(true)}>
                        <Plus className="size-4" aria-hidden="true" />
                        Attach image
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {product.images.map((image) => (
                    <div
                      key={image.id}
                      className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted"
                    >
                      <img
                        src={image.url}
                        alt=""
                        className="size-full object-cover"
                      />
                      {canEdit ? (
                        <Button
                          variant="secondary"
                          size="icon-sm"
                          className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                          aria-label="Detach image"
                          onClick={() => setDetachTarget(image)}
                        >
                          <Trash2 className="size-3.5" aria-hidden="true" />
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Variations</CardTitle>
              <CardDescription>
                Price, stock, and option combinations for this product.
              </CardDescription>
              {canEdit ? (
                <CardAction>
                  <Button size="sm" asChild>
                    <Link to={`/products/${product.id}/variations/new`}>
                      <Plus className="size-4" aria-hidden="true" />
                      Add variation
                    </Link>
                  </Button>
                </CardAction>
              ) : null}
            </CardHeader>
            <CardContent className="px-0">
              {product.variations.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title="No variations yet"
                  description="A product needs at least one variation before buyers can add it to a cart."
                  className="py-10"
                  action={
                    canEdit ? (
                      <Button size="sm" asChild>
                        <Link to={`/products/${product.id}/variations/new`}>
                          <Plus className="size-4" aria-hidden="true" />
                          Add variation
                        </Link>
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-4">SKU</TableHead>
                        <TableHead>Options</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-12 pr-4">
                          <span className="sr-only">Actions</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {product.variations.map((variation) => (
                        <TableRow key={variation.id}>
                          <TableCell className="pl-4 font-mono text-xs font-medium">
                            {variation.sku}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(variation.options).map(([key, value]) => (
                                <Badge key={key} variant="secondary" className="font-normal">
                                  {key}: {value}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            <div>
                              {formatMoney(variation.priceCents)}
                              {variation.compareAtCents ? (
                                <span className="ml-2 text-xs text-muted-foreground line-through">
                                  {formatMoney(variation.compareAtCents)}
                                </span>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {variation.stockQuantity}
                          </TableCell>
                          <TableCell>
                            <StatusBadge
                              status={variation.isActive ? 'active' : 'inactive'}
                            />
                          </TableCell>
                          <TableCell className="pr-4 text-right">
                            {canEdit ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label="Variation actions"
                                  >
                                    <MoreHorizontal
                                      className="size-4"
                                      aria-hidden="true"
                                    />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem asChild>
                                    <Link
                                      to={`/products/${product.id}/variations/${variation.id}/edit`}
                                    >
                                      <Pencil className="size-4" aria-hidden="true" />
                                      Edit variation
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onClick={() => setDeleteVariationTarget(variation)}
                                  >
                                    <Trash2 className="size-4" aria-hidden="true" />
                                    Delete variation
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
              <CardDescription>Product record and ownership.</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="divide-y divide-border text-sm">
                <div className="flex items-center justify-between gap-3 py-2 first:pt-0">
                  <dt className="text-muted-foreground">Product ID</dt>
                  <dd className="flex items-center gap-1 font-mono text-xs">
                    {shortId(product.id, 12)}
                    <CopyButton value={product.id} label="Copy product ID" />
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 py-2">
                  <dt className="text-muted-foreground">Seller ID</dt>
                  <dd className="flex items-center gap-1 font-mono text-xs">
                    {shortId(product.sellerId, 12)}
                    <CopyButton value={product.sellerId} label="Copy seller ID" />
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 py-2">
                  <dt className="text-muted-foreground">Created</dt>
                  <dd>{formatDate(product.createdAt)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3 py-2">
                  <dt className="text-muted-foreground">Updated</dt>
                  <dd>{formatDate(product.updatedAt)}</dd>
                </div>
              </dl>
              {product.description ? (
                <div className="mt-4 space-y-2 border-t border-border pt-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Description
                  </p>
                  <ProductDescription value={product.description} />
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Attributes</CardTitle>
              <CardDescription>
                Option groups used by every variation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {product.attributes.map((attribute) => (
                <div key={attribute.id} className="space-y-2">
                  <p className="text-sm font-medium">{attribute.name}</p>
                  <div className="flex flex-wrap gap-1">
                    {attribute.values.map((value) => (
                      <Badge key={value.id} variant="outline" className="font-normal">
                        {value.value}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {canEdit ? (
        <>
          <AttachImageDialog
            product={product}
            open={attachOpen}
            onOpenChange={setAttachOpen}
          />
          <ConfirmDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            title="Delete this product?"
            description={`${product.name} and all of its variations will be permanently deleted. Attached media files stay in the media library.`}
            confirmLabel="Delete product"
            destructive
            pending={deleteProductMutation.isPending}
            onConfirm={() => deleteProductMutation.mutate()}
          />
          <ConfirmDialog
            open={Boolean(deleteVariationTarget)}
            onOpenChange={(open) => !open && setDeleteVariationTarget(null)}
            title="Delete this variation?"
            description={
              deleteVariationTarget
                ? `Variation ${deleteVariationTarget.sku} will be permanently removed from the product.`
                : ''
            }
            confirmLabel="Delete variation"
            destructive
            pending={deleteVariationMutation.isPending}
            onConfirm={() =>
              deleteVariationTarget &&
              deleteVariationMutation.mutate(deleteVariationTarget.id)
            }
          />
          <ConfirmDialog
            open={Boolean(detachTarget)}
            onOpenChange={(open) => !open && setDetachTarget(null)}
            title="Detach this image?"
            description="The image is removed from the product listing but remains available in the media library."
            confirmLabel="Detach image"
            destructive
            pending={detachImageMutation.isPending}
            onConfirm={() => detachTarget && detachImageMutation.mutate(detachTarget.id)}
          />
        </>
      ) : null}
    </>
  )
}
