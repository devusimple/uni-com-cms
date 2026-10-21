import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Eye,
  ImageOff,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { PageHeader } from '@/components/page-header'
import { Pagination } from '@/components/pagination'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { deleteProduct, listProducts } from '@/lib/api/products'
import type { ProductCard, ProductListParams, ProductSort, ProductStatus } from '@/lib/api/types'
import { getErrorMessage } from '@/lib/errors'
import { formatDateShort } from '@/lib/format'
import { isAdmin } from '@/lib/permissions'

const PAGE_SIZE = 20

function ProductsSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex items-center gap-4">
          <Skeleton className="size-10 rounded-md" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  )
}

export function ProductsPage() {
  const { user } = useAuth()
  const role = user?.role
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1)
  const status = (params.get('status') ?? 'all') as ProductStatus | 'all'
  const sort = (params.get('sort') ?? 'newest') as ProductSort
  const search = params.get('search') ?? ''
  const [searchInput, setSearchInput] = useState(search)
  const [deleteTarget, setDeleteTarget] = useState<ProductCard | null>(null)

  const queryParams: ProductListParams = {
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
    sort,
    mine: role === 'seller' ? true : undefined,
    status: status === 'all' ? undefined : status,
    search: search || undefined,
  }

  const productsQuery = useQuery({
    queryKey: ['products', 'list', queryParams],
    queryFn: () => listProducts(queryParams),
  })

  const products = productsQuery.data ?? []
  const hasFilters = Boolean(search) || status !== 'all' || sort !== 'newest'

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params)
    if (value === null || value === '' || value === 'all') next.delete(key)
    else next.set(key, value)
    next.delete('page')
    setParams(next)
  }

  function setPage(nextPage: number) {
    const next = new URLSearchParams(params)
    if (nextPage <= 1) next.delete('page')
    else next.set('page', String(nextPage))
    setParams(next)
  }

  function submitSearch(event: React.FormEvent) {
    event.preventDefault()
    setParam('search', searchInput.trim() || null)
  }

  function clearFilters() {
    setSearchInput('')
    setParams(new URLSearchParams())
  }

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      toast.success('Product deleted')
      setDeleteTarget(null)
      void queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  return (
    <>
      <PageHeader
        title="Products"
        description={
          role === 'seller'
            ? 'Manage your product catalog, stock, and storefront images.'
            : 'Browse published products. Product creation is restricted to seller accounts by the API.'
        }
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void queryClient.invalidateQueries({ queryKey: ['products'] })}
              disabled={productsQuery.isFetching}
            >
              <RefreshCw
                className={productsQuery.isFetching ? 'size-4 animate-spin' : 'size-4'}
                aria-hidden="true"
              />
              Refresh
            </Button>
            {role === 'seller' ? (
              <Button size="sm" asChild>
                <Link to="/products/new">
                  <Plus className="size-4" aria-hidden="true" />
                  New product
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center">
        <form className="flex flex-1 gap-2" onSubmit={submitSearch}>
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search products by name or SKU"
              className="pl-9"
              aria-label="Search products"
            />
          </div>
          <Button type="submit" variant="outline">
            Search
          </Button>
        </form>

        <div className="flex gap-2">
          <Select value={status} onValueChange={(value) => setParam('status', value)}>
            <SelectTrigger className="w-full sm:w-36" aria-label="Filter by status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={(value) => setParam('sort', value)}>
            <SelectTrigger className="w-full sm:w-40" aria-label="Sort products">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="name_asc">Name A–Z</SelectItem>
              <SelectItem value="name_desc">Name Z–A</SelectItem>
              <SelectItem value="price_asc">Price low–high</SelectItem>
              <SelectItem value="price_desc">Price high–low</SelectItem>
            </SelectContent>
          </Select>

          {hasFilters ? (
            <Button variant="ghost" size="icon" onClick={clearFilters} aria-label="Clear filters">
              <X className="size-4" aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        {productsQuery.isLoading ? (
          <ProductsSkeleton />
        ) : productsQuery.isError ? (
          <ErrorState
            title="Catalog unavailable"
            message={getErrorMessage(productsQuery.error)}
            onRetry={() => void productsQuery.refetch()}
          />
        ) : products.length === 0 ? (
          <EmptyState
            icon={Package}
            title={hasFilters ? 'No products match these filters' : 'No products yet'}
            description={
              hasFilters
                ? 'Try a different search, status, or sort order.'
                : role === 'seller'
                  ? 'Create your first product to start building the catalog.'
                  : 'No published products are available in the marketplace yet.'
            }
            action={
              hasFilters ? (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : role === 'seller' ? (
                <Button size="sm" asChild>
                  <Link to="/products/new">
                    <Plus className="size-4" aria-hidden="true" />
                    New product
                  </Link>
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Product</TableHead>
                    <TableHead>Status</TableHead>
                    {isAdmin(role) ? <TableHead>Seller ID</TableHead> : null}
                    <TableHead>Updated</TableHead>
                    <TableHead className="w-12 pr-4">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow
                      key={product.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/products/${product.id}`)}
                    >
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-3">
                          <div className="size-10 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                            {product.coverImage ? (
                              <img
                                src={product.coverImage}
                                alt=""
                                className="size-full object-cover"
                              />
                            ) : (
                              <div className="flex size-full items-center justify-center">
                                <ImageOff
                                  className="size-4 text-muted-foreground"
                                  aria-hidden="true"
                                />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{product.name}</p>
                            <p className="truncate font-mono text-xs text-muted-foreground">
                              {product.slug}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={product.status} />
                      </TableCell>
                      {isAdmin(role) ? (
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {product.sellerId}
                        </TableCell>
                      ) : null}
                      <TableCell className="text-muted-foreground">
                        {formatDateShort(product.updatedAt)}
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Product actions"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <MoreHorizontal className="size-4" aria-hidden="true" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <DropdownMenuItem asChild>
                              <Link to={`/products/${product.id}`}>
                                <Eye className="size-4" aria-hidden="true" />
                                Open product
                              </Link>
                            </DropdownMenuItem>
                            {role === 'seller' || isAdmin(role) ? (
                              <>
                                <DropdownMenuItem asChild>
                                  <Link to={`/products/${product.id}/edit`}>
                                    <Pencil className="size-4" aria-hidden="true" />
                                    Edit product
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => setDeleteTarget(product)}
                                >
                                  <Trash2 className="size-4" aria-hidden="true" />
                                  Delete product
                                </DropdownMenuItem>
                              </>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="px-4 pb-4">
              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                itemCount={products.length}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this product?"
        description={
          deleteTarget
            ? `${deleteTarget.name} and all of its variations will be permanently deleted. Product images are kept in the media library.`
            : ''
        }
        confirmLabel="Delete product"
        destructive
        pending={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </>
  )
}
