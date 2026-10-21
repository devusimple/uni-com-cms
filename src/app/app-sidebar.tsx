import {
  ChevronDown,
  Images,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  ShoppingBag,
  Tags,
  TicketPercent,
  Users,
} from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import { useAuth } from '@/hooks/use-auth'
import { logout } from '@/lib/api/auth'
import { useAuthStore } from '@/lib/auth-store'
import { initials } from '@/lib/format'
import { canModerate, isAdmin } from '@/lib/permissions'
import type { Role } from '@/lib/api/types'

interface NavItem {
  title: string
  href: string
  icon: typeof LayoutDashboard
  roles?: Role[]
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: 'Workspace',
    items: [
      { title: 'Overview', href: '/', icon: LayoutDashboard },
      { title: 'Orders', href: '/orders', icon: ShoppingBag },
      { title: 'Products', href: '/products', icon: Package },
      { title: 'Media', href: '/media', icon: Images },
    ],
  },
  {
    label: 'Commerce',
    items: [
      { title: 'Categories', href: '/categories', icon: Tags, roles: ['admin'] },
      { title: 'Coupons', href: '/coupons', icon: TicketPercent, roles: ['admin'] },
      {
        title: 'Customers',
        href: '/customers',
        icon: Users,
        roles: ['admin', 'moderator'],
      },
    ],
  },
  {
    label: 'Account',
    items: [{ title: 'Settings', href: '/settings', icon: Settings }],
  },
]

function isItemVisible(item: NavItem, role: Role | undefined) {
  if (!item.roles) return true
  if (!role) return false
  return item.roles.includes(role)
}

function isItemActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AppSidebar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const refreshToken = useAuthStore((state) => state.refreshToken)
  const clearSession = useAuthStore((state) => state.clear)

  async function handleSignOut() {
    try {
      if (refreshToken) await logout(refreshToken)
    } catch {
      // The local session should still end if the API is unreachable.
    } finally {
      clearSession()
      navigate('/login', { replace: true })
      toast.success('Signed out')
    }
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="UNI-COM Console">
              <Link to="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Package className="size-4" aria-hidden="true" />
                </div>
                <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate text-sm font-semibold tracking-tight">
                    UNI-COM
                  </span>
                  <span className="truncate text-[11px] text-muted-foreground">
                    Operations console
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) => isItemVisible(item, user?.role))
          if (visibleItems.length === 0) return null
          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isItemActive(pathname, item.href)}
                        tooltip={item.title}
                      >
                        <Link to={item.href}>
                          <item.icon aria-hidden="true" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )
        })}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="size-8 rounded-lg">
                    <AvatarImage src={user?.avatarUrl ?? undefined} alt="" />
                    <AvatarFallback className="rounded-lg text-xs">
                      {initials(user?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-medium">
                      {user?.name ?? 'Unnamed user'}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user?.email}
                    </span>
                  </div>
                  <ChevronDown
                    className="ml-auto size-4 group-data-[collapsible=icon]:hidden"
                    aria-hidden="true"
                  />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                side="right"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user?.name ?? 'Unnamed user'}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                    <p className="text-xs capitalize text-muted-foreground">
                      {user?.role}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/settings">
                    <Settings aria-hidden="true" />
                    Account settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut aria-hidden="true" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="px-2 pb-1 text-[10px] text-muted-foreground group-data-[collapsible=icon]:hidden">
          {isAdmin(user?.role)
            ? 'Administrator workspace'
            : canModerate(user?.role)
              ? 'Moderation workspace'
              : 'Seller workspace'}
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
