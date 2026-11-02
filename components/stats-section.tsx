"use client"

import * as React from "react"
import { Users, Activity, Clock, CheckCircle2 } from "lucide-react"
import { cn } from "cn"

export interface StatItem {
  id: string
  title: string
  badge: string
  value: number | string
  description: string
  color: "blue" | "green" | "yellow" | "red"
  icon: React.ReactNode
}

const colorStyles: Record<
  StatItem["color"],
  {
    container: string
    iconBg: string
    badge: string
    value: string
    description: string
  }
> = {
  blue: {
    container:
      "bg-[#BAE6FD] text-[#075985] border-[#7DD3FC] dark:bg-[#0C4A6E]/80 dark:text-[#E0F2FE] dark:border-[#0284C7]",
    iconBg: "bg-black/8 dark:bg-white/10 text-[#075985] dark:text-[#E0F2FE]",
    badge: "text-[#075985]/80 dark:text-[#E0F2FE]/80",
    value: "text-[#075985] dark:text-[#E0F2FE]",
    description: "text-[#075985]/85 dark:text-[#E0F2FE]/85",
  },
  red: {
    container:
      "bg-[#FECDD3] text-[#881337] border-[#FDA4AF] dark:bg-[#881337]/80 dark:text-[#FFE4E6] dark:border-[#E11D48]",
    iconBg: "bg-black/8 dark:bg-white/10 text-[#881337] dark:text-[#FFE4E6]",
    badge: "text-[#881337]/80 dark:text-[#FFE4E6]/80",
    value: "text-[#881337] dark:text-[#FFE4E6]",
    description: "text-[#881337]/85 dark:text-[#FFE4E6]/85",
  },
  yellow: {
    container:
      "bg-[#FEF08A] text-[#713F12] border-[#FDE047] dark:bg-[#713F12]/80 dark:text-[#FEF9C3] dark:border-[#CA8A04]",
    iconBg: "bg-black/8 dark:bg-white/10 text-[#713F12] dark:text-[#FEF9C3]",
    badge: "text-[#713F12]/80 dark:text-[#FEF9C3]/80",
    value: "text-[#713F12] dark:text-[#FEF9C3]",
    description: "text-[#713F12]/85 dark:text-[#FEF9C3]/85",
  },
  green: {
    container:
      "bg-[#BBF7D0] text-[#14532D] border-[#86EFAC] dark:bg-[#14532D]/80 dark:text-[#DCFCE7] dark:border-[#16A34A]",
    iconBg: "bg-black/8 dark:bg-white/10 text-[#14532D] dark:text-[#DCFCE7]",
    badge: "text-[#14532D]/80 dark:text-[#DCFCE7]/80",
    value: "text-[#14532D] dark:text-[#DCFCE7]",
    description: "text-[#14532D]/85 dark:text-[#DCFCE7]/85",
  },
}

const defaultStats: StatItem[] = [
  {
    id: "total_pasien",
    title: "Total Pasien",
    badge: "TOTAL PASIEN",
    value: 0,
    description: "Seluruh pasien dirawat di HCU",
    color: "blue",
    icon: <Users className="size-4" />,
  },
  {
    id: "perawatan_total",
    title: "Perawatan Total",
    badge: "PERAWATAN TOTAL",
    value: 0,
    description: "Pasien dengan ketergantungan penuh",
    color: "red",
    icon: <Activity className="size-4" />,
  },
  {
    id: "perawatan_parsial",
    title: "Perawatan Parsial",
    badge: "PERAWATAN PARSIAL",
    value: 0,
    description: "Pasien dengan bantuan sebagian",
    color: "yellow",
    icon: <Clock className="size-4" />,
  },
  {
    id: "perawatan_minimal",
    title: "Perawatan Minimal",
    badge: "PERAWATAN MINIMAL",
    value: 0,
    description: "Pasien mandiri / observasi ringan",
    color: "green",
    icon: <CheckCircle2 className="size-4" />,
  },
]

interface StatsSectionProps {
  stats?: StatItem[]
  className?: string
}

export function StatsSection({ stats, className }: StatsSectionProps) {
  const [liveStats, setLiveStats] = React.useState<StatItem[]>(defaultStats)

  React.useEffect(() => {
    if (stats) return
    try {
      const saved = localStorage.getItem("sp_hcu_patients")
      if (saved) {
        const patients: Array<{ status: string; careLevel: string }> = JSON.parse(saved)
        const active = patients.filter((p) => p.status === "aktif")
        const total = active.length
        const totalCare = active.filter((p) => p.careLevel === "total").length
        const partialCare = active.filter((p) => p.careLevel === "parsial").length
        const minimalCare = active.filter((p) => p.careLevel === "minimal").length

        queueMicrotask(() => {
          setLiveStats([
            {
              id: "total_pasien",
              title: "Total Pasien",
              badge: "TOTAL PASIEN",
              value: total,
              description: "Seluruh pasien dirawat di HCU",
              color: "blue",
              icon: <Users className="size-4" />,
            },
            {
              id: "perawatan_total",
              title: "Perawatan Total",
              badge: "PERAWATAN TOTAL",
              value: totalCare,
              description: "Pasien dengan ketergantungan penuh",
              color: "red",
              icon: <Activity className="size-4" />,
            },
            {
              id: "perawatan_parsial",
              title: "Perawatan Parsial",
              badge: "PERAWATAN PARSIAL",
              value: partialCare,
              description: "Pasien dengan bantuan sebagian",
              color: "yellow",
              icon: <Clock className="size-4" />,
            },
            {
              id: "perawatan_minimal",
              title: "Perawatan Minimal",
              badge: "PERAWATAN MINIMAL",
              value: minimalCare,
              description: "Pasien mandiri / observasi ringan",
              color: "green",
              icon: <CheckCircle2 className="size-4" />,
            },
          ])
        })
      }
    } catch {
      // Abaikan jika tidak didukung
    }
  }, [stats])

  const items = stats || liveStats

  return (
    <div
      className={cn(
        "grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3.5 lg:gap-4",
        className
      )}
    >
      {items.map((item) => {
        const theme = colorStyles[item.color]

        return (
          <div
            key={item.id}
            className={cn(
              "rounded-2xl p-3 sm:p-4.5 flex flex-col justify-between min-h-[100px] sm:min-h-[115px] border shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer select-none",
              theme.container
            )}
          >
            {/* Baris Atas: Ikon di kiri, Badge di kanan */}
            <div className="flex items-center justify-between gap-1">
              <div
                className={cn(
                  "flex items-center justify-center size-6.5 sm:size-8 rounded-lg shrink-0",
                  theme.iconBg
                )}
              >
                {item.icon}
              </div>
              <span
                className={cn(
                  "text-[9px] sm:text-[10px] md:text-[11px] font-bold tracking-wider uppercase text-right leading-tight",
                  theme.badge
                )}
              >
                {item.badge}
              </span>
            </div>

            {/* Bagian Tengah: Angka Statistik Besar */}
            <div className="mt-2 sm:mt-2.5">
              <span
                suppressHydrationWarning
                className={cn(
                  "text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight",
                  theme.value
                )}
              >
                {item.value}
              </span>
            </div>

            {/* Baris Bawah: Keterangan deskripsi */}
            <div className="mt-0.5 sm:mt-1">
              <span
                suppressHydrationWarning
                className={cn(
                  "text-[10px] sm:text-xs font-medium leading-tight",
                  theme.description
                )}
              >
                {item.description}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
