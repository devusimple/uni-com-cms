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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { createCoupon } from '@/lib/api/coupons'
import type { CouponType } from '@/lib/api/types'
import { COUPON_CODE_PATTERN, toUnixSeconds } from '@/lib/coupons'
import { getErrorMessage } from '@/lib/errors'

export function CouponCreatePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [code, setCode] = useState('')
  const [type, setType] = useState<CouponType>('percent')
  const [value, setValue] = useState('')
  const [minSubtotal, setMinSubtotal] = useState('')
  const [maxUses, setMaxUses] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      const trimmedCode = code.trim()
      if (trimmedCode.length < 2) {
        throw new Error('Code must be at least 2 characters long.')
      }
      if (!COUPON_CODE_PATTERN.test(trimmedCode)) {
        throw new Error('Code must use letters, numbers, hyphens, or underscores.')
      }
      const numericValue = Number(value)
      if (!value.trim() || !Number.isFinite(numericValue) || numericValue <= 0) {
        throw new Error('Enter a valid discount value.')
      }
      if (
        type === 'percent' &&
        (numericValue > 100 || !Number.isInteger(numericValue))
      ) {
        throw new Error('Percentage discounts must be a whole number between 1 and 100.')
      }
      const minSubtotalValue = minSubtotal.trim() ? Number(minSubtotal) : 0
      if (!Number.isFinite(minSubtotalValue) || minSubtotalValue < 0) {
        throw new Error('Minimum subtotal must be a valid amount.')
      }
      const maxUsesValue = maxUses.trim() ? Number(maxUses) : null
      if (
        maxUsesValue !== null &&
        (!Number.isInteger(maxUsesValue) || maxUsesValue < 1)
      ) {
        throw new Error('Usage limit must be a whole number of at least 1.')
      }
      const startsAtValue = toUnixSeconds(startsAt)
      const endsAtValue = toUnixSeconds(endsAt)
      if (
        startsAtValue !== null &&
        endsAtValue !== null &&
        endsAtValue <= startsAtValue
      ) {
        throw new Error('The expiry must come after the start date.')
      }

      return createCoupon({
        code: trimmedCode,
        type,
        value:
          type === 'percent'
            ? Math.round(numericValue)
            : Math.round(numericValue * 100),
        minSubtotalCents: Math.round(minSubtotalValue * 100),
        maxUses: maxUsesValue,
        startsAt: startsAtValue,
        endsAt: endsAtValue,
        isActive,
      })
    },
    onSuccess: () => {
      toast.success('Coupon created')
      void queryClient.invalidateQueries({ queryKey: ['coupons'] })
      navigate('/coupons', { replace: true })
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  })

  return (
    <>
      <PageHeader
        title="New coupon"
        description="Create a discount code. After creation, only the active flag, usage limit, and expiry can change."
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
              form="create-coupon-form"
              size="sm"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              Create coupon
            </Button>
          </>
        }
      />

      <form
        id="create-coupon-form"
        onSubmit={(event) => {
          event.preventDefault()
          setError(null)
          mutation.mutate()
        }}
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Card>
            <CardHeader>
              <CardTitle>Discount</CardTitle>
              <CardDescription>
                Codes are case-insensitive in the storefront and must be unique.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="coupon-code">Code</Label>
                <Input
                  id="coupon-code"
                  value={code}
                  maxLength={30}
                  onChange={(event) => setCode(event.target.value.toUpperCase())}
                  placeholder="WELCOME10"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coupon-type">Type</Label>
                <Select
                  value={type}
                  onValueChange={(nextType) => {
                    setType(nextType as CouponType)
                    setValue('')
                  }}
                >
                  <SelectTrigger id="coupon-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="coupon-value">
                  {type === 'percent' ? 'Percent off' : 'Amount off (USD)'}
                </Label>
                <Input
                  id="coupon-value"
                  type="number"
                  min="1"
                  max={type === 'percent' ? '100' : undefined}
                  step={type === 'percent' ? '1' : '0.01'}
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  placeholder={type === 'percent' ? '10' : '15.00'}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coupon-min">Minimum subtotal (USD)</Label>
                <Input
                  id="coupon-min"
                  type="number"
                  min="0"
                  step="0.01"
                  value={minSubtotal}
                  onChange={(event) => setMinSubtotal(event.target.value)}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty for no minimum.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="coupon-max">Usage limit</Label>
                <Input
                  id="coupon-max"
                  type="number"
                  min="1"
                  step="1"
                  value={maxUses}
                  onChange={(event) => setMaxUses(event.target.value)}
                  placeholder="Unlimited"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="coupon-start">Starts at</Label>
                <Input
                  id="coupon-start"
                  type="datetime-local"
                  value={startsAt}
                  onChange={(event) => setStartsAt(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to start the code immediately. The start date cannot be
                  changed later.
                </p>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="coupon-expiry">Expires at</Label>
                <Input
                  id="coupon-expiry"
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
                      Buyers can apply this code immediately.
                    </span>
                  </span>
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                </label>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Immutable fields</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Code, type, value, minimum subtotal, and start date cannot be changed later.</p>
                <p>Coupons cannot be deleted, so deactivate a code to stop redemptions.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </>
  )
}
