import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  ClipboardList,
  Package,
  RefreshCw,
  Tags,
  TicketPercent,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/use-auth'
import { listCategories } from '@/lib/api/categories'
import { listCoupons } from '@/lib/api/coupons'
import { listOrders } from '@/lib/api/orders'
import { listProducts } from '@/lib/api/products'
import type { OrderScope, ProductListParams } from '@/lib/api/types'
import { formatDateShort, formatMoney, shortId } from '@/lib/format'
import { isAdmin } from '@/lib/permissions'

function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-md" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-5 w-16" />
        </div>
      ))}
    </div>
  )
}

export function DashboardPage() {
  const { user } = useAuth()
  const role = user?.role
  const admin = isAdmin(role)
  const scope: OrderScope = admin ? 'all' : 'mine'
  const productParams: ProductListParams = admin
    ? { limit: 5, sort: 'newest', status: 'published' }
    : { limit: 5, status: 'published' }

  const ordersQuery = useQuery({
    queryKey: ['orders', 'recent', scope],
    queryFn: () => listOrders({ scope, limit: 5 }),
  })
  const productsQuery = useQuery({
    queryKey: ['products', 'recent', productParams],
    queryFn: () => listProducts(productParams),
  })
  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: listCategories,
    enabled: admin,
  })
  const couponsQuery = useQuery({
    queryKey: ['coupons'],
    queryFn: listCoupons,
    enabled: admin,
  })

  const categories = categoriesQuery.data ?? []
  const products = productsQuery.data ?? []
  const orders = ordersQuery.data ?? []
  const coupons = couponsQuery.data ?? []

  const setupSteps = [
    {
      label: 'Create catalog categories',
      description: 'Group products so buyers can browse the storefront.',
      href: '/categories',
      done: categories.length > 0,
      visible: admin,
    },
    {
      label: 'Add a product',
      description: 'Products start as drafts until you publish them.',
      href: '/products',
      done: products.length > 0,
      visible: admin,
    },
    {
      label: 'Set up a coupon',
      description: 'Offer a percentage or fixed-amount discount.',
      href: '/coupons',
      done: coupons.length > 0,
      visible: admin,
    },
  ].filter((step) => step.visible)

  const openSteps = setupSteps.filter((step) => !step.done)
  const loading =
    ordersQuery.isLoading ||
    productsQuery.isLoading ||
    (admin && (categoriesQuery.isLoading || couponsQuery.isLoading))

  function refresh() {
    void ordersQuery.refetch()
    void productsQuery.refetch()
    void categoriesQuery.refetch()
    if (admin) void couponsQuery.refetch()
  }

  return (
    <>
      <PageHeader
        title="Overview"
        description="A live view of the marketplace. Figures are read directly from the UNI-COM API."
        actions={
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw
              className={loading ? 'size-4 animate-spin' : 'size-4'}
              aria-hidden="true"
            />
            Refresh
          </Button>
        }
      />

      {openSteps.length > 0 && !loading ? (
        <Card>
          <CardHeader>
            <CardTitle>Set up your workspace</CardTitle>
            <CardDescription>
              Finish these steps to get the storefront ready for real orders.
            </CardDescription>
            <CardAction>
              <span className="text-xs text-muted-foreground">
                {setupSteps.length - openSteps.length}/{setupSteps.length} complete
              </span>
            </CardAction>
          </CardHeader>
          <CardContent
            className={
              setupSteps.length === 1
                ? 'grid gap-2'
                : setupSteps.length === 2
                  ? 'grid gap-2 sm:grid-cols-2'
                  : 'grid gap-2 sm:grid-cols-3'
            }
          >
            {setupSteps.map((step) => (
              <Link
                key={step.label}
                to={step.href}
                className="group flex gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
              >
                {step.done ? (
                  <CheckCircle2
                    className="mt-0.5 size-4 shrink-0 text-success"
                    aria-hidden="true"
                  />
                ) : (
                  <Circle
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                )}
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium">{step.label}</p>
                  <p className="text-xs leading-5 text-muted-foreground">
                    {step.description}
                  </p>
                </div>
                <ArrowRight
                  className="ml-auto size-4 shrink-0 self-center text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent orders</CardTitle>
            <CardDescription>
              {admin
                ? 'Latest orders across the marketplace.'
                : 'Latest orders placed with your account.'}
            </CardDescription>
            <CardAction>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/orders">View all</Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {ordersQuery.isLoading ? (
              <ListSkeleton />
            ) : ordersQuery.isError ? (
              <ErrorState
                title="Orders unavailable"
                message="Could not load recent orders."
                onRetry={() => void ordersQuery.refetch()}
              />
            ) : orders.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="No orders yet"
                description="New orders will appear here as soon as buyers check out."
                className="py-10"
              />
            ) : (
              <div className="divide-y divide-border">
                {orders.map((order) => (
                  <div key={order.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40">
                      <ClipboardList className="size-4 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        Order {shortId(order.id, 10)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {order.items.length} {order.items.length === 1 ? 'item' : 'items'} ·{' '}
                        {formatDateShort(order.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="hidden text-sm tabular-nums sm:inline">
                        {formatMoney(order.totalCents, order.currency)}
                      </span>
                      <StatusBadge status={order.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest products</CardTitle>
            <CardDescription>
              {admin
                ? 'Published products, newest first.'
                : 'The products published in the marketplace.'}
            </CardDescription>
            <CardAction>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/products">View catalog</Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {productsQuery.isLoading ? (
              <ListSkeleton />
            ) : productsQuery.isError ? (
              <ErrorState
                title="Catalog unavailable"
                message="Could not load the latest products."
                onRetry={() => void productsQuery.refetch()}
              />
            ) : products.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No products yet"
                description={
                  admin
                    ? 'Create a product to start building the UNI-COM catalog.'
                    : 'No published products are available in the marketplace yet.'
                }
                className="py-10"
                action={
                  admin ? (
                    <Button size="sm" asChild>
                      <Link to="/products">Go to products</Link>
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <div className="divide-y divide-border">
                {products.map((product) => (
                  <Link
                    key={product.id}
                    to={`/products/${product.id}`}
                    className="-mx-2 flex items-center gap-3 rounded-md px-2 py-3 transition-colors first:pt-0 last:pb-0 hover:bg-muted/50"
                  >
                    <div className="size-9 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                      {product.coverImage ? (
                        <img
                          src={product.coverImage}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center">
                          <Package className="size-4 text-muted-foreground" aria-hidden="true" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{product.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {product.slug}
                      </p>
                    </div>
                    <StatusBadge status={product.status} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {admin ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Link
            to="/categories"
            className="flex items-center gap-3 rounded-xl border border-border p-4 transition-colors hover:bg-muted/40"
          >
            <Tags className="size-5 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm font-medium">Categories</p>
              <p className="text-xs text-muted-foreground">
                {categories.length} {categories.length === 1 ? 'category' : 'categories'} configured
              </p>
            </div>
            <ArrowRight className="ml-auto size-4 text-muted-foreground" aria-hidden="true" />
          </Link>
          <Link
            to="/coupons"
            className="flex items-center gap-3 rounded-xl border border-border p-4 transition-colors hover:bg-muted/40"
          >
            <TicketPercent className="size-5 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm font-medium">Coupons</p>
              <p className="text-xs text-muted-foreground">
                {coupons.length} {coupons.length === 1 ? 'coupon' : 'coupons'} created
              </p>
            </div>
            <ArrowRight className="ml-auto size-4 text-muted-foreground" aria-hidden="true" />
          </Link>
        </div>
      ) : null}
    </>
  )
}
