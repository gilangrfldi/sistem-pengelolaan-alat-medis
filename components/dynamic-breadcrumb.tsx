"use client"

import { usePathname } from "next/navigation"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"

const routeTitles: Record<string, string> = {
  "/beranda": "Beranda",
  "/kelola-alat": "Kelola Alat",
  "/rekap-bulanan": "Rekap Bulanan",
  "/riwayat-unduhan": "Riwayat & Unduh",
}

export function DynamicBreadcrumb() {
  const pathname = usePathname()

  // Ambil judul dari daftar mapping atau format otomatis dari slug URL
  const title =
    routeTitles[pathname] ||
    pathname
      .split("/")
      .filter(Boolean)
      .pop()
      ?.replace(/-/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase()) ||
    "Beranda"

  return (
    <Breadcrumb>
      <BreadcrumbItem className="hidden md:block">
        <BreadcrumbPage>{title}</BreadcrumbPage>
      </BreadcrumbItem>
    </Breadcrumb>
  )
}
