import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { CopyButton } from '@/components/copy-button'
import { ErrorState } from '@/components/error-state'
import { PageHeader } from '@/components/page-header'
import { RichTextEditor } from '@/components/rich-text-editor'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/use-auth'
import { getProduct, updateProduct } from '@/lib/api/products'
import type { Product, ProductStatus } from '@/lib/api/types'
import { getErrorMessage } from '@/lib/errors'
import { isAdmin } from '@/lib/permissions'
import {
  normalizeProductDescription,
  PRODUCT_DESCRIPTION_MAX_LENGTH,
  toProductDescriptionEditorValue,
} from '@/lib/product-description'

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function EditProductForm({ product }: { product: Product }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [name, setName] = useState(product.name)
  const [slug, setSlug] = useState(product.slug)
  const [description, setDescription] = useState(() =>
    toProductDescriptionEditorValue(product.description),
  )
  const [status, setStatus] = useState<ProductStatus>(product.status)
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error('Product name is required.')
      if (!SLUG_PATTERN.test(slug.trim())) {
        throw new Error('Slug must use lowercase letters, numbers, and single hyphens.')
      }
      const normalizedDescription = normalizeProductDescription(description)
      if (
        normalizedDescription &&
        normalizedDescription.length > PRODUCT_DESCRIPTION_MAX_LENGTH
      ) {
        throw new Error(
          'Description must be 5,000 characters or fewer, including formatting.',
        )
      }
      return updateProduct(product.id, {
        name: name.trim(),
        slug: slug.trim(),
        description: normalizedDescription,
        status,
      })
    },
    onSuccess: () => {
      toast.success('Product updated')
      void queryClient.invalidateQueries({ queryKey: ['product', product.id] })
      void queryClient.invalidateQueries({ queryKey: ['products'] })
      navigate(`/products/${product.id}`, { replace: true })
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  })

  return (
    <>
      <PageHeader
        title={`Edit ${product.name}`}
        description="Update the product record. Category assignments and attributes are not editable from this screen."
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/products/${product.id}`}>
                <ArrowLeft className="size-4" aria-hidden="true" />
                Cancel
              </Link>
            </Button>
            <Button
              type="submit"
              form="edit-product-form"
              size="sm"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              Save changes
            </Button>
          </>
        }
      />

      <form
        id="edit-product-form"
        onSubmit={(event) => {
          event.preventDefault()
          setError(null)
          mutation.mutate()
        }}
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Card>
            <CardHeader>
              <CardTitle>Product information</CardTitle>
              <CardDescription>
                Changes to the name and slug appear in the storefront immediately.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="edit-product-name">Name</Label>
                <Input
                  id="edit-product-name"
                  value={name}
                  maxLength={200}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-product-slug">Slug</Label>
                <Input
                  id="edit-product-slug"
                  value={slug}
                  maxLength={220}
                  onChange={(event) => setSlug(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Lowercase letters, numbers, and hyphens.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-product-status">Status</Label>
                <Select
                  value={status}
                  onValueChange={(value) => setStatus(value as ProductStatus)}
                >
                  <SelectTrigger id="edit-product-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="edit-product-description">Description</Label>
                <RichTextEditor
                  id="edit-product-description"
                  value={description}
                  onChange={setDescription}
                  maxLength={PRODUCT_DESCRIPTION_MAX_LENGTH}
                />
              </div>
              {error ? (
                <div
                  role="alert"
                  className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive sm:col-span-2"
                >
                  {error}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Record</CardTitle>
                <CardDescription>Read-only identifiers for this product.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Product ID</span>
                  <span className="flex items-center gap-1 font-mono text-xs">
                    {product.id}
                    <CopyButton value={product.id} label="Copy product ID" />
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Seller ID</span>
                  <span className="font-mono text-xs">{product.sellerId}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Variations</span>
                  <span className="tabular-nums">{product.variations.length}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Categories</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Category assignments are not returned by the API, so they are not shown
                here. They are preserved when this form is saved.
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </>
  )
}

export function EditProductPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const productQuery = useQuery({
    queryKey: ['product', id],
    queryFn: () => getProduct(id as string),
    enabled: Boolean(id),
  })
  const product = productQuery.data
  const canEdit = Boolean(
    product && (isAdmin(user?.role) || product.sellerId === user?.id),
  )

  if (!id) return null

  if (productQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    )
  }

  if (productQuery.isError || !product) {
    return (
      <>
        <PageHeader
          title="Edit product"
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

  if (!canEdit) {
    return (
      <>
        <PageHeader
          title="Edit product"
          description="This product belongs to another seller."
          actions={
            <Button variant="outline" size="sm" asChild>
              <Link to={`/products/${product.id}`}>
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back to product
              </Link>
            </Button>
          }
        />
        <div className="rounded-xl border border-border bg-card">
          <ErrorState
            title="You cannot edit this product"
            message="Only the owning seller or an administrator can update this product."
          />
        </div>
      </>
    )
  }

  return <EditProductForm key={product.id} product={product} />
}
