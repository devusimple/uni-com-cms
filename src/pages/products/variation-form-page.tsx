import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ErrorState } from '@/components/error-state'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
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
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/hooks/use-auth'
import {
  addVariation,
  getProduct,
  updateVariation,
} from '@/lib/api/products'
import type { Product, ProductVariation } from '@/lib/api/types'
import { getErrorMessage } from '@/lib/errors'
import { isAdmin } from '@/lib/permissions'

function optionSignature(
  attributes: Product['attributes'],
  options: Record<string, string>,
) {
  return JSON.stringify(
    attributes
      .map((attribute) => [attribute.name, options[attribute.name] ?? ''])
      .sort(([left], [right]) => left.localeCompare(right)),
  )
}

function VariationForm({
  product,
  variation,
}: {
  product: Product
  variation: ProductVariation | null
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [sku, setSku] = useState(variation?.sku ?? '')
  const [price, setPrice] = useState(
    variation ? (variation.priceCents / 100).toFixed(2) : '',
  )
  const [compareAt, setCompareAt] = useState(
    variation?.compareAtCents
      ? (variation.compareAtCents / 100).toFixed(2)
      : '',
  )
  const [stock, setStock] = useState(String(variation?.stockQuantity ?? 0))
  const [isActive, setIsActive] = useState(variation?.isActive ?? true)
  const [options, setOptions] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      product.attributes.map((attribute) => [
        attribute.name,
        variation?.options[attribute.name] ?? attribute.values[0]?.value ?? '',
      ]),
    ),
  )
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      const priceValue = Number(price)
      const compareValue = compareAt.trim() ? Number(compareAt) : null
      const stockValue = Number(stock)

      if (!sku.trim()) throw new Error('SKU is required.')
      if (!price.trim() || !Number.isFinite(priceValue) || priceValue < 0) {
        throw new Error('Enter a valid price.')
      }
      if (
        compareValue !== null &&
        (!Number.isFinite(compareValue) || compareValue < 0)
      ) {
        throw new Error('Compare-at price must be a valid amount.')
      }
      if (!Number.isInteger(stockValue) || stockValue < 0) {
        throw new Error('Stock must be a whole number of zero or more.')
      }
      if (product.attributes.some((attribute) => !options[attribute.name])) {
        throw new Error('Choose a value for every product attribute.')
      }

      const input = {
        sku: sku.trim(),
        priceCents: Math.round(priceValue * 100),
        compareAtCents:
          compareValue === null ? null : Math.round(compareValue * 100),
        stockQuantity: stockValue,
        isActive,
      }

      if (variation) {
        return updateVariation(product.id, variation.id, input)
      }

      const signature = optionSignature(product.attributes, options)
      const duplicate = product.variations.some(
        (existing) =>
          optionSignature(product.attributes, existing.options) === signature,
      )
      if (duplicate) {
        throw new Error(
          'A variation with this option combination already exists for this product.',
        )
      }

      return addVariation(product.id, { ...input, options })
    },
    onSuccess: () => {
      toast.success(variation ? 'Variation updated' : 'Variation added')
      void queryClient.invalidateQueries({ queryKey: ['product', product.id] })
      void queryClient.invalidateQueries({ queryKey: ['products'] })
      navigate(`/products/${product.id}`, { replace: true })
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  })

  const title = variation ? 'Edit variation' : 'New variation'

  return (
    <>
      <PageHeader
        title={title}
        description={`${product.name} · ${product.attributes
          .map((attribute) => attribute.name)
          .join(' / ')}`}
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
              form="variation-form"
              size="sm"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              {variation ? 'Save changes' : 'Add variation'}
            </Button>
          </>
        }
      />

      <form
        id="variation-form"
        onSubmit={(event) => {
          event.preventDefault()
          setError(null)
          mutation.mutate()
        }}
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Card>
            <CardHeader>
              <CardTitle>Pricing and stock</CardTitle>
              <CardDescription>
                The SKU must be unique across the catalog. Prices are entered in USD.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="variation-sku">SKU</Label>
                <Input
                  id="variation-sku"
                  value={sku}
                  maxLength={100}
                  onChange={(event) => setSku(event.target.value)}
                  placeholder="SHIRT-LINEN-M"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="variation-price">Price (USD)</Label>
                <Input
                  id="variation-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  placeholder="49.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="variation-compare">Compare-at (optional)</Label>
                <Input
                  id="variation-compare"
                  type="number"
                  min="0"
                  step="0.01"
                  value={compareAt}
                  onChange={(event) => setCompareAt(event.target.value)}
                  placeholder="65.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="variation-stock">Stock</Label>
                <Input
                  id="variation-stock"
                  type="number"
                  min="0"
                  step="1"
                  value={stock}
                  onChange={(event) => setStock(event.target.value)}
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
                <CardTitle>Options</CardTitle>
                <CardDescription>
                  {variation
                    ? 'Option values are fixed after creation.'
                    : 'Every product attribute needs a value.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {product.attributes.map((attribute) => (
                  <div key={attribute.id} className="space-y-2">
                    <Label
                      htmlFor={`variation-option-${attribute.id}`}
                      className="text-xs text-muted-foreground"
                    >
                      {attribute.name}
                    </Label>
                    {variation ? (
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="secondary" className="font-normal">
                          {variation.options[attribute.name] ?? '—'}
                        </Badge>
                      </div>
                    ) : (
                      <Select
                        value={options[attribute.name] ?? ''}
                        onValueChange={(value) =>
                          setOptions((current) => ({
                            ...current,
                            [attribute.name]: value,
                          }))
                        }
                      >
                        <SelectTrigger
                          id={`variation-option-${attribute.id}`}
                          className="w-full"
                        >
                          <SelectValue placeholder={`Choose ${attribute.name}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {attribute.values.map((value) => (
                            <SelectItem key={value.id} value={value.value}>
                              {value.value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Availability</CardTitle>
              </CardHeader>
              <CardContent>
                <label className="flex items-center justify-between gap-3 text-sm">
                  <span>
                    <span className="block font-medium">Active</span>
                    <span className="block text-xs text-muted-foreground">
                      Buyers can purchase this variation.
                    </span>
                  </span>
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                </label>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </>
  )
}

export function VariationFormPage() {
  const { id, variationId } = useParams<{ id: string; variationId?: string }>()
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
  const variation = variationId
    ? product?.variations.find((item) => item.id === variationId) ?? null
    : null

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
          title={variationId ? 'Edit variation' : 'New variation'}
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
          title={variationId ? 'Edit variation' : 'New variation'}
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
            title="You cannot manage variations for this product"
            message="Only the owning seller or an administrator can add or update variations."
          />
        </div>
      </>
    )
  }

  if (variationId && !variation) {
    return (
      <>
        <PageHeader
          title="Edit variation"
          description="This variation is not part of the selected product."
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
            title="Variation not found"
            message="It may have been deleted. Return to the product to review its current variations."
          />
        </div>
      </>
    )
  }

  if (product.attributes.length === 0) {
    return (
      <>
        <PageHeader
          title="New variation"
          description={product.name}
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
            title="This product has no attributes"
            message="A variation needs at least one attribute value. Products created in the console always include attributes, so this product may need to be recreated."
          />
        </div>
      </>
    )
  }

  return (
    <VariationForm
      key={variation?.id ?? 'new'}
      product={product}
      variation={variation}
    />
  )
}
