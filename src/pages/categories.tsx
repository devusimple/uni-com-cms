import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MoreHorizontal, Plus, RefreshCw, Search, Tags, Trash2 } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { deleteCategory, listCategories } from '@/lib/api/categories'
import type { Category } from '@/lib/api/types'
import { getErrorMessage } from '@/lib/errors'
import { formatDateShort } from '@/lib/format'

export function CategoriesPage() {
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const search = params.get('search') ?? ''
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: listCategories,
  })

  const categories = useMemo(() => {
    const term = search.trim().toLowerCase()
    const list = categoriesQuery.data ?? []
    if (!term) return list
    return list.filter(
      (category) =>
        category.name.toLowerCase().includes(term) ||
        category.slug.toLowerCase().includes(term) ||
        (category.description ?? '').toLowerCase().includes(term),
    )
  }, [categoriesQuery.data, search])

  function setSearch(value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set('search', value)
    else next.delete('search')
    setParams(next, { replace: true })
  }

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      toast.success('Category deleted')
      setDeleteTarget(null)
      void queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  })

  return (
    <>
      <PageHeader
        title="Categories"
        description="Organise the storefront catalog. Categories can be created and deleted, but the API does not support editing them."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void categoriesQuery.refetch()}
              disabled={categoriesQuery.isFetching}
            >
              <RefreshCw
                className={categoriesQuery.isFetching ? 'size-4 animate-spin' : 'size-4'}
                aria-hidden="true"
              />
              Refresh
            </Button>
            <Button size="sm" asChild>
              <Link to="/categories/new">
                <Plus className="size-4" aria-hidden="true" />
                New category
              </Link>
            </Button>
          </>
        }
      />

      <div className="relative max-w-sm">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Filter categories"
          className="pl-9"
          aria-label="Filter categories"
        />
      </div>

      <div className="rounded-xl border border-border bg-card">
        {categoriesQuery.isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center gap-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        ) : categoriesQuery.isError ? (
          <ErrorState
            title="Categories unavailable"
            message={getErrorMessage(categoriesQuery.error)}
            onRetry={() => void categoriesQuery.refetch()}
          />
        ) : categories.length === 0 ? (
          <EmptyState
            icon={Tags}
            title={search ? 'No categories match' : 'No categories yet'}
            description={
              search
                ? 'Try a different name, slug, or description.'
                : 'Create categories so buyers can browse the storefront by department.'
            }
            action={
              search ? (
                <Button variant="outline" size="sm" onClick={() => setSearch('')}>
                  Clear search
                </Button>
              ) : (
                <Button size="sm" asChild>
                  <Link to="/categories/new">
                    <Plus className="size-4" aria-hidden="true" />
                    New category
                  </Link>
                </Button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-12 pr-4">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="pl-4">
                      <p className="text-sm font-medium">{category.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {category.slug}
                      </p>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className="truncate text-sm text-muted-foreground">
                        {category.description ?? '—'}
                      </p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateShort(category.createdAt)}
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Category actions"
                          >
                            <MoreHorizontal className="size-4" aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteTarget(category)}
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                            Delete category
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this category?"
        description={
          deleteTarget
            ? `${deleteTarget.name} will be removed. Products assigned to it may no longer appear under this category.`
            : ''
        }
        confirmLabel="Delete category"
        destructive
        pending={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </>
  )
}
