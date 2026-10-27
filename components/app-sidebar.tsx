"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Frame, BotIcon, BookOpenIcon, Home, DownloadCloudIcon } from "lucide-react"

// This is sample data.
const data = {
  user: {
    username: "perawat.hcu",
    avatar: "/avatars/shadcn.jpg",
  },
  headers: [
    {
      name: "RSUD Welas Asih",
      logo: (
        <Frame />
      ),
      plan: "HCU",
    }
  ],
  navMain: [
    {
      title: "Beranda",
      url: "/beranda",
      icon: (
        <Home
        />
      ),
    },
    {
      title: "Kelola Alat",
      url: "/kelola-alat",
      icon: (
        <BotIcon
        />
      )
    },
    {
      title: "Rekap Bulanan",
      url: "/rekap-bulanan",
      icon: (
        <BookOpenIcon
        />
      )
    },
    {
      title: "Riwayat & Unduh",
      url: "/riwayat-unduhan",
      icon: (
        <DownloadCloudIcon
        />
      )
    },
  ],
 
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="flex flex-row h-12 border-b border-gray-200">
            <div className="flex  size-8 items-center justify-center">
              {/* Akan Diganti dengan logo RSUD Welas Asih */}
              <Frame 
                size={12}
              />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{data.headers[0].name}</span>
              <span className="truncate text-xs">{data.headers[0].plan}</span>
            </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
