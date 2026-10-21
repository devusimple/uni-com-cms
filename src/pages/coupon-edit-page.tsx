import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { CopyButton } from '@/components/copy-button'
import { ErrorState } from '@/components/error-state'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { listCoupons, updateCoupon } from '@/lib/api/coupons'
import type { Coupon } from '@/lib/api/types'
import { couponValue, toDateTimeLocal, toUnixSeconds } from '@/lib/coupons'
import { getErrorMessage } from '@/lib/errors'
import { formatDateShort, formatMoney } from '@/lib/format'

function EditCouponForm({ coupon }: { coupon: Coupon }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [maxUses, setMaxUses] = useState(
    coupon.maxUses ? String(coupon.maxUses) : '',
  )
  const [endsAt, setEndsAt] = useState(toDateTimeLocal(coupon.endsAt))
  const [isActive, setIsActive] = useState(coupon.isActive)
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      const maxUsesValue = maxUses.trim() ? Number(maxUses) : null
      if (
        maxUsesValue !== null &&
        (!Number.isInteger(maxUsesValue) || maxUsesValue < 1)
      ) {
        throw new Error('Usage limit must be a whole number of at least 1.')
      }
      return updateCoupon(coupon.id, {
        maxUses: maxUsesValue,
        endsAt: toUnixSeconds(endsAt),
        isActive,
      })
    },
    onSuccess: () => {
      toast.success('Coupon updated')
      void queryClient.invalidateQueries({ queryKey: ['coupons'] })
      navigate('/coupons', { replace: true })
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  })

  return (
    <>
      <PageHeader
        title={`Edit ${coupon.code}`}
        description="Change the usage limit, expiry, or active state. The code and discount amount are immutable."
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link to="/coupons">
                <ArrowLeft className="size-4" aria-hidden="true" />
                Cancel
              </Link>
            </Button>
            <Button
              type="submit"
              form="edit-coupon-form"
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
        id="edit-coupon-form"
        onSubmit={(event) => {
          event.preventDefault()
          setError(null)
          mutation.mutate()
        }}
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Card>
            <CardHeader>
              <CardTitle>Redemption limits</CardTitle>
              <CardDescription>
                A usage limit of {coupon.usedCount} or fewer is already exhausted.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-coupon-max">Usage limit</Label>
                <Input
                  id="edit-coupon-max"
                  type="number"
                  min="1"
                  step="1"
                  value={maxUses}
                  onChange={(event) => setMaxUses(event.target.value)}
                  placeholder="Unlimited"
                />
                <p className="text-xs text-muted-foreground">
                  Already redeemed {coupon.usedCount}{' '}
                  {coupon.usedCount === 1 ? 'time' : 'times'}.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-coupon-expiry">Expires at</Label>
                <Input
                  id="edit-coupon-expiry"
                  type="datetime-local"
                  value={endsAt}
                  onChange={(event) => setEndsAt(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty for no expiry.
                </p>
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
                <CardTitle>Availability</CardTitle>
              </CardHeader>
              <CardContent>
                <label className="flex items-center justify-between gap-3 text-sm">
                  <span>
                    <span className="block font-medium">Active</span>
                    <span className="block text-xs text-muted-foreground">
                      Buyers can apply this code.
                    </span>
                  </span>
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                </label>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Coupon details</CardTitle>
                <CardDescription>These values cannot be changed.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Code</span>
                  <span className="flex items-center gap-1 font-mono font-medium">
                    {coupon.code}
                    <CopyButton value={coupon.code} label="Copy coupon code" />
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="tabular-nums">{couponValue(coupon)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Minimum</span>
                  <span className="tabular-nums">
                    {coupon.minSubtotalCents > 0
                      ? formatMoney(coupon.minSubtotalCents)
                      : 'None'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Created</span>
                  <span>{formatDateShort(coupon.createdAt)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </>
  )
}

export function CouponEditPage() {
  const { id } = useParams<{ id: string }>()
  const couponsQuery = useQuery({
    queryKey: ['coupons'],
    queryFn: listCoupons,
  })
  const coupon = id
    ? couponsQuery.data?.find((item) => item.id === id) ?? null
    : null

  if (!id) return null

  if (couponsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    )
  }

  if (couponsQuery.isError) {
    return (
      <>
        <PageHeader
          title="Edit coupon"
          description="Unable to load this coupon."
          actions={
            <Button variant="outline" size="sm" asChild>
              <Link to="/coupons">
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back to coupons
              </Link>
            </Button>
          }
        />
        <div className="rounded-xl border border-border bg-card">
          <ErrorState
            title="Coupons unavailable"
            message={getErrorMessage(couponsQuery.error)}
            onRetry={() => void couponsQuery.refetch()}
          />
        </div>
      </>
    )
  }

  if (!coupon) {
    return (
      <>
        <PageHeader
          title="Edit coupon"
          description="This coupon could not be found."
          actions={
            <Button variant="outline" size="sm" asChild>
              <Link to="/coupons">
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back to coupons
              </Link>
            </Button>
          }
        />
        <div className="rounded-xl border border-border bg-card">
          <ErrorState
            title="Coupon not found"
            message="It may have been removed. Return to the coupon list to review current codes."
          />
        </div>
      </>
    )
  }

  return <EditCouponForm key={coupon.id} coupon={coupon} />
}
