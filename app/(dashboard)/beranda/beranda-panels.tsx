"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { ArrowRight, BedSingle, Stethoscope } from "lucide-react"
import { fetchPatientsFromDb } from "@/lib/services/pasien-service"
import { fetchTimedToolsFromDb } from "@/lib/services/alat-service"
import type { Patient } from "@/app/(dashboard)/kelola-pasien/page"
import type { TimedToolUsageRecord } from "@/app/(dashboard)/kelola-alat/page"
import { Skeleton } from "@/components/ui/skeleton"
import { LiveStopwatch, getStartDateStr } from "@/components/live-stopwatch"
import type { PeriodFilterState } from "@/lib/utils/period-filter"

const TOTAL_BED_CAPACITY = 21

export interface BerandaPanelsProps {
  patients?: Patient[]
  timedTools?: TimedToolUsageRecord[]
  filterState?: PeriodFilterState
  shift?: string
}

export function BerandaPanels({
  patients: propPatients,
  timedTools: propTimedTools,
}: BerandaPanelsProps = {}) {
  const [internalPatients, setInternalPatients] = useState<Patient[]>([])
  const [internalTimedTools, setInternalTimedTools] = useState<TimedToolUsageRecord[]>([])

  // Sinkronisasi data pasien & alat medis
  useEffect(() => {
    if (propPatients !== undefined && propTimedTools !== undefined) return

    let isMounted = true

    const fetchData = async () => {
      try {
        // 1. Pasien
        if (propPatients === undefined) {
          const resPasien = await fetchPatientsFromDb()
          if (!isMounted) return

          if (resPasien.isDbConnected) {
            setInternalPatients(resPasien.data)
            if (typeof window !== "undefined") {
              localStorage.setItem("sp_hcu_patients", JSON.stringify(resPasien.data))
            }
          } else {
            const saved = typeof window !== "undefined" ? localStorage.getItem("sp_hcu_patients") : null
            if (saved && isMounted) {
              const parsed = JSON.parse(saved)
              if (Array.isArray(parsed)) setInternalPatients(parsed)
            }
          }
        }

        // 2. Alat Waktu
        if (propTimedTools === undefined) {
          const resTimed = await fetchTimedToolsFromDb()
          if (!isMounted) return
          if (resTimed.isDbConnected) {
            setInternalTimedTools(resTimed.data)
          }
        }
      } catch (err) {
        console.warn("Gagal sinkronisasi data Beranda:", err)
      }
    }

    void fetchData()
    window.addEventListener("focus", fetchData)
    window.addEventListener("storage", fetchData)
    return () => {
      isMounted = false
      window.removeEventListener("focus", fetchData)
      window.removeEventListener("storage", fetchData)
    }
  }, [propPatients, propTimedTools])

  const effectivePatients = propPatients ?? internalPatients
  const effectiveTimedTools = propTimedTools ?? internalTimedTools

  // ==========================================
  // KALKULASI DATA PANEL KIRI (BOR & PASIEN)
  // ==========================================
  const activePatients = useMemo(() => {
    return effectivePatients.filter((p) => p.status === "aktif")
  }, [effectivePatients])

  const occupiedCount = activePatients.length
  const emptyCount = Math.max(0, TOTAL_BED_CAPACITY - occupiedCount)
  const borPercentage = Number(((occupiedCount / TOTAL_BED_CAPACITY) * 100).toFixed(1))
  const emptyPercentage = Number(((emptyCount / TOTAL_BED_CAPACITY) * 100).toFixed(1))

  const totalCareCount = useMemo(
    () => activePatients.filter((p) => p.careLevel === "total").length,
    [activePatients]
  )
  const partialCareCount = useMemo(
    () => activePatients.filter((p) => p.careLevel === "parsial").length,
    [activePatients]
  )
  const minimalCareCount = useMemo(
    () => activePatients.filter((p) => p.careLevel === "minimal").length,
    [activePatients]
  )

  const totalCarePct = occupiedCount > 0 ? Math.round((totalCareCount / occupiedCount) * 100) : 0
  const partialCarePct = occupiedCount > 0 ? Math.round((partialCareCount / occupiedCount) * 100) : 0
  const minimalCarePct =
    occupiedCount > 0
      ? Math.max(0, 100 - totalCarePct - partialCarePct)
      : 0

  // SVG Gauge calculation: radius 52, circumference ~326.7
  const gaugeRadius = 52
  const gaugeCircumference = 2 * Math.PI * gaugeRadius
  const gaugeDashoffset =
    gaugeCircumference - (borPercentage / 100) * gaugeCircumference

  // ==========================================
  // KALKULASI DATA PANEL KANAN (ALAT WAKTU AKTIF)
  // ==========================================
  const activeTimedTools = useMemo(() => {
    return effectiveTimedTools.filter((t) => t.status === "berjalan")
  }, [effectiveTimedTools])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* ========================================================================= */}
      {/* PANEL KIRI: Kapasitas Ruangan (BOR) & Proporsi Tingkat Perawatan Pasien  */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6 shadow-xs flex flex-col justify-between gap-6 transition-all">
        <div className="flex flex-col gap-5">
          {/* Header Panel Kiri */}
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
              Kapasitas Ruangan (BOR)
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Informasi persentase keterisian tempat tidur dan distribusi tingkat perawatan pasien
            </p>
          </div>

          {/* Kotak BOR Radial Gauge & Status Bed */}
          <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 sm:p-5 flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
            {/* Visual Donut Gauge */}
            <div className="relative flex items-center justify-center shrink-0">
              <svg viewBox="0 0 128 128" className="size-28 sm:size-32 rotate-[-90deg]">
                <circle
                  cx="64"
                  cy="64"
                  r={gaugeRadius}
                  stroke="currentColor"
                  strokeWidth="11"
                  fill="transparent"
                  className="text-muted/30"
                />
                <circle
                  cx="64"
                  cy="64"
                  r={gaugeRadius}
                  stroke="currentColor"
                  strokeWidth="11"
                  fill="transparent"
                  strokeDasharray={gaugeCircumference}
                  strokeDashoffset={gaugeDashoffset}
                  strokeLinecap="round"
                  className="text-[#512DA8] transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                  {borPercentage}%
                </span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  BOR HCU
                </span>
              </div>
            </div>

            {/* Status Angka Bed Terisi vs Bed Kosong */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 w-full">
              {/* Bed Terisi */}
              <div className="rounded-xl border border-border/60 bg-background p-3 sm:p-3.5 flex flex-col justify-between">
                <span className="text-[11px] sm:text-xs font-medium text-muted-foreground">
                  Bed Terisi
                </span>
                <div className="mt-1 flex flex-wrap items-baseline gap-1">
                  <span className="text-lg sm:text-2xl font-bold text-[#512DA8]">
                    {occupiedCount} Bed
                  </span>
                  <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground">
                    ({borPercentage}%)
                  </span>
                </div>
              </div>

              {/* Bed Kosong */}
              <div className="rounded-xl border border-border/60 bg-background p-3 sm:p-3.5 flex flex-col justify-between">
                <span className="text-[11px] sm:text-xs font-medium text-muted-foreground">
                  Bed Kosong
                </span>
                <div className="mt-1 flex flex-wrap items-baseline gap-1">
                  <span className="text-lg sm:text-2xl font-bold text-emerald-600">
                    {emptyCount} Bed
                  </span>
                  <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground">
                    ({emptyPercentage}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bagian Distribusi Tingkat Perawatan Pasien */}
          <div className="flex flex-col gap-3">
            <div>
              <h3 className="text-xs sm:text-sm font-semibold text-foreground">
                Distribusi Tingkat Perawatan Pasien
              </h3>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                Proporsi sebaran kategori tingkat perawatan pasien yang sedang dirawat
              </p>
            </div>

            {/* Stacked Horizontal Bar */}
            <div className="w-full h-3 rounded-full overflow-hidden bg-muted/40 flex">
              {occupiedCount > 0 ? (
                <>
                  <div
                    style={{ width: `${totalCarePct}%` }}
                    className="bg-[#FECDD3] transition-all duration-500"
                    title={`Perawatan Total: ${totalCareCount} pasien (${totalCarePct}%)`}
                  />
                  <div
                    style={{ width: `${partialCarePct}%` }}
                    className="bg-[#FEF08A] transition-all duration-500"
                    title={`Perawatan Parsial: ${partialCareCount} pasien (${partialCarePct}%)`}
                  />
                  <div
                    style={{ width: `${minimalCarePct}%` }}
                    className="bg-[#BBF7D0] transition-all duration-500"
                    title={`Perawatan Minimal: ${minimalCareCount} pasien (${minimalCarePct}%)`}
                  />
                </>
              ) : (
                <div className="w-full bg-muted/60" />
              )}
            </div>

            {/* Legend & Breakdown Ringkas - Responsif Mobile & Desktop */}
            <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1.5 sm:gap-y-2 text-[11px] sm:text-xs pt-1">
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-[#FDA4AF] shrink-0" />
                <span className="text-muted-foreground">
                  Perawatan Total:{" "}
                  <strong className="text-foreground font-semibold">
                    {totalCareCount}
                  </strong>{" "}
                  ({totalCarePct}%)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-[#FDE047] shrink-0" />
                <span className="text-muted-foreground">
                  Perawatan Parsial:{" "}
                  <strong className="text-foreground font-semibold">
                    {partialCareCount}
                  </strong>{" "}
                  ({partialCarePct}%)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-[#86EFAC] shrink-0" />
                <span className="text-muted-foreground">
                  Perawatan Minimal:{" "}
                  <strong className="text-foreground font-semibold">
                    {minimalCareCount}
                  </strong>{" "}
                  ({minimalCarePct}%)
                </span>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground/80 mt-1">
              Kapasitas Ruang HCU: 21 Tempat Tidur (19 Bed Reguler + 2 Ruang Isolasi)
            </p>
          </div>
        </div>

        {/* Tombol Aksi Panel Kiri */}
        <div className="pt-2 border-t border-border/50 flex justify-end">
          <Link
            href="/kelola-pasien"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#512DA8] hover:text-[#4527A0] hover:underline transition-colors"
          >
            Kelola Pasien <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PANEL KANAN: Pemantauan Alat Hitungan Waktu                               */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6 shadow-xs flex flex-col justify-between gap-6 transition-all">
        <div className="flex flex-col gap-4">
          {/* Header Panel Kanan */}
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
              Pemantauan Alat Hitungan Waktu
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Daftar alat medis hitungan waktu yang sedang aktif digunakan pada pasien
            </p>
          </div>

          {/* Daftar Alat Aktif */}
          <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
            {activeTimedTools.length > 0 ? (
              activeTimedTools.map((tool) => (
                <div
                  key={tool.id}
                  className="rounded-xl border border-[#BBF7D0] bg-background p-3.5 sm:p-4 flex flex-col gap-2.5 shadow-xs relative overflow-hidden"
                >
                  {/* Aksen Hijau Emerald di Sisi Kiri */}
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500" />

                  {/* Baris Atas: Nama Alat, Nomor Unit, & Status Aktif */}
                  <div className="flex items-center justify-between gap-2 pl-2">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className="font-bold text-sm sm:text-base text-foreground">
                        {tool.toolName}
                      </span>
                      {tool.unitNumber != null && (
                        <span className="text-xs font-bold text-[#512DA8] bg-[#F5F3FF] px-2 py-0.5 rounded-md border border-[#DDD6FE] shrink-0">
                          #{tool.unitNumber}
                        </span>
                      )}
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC] shrink-0">
                      <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Aktif
                    </span>
                  </div>

                  {/* Baris Khusus Pasien & Bed - Diberikan Ruang Penuh agar Nama Panjang Tidak Terpotong */}
                  <div className="flex items-center gap-2.5 pl-2 py-1.5 px-2.5 rounded-lg bg-neutral-50/80 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-[#512DA8] bg-[#F5F3FF] dark:bg-purple-950/60 dark:text-purple-300 border border-[#DDD6FE] dark:border-purple-800 px-2 py-0.5 rounded shrink-0">
                      <BedSingle className="size-3.5" />
                      {tool.bed}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-foreground truncate flex-1">
                      {tool.patientName || "Pasien tidak terdaftar"}
                    </span>
                  </div>

                  {/* Baris Bawah: Waktu Mulai, Perawat, dan Live Stopwatch */}
                  <div className="flex items-center justify-between gap-3 pl-2 pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2">
                        <span>
                          Tgl: <strong>{getStartDateStr(tool.startedAtTimestamp, tool.shiftKey)}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Mulai: <strong>{tool.startTimeStr} WIB</strong>
                        </span>
                      </div>
                      <span className="truncate">
                        Dipasang oleh:{" "}
                        <strong className="text-foreground font-medium">
                          {tool.nurseName || "-"}
                        </strong>
                      </span>
                      {(() => {
                        const cleanNote = tool.notes
                          ? tool.notes.replace(/__ACTION_LOGS__[\s\S]*?__END_ACTION_LOGS__/g, "").replace(/__STATUS_SELESAI__/g, "").trim()
                          : ""
                        if (!cleanNote) return null
                        return (
                          <span className="text-[10px] text-muted-foreground/80 italic truncate">
                            Catatan: {cleanNote}
                          </span>
                        )
                      })()}
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-0.5">
                      <LiveStopwatch
                        startedAtTimestamp={tool.startedAtTimestamp}
                        startTimeStr={tool.startTimeStr}
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-4 rounded-xl border border-dashed border-border/80 bg-muted/10 text-center">
                <div className="size-11 rounded-full bg-muted/40 flex items-center justify-center text-muted-foreground mb-2.5">
                  <Stethoscope className="size-5" />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  Tidak ada alat hitungan waktu yang sedang aktif
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Semua unit alat medis saat ini dalam kondisi standby atau telah selesai digunakan
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Tombol Aksi Panel Kanan */}
        <div className="pt-2 border-t border-border/50 flex justify-end">
          <Link
            href="/kelola-alat"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#512DA8] hover:text-[#4527A0] hover:underline transition-colors"
          >
            Kelola Alat <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}

export function BerandaPanelsSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Skeleton className="h-[460px] rounded-2xl" />
      <Skeleton className="h-[460px] rounded-2xl" />
    </div>
  )
}
