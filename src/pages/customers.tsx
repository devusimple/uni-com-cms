import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  MoreHorizontal,
  RefreshCw,
  ShieldCheck,
  UserCog,
  Users,
} from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { CopyButton } from '@/components/copy-button'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { PageHeader } from '@/components/page-header'
import { Pagination } from '@/components/pagination'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
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
import { listUsers, setUserRole, setUserStatus } from '@/lib/api/users'
import type { PublicUser, Role } from '@/lib/api/types'
import { getErrorMessage } from '@/lib/errors'
import { initials } from '@/lib/format'

const PAGE_SIZE = 20
const roles: Role[] = ['user', 'admin']

export function CustomersPage() {
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1)
  const roleFilter = (params.get('role') ?? 'all') as Role | 'all'
  const [selected, setSelected] = useState<PublicUser | null>(null)
  const [nextRole, setNextRole] = useState<Role | ''>('')
  const [error, setError] = useState<string | null>(null)

  const usersQuery = useQuery({
    queryKey: ['users', roleFilter, page],
    queryFn: () =>
      listUsers({
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
        role: roleFilter === 'all' ? undefined : roleFilter,
      }),
  })

  const users = usersQuery.data ?? []

  function setPage(nextPage: number) {
    const next = new URLSearchParams(params)
    if (nextPage <= 1) next.delete('page')
    else next.set('page', String(nextPage))
    setParams(next)
  }

  function setRoleFilter(value: string) {
    const next = new URLSearchParams(params)
    if (value === 'all') next.delete('role')
    else next.set('role', value)
    next.delete('page')
    setParams(next)
  }

  function openUser(user: PublicUser) {
    setSelected(user)
    setNextRole('')
    setError(null)
  }

  const roleMutation = useMutation({
    mutationFn: async () => {
      if (!selected || !nextRole) throw new Error('Choose a role first.')
      return setUserRole(selected.id, nextRole)
    },
    onSuccess: () => {
      toast.success('Role updated')
      void queryClient.invalidateQueries({ queryKey: ['users'] })
      setSelected(null)
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  })

  const statusMutation = useMutation({
    mutationFn: (isActive: boolean) => {
      if (!selected) throw new Error('No user selected.')
      return setUserStatus(selected.id, isActive)
    },
    onSuccess: (_result, isActive) => {
      toast.success(isActive ? 'Account enabled' : 'Account disabled')
      void queryClient.invalidateQueries({ queryKey: ['users'] })
      setSelected(null)
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  })

  const isSelf = selected?.id === currentUser?.id

  return (
    <>
      <PageHeader
        title="Customers"
        description="The public user directory. The API exposes only names, avatars, and IDs here — email, role, and account status are not available for other users. Accounts hold one of two roles: user or admin."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void usersQuery.refetch()}
            disabled={usersQuery.isFetching}
          >
            <RefreshCw
              className={usersQuery.isFetching ? 'size-4 animate-spin' : 'size-4'}
              aria-hidden="true"
            />
            Refresh
          </Button>
        }
      />

      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Directory filter</p>
          <p className="text-xs text-muted-foreground">
            Filtering happens on the server; the returned profiles do not include
            roles.
          </p>
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-44" aria-label="Filter by role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {roles.map((role) => (
              <SelectItem key={role} value={role} className="capitalize">
                {role}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-border bg-card">
        {usersQuery.isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3">
                <Skeleton className="size-9 rounded-full" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="ml-auto h-4 w-28" />
              </div>
            ))}
          </div>
        ) : usersQuery.isError ? (
          <ErrorState
            title="Directory unavailable"
            message={getErrorMessage(usersQuery.error)}
            onRetry={() => void usersQuery.refetch()}
          />
        ) : users.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No users found"
            description={
              roleFilter === 'all'
                ? 'The directory is empty, or no public profiles exist yet.'
                : `No public profiles were returned for the ${roleFilter} role.`
            }
            action={
              roleFilter !== 'all' ? (
                <Button variant="outline" size="sm" onClick={() => setRoleFilter('all')}>
                  Show all roles
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
                    <TableHead className="pl-4">User</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead className="w-12 pr-4">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-9">
                            <AvatarImage src={user.avatarUrl ?? undefined} alt="" />
                            <AvatarFallback className="text-xs">
                              {initials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">
                              {user.name ?? 'Unnamed user'}
                              {user.id === currentUser?.id ? (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  You
                                </span>
                              ) : null}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                          {user.id}
                          <CopyButton value={user.id} label="Copy user ID" />
                        </div>
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="User actions"
                            >
                              <MoreHorizontal className="size-4" aria-hidden="true" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openUser(user)}>
                              <UserCog className="size-4" aria-hidden="true" />
                              Manage access
                            </DropdownMenuItem>
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
                itemCount={users.length}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </div>

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage {selected?.name ?? 'user'}</DialogTitle>
            <DialogDescription>
              The API does not return this user's current role or active state, so
              these actions overwrite the values blindly.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="user-role">Assign role</Label>
              <div className="flex gap-2">
                <Select
                  value={nextRole}
                  onValueChange={(value) => setNextRole(value as Role)}
                >
                  <SelectTrigger id="user-role" className="flex-1">
                    <SelectValue placeholder="Choose a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role} value={role} className="capitalize">
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  disabled={!nextRole || roleMutation.isPending}
                  onClick={() => {
                    setError(null)
                    roleMutation.mutate()
                  }}
                >
                  <ShieldCheck className="size-4" aria-hidden="true" />
                  Apply
                </Button>
              </div>
            </div>

            <div className="space-y-2 rounded-lg border border-border p-3">
              <p className="text-sm font-medium">Account status</p>
              <p className="text-xs text-muted-foreground">
                Disabling an account signs the user out everywhere. Administrators
                cannot disable their own account.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSelf || statusMutation.isPending}
                  onClick={() => {
                    setError(null)
                    statusMutation.mutate(true)
                  }}
                >
                  Enable account
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={isSelf || statusMutation.isPending}
                  onClick={() => {
                    setError(null)
                    statusMutation.mutate(false)
                  }}
                >
                  Disable account
                </Button>
              </div>
              {isSelf ? (
                <p className="text-xs text-muted-foreground">
                  You cannot change your own account status.
                </p>
              ) : null}
            </div>

            {error ? (
              <div
                role="alert"
                className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive"
              >
                {error}
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSelected(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
