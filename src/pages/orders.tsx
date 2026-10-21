import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Ban,
  CheckCircle2,
  ClipboardList,
  Loader2,
  MoreHorizontal,
  PackageCheck,
  RefreshCw,
  Truck,
} from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { CopyButton } from '@/components/copy-button'
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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
import { cancelOrder, fulfillOrder, listOrders } from '@/lib/api/orders'
import type { Order, OrderScope } from '@/lib/api/types'
import { getErrorMessage } from '@/lib/errors'
import { formatDate, formatDateShort, formatMoney, shortId } from '@/lib/format'
import { canModerate, isAdmin } from '@/lib/permissions'

const PAGE_SIZE = 20

function OrdersSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex items-center gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-16" />
        </div>
      ))}
    </div>
  )
}

export function OrdersPage() {
  const { user } = useAuth()
  const role = user?.role
  const scope: OrderScope = isAdmin(role) || canModerate(role) ? 'all' : 'sold'
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1)
  const offset = (page - 1) * PAGE_SIZE
  const queryClient = useQueryClient()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null)
  const [fulfillTarget, setFulfillTarget] = useState<Order | null>(null)

  const ordersQuery = useQuery({
    queryKey: ['orders', 'list', scope, page],
    queryFn: () => listOrders({ scope, limit: PAGE_SIZE, offset }),
  })

  const orders = ordersQuery.data ?? []
  const selectedOrder = orders.find((order) => order.id === selectedId) ?? null

  function setPage(nextPage: number) {
    const next = new URLSearchParams(params)
    if (nextPage <= 1) next.delete('page')
    else next.set('page', String(nextPage))
    setParams(next)
  }

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ['orders'] })
  }

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelOrder(id),
    onSuccess: () => {
      toast.success('Order cancelled and stock restored')
      setCancelTarget(null)
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
      void queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const fulfillMutation = useMutation({
    mutationFn: (id: string) => fulfillOrder(id),
    onSuccess: () => {
      toast.success('Order marked as fulfilled')
      setFulfillTarget(null)
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const terminal = (status: string) => status === 'cancelled' || status === 'fulfilled'

  return (
    <>
      <PageHeader
        title="Orders"
        description={
          scope === 'all'
            ? 'Review and fulfil orders across the marketplace.'
            : 'Orders containing your products.'
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={ordersQuery.isFetching}
          >
            <RefreshCw
              className={ordersQuery.isFetching ? 'size-4 animate-spin' : 'size-4'}
              aria-hidden="true"
            />
            Refresh
          </Button>
        }
      />

      <div className="rounded-xl border border-border bg-card">
        {ordersQuery.isLoading ? (
          <OrdersSkeleton />
        ) : ordersQuery.isError ? (
          <ErrorState
            title="Orders unavailable"
            message={getErrorMessage(ordersQuery.error)}
            onRetry={() => void ordersQuery.refetch()}
          />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={page > 1 ? 'No orders on this page' : 'No orders yet'}
            description={
              page > 1
                ? 'Go back to the previous page to see earlier orders.'
                : 'Orders will appear here after buyers complete checkout.'
            }
            action={
              page > 1 ? (
                <Button variant="outline" size="sm" onClick={() => setPage(page - 1)}>
                  Back to previous page
                </Button>
              ) : (
                <Button variant="outline" size="sm" asChild>
                  <Link to="/products">Review products</Link>
                </Button>
              )
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Order</TableHead>
                    <TableHead>Placed</TableHead>
                    <TableHead>Buyer ID</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12 pr-4">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow
                      key={order.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedId(order.id)}
                    >
                      <TableCell className="pl-4 font-mono text-xs font-medium">
                        {shortId(order.id, 10)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateShort(order.createdAt)}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {shortId(order.buyerId, 10)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {order.items.length}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatMoney(order.totalCents, order.currency)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={order.status} />
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Order actions"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <MoreHorizontal className="size-4" aria-hidden="true" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <DropdownMenuItem onClick={() => setSelectedId(order.id)}>
                              <ClipboardList className="size-4" aria-hidden="true" />
                              View details
                            </DropdownMenuItem>
                            {!terminal(order.status) ? (
                              <>
                                <DropdownMenuItem
                                  onClick={() => setFulfillTarget(order)}
                                >
                                  <Truck className="size-4" aria-hidden="true" />
                                  Mark fulfilled
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            ) : null}
                            {order.status === 'pending' ? (
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setCancelTarget(order)}
                              >
                                <Ban className="size-4" aria-hidden="true" />
                                Cancel order
                              </DropdownMenuItem>
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
                itemCount={orders.length}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </div>

      <Sheet open={Boolean(selectedOrder)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {selectedOrder ? (
            <>
              <SheetHeader className="border-b border-border">
                <SheetTitle className="flex items-center gap-2">
                  Order {shortId(selectedOrder.id, 12)}
                  <CopyButton value={selectedOrder.id} label="Copy order ID" />
                </SheetTitle>
                <SheetDescription>
                  Placed {formatDate(selectedOrder.createdAt)} by{' '}
                  <span className="font-mono">{shortId(selectedOrder.buyerId, 12)}</span>
                </SheetDescription>
                <div className="pt-2">
                  <StatusBadge status={selectedOrder.status} />
                </div>
              </SheetHeader>

              <div className="space-y-6 px-4 pb-4">
                <section className="space-y-2">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Items
                  </h3>
                  <div className="divide-y divide-border rounded-lg border border-border">
                    {selectedOrder.items.map((item) => (
                      <div key={item.id} className="flex gap-3 p-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40">
                          <PackageCheck
                            className="size-4 text-muted-foreground"
                            aria-hidden="true"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{item.productName}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {item.sku}
                            {Object.entries(item.options).length > 0
                              ? ` · ${Object.entries(item.options)
                                  .map(([key, value]) => `${key}: ${value}`)
                                  .join(', ')}`
                              : ''}
                          </p>
                        </div>
                        <div className="shrink-0 text-right text-sm">
                          <p className="tabular-nums">
                            {formatMoney(
                              item.unitPriceCents * item.quantity,
                              selectedOrder.currency,
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.quantity} × {formatMoney(item.unitPriceCents, selectedOrder.currency)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-2">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Shipping address
                  </h3>
                  {selectedOrder.shippingAddress ? (
                    <address className="rounded-lg border border-border p-3 text-sm not-italic leading-6">
                      <p className="font-medium">{selectedOrder.shippingAddress.fullName}</p>
                      <p>{selectedOrder.shippingAddress.line1}</p>
                      {selectedOrder.shippingAddress.line2 ? (
                        <p>{selectedOrder.shippingAddress.line2}</p>
                      ) : null}
                      <p>
                        {selectedOrder.shippingAddress.city}
                        {selectedOrder.shippingAddress.state
                          ? `, ${selectedOrder.shippingAddress.state}`
                          : ''}{' '}
                        {selectedOrder.shippingAddress.postalCode}
                      </p>
                      <p>{selectedOrder.shippingAddress.country}</p>
                      {selectedOrder.shippingAddress.phone ? (
                        <p className="text-muted-foreground">
                          {selectedOrder.shippingAddress.phone}
                        </p>
                      ) : null}
                    </address>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No shipping address was provided.
                    </p>
                  )}
                </section>

                <section className="space-y-2">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Payment
                  </h3>
                  <div className="space-y-2 rounded-lg border border-border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Method</span>
                      <span className="uppercase">{selectedOrder.paymentMethod}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="tabular-nums">
                        {formatMoney(selectedOrder.subtotalCents, selectedOrder.currency)}
                      </span>
                    </div>
                    {selectedOrder.discountCents > 0 ? (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          Discount
                          {selectedOrder.couponCode ? ` (${selectedOrder.couponCode})` : ''}
                        </span>
                        <span className="tabular-nums text-success">
                          −{formatMoney(selectedOrder.discountCents, selectedOrder.currency)}
                        </span>
                      </div>
                    ) : null}
                    <div className="flex items-center justify-between border-t border-border pt-2 font-medium">
                      <span>Total</span>
                      <span className="tabular-nums">
                        {formatMoney(selectedOrder.totalCents, selectedOrder.currency)}
                      </span>
                    </div>
                  </div>
                </section>
              </div>

              <SheetFooter className="border-t border-border">
                {selectedOrder.status === 'pending' ? (
                  <Button
                    variant="outline"
                    onClick={() => setCancelTarget(selectedOrder)}
                  >
                    <Ban className="size-4" aria-hidden="true" />
                    Cancel order
                  </Button>
                ) : null}
                {!terminal(selectedOrder.status) ? (
                  <Button onClick={() => setFulfillTarget(selectedOrder)}>
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                    Mark fulfilled
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => setSelectedId(null)}>
                    Close
                  </Button>
                )}
              </SheetFooter>
            </>
          ) : (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
            </div>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        title="Cancel this order?"
        description={
          cancelTarget
            ? `Order ${shortId(cancelTarget.id, 10)} will be cancelled and its stock returned to inventory. This cannot be undone.`
            : ''
        }
        confirmLabel="Cancel order"
        destructive
        pending={cancelMutation.isPending}
        onConfirm={() => cancelTarget && cancelMutation.mutate(cancelTarget.id)}
      />

      <ConfirmDialog
        open={Boolean(fulfillTarget)}
        onOpenChange={(open) => !open && setFulfillTarget(null)}
        title="Mark this order fulfilled?"
        description={
          fulfillTarget
            ? `Order ${shortId(fulfillTarget.id, 10)} will be marked as fulfilled. Confirm that the items have been dispatched.`
            : ''
        }
        confirmLabel="Mark fulfilled"
        pending={fulfillMutation.isPending}
        onConfirm={() => fulfillTarget && fulfillMutation.mutate(fulfillTarget.id)}
      />
    </>
  )
}
