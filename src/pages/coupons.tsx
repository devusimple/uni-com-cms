import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  TicketPercent,
} from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { CopyButton } from '@/components/copy-button'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
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
import { listCoupons, updateCoupon } from '@/lib/api/coupons'
import type { Coupon } from '@/lib/api/types'
import { couponValue } from '@/lib/coupons'
import { getErrorMessage } from '@/lib/errors'
import { formatDateShort, formatMoney } from '@/lib/format'

export function CouponsPage() {
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const search = params.get('search') ?? ''

  function setSearch(value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set('search', value)
    else next.delete('search')
    setParams(next, { replace: true })
  }

  const couponsQuery = useQuery({
    queryKey: ['coupons'],
    queryFn: listCoupons,
  })

  const coupons = useMemo(() => {
    const term = search.trim().toLowerCase()
    const list = couponsQuery.data ?? []
    if (!term) return list
    return list.filter((coupon) => coupon.code.toLowerCase().includes(term))
  }, [couponsQuery.data, search])

  const toggleMutation = useMutation({
    mutationFn: (coupon: Coupon) =>
      updateCoupon(coupon.id, { isActive: !coupon.isActive }),
    onSuccess: () => {
      toast.success('Coupon updated')
      void queryClient.invalidateQueries({ queryKey: ['coupons'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  return (
    <>
      <PageHeader
        title="Coupons"
        description="Create discount codes and control their usage. Coupons cannot be deleted, and only the active flag, usage limit, and expiry can be changed."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void couponsQuery.refetch()}
              disabled={couponsQuery.isFetching}
            >
              <RefreshCw
                className={couponsQuery.isFetching ? 'size-4 animate-spin' : 'size-4'}
                aria-hidden="true"
              />
              Refresh
            </Button>
            <Button size="sm" asChild>
              <Link to="/coupons/new">
                <Plus className="size-4" aria-hidden="true" />
                New coupon
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
          placeholder="Search coupon code"
          className="pl-9"
          aria-label="Search coupons"
        />
      </div>

      <div className="rounded-xl border border-border bg-card">
        {couponsQuery.isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center gap-4">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        ) : couponsQuery.isError ? (
          <ErrorState
            title="Coupons unavailable"
            message={getErrorMessage(couponsQuery.error)}
            onRetry={() => void couponsQuery.refetch()}
          />
        ) : coupons.length === 0 ? (
          <EmptyState
            icon={TicketPercent}
            title={search ? 'No coupons match' : 'No coupons yet'}
            description={
              search
                ? 'Try a different coupon code.'
                : 'Create a discount code to run a promotion in the storefront.'
            }
            action={
              search ? (
                <Button variant="outline" size="sm" onClick={() => setSearch('')}>
                  Clear search
                </Button>
              ) : (
                <Button size="sm" asChild>
                  <Link to="/coupons/new">
                    <Plus className="size-4" aria-hidden="true" />
                    New coupon
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
                  <TableHead className="pl-4">Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead className="text-right">Minimum</TableHead>
                  <TableHead className="text-right">Usage</TableHead>
                  <TableHead className="pl-6">Schedule</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24 pr-4 text-right">Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((coupon) => (
                  <TableRow key={coupon.id}>
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-sm font-medium">
                          {coupon.code}
                        </span>
                        <CopyButton value={coupon.code} label="Copy coupon code" />
                      </div>
                      <p className="text-xs capitalize text-muted-foreground">
                        {coupon.type === 'percent' ? 'Percentage' : 'Fixed amount'}
                      </p>
                    </TableCell>
                    <TableCell className="font-medium tabular-nums">
                      {couponValue(coupon)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {coupon.minSubtotalCents > 0
                        ? formatMoney(coupon.minSubtotalCents)
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {coupon.usedCount}
                      {coupon.maxUses ? ` / ${coupon.maxUses}` : ' / ∞'}
                    </TableCell>
                    <TableCell className="pl-6 text-muted-foreground">
                      {coupon.startsAt
                        ? formatDateShort(coupon.startsAt)
                        : 'Immediately'}
                      {' → '}
                      {coupon.endsAt ? formatDateShort(coupon.endsAt) : 'No expiry'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={coupon.isActive ? 'active' : 'inactive'} />
                    </TableCell>
                    <TableCell className="pr-4">
                      <div className="flex items-center justify-end gap-1">
                        <Switch
                          checked={coupon.isActive}
                          disabled={toggleMutation.isPending}
                          onCheckedChange={() => toggleMutation.mutate(coupon)}
                          aria-label={`Toggle ${coupon.code}`}
                        />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Coupon actions"
                            >
                              <MoreHorizontal className="size-4" aria-hidden="true" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link to={`/coupons/${coupon.id}/edit`}>
                                <Pencil className="size-4" aria-hidden="true" />
                                Edit coupon
                              </Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </>
  )
}
