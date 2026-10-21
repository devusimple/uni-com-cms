import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
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
import { Checkbox } from '@/components/ui/checkbox'
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
import { listCategories } from '@/lib/api/categories'
import { createProduct } from '@/lib/api/products'
import type { ProductStatus } from '@/lib/api/types'
import { getErrorMessage } from '@/lib/errors'
import { slugify } from '@/lib/format'
import {
  normalizeProductDescription,
  PRODUCT_DESCRIPTION_MAX_LENGTH,
} from '@/lib/product-description'

interface AttributeDraft {
  id: string
  name: string
  values: string
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function newAttribute(): AttributeDraft {
  return { id: crypto.randomUUID(), name: '', values: '' }
}

export function CreateProductPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<ProductStatus>('draft')
  const [attributes, setAttributes] = useState<AttributeDraft[]>([newAttribute()])
  const [categoryIds, setCategoryIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: listCategories,
  })

  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: (product) => {
      toast.success('Product created')
      void queryClient.invalidateQueries({ queryKey: ['products'] })
      navigate(`/products/${product.id}`, { replace: true })
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  })

  function handleNameChange(value: string) {
    setName(value)
    if (!slugTouched) setSlug(slugify(value))
  }

  function updateAttribute(id: string, patch: Partial<AttributeDraft>) {
    setAttributes((current) =>
      current.map((attribute) =>
        attribute.id === id ? { ...attribute, ...patch } : attribute,
      ),
    )
  }

  function removeAttribute(id: string) {
    setAttributes((current) => current.filter((attribute) => attribute.id !== id))
  }

  function toggleCategory(id: string, checked: boolean) {
    setCategoryIds((current) => {
      if (checked) {
        if (current.length >= 10) return current
        return [...current, id]
      }
      return current.filter((value) => value !== id)
    })
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    const trimmedName = name.trim()
    const trimmedSlug = slug.trim()

    if (!trimmedName) {
      setError('Product name is required.')
      return
    }
    if (!trimmedSlug || !SLUG_PATTERN.test(trimmedSlug)) {
      setError('Slug must use lowercase letters, numbers, and single hyphens.')
      return
    }

    const cleanedAttributes = attributes.map((attribute) => ({
      name: attribute.name.trim(),
      values: Array.from(
        new Set(
          attribute.values
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean),
        ),
      ),
    }))

    if (
      cleanedAttributes.length === 0 ||
      cleanedAttributes.some(
        (attribute) => !attribute.name || attribute.values.length === 0,
      )
    ) {
      setError('Every attribute needs a name and at least one value.')
      return
    }

    const normalizedDescription = normalizeProductDescription(description)
    if (
      normalizedDescription &&
      normalizedDescription.length > PRODUCT_DESCRIPTION_MAX_LENGTH
    ) {
      setError('Description must be 5,000 characters or fewer, including formatting.')
      return
    }

    createMutation.mutate({
      name: trimmedName,
      slug: trimmedSlug,
      description: normalizedDescription ?? undefined,
      status,
      attributes: cleanedAttributes,
      categoryIds: categoryIds.length > 0 ? categoryIds : undefined,
    })
  }

  const categories = categoriesQuery.data ?? []

  return (
    <>
      <PageHeader
        title="New product"
        description="Create a variable product. Variations and images can be added after the product record exists."
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link to="/products">
                <ArrowLeft className="size-4" aria-hidden="true" />
                Cancel
              </Link>
            </Button>
            <Button
              type="submit"
              form="create-product-form"
              size="sm"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              Create product
            </Button>
          </>
        }
      />

      <form id="create-product-form" onSubmit={handleSubmit}>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Product information</CardTitle>
                <CardDescription>
                  The name and slug buyers see in the storefront.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="product-name">Name</Label>
                  <Input
                    id="product-name"
                    value={name}
                    maxLength={200}
                    onChange={(event) => handleNameChange(event.target.value)}
                    placeholder="e.g. Linen overshirt"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="product-slug">Slug</Label>
                  <Input
                    id="product-slug"
                    value={slug}
                    maxLength={220}
                    onChange={(event) => {
                      setSlugTouched(true)
                      setSlug(event.target.value)
                    }}
                    placeholder="e.g. linen-overshirt"
                  />
                  <p className="text-xs text-muted-foreground">
                    Lowercase letters, numbers, and hyphens.
                  </p>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="product-description">Description</Label>
                  <RichTextEditor
                    id="product-description"
                    value={description}
                    onChange={setDescription}
                    maxLength={PRODUCT_DESCRIPTION_MAX_LENGTH}
                    placeholder="What buyers should know about this product."
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Attributes</CardTitle>
                <CardDescription>
                  At least one attribute is required. Variations must cover every value.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {attributes.map((attribute, index) => (
                  <div
                    key={attribute.id}
                    className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto]"
                  >
                    <Input
                      aria-label={`Attribute ${index + 1} name`}
                      value={attribute.name}
                      maxLength={50}
                      onChange={(event) =>
                        updateAttribute(attribute.id, { name: event.target.value })
                      }
                      placeholder="Size"
                    />
                    <Input
                      aria-label={`Attribute ${index + 1} values`}
                      value={attribute.values}
                      onChange={(event) =>
                        updateAttribute(attribute.id, { values: event.target.value })
                      }
                      placeholder="S, M, L"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Remove attribute"
                      disabled={attributes.length === 1}
                      onClick={() => removeAttribute(attribute.id)}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setAttributes((current) => [...current, newAttribute()])
                  }
                >
                  <Plus className="size-4" aria-hidden="true" />
                  Add attribute
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Categories</CardTitle>
                <CardDescription>
                  Optional. Select up to 10 categories.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {categoriesQuery.isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-5 w-32" />
                  </div>
                ) : categoriesQuery.isError ? (
                  <p className="text-sm text-muted-foreground">
                    Categories could not be loaded. The product can still be created
                    without them.
                  </p>
                ) : categories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No categories are configured yet.
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {categories.map((category) => {
                      const checked = categoryIds.includes(category.id)
                      return (
                        <label
                          key={category.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          <Checkbox
                            checked={checked}
                            disabled={!checked && categoryIds.length >= 10}
                            onCheckedChange={(value) =>
                              toggleCategory(category.id, value === true)
                            }
                          />
                          {category.name}
                        </label>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {error ? (
              <div
                role="alert"
                className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </div>
            ) : null}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Publishing</CardTitle>
                <CardDescription>
                  Drafts stay out of the storefront until you publish them.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Label htmlFor="product-status">Status</Label>
                <Select
                  value={status}
                  onValueChange={(value) => setStatus(value as ProductStatus)}
                >
                  <SelectTrigger id="product-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Next steps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>After creating the product, add at least one variation.</p>
                <p>Upload images from the Media library, then attach them here.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </>
  )
}
