"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { ChevronRight } from "lucide-react"
import { cn } from "cn"

export interface NavSubItem {
  title: string
  url: string
}

export interface NavMainItem {
  title: string
  url: string
  icon?: React.ReactNode
  isActive?: boolean
  items?: NavSubItem[]
}

export function NavMain({ items }: { items: NavMainItem[] }) {
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()

  // Otomatis tutup sidebar di mobile saat rute halaman berhasil berpindah
  const prevPathnameRef = React.useRef(pathname)
  React.useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname
      setOpenMobile(false)
    }
  }, [pathname, setOpenMobile])

  // Track state buka/tutup untuk menu induk yang memiliki subitem
  const [openMenus, setOpenMenus] = React.useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    items.forEach((item) => {
      if (item.items && item.items.length > 0) {
        // Otomatis buka jika subitem sedang aktif
        const isChildActive = item.items.some((sub) => pathname.startsWith(sub.url))
        initial[item.title] = isChildActive || pathname.startsWith(item.url)
      }
    })
    return initial
  })

  const toggleMenu = (title: string) => {
    setOpenMenus((prev) => ({
      ...prev,
      [title]: !prev[title],
    }))
  }

  return (
    <SidebarGroup>
      <SidebarMenu className="gap-1">
        {items.map((item) => {
          const hasSubItems = Boolean(item.items && item.items.length > 0)
          const isItemActive =
            item.isActive ??
            (pathname === item.url ||
              (hasSubItems && item.items?.some((sub) => pathname === sub.url)))

          if (hasSubItems) {
            const isOpen = Boolean(openMenus[item.title])

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  type="button"
                  tooltip={item.title}
                  onClick={() => toggleMenu(item.title)}
                  className={cn(
                    "w-full justify-between transition-colors duration-150 rounded-lg text-sm cursor-pointer",
                    isItemActive
                      ? "bg-white/20! text-white! font-medium shadow-xs"
                      : "text-white/75! hover:bg-white/10! hover:text-white! active:bg-white/15!"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {item.icon}
                    <span>{item.title}</span>
                  </div>
                  <ChevronRight
                    className={cn(
                      "size-4 shrink-0 text-white/70 transition-transform duration-200",
                      isOpen && "rotate-90 text-white"
                    )}
                  />
                </SidebarMenuButton>

                {isOpen && (
                  <SidebarMenuSub className="my-1 border-white/20 pl-2">
                    {item.items?.map((subItem) => {
                      const isSubActive = pathname === subItem.url

                      return (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            render={<Link href={subItem.url} />}
                            isActive={isSubActive}
                            className={cn(
                              "text-xs rounded-md transition-colors duration-150 h-8",
                              isSubActive
                                ? "bg-white/25! text-white! font-semibold shadow-xs"
                                : "text-white/70! hover:bg-white/10! hover:text-white!"
                            )}
                          >
                            <span>{subItem.title}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      )
                    })}
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>
            )
          }

          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                tooltip={item.title}
                isActive={isItemActive}
                render={<Link href={item.url} />}
                className={cn(
                  "transition-colors duration-150 rounded-lg text-sm",
                  isItemActive
                    ? "bg-white/20! text-white! font-medium shadow-xs hover:bg-white/25! hover:text-white!"
                    : "text-white/75! hover:bg-white/10! hover:text-white! active:bg-white/15!"
                )}
              >
                {item.icon}
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
