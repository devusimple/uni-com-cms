import { Outlet } from 'react-router-dom'
import { AppBreadcrumbs } from '@/app/breadcrumbs'
import { AppSidebar } from '@/app/app-sidebar'
import { ThemeToggle } from '@/components/theme-toggle'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'

export function AppShell() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 h-4" />
          <div className="min-w-0 flex-1 overflow-hidden">
            <AppBreadcrumbs />
          </div>
          <ThemeToggle />
        </header>
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
