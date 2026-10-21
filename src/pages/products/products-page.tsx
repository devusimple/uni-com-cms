import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Eye,
  Filter,
  ImageOff,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAuth } from '@/hooks/use-auth'
import { listCategories } from '@/lib/api/categories'
import { deleteProduct, listProducts } from '@/lib/api/products'
import type { ProductCard, ProductListParams, ProductSort, ProductStatus } from '@/lib/api/types'
import { getErrorMessage } from '@/lib/errors'
import { formatDateShort } from '@/lib/format'
import { isAdmin } from '@/lib/permissions'

const PAGE_SIZE = 20

const STATUS_OPTIONS: Array<{ value: ProductStatus; label: string }> = [
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Draft' },
  { value: 'archived', label: 'Archived' },
]

const SORT_OPTIONS: Array<{ value: ProductSort; label: string }> = [
  { value: 'newest', label: 'Newest' },
  { value: 'name_asc', label: 'Name A–Z' },
  { value: 'name_desc', label: 'Name Z–A' },
  { value: 'price_asc', label: 'Price low–high' },
  { value: 'price_desc', label: 'Price high–low' },
]

/** The API expects integer cents for its price bounds. */
function toCents(value: string) {
  if (!value.trim()) return undefined
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount < 0) return undefined
  return Math.round(amount * 100)
}

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
  const admin = isAdmin(role)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()

  const page = Math.max(1, Number(params.get('page') ?? '1') || 1)
  // Only admins may filter by status, so a stale URL value never leaks through.
  const status = (admin ? params.get('status') : null) ?? 'published'
  const sort = (params.get('sort') ?? 'newest') as ProductSort
  const search = params.get('search') ?? ''
  const category = params.get('category') ?? ''
  const minPrice = params.get('minPrice') ?? ''
  const maxPrice = params.get('maxPrice') ?? ''
  const mine = params.get('mine') === 'true' && admin

  const [searchInput, setSearchInput] = useState(search)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [minPriceInput, setMinPriceInput] = useState(minPrice)
  const [maxPriceInput, setMaxPriceInput] = useState(maxPrice)
  const [deleteTarget, setDeleteTarget] = useState<ProductCard | null>(null)

  // Keep the local inputs aligned with the URL without an extra render pass.
  const [syncedSearch, setSyncedSearch] = useState(search)
  if (search !== syncedSearch) {
    setSyncedSearch(search)
    setSearchInput(search)
  }

  const [syncedPrice, setSyncedPrice] = useState(`${minPrice}|${maxPrice}`)
  if (`${minPrice}|${maxPrice}` !== syncedPrice) {
    setSyncedPrice(`${minPrice}|${maxPrice}`)
    setMinPriceInput(minPrice)
    setMaxPriceInput(maxPrice)
  }

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: listCategories,
  })
  const categories = categoriesQuery.data ?? []

  const queryParams: ProductListParams = {
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
    sort,
    search: search || undefined,
    category: category || undefined,
    minPrice: toCents(minPrice),
    maxPrice: toCents(maxPrice),
    mine: mine ? true : undefined,
    status: admin ? (status as ProductStatus) : undefined,
  }

  const productsQuery = useQuery({
    queryKey: ['products', 'list', queryParams],
    queryFn: () => listProducts(queryParams),
  })

  const products = productsQuery.data ?? []
  const activeFilterCount =
    (category ? 1 : 0) + (minPrice ? 1 : 0) + (maxPrice ? 1 : 0) + (mine ? 1 : 0)
  const hasFilters = Boolean(search) || status !== 'published' || sort !== 'newest' || activeFilterCount > 0

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params)
    if (value === null || value === '') next.delete(key)
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

  function applyPriceRange() {
    const next = new URLSearchParams(params)
    const min = toCents(minPriceInput)
    const max = toCents(maxPriceInput)
    if (min !== undefined) next.set('minPrice', String(min))
    else next.delete('minPrice')
    if (max !== undefined) next.set('maxPrice', String(max))
    else next.delete('maxPrice')
    next.delete('page')
    setParams(next)
  }

  function clearFilters() {
    setSearchInput('')
    setMinPriceInput('')
    setMaxPriceInput('')
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
          admin
            ? 'Manage the full catalog, including drafts and archived products.'
            : 'Browse the products published in the marketplace.'
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
            {admin ? (
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

      <div className="rounded-xl border border-border bg-card">
        <div className="grid gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <form className="flex gap-2" onSubmit={submitSearch}>
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search products by name"
                className="pl-9"
                aria-label="Search products"
              />
            </div>
            <Button type="submit" variant="outline">
              Search
            </Button>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            {admin ? (
              <Select value={status} onValueChange={(value) => setParam('status', value)}>
                <SelectTrigger className="w-full sm:w-36" aria-label="Filter by status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}

            <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  <SlidersHorizontal className="size-4" aria-hidden="true" />
                  Filters
                  {activeFilterCount > 0 ? (
                    <Badge variant="secondary" className="ml-1 tabular-nums">
                      {activeFilterCount}
                    </Badge>
                  ) : null}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80">
                <PopoverHeader>
                  <PopoverTitle>Refine results</PopoverTitle>
                  <PopoverDescription>
                    Narrow the catalog by category, price, or ownership.
                  </PopoverDescription>
                </PopoverHeader>

                <div className="space-y-2">
                  <Label htmlFor="filter-category">Category</Label>
                  <Select
                    value={category || 'all'}
                    onValueChange={(value) =>
                      setParam('category', value === 'all' ? null : value)
                    }
                  >
                    <SelectTrigger id="filter-category" className="w-full">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {categories.map((item) => (
                        <SelectItem key={item.id} value={item.slug}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="filter-min-price">Price range (USD)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="filter-min-price"
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={minPriceInput}
                      onChange={(event) => setMinPriceInput(event.target.value)}
                      placeholder="Min"
                      aria-label="Minimum price"
                    />
                    <span className="text-muted-foreground">–</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={maxPriceInput}
                      onChange={(event) => setMaxPriceInput(event.target.value)}
                      placeholder="Max"
                      aria-label="Maximum price"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Leave both fields empty for every price.
                  </p>
                </div>

                {admin ? (
                  <label className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
                    <span>
                      <span className="block font-medium">Only my products</span>
                      <span className="block text-xs text-muted-foreground">
                        Restrict the list to products you own.
                      </span>
                    </span>
                    <Switch
                      checked={mine}
                      onCheckedChange={(checked) =>
                        setParam('mine', checked ? 'true' : null)
                      }
                      aria-label="Only my products"
                    />
                  </label>
                ) : null}

                <div className="flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setMinPriceInput('')
                      setMaxPriceInput('')
                      const next = new URLSearchParams(params)
                      next.delete('minPrice')
                      next.delete('maxPrice')
                      next.delete('page')
                      setParams(next)
                    }}
                  >
                    Clear
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      applyPriceRange()
                      setFiltersOpen(false)
                    }}
                  >
                    Apply
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <Select value={sort} onValueChange={(value) => setParam('sort', value)}>
              <SelectTrigger className="w-full sm:w-40" aria-label="Sort products">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasFilters ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={clearFilters}
                aria-label="Clear filters"
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            ) : null}
          </div>
        </div>

        {activeFilterCount > 0 ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-border px-3 py-2">
            <Filter className="size-3.5 text-muted-foreground" aria-hidden="true" />
            {category ? (
              <Badge variant="secondary" className="font-normal">
                {categories.find((item) => item.slug === category)?.name ?? category}
              </Badge>
            ) : null}
            {minPrice ? (
              <Badge variant="secondary" className="font-normal tabular-nums">
                Min ${(Number(minPrice) / 100).toFixed(2)}
              </Badge>
            ) : null}
            {maxPrice ? (
              <Badge variant="secondary" className="font-normal tabular-nums">
                Max ${(Number(maxPrice) / 100).toFixed(2)}
              </Badge>
            ) : null}
            {mine ? (
              <Badge variant="secondary" className="font-normal">
                Mine only
              </Badge>
            ) : null}
          </div>
        ) : null}
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
                ? 'Try a different search, status, category, or price range.'
                : admin
                  ? 'Create your first product to start building the catalog.'
                  : 'No published products are available in the marketplace yet.'
            }
            action={
              hasFilters ? (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : admin ? (
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
                    {admin ? <TableHead>Owner ID</TableHead> : null}
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
                      {admin ? (
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {product.ownerId}
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
                            {admin || product.ownerId === user?.id ? (
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
