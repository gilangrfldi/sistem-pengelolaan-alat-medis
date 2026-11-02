"use client"

import * as React from "react"
import { BedSingle } from "lucide-react"
import { cn } from "@/lib/utils"

export const REGULAR_BEDS = Array.from({ length: 19 }, (_, i) => {
  const num = String(i + 1).padStart(2, "0")
  return `Bed ${num}`
})

export const ISOLATION_BEDS = ["Isolasi 1", "Isolasi 2"]
export const ALL_BEDS = [...REGULAR_BEDS, ...ISOLATION_BEDS]

export type BedVisualVariant = "available" | "occupied" | "empty"

export interface BedSelectorLegendLabels {
  available?: string
  occupied?: string
  disabled?: string
  selected?: string
}

export interface BedSelectorStatusTexts {
  available?: string
  disabled?: string
  selected?: string
}

export interface BedSelectorProps {
  /** Label header utama (misal: "Pilih Bed Pasien" atau "Denah Bed Ruang HCU"). Jika null, header tidak dirender */
  title?: React.ReactNode
  /** Menampilkan tanda bintang merah pada title */
  required?: boolean
  /** Subtitle atau info pendamping di samping title */
  subtitle?: React.ReactNode
  /** Gaya visual untuk bed yang terisi atau disabled: 'rose' (merah/pink), 'muted' (abu-abu pudar), atau 'green' (hijau segar seperti stat alat aktif) */
  occupiedStyle?: "rose" | "muted" | "green"
  /** Apakah menampilkan legenda di kanan atas (default: true) */
  showLegend?: boolean
  /** Kustomisasi label teks di legenda (Tersedia, Terisi/Kosong, Pilihan Anda) */
  legendLabels?: BedSelectorLegendLabels
  /** Kustomisasi teks status default pada tombol bed jika getBedStatusText tidak disediakan */
  bedStatusTexts?: BedSelectorStatusTexts
  /** Fungsi penentu apakah bed dalam kondisi terisi pasien */
  isBedOccupied?: (bed: string) => boolean
  /** Varian visual spesifik: 'occupied' (pink/terisi), 'empty' (abu-abu/kosong), 'available' (putih/tersedia) */
  getBedVariant?: (bed: string, state: { isSelected: boolean; isDisabled: boolean }) => BedVisualVariant
  /** Fungsi kustom untuk mendapatkan teks/elemen status pada tiap bed */
  getBedStatusText?: (bed: string, state: { isSelected: boolean; isDisabled: boolean }) => React.ReactNode
  /** Bed yang sedang terpilih */
  selectedBed: string | null
  /** Callback saat bed dipilih/diklik */
  onSelectBed: (bed: string) => void
  /** Fungsi penentu apakah bed dalam kondisi disabled (non-aktif) */
  isBedDisabled?: (bed: string) => boolean
  /** Tooltip (atribut title pada button) untuk tiap bed */
  getBedTooltip?: (bed: string, state: { isSelected: boolean; isDisabled: boolean }) => string
  /** Class kustom untuk grid kolom bed reguler (default: "grid-cols-4 sm:grid-cols-7") */
  columnsClass?: string
  /** Class kustom untuk wrapper luar */
  className?: string
  /** Class kustom untuk container dalam denah */
  innerClassName?: string
  /** Render kustom di area header kanan (menggantikan legenda default) */
  headerRight?: React.ReactNode
  /** Daftar bed reguler (opsional, default REGULAR_BEDS 01-19) */
  regularBeds?: string[]
  /** Daftar bed isolasi (opsional, default ISOLATION_BEDS 1-2) */
  isolationBeds?: string[]
}

export function BedSelector({
  title,
  required = false,
  subtitle,
  occupiedStyle = "rose",
  showLegend = true,
  legendLabels = {
    available: "Tersedia",
    disabled: "Terisi",
    selected: "Pilihan Anda",
  },
  bedStatusTexts = {
    available: "Tersedia",
    disabled: "Terisi",
    selected: "Pilihan",
  },
  isBedOccupied,
  getBedVariant,
  getBedStatusText,
  selectedBed,
  onSelectBed,
  isBedDisabled,
  getBedTooltip,
  columnsClass = "grid-cols-4 sm:grid-cols-7",
  className,
  innerClassName,
  headerRight,
  regularBeds = REGULAR_BEDS,
  isolationBeds = ISOLATION_BEDS,
}: BedSelectorProps) {
  const availableLegend = legendLabels.available ?? (legendLabels.occupied ? undefined : "Tersedia")
  const occupiedLegend =
    legendLabels.occupied ??
    (legendLabels.disabled && !legendLabels.disabled.toLowerCase().includes("kosong")
      ? legendLabels.disabled
      : undefined)
  const disabledLegend =
    legendLabels.disabled ??
    (legendLabels.occupied ? undefined : "Terisi")
  const selectedLegend = legendLabels.selected ?? "Pilihan Anda"

  const defaultAvailableText = bedStatusTexts.available ?? "Tersedia"
  const defaultDisabledText = bedStatusTexts.disabled ?? "Terisi"
  const defaultSelectedText = bedStatusTexts.selected ?? "Pilihan"

  const resolveVariant = (bed: string, isSelected: boolean, isDisabled: boolean): BedVisualVariant => {
    if (getBedVariant) {
      return getBedVariant(bed, { isSelected, isDisabled })
    }
    if (isBedOccupied?.(bed)) {
      return occupiedStyle === "muted" ? "empty" : "occupied"
    }
    if (isDisabled) {
      if (occupiedStyle === "muted" || (disabledLegend && disabledLegend.toLowerCase().includes("kosong"))) {
        return "empty"
      }
      return "occupied"
    }
    return "available"
  }

  const resolveStatus = (bed: string, isSelected: boolean, isDisabled: boolean) => {
    if (getBedStatusText) {
      return getBedStatusText(bed, { isSelected, isDisabled })
    }
    if (isSelected) return defaultSelectedText
    if (isDisabled) return defaultDisabledText
    return defaultAvailableText
  }

  const renderStatusSubtitle = (
    statusNode: React.ReactNode,
    isSelected: boolean,
    variant: BedVisualVariant
  ) => {
    if (typeof statusNode === "string") {
      return (
        <span
          className={cn(
            "mt-0.5 text-[9px] font-medium leading-none truncate max-w-full",
            isSelected
              ? "text-white/90 font-bold"
              : variant === "occupied"
              ? occupiedStyle === "green"
                ? "text-[#14532D] dark:text-[#86EFAC] font-semibold"
                : "text-rose-600 dark:text-rose-400 font-semibold"
              : variant === "empty"
              ? "text-neutral-400/80"
              : "text-emerald-600 dark:text-emerald-400 font-medium"
          )}
        >
          {statusNode}
        </span>
      )
    }
    return statusNode
  }

  const renderIsolationStatusSubtitle = (
    statusNode: React.ReactNode,
    isSelected: boolean,
    variant: BedVisualVariant
  ) => {
    if (typeof statusNode === "string") {
      return (
        <span
          className={cn(
            "text-[10px] font-medium leading-none shrink-0",
            isSelected
              ? "text-white/90 font-bold"
              : variant === "occupied"
              ? occupiedStyle === "green"
                ? "text-[#14532D] dark:text-[#86EFAC] font-semibold"
                : "text-rose-600 dark:text-rose-400 font-semibold"
              : variant === "empty"
              ? "text-neutral-400/80"
              : "text-emerald-600 dark:text-emerald-400 font-semibold"
          )}
        >
          {statusNode}
        </span>
      )
    }
    return statusNode
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Header Denah: Title & Legend */}
      {(title !== undefined || subtitle || headerRight || showLegend) && (
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div>
            {title && (
              <div className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1">
                <span>{title}</span>
                {required && <span className="text-red-500">*</span>}
              </div>
            )}
            {subtitle && (
              <div className="text-[11px] text-muted-foreground">{subtitle}</div>
            )}
          </div>

          {headerRight ?? (
            showLegend && (
              <div className="flex items-center gap-2.5 sm:gap-3 text-[10px] sm:text-[11px] select-none">
                {availableLegend && (
                  <span className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400">
                    <span className="size-2.5 rounded-full border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800" />
                    <span>{availableLegend}</span>
                  </span>
                )}
                {occupiedLegend && (
                  <span
                    className={cn(
                      "flex items-center gap-1.5 font-medium",
                      occupiedStyle === "muted"
                        ? "text-neutral-500 dark:text-neutral-400"
                        : occupiedStyle === "green"
                        ? "text-[#14532D] dark:text-[#86EFAC]"
                        : "text-rose-600 dark:text-rose-400"
                    )}
                  >
                    {occupiedStyle === "muted" ? (
                      <span className="size-2.5 rounded-full border border-neutral-300 bg-neutral-100 dark:bg-neutral-800/40 dark:border-neutral-700" />
                    ) : occupiedStyle === "green" ? (
                      <span className="size-2.5 rounded-full border border-[#86EFAC] bg-[#BBF7D0] dark:bg-[#14532D]/80 dark:border-[#16A34A]" />
                    ) : (
                      <span className="size-2.5 rounded-full border border-rose-300 bg-[#fee2e2] dark:bg-rose-950/70 dark:border-rose-800" />
                    )}
                    <span>{occupiedLegend}</span>
                  </span>
                )}
                {disabledLegend && (!occupiedLegend || disabledLegend.toLowerCase().includes("kosong")) && (
                  <span
                    className={cn(
                      "flex items-center gap-1.5 font-medium",
                      occupiedStyle === "muted" || disabledLegend.toLowerCase().includes("kosong")
                        ? "text-neutral-400 dark:text-neutral-500"
                        : "text-rose-600 dark:text-rose-400"
                    )}
                  >
                    {occupiedStyle === "muted" || disabledLegend.toLowerCase().includes("kosong") ? (
                      <span className="size-2.5 rounded-full border border-neutral-300 bg-neutral-100 dark:bg-neutral-800/40 dark:border-neutral-700" />
                    ) : (
                      <span className="size-2.5 rounded-full border border-rose-300 bg-[#fee2e2] dark:bg-rose-950/70 dark:border-rose-800" />
                    )}
                    <span>{disabledLegend}</span>
                  </span>
                )}
                {selectedLegend && (
                  <span className="flex items-center gap-1.5 text-[#512da8] dark:text-purple-300 font-semibold">
                    <span className="size-2.5 rounded-full bg-[#512da8]" />
                    <span>{selectedLegend}</span>
                  </span>
                )}
              </div>
            )
          )}
        </div>
      )}

      {/* Container Kotak Denah */}
      <div
        className={cn(
          "space-y-3 p-3 sm:p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30",
          innerClassName
        )}
      >
        {/* Section 1: Bed Reguler (01 – 19) */}
        <div>
          <div className="text-[11px] font-semibold text-muted-foreground mb-1.5">
            Bed Reguler (Bed 01 – Bed 19)
          </div>
          <div className={cn("grid gap-1.5 sm:gap-2", columnsClass)}>
            {regularBeds.map((bed) => {
              const isSelected = selectedBed === bed
              const isDisabled = Boolean(isBedDisabled?.(bed))
              const variant = resolveVariant(bed, isSelected, isDisabled)
              const statusNode = resolveStatus(bed, isSelected, isDisabled)
              const tooltip = getBedTooltip
                ? getBedTooltip(bed, { isSelected, isDisabled })
                : `${bed}: ${isDisabled ? (disabledLegend ?? "Terisi") : isSelected ? selectedLegend : (availableLegend ?? "Tersedia")}`

              return (
                <button
                  key={bed}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    if (!isDisabled) onSelectBed(bed)
                  }}
                  title={tooltip}
                  className={cn(
                    "relative flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-2xl border text-xs font-semibold transition-all select-none",
                    isSelected
                      ? "bg-[#512da8] text-white border-[#512da8] shadow-sm ring-2 ring-[#512da8]/30 cursor-pointer"
                      : variant === "occupied"
                      ? cn(
                          occupiedStyle === "green"
                            ? "bg-[#BBF7D0]/70 dark:bg-[#14532D]/40 border-[#86EFAC] dark:border-[#16A34A]/60 text-[#14532D] dark:text-[#DCFCE7]"
                            : "bg-[#fee2e2]/70 dark:bg-rose-950/40 border-[#fca5a5] dark:border-rose-800/60 text-rose-700 dark:text-rose-300",
                          isDisabled
                            ? "cursor-not-allowed opacity-90"
                            : occupiedStyle === "green"
                            ? "hover:bg-[#a7f3d0] hover:border-emerald-400 cursor-pointer shadow-2xs"
                            : "hover:bg-[#ffe4e6] hover:border-rose-400 cursor-pointer shadow-2xs"
                        )
                      : variant === "empty"
                      ? "opacity-40 cursor-not-allowed bg-neutral-100/60 dark:bg-neutral-800/20 border-neutral-200/60 dark:border-neutral-800/60 text-neutral-400 dark:text-neutral-500"
                      : "bg-white dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:border-[#512da8] cursor-pointer shadow-2xs"
                  )}
                >
                  <BedSingle
                    className={cn(
                      "size-4 mb-1",
                      isSelected
                        ? "text-white"
                        : variant === "occupied"
                        ? occupiedStyle === "green"
                          ? "text-[#14532D] dark:text-[#86EFAC]"
                          : "text-rose-500 dark:text-rose-400"
                        : variant === "empty"
                        ? "text-neutral-300 dark:text-neutral-600"
                        : "text-neutral-400"
                    )}
                  />
                  <span
                    className={cn(
                      "text-[11px] font-bold",
                      isSelected
                        ? "text-white"
                        : variant === "occupied"
                        ? occupiedStyle === "green"
                          ? "text-[#14532D] dark:text-[#DCFCE7]"
                          : "text-rose-700 dark:text-rose-300"
                        : variant === "empty"
                        ? "text-neutral-400 dark:text-neutral-500"
                        : "text-neutral-800 dark:text-neutral-200"
                    )}
                  >
                    {bed.replace("Bed ", "B-")}
                  </span>
                  {renderStatusSubtitle(statusNode, isSelected, variant)}
                </button>
              )
            })}
          </div>
        </div>

        {/* Section 2: Ruang Isolasi HCU */}
        <div>
          <div className="text-[11px] font-semibold text-muted-foreground mb-1.5">
            Ruang Isolasi HCU
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {isolationBeds.map((bed) => {
              const isSelected = selectedBed === bed
              const isDisabled = Boolean(isBedDisabled?.(bed))
              const variant = resolveVariant(bed, isSelected, isDisabled)
              const statusNode = resolveStatus(bed, isSelected, isDisabled)
              const tooltip = getBedTooltip
                ? getBedTooltip(bed, { isSelected, isDisabled })
                : `${bed}: ${isDisabled ? (disabledLegend ?? "Terisi") : isSelected ? selectedLegend : (availableLegend ?? "Tersedia")}`

              return (
                <button
                  key={bed}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    if (!isDisabled) onSelectBed(bed)
                  }}
                  title={tooltip}
                  className={cn(
                    "flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border text-xs font-semibold transition-all select-none",
                    isSelected
                      ? "bg-[#512da8] text-white border-[#512da8] shadow-sm ring-2 ring-[#512da8]/30 cursor-pointer"
                      : variant === "occupied"
                      ? cn(
                          occupiedStyle === "green"
                            ? "bg-[#BBF7D0]/70 dark:bg-[#14532D]/40 border-[#86EFAC] dark:border-[#16A34A]/60 text-[#14532D] dark:text-[#DCFCE7]"
                            : "bg-[#fee2e2]/70 dark:bg-rose-950/40 border-[#fca5a5] dark:border-rose-800/60 text-rose-700 dark:text-rose-300",
                          isDisabled
                            ? "cursor-not-allowed opacity-90"
                            : occupiedStyle === "green"
                            ? "hover:bg-[#a7f3d0] hover:border-emerald-400 cursor-pointer shadow-2xs"
                            : "hover:bg-[#ffe4e6] hover:border-rose-400 cursor-pointer shadow-2xs"
                        )
                      : variant === "empty"
                      ? "opacity-40 cursor-not-allowed bg-neutral-100/60 dark:bg-neutral-800/20 border-neutral-200/60 dark:border-neutral-800/60 text-neutral-400 dark:text-neutral-500"
                      : "bg-white dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:border-[#512da8] cursor-pointer shadow-2xs"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <BedSingle
                      className={cn(
                        "size-4 shrink-0",
                        isSelected
                          ? "text-white"
                          : variant === "occupied"
                          ? occupiedStyle === "green"
                            ? "text-[#14532D] dark:text-[#86EFAC]"
                            : "text-rose-500 dark:text-rose-400"
                          : variant === "empty"
                          ? "text-neutral-300 dark:text-neutral-600"
                          : "text-neutral-400"
                      )}
                    />
                    <span
                      className={cn(
                        "font-bold",
                        isSelected
                          ? "text-white"
                          : variant === "occupied"
                          ? occupiedStyle === "green"
                            ? "text-[#14532D] dark:text-[#DCFCE7]"
                            : "text-rose-700 dark:text-rose-300"
                          : variant === "empty"
                          ? "text-neutral-400 dark:text-neutral-500"
                          : "text-neutral-800 dark:text-neutral-200"
                      )}
                    >
                      {bed}
                    </span>
                  </div>
                  {renderIsolationStatusSubtitle(statusNode, isSelected, variant)}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
