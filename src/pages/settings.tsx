import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ImageUp,
  Loader2,
  LogOut,
  MonitorSmartphone,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { CopyButton } from '@/components/copy-button'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/hooks/use-auth'
import {
  logout,
  logoutAll,
  requestEmailVerification,
  updateProfile,
} from '@/lib/api/auth'
import { updateMediaVisibility, uploadMedia } from '@/lib/api/media'
import { useAuthStore } from '@/lib/auth-store'
import { getErrorMessage } from '@/lib/errors'
import { formatDate, initials } from '@/lib/format'

const MAX_AVATAR_BYTES = 10 * 1024 * 1024

export function SettingsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const setUser = useAuthStore((state) => state.setUser)
  const clearSession = useAuthStore((state) => state.clear)
  const refreshToken = useAuthStore((state) => state.refreshToken)

  const [name, setName] = useState(user?.name ?? '')
  const [error, setError] = useState<string | null>(null)
  const [logoutAllOpen, setLogoutAllOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const profileMutation = useMutation({
    mutationFn: async () => {
      return updateProfile({ name: name.trim() || null })
    },
    onSuccess: (updatedUser) => {
      setUser(updatedUser)
      toast.success('Profile updated')
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  })

  const logoutAllMutation = useMutation({
    mutationFn: logoutAll,
    onSuccess: () => {
      clearSession()
      queryClient.clear()
      navigate('/login', { replace: true })
      toast.success('Signed out of all sessions')
    },
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  })

  const verifyMutation = useMutation({
    mutationFn: requestEmailVerification,
    onSuccess: () => toast.success('Verification email requested'),
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  })

  const avatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const media = await uploadMedia(file)
      let avatarUrl = media.url

      // The directory shows other users your avatar, so the file has to be
      // publicly readable. Uploads start private, so flip the flag first.
      if (!media.isPublic) {
        try {
          const published = await updateMediaVisibility(media.id, true)
          avatarUrl = published.url
        } catch {
          toast.warning('Uploaded, but the file could not be made public.')
        }
      }

      const updatedUser = await updateProfile({ avatarUrl })
      return updatedUser
    },
    onSuccess: (updatedUser) => {
      setUser(updatedUser)
      setAvatarError(null)
      setPreviewUrl(null)
      toast.success('Profile picture updated')
    },
    onError: (mutationError) => setAvatarError(getErrorMessage(mutationError)),
  })

  const removeAvatarMutation = useMutation({
    mutationFn: () => updateProfile({ avatarUrl: null }),
    onSuccess: (updatedUser) => {
      setUser(updatedUser)
      setAvatarError(null)
      toast.success('Profile picture removed')
    },
    onError: (mutationError) => setAvatarError(getErrorMessage(mutationError)),
  })

  function handleAvatarFile(file: File | undefined) {
    if (!file) return
    setAvatarError(null)

    if (!file.type.startsWith('image/')) {
      setAvatarError('Choose an image file.')
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError('Images must be 10 MB or smaller.')
      return
    }

    // The effect above revokes the previous preview when this changes.
    setPreviewUrl(URL.createObjectURL(file))
    avatarMutation.mutate(file)
  }

  async function handleSignOut() {
    setSigningOut(true)
    try {
      if (refreshToken) await logout(refreshToken)
    } catch {
      // Local sign-out still proceeds.
    } finally {
      clearSession()
      queryClient.clear()
      navigate('/login', { replace: true })
      toast.success('Signed out')
      setSigningOut(false)
    }
  }

  if (!user) return null

  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage your profile and active sessions."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>
                This information is visible to other users in the public directory.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                id="profile-form"
                className="space-y-5"
                onSubmit={(event) => {
                  event.preventDefault()
                  setError(null)
                  profileMutation.mutate()
                }}
              >
                <div className="flex flex-wrap items-start gap-4">
                  <Avatar className="size-16">
                    <AvatarImage
                      src={previewUrl ?? user.avatarUrl ?? undefined}
                      alt=""
                    />
                    <AvatarFallback className="text-lg">
                      {initials(name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div>
                      <p className="text-sm font-medium">{name || 'Unnamed user'}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(event) => {
                        handleAvatarFile(event.target.files?.[0])
                        event.target.value = ''
                      }}
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={avatarMutation.isPending}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {avatarMutation.isPending ? (
                          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <ImageUp className="size-4" aria-hidden="true" />
                        )}
                        {avatarMutation.isPending
                          ? 'Uploading…'
                          : user.avatarUrl
                            ? 'Replace picture'
                            : 'Upload picture'}
                      </Button>
                      {user.avatarUrl ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={removeAvatarMutation.isPending}
                          onClick={() => removeAvatarMutation.mutate()}
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                          Remove
                        </Button>
                      ) : null}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      PNG, JPG, or WebP up to 10 MB. The picture is stored in your
                      media library and made public so others can see it.
                    </p>

                    {avatarError ? (
                      <p role="alert" className="text-xs text-destructive">
                        {avatarError}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="settings-name">Display name</Label>
                  <Input
                    id="settings-name"
                    value={name}
                    maxLength={100}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Your name"
                  />
                </div>

                {error ? (
                  <div
                    role="alert"
                    className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive"
                  >
                    {error}
                  </div>
                ) : null}
              </form>
            </CardContent>
            <CardFooter className="justify-end">
              <Button
                type="submit"
                form="profile-form"
                disabled={profileMutation.isPending}
              >
                {profileMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : null}
                Save profile
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>Identity and access details from the API.</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="divide-y divide-border text-sm">
                <div className="flex items-center justify-between gap-3 py-2 first:pt-0">
                  <dt className="text-muted-foreground">Email</dt>
                  <dd className="flex items-center gap-2">
                    <span>{user.email}</span>
                    {user.emailVerifiedAt ? (
                      <Badge variant="outline" className="text-success">
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline">Unverified</Badge>
                    )}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 py-2">
                  <dt className="text-muted-foreground">Role</dt>
                  <dd>
                    <Badge variant="outline" className="capitalize">
                      {user.role === 'admin' ? 'Administrator' : 'Member'}
                    </Badge>
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 py-2">
                  <dt className="text-muted-foreground">Account status</dt>
                  <dd>
                    <StatusBadge status={user.isActive ? 'active' : 'inactive'} />
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 py-2">
                  <dt className="text-muted-foreground">User ID</dt>
                  <dd className="flex items-center gap-1 font-mono text-xs">
                    {user.id}
                    <CopyButton value={user.id} label="Copy user ID" />
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 py-2">
                  <dt className="text-muted-foreground">Created</dt>
                  <dd>{formatDate(user.createdAt)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3 py-2">
                  <dt className="text-muted-foreground">Last login</dt>
                  <dd>
                    {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Not recorded'}
                  </dd>
                </div>
              </dl>

              {!user.emailVerifiedAt ? (
                <div className="mt-4 flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
                    <p className="text-xs text-muted-foreground">
                      Verify your email to secure account recovery.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={verifyMutation.isPending}
                    onClick={() => verifyMutation.mutate()}
                  >
                    {verifyMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    ) : null}
                    Resend verification
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sessions</CardTitle>
              <CardDescription>
                Refresh tokens rotate on every refresh, so only the current session is
                tracked locally.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-border p-3">
                <MonitorSmartphone
                  className="mt-0.5 size-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium">This browser</p>
                  <p className="text-xs text-muted-foreground">
                    Signed in as {user.email}
                  </p>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleSignOut}
                  disabled={signingOut}
                >
                  {signingOut ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <LogOut className="size-4" aria-hidden="true" />
                  )}
                  Sign out
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full justify-start"
                  onClick={() => setLogoutAllOpen(true)}
                  disabled={logoutAllMutation.isPending}
                >
                  <UserRound className="size-4" aria-hidden="true" />
                  Sign out everywhere
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>About this console</CardTitle>
              <CardDescription>Operational details for support.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center justify-between gap-3">
                <span>API</span>
                <span className="truncate font-mono">
                  {(import.meta.env.VITE_API_URL || 'https://uni-com.devusimple.workers.dev')
                    .replace(/^https?:\/\//, '')
                    .replace(/\/+$/, '')}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Console</span>
                <span>UNI-COM CMS</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={logoutAllOpen}
        onOpenChange={setLogoutAllOpen}
        title="Sign out of all sessions?"
        description="Every refresh token for your account will be revoked, including this browser. You will need to sign in again."
        confirmLabel="Sign out everywhere"
        destructive
        pending={logoutAllMutation.isPending}
        onConfirm={() => logoutAllMutation.mutate()}
      />
    </>
  )
}
