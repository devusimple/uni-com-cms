import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Loader2, LockKeyhole, Mail, Package, ShieldCheck, ShoppingBag, Tags } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/lib/auth-store'
import { login, requestPasswordReset } from '@/lib/api/auth'
import { getErrorMessage } from '@/lib/errors'

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginValues = z.infer<typeof loginSchema>

const resetSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
})

type ResetValues = z.infer<typeof resetSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const status = useAuthStore((state) => state.status)
  const setSession = useAuthStore((state) => state.setSession)
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const from =
    typeof location.state?.from === 'string' && location.state.from.startsWith('/')
      ? location.state.from
      : '/'

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const resetForm = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: '' },
  })

  if (status === 'authenticated') {
    return <Navigate to={from} replace />
  }

  async function onSubmit(values: LoginValues) {
    setFormError(null)
    try {
      const session = await login(values.email.trim(), values.password)
      setSession(session)
      toast.success(`Welcome back${session.user.name ? `, ${session.user.name}` : ''}`)
      navigate(from, { replace: true })
    } catch (error) {
      setFormError(getErrorMessage(error))
    }
  }

  async function onReset(values: ResetValues) {
    try {
      await requestPasswordReset(values.email.trim())
      setResetSent(true)
    } catch (error) {
      resetForm.setError('root', { message: getErrorMessage(error) })
    }
  }

  const apiHost = (import.meta.env.VITE_API_URL || 'https://uni-com.devusimple.workers.dev')
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '')

  return (
    <div className="grid min-h-svh bg-background lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-border bg-brand p-10 text-brand-foreground lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-brand-foreground text-brand">
            <Package className="size-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-[0.18em]">UNI-COM</p>
            <p className="text-xs text-brand-foreground/60">Operations console</p>
          </div>
        </div>

        <div className="max-w-md space-y-8">
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand-foreground/50">
              Marketplace operations
            </p>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight">
              Run the storefront without losing the thread.
            </h1>
            <p className="text-sm leading-6 text-brand-foreground/60">
              Orders, catalog, customers, and storefront media in one workspace built
              directly on the UNI-COM API.
            </p>
          </div>

          <div className="grid gap-3 text-sm">
            <div className="flex items-center gap-3 border-t border-brand-foreground/15 pt-3">
              <ShoppingBag className="size-4 text-brand-foreground/60" aria-hidden="true" />
              <span>Fulfil orders and keep buyers informed</span>
            </div>
            <div className="flex items-center gap-3 border-t border-brand-foreground/15 pt-3">
              <Tags className="size-4 text-brand-foreground/60" aria-hidden="true" />
              <span>Maintain catalog structure, pricing, and stock</span>
            </div>
            <div className="flex items-center gap-3 border-t border-brand-foreground/15 pt-3">
              <ShieldCheck className="size-4 text-brand-foreground/60" aria-hidden="true" />
              <span>Administer catalog, orders, and customer access</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-brand-foreground/40">Connected to {apiHost}</p>
      </div>

      <div className="flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2 lg:hidden">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Package className="size-4" aria-hidden="true" />
              </div>
              <span className="text-sm font-semibold tracking-[0.16em]">UNI-COM</span>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">Sign in to the console</h2>
            <p className="text-sm text-muted-foreground">
              Use your UNI-COM staff account. Public sign-up is disabled.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@company.com"
                  className="pl-9"
                  aria-invalid={Boolean(errors.email)}
                  {...register('email')}
                />
              </div>
              {errors.email ? (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="password">Password</Label>
                <Dialog
                  open={resetOpen}
                  onOpenChange={(open) => {
                    setResetOpen(open)
                    if (!open) {
                      setResetSent(false)
                      resetForm.reset()
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      Forgot password?
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Reset your password</DialogTitle>
                      <DialogDescription>
                        We will email a reset link if an account exists for that address.
                      </DialogDescription>
                    </DialogHeader>
                    {resetSent ? (
                      <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm">
                        Check your inbox. The response is the same whether or not an
                        account exists.
                      </div>
                    ) : (
                      <form
                        id="reset-form"
                        className="space-y-4"
                        onSubmit={resetForm.handleSubmit(onReset)}
                        noValidate
                      >
                        <div className="space-y-2">
                          <Label htmlFor="reset-email">Email</Label>
                          <Input
                            id="reset-email"
                            type="email"
                            autoComplete="email"
                            placeholder="name@company.com"
                            {...resetForm.register('email')}
                          />
                          {resetForm.formState.errors.email ? (
                            <p className="text-xs text-destructive">
                              {resetForm.formState.errors.email.message}
                            </p>
                          ) : null}
                          {resetForm.formState.errors.root ? (
                            <p className="text-xs text-destructive">
                              {resetForm.formState.errors.root.message}
                            </p>
                          ) : null}
                        </div>
                      </form>
                    )}
                    <DialogFooter>
                      {resetSent ? (
                        <Button type="button" onClick={() => setResetOpen(false)}>
                          Done
                        </Button>
                      ) : (
                        <Button
                          type="submit"
                          form="reset-form"
                          disabled={resetForm.formState.isSubmitting}
                        >
                          {resetForm.formState.isSubmitting ? (
                            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                          ) : null}
                          Send reset link
                        </Button>
                      )}
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="relative">
                <LockKeyhole
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Your password"
                  className="pl-9 pr-10"
                  aria-invalid={Boolean(errors.password)}
                  {...register('password')}
                />
                <button
                  type="button"
                  className="absolute right-1 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" aria-hidden="true" />
                  ) : (
                    <Eye className="size-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {errors.password ? (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              ) : null}
            </div>

            {formError ? (
              <div
                role="alert"
                className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive"
              >
                {formError}
              </div>
            ) : null}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              Sign in
            </Button>
          </form>

          <p className="text-xs leading-5 text-muted-foreground">
            Access is limited to authorised UNI-COM staff. If your account is disabled,
            contact a marketplace administrator.
          </p>
        </div>
      </div>
    </div>
  )
}
