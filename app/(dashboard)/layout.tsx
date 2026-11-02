import { AppSidebar } from "@/components/app-sidebar"
import { DynamicBreadcrumb } from "@/components/ui/dynamic-breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { DashboardAccessGuard } from "@/components/dashboard-access-guard"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar": "#512da8",
          "--color-sidebar": "#512da8",
        } as React.CSSProperties
      }
    >
      <AppSidebar />
      <SidebarInset className="bg-[#F8FAFC] dark:bg-background">
        <header className="sticky top-0 z-40 flex h-12 shrink-0 items-center justify-between border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 bg-[#512da8] text-white border-white/10 px-3 sm:px-4 shadow-xs">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1 text-white/80 hover:bg-white/10 hover:text-white" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto bg-white/20"
            />
            <DynamicBreadcrumb />
          </div>
          <div className="hidden sm:flex items-center text-xs text-white/70 font-medium tracking-wide">
            Sistem Pengelolaan Alat Medis Ruang HCU
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-4">
          <DashboardAccessGuard>{children}</DashboardAccessGuard>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
