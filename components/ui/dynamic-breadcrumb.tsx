"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight } from "lucide-react"

const routeTitles: Record<string, string> = {
  "/beranda": "Beranda",
  "/kelola-pasien": "Kelola Pasien",
  "/kelola-alat": "Kelola Alat",
  "/kelola-alat/master-alat": "Master Alat",
  "/rekap": "Rekap",
  "/rekap/pasien": "Rekap Pasien",
  "/rekap/alat": "Rekap Alat",
  "/kelola-perawat": "Kelola Perawat",
  "/pengaturan-akun": "Pengaturan Akun",
}

export function DynamicBreadcrumb() {
  const pathname = usePathname()

  // Pecah path menjadi segmen: misal ["kelola-alat", "master-alat"]
  const segments = pathname.split("/").filter(Boolean)

  if (segments.length === 0) {
    return (
      <span className="text-white font-semibold text-xs sm:text-sm">
        Beranda
      </span>
    )
  }

  // Buat array breadcrumb berjenjang tanpa mutasi variabel luar
  const crumbs = segments.map((seg, idx) => {
    const href = "/" + segments.slice(0, idx + 1).join("/")
    const isLast = idx === segments.length - 1
    const title =
      routeTitles[href] ||
      seg.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())

    return {
      title,
      href,
      isLast,
    }
  })

  return (
    <nav aria-label="breadcrumb">
      <ol className="flex items-center gap-1.5 text-xs sm:text-sm">
        {crumbs.map((crumb, idx) => (
          <React.Fragment key={crumb.href}>
            {idx > 0 && (
              <li className="text-white/40 flex items-center" aria-hidden="true">
                <ChevronRight className="size-3.5" />
              </li>
            )}
            <li>
              {crumb.isLast ? (
                <span className="text-white font-semibold">
                  {crumb.title}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-white/70 hover:text-white transition-colors"
                >
                  {crumb.title}
                </Link>
              )}
            </li>
          </React.Fragment>
        ))}
      </ol>
    </nav>
  )
}
