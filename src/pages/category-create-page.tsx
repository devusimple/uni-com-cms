import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'
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
import { Textarea } from '@/components/ui/textarea'
import { createCategory } from '@/lib/api/categories'
import { getErrorMessage } from '@/lib/errors'
import { slugify } from '@/lib/format'

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function CategoryCreatePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error('Category name is required.')
      if (slug.trim() && !SLUG_PATTERN.test(slug.trim())) {
        throw new Error('Slug must use lowercase letters, numbers, and single hyphens.')
      }
      return createCategory({
        name: name.trim(),
        slug: slug.trim() || undefined,
        description: description.trim() || undefined,
      })
    },
    onSuccess: () => {
      toast.success('Category created')
      void queryClient.invalidateQueries({ queryKey: ['categories'] })
      navigate('/categories', { replace: true })
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  })

  return (
    <>
      <PageHeader
        title="New category"
        description="Categories group products in the storefront. The API does not support editing a category after creation."
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link to="/categories">
                <ArrowLeft className="size-4" aria-hidden="true" />
                Cancel
              </Link>
            </Button>
            <Button
              type="submit"
              form="create-category-form"
              size="sm"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              Create category
            </Button>
          </>
        }
      />

      <form
        id="create-category-form"
        onSubmit={(event) => {
          event.preventDefault()
          setError(null)
          mutation.mutate()
        }}
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Card>
            <CardHeader>
              <CardTitle>Category information</CardTitle>
              <CardDescription>
                The name and slug are shown to buyers when browsing the catalog.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category-name">Name</Label>
                <Input
                  id="category-name"
                  value={name}
                  maxLength={80}
                  onChange={(event) => {
                    setName(event.target.value)
                    if (!slugTouched) setSlug(slugify(event.target.value))
                  }}
                  placeholder="Outerwear"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category-slug">Slug</Label>
                <Input
                  id="category-slug"
                  value={slug}
                  maxLength={100}
                  onChange={(event) => {
                    setSlugTouched(true)
                    setSlug(event.target.value)
                  }}
                  placeholder="outerwear"
                />
                <p className="text-xs text-muted-foreground">
                  Lowercase letters, numbers, and hyphens. Generated from the name if
                  left empty.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category-description">Description</Label>
                <Textarea
                  id="category-description"
                  value={description}
                  maxLength={500}
                  rows={4}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Optional display copy for the category."
                />
              </div>
              {error ? (
                <div
                  role="alert"
                  className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {error}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Before you create</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Category names can duplicate, but slugs must be unique.</p>
              <p>
                Once created, a category cannot be renamed or edited. It can only be
                deleted.
              </p>
            </CardContent>
          </Card>
        </div>
      </form>
    </>
  )
}
