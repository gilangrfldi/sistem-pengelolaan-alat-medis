"use client"

import * as React from "react"
import Image from "next/image"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Home, Users, Activity, FileText, ShieldCheck } from "lucide-react"

// Data master menu navigasi
const data = {
  user: {
    username: "Staf Perawat",
    avatar: "/avatars/shadcn.jpg",
  },
  headers: [
    {
      name: "RSUD Welas Asih",
      logo: "/logo.jpeg",
      plan: "HCU",
    },
  ],
  navMain: [
    {
      title: "Beranda",
      url: "/beranda",
      icon: <Home className="size-4" />,
    },
    {
      title: "Kelola Pasien",
      url: "/kelola-pasien",
      icon: <Users className="size-4" />,
    },
    {
      title: "Kelola Alat",
      url: "/kelola-alat",
      icon: <Activity className="size-4" />,
    },
    {
      title: "Rekap",
      url: "/rekap",
      icon: <FileText className="size-4" />,
      items: [
        {
          title: "Rekap Pasien",
          url: "/rekap/pasien",
        },
        {
          title: "Rekap Alat",
          url: "/rekap/alat",
        },
      ],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const isPengelola = React.useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("storage", onStoreChange)
      return () => window.removeEventListener("storage", onStoreChange)
    },
    () => {
      if (typeof window === "undefined") return true
      const role = localStorage.getItem("sp_current_user_role")
      return role === "pengelola"
    },
    () => true
  )

  const navItems = React.useMemo(() => {
    const list = [...data.navMain]
    if (isPengelola) {
      list.push({
        title: "Kelola Perawat",
        url: "/kelola-perawat",
        icon: <ShieldCheck className="size-4" />,
      })
    }
    return list
  }, [isPengelola])

  return (
    <Sidebar
      collapsible="icon"
      className="bg-[#512da8] text-white"
      style={
        {
          "--sidebar": "#512da8",
          "--color-sidebar": "#512da8",
        } as React.CSSProperties
      }
      {...props}
    >
      <SidebarHeader className="border-b border-white/10 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="hover:bg-transparent active:bg-transparent cursor-default px-2 group-data-[collapsible=icon]:p-0!"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg overflow-hidden bg-white/10 shrink-0 border border-white/20">
                {/* Logo RSUD Welas Asih */}
                <Image
                  src="/logo.jpeg"
                  alt="Logo RSUD Welas Asih"
                  width={32}
                  height={32}
                  className="size-full object-cover"
                />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight ml-1">
                <span className="truncate font-semibold text-white">
                  {data.headers[0].name}
                </span>
                <span className="truncate text-xs text-white/70">
                  {data.headers[0].plan}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
