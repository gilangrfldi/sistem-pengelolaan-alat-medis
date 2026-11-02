"use client"

import * as React from "react"
import { useState, useEffect, useMemo } from "react"
import {
  Download,
  Clock,
  Activity,
  AlertTriangle,
  Search,
  CheckCircle2,
  FileSpreadsheet,
  RotateCcw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { PeriodFilterBar } from "@/components/period-filter-bar"
import {
  PeriodFilterState,
  getInitialPeriodFilterState,
  getCurrentClientPeriodFilterState,
  getPeriodRange,
  isDateWithinPeriod,
} from "@/lib/utils/period-filter"
import { exportToCsv } from "@/lib/utils/csv-export"
import {
  fetchTimedToolsFromDb,
  fetchCountToolsFromDb,
  fetchDamagedToolsFromDb,
} from "@/lib/services/alat-service"
import type {
  TimedToolUsageRecord,
  CountToolUsageRecord,
  DamagedToolRecord,
} from "@/app/(dashboard)/kelola-alat/page"

type ToolTabKey = "waktu" | "kali" | "rusak"

export default function RekapAlatPage() {
  const [activeTab, setActiveTab] = useState<ToolTabKey>("waktu")
  const [filterState, setFilterState] = useState<PeriodFilterState>(getInitialPeriodFilterState())
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [downloadSuccessToast, setDownloadSuccessToast] = useState<string | null>(null)

  // Sinkronkan periode filter dengan waktu lokal pengguna di sisi klien
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilterState(getCurrentClientPeriodFilterState())
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  // Data Kategori Alat Medis dari Supabase (Hanya 2 Kategori Utama: Waktu & Kali, plus Alat Rusak)
  const [timedTools, setTimedTools] = useState<TimedToolUsageRecord[]>([])
  const [countTools, setCountTools] = useState<CountToolUsageRecord[]>([])
  const [damagedTools, setDamagedTools] = useState<DamagedToolRecord[]>([])

  // Ambil data seluruh kategori dari database
  useEffect(() => {
    let ignore = false
    async function loadAllToolData() {
      try {
        setLoading(true)
        const [resTimed, resCount, resDamaged] = await Promise.all([
          fetchTimedToolsFromDb(),
          fetchCountToolsFromDb(),
          fetchDamagedToolsFromDb(),
        ])

        if (!ignore) {
          if (resTimed.data) setTimedTools(resTimed.data)
          if (resCount.data) setCountTools(resCount.data)
          if (resDamaged.data) setDamagedTools(resDamaged.data)
        }
      } catch (err) {
        console.warn("Gagal memuat data alat medis untuk rekap:", err)
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    loadAllToolData()
    return () => {
      ignore = true
    }
  }, [])

  // 1. FILTER & AGREGASI ALAT WAKTU (HANYA ALAT SELESAI / DILEPAS)
  const aggregatedTimed = useMemo(() => {
    // Saring alat hitungan waktu yang statusnya sudah selesai dan masuk periode
    const finishedTools = timedTools.filter((t) => {
      if (t.status !== "selesai") return false
      const inPeriod = isDateWithinPeriod(t.endedAtTimestamp || t.startedAtTimestamp || t.shiftKey, filterState)
      return inPeriod
    })

    // Kelompokkan per alat & nomor unit / jenis anatomi / sentral
    const groupMap = new Map<string, {
      toolName: string
      unitDisplay: string
      unitNumber?: number
      frequency: number
      totalMinutes: number
    }>()

    finishedTools.forEach((t) => {
      const unitKey = t.unitNumber !== undefined
        ? `unit-${t.unitNumber}`
        : t.locations && t.locations.length > 0
        ? `loc-${t.locations.sort().join("-")}`
        : "sentral"
      const groupKey = `${t.toolName}___${unitKey}`

      const unitDisplay = t.unitNumber !== undefined
        ? `#${t.unitNumber}`
        : t.locations && t.locations.length > 0
        ? t.locations.join(", ")
        : "Sentral / Bebas"

      const existing = groupMap.get(groupKey)
      if (existing) {
        existing.frequency += 1
        existing.totalMinutes += (t.durationMinutes || 0)
      } else {
        groupMap.set(groupKey, {
          toolName: t.toolName,
          unitDisplay,
          unitNumber: t.unitNumber,
          frequency: 1,
          totalMinutes: t.durationMinutes || 0,
        })
      }
    })

    let list = Array.from(groupMap.values()).sort((a, b) => {
      if (a.toolName !== b.toolName) return a.toolName.localeCompare(b.toolName)
      return (a.unitNumber || 0) - (b.unitNumber || 0)
    })

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase()
      list = list.filter((item) =>
        item.toolName.toLowerCase().includes(q) || item.unitDisplay.toLowerCase().includes(q)
      )
    }

    return list
  }, [timedTools, filterState, searchTerm])

  // 2. FILTER & AGREGASI ALAT KALI (TINDAKAN MEDIS)
  const aggregatedCount = useMemo(() => {
    // Saring tindakan yang masuk periode
    const validTools = countTools.filter((t) => {
      if (t.createdAt && isDateWithinPeriod(t.createdAt, filterState)) return true
      if (t.lastActionTime && isDateWithinPeriod(t.lastActionTime, filterState)) return true
      return false
    })

    // Kelompokkan per nama tindakan & nomor unit
    const groupMap = new Map<string, {
      toolName: string
      unitNumber: string
      totalCount: number
    }>()

    validTools.forEach((t) => {
      const rawUnit = t.unitNumber !== undefined ? `#${t.unitNumber}` : "-"
      const groupKey = `${t.toolName}___${rawUnit}`

      const existing = groupMap.get(groupKey)
      if (existing) {
        existing.totalCount += (t.count || 1)
      } else {
        groupMap.set(groupKey, {
          toolName: t.toolName,
          unitNumber: rawUnit,
          totalCount: t.count || 1,
        })
      }
    })

    let list = Array.from(groupMap.values())
      .sort((a, b) => a.toolName.localeCompare(b.toolName))

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase()
      list = list.filter((item) =>
        item.toolName.toLowerCase().includes(q) || item.unitNumber.toLowerCase().includes(q)
      )
    }

    return list
  }, [countTools, filterState, searchTerm])

  // 3. FILTER ALAT RUSAK
  const filteredDamaged = useMemo(() => {
    return damagedTools.filter((t) => {
      const inPeriod = isDateWithinPeriod(t.reportDate, filterState)
      if (!inPeriod) return false
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        const matchName = t.toolName.toLowerCase().includes(q)
        const matchNotes = t.notes?.toLowerCase().includes(q)
        if (!matchName && !matchNotes) return false
      }
      return true
    })
  }, [damagedTools, filterState, searchTerm])

  // ----------------------------------------------------------------------------
  // FUNGSI UNDUH CSV SESUAI TAB YANG AKTIF
  // ----------------------------------------------------------------------------
  const handleDownloadActiveCategoryCsv = () => {
    const { label } = getPeriodRange(filterState)
    const timestampStr = new Date().toISOString().slice(0, 10)
    const periodMap = {
      harian: "Harian" as const,
      mingguan: "Mingguan" as const,
      bulanan: "Bulanan" as const,
      triwulan: "Triwulan" as const,
    }

    if (activeTab === "waktu") {
      const headers = [
        "No",
        "Nama Alat Medis",
        "Nomor Unit / Jenis",
        "Frekuensi Digunakan",
        "Total Durasi (Menit)",
        "Total Durasi (Jam:Menit)",
      ]
      const rows = aggregatedTimed.map((item, idx) => {
        const hrs = Math.floor(item.totalMinutes / 60)
        const mins = item.totalMinutes % 60
        return [
          idx + 1,
          item.toolName,
          item.unitDisplay,
          `${item.frequency}x`,
          item.totalMinutes,
          `${hrs} jam ${mins} menit`,
        ]
      })

      exportToCsv({
        fileName: `rekap_alat_hitungan_waktu_${filterState.periodType}_${timestampStr}.csv`,
        headers,
        rows,
        category: "Alat Waktu",
        periodType: periodMap[filterState.periodType],
        periodDetail: label,
      })
      setDownloadSuccessToast(`Rekap Alat Hitungan Waktu (${rows.length} unit) berhasil diunduh ke CSV.`)
    } else if (activeTab === "kali") {
      const headers = [
        "No",
        "Nama Tindakan / Prosedur Medis",
        "Nomor Unit",
        "Total Frekuensi Tindakan (Kali)",
      ]
      const rows = aggregatedCount.map((item, idx) => [
        idx + 1,
        item.toolName,
        item.unitNumber,
        `${item.totalCount}x`,
      ])

      exportToCsv({
        fileName: `rekap_alat_hitungan_kali_${filterState.periodType}_${timestampStr}.csv`,
        headers,
        rows,
        category: "Alat Kali",
        periodType: periodMap[filterState.periodType],
        periodDetail: label,
      })
      setDownloadSuccessToast(`Rekap Alat Hitungan Kali (${rows.length} tindakan) berhasil diunduh ke CSV.`)
    } else if (activeTab === "rusak") {
      const headers = [
        "No",
        "Nama Alat Medis",
        "Jumlah Unit Rusak",
        "Nomor Unit Fisik Rusak",
        "Tingkat Kerusakan",
        "Tanggal Laporan",
        "Dilaporkan Oleh",
        "Keterangan Kerusakan",
      ]
      const rows = filteredDamaged.map((t, idx) => [
        idx + 1,
        t.toolName,
        t.quantity,
        t.unitNumbers && t.unitNumbers.length > 0 ? t.unitNumbers.map((n) => `#${n}`).join(", ") : "-",
        t.severity === "rusak_berat"
          ? "Rusak Berat"
          : "Rusak Ringan",
        t.reportDate,
        t.reportedBy,
        t.notes || "-",
      ])

      exportToCsv({
        fileName: `rekap_alat_rusak_${filterState.periodType}_${timestampStr}.csv`,
        headers,
        rows,
        category: "Alat Rusak",
        periodType: periodMap[filterState.periodType],
        periodDetail: label,
      })
      setDownloadSuccessToast(`Rekap Alat Rusak (${rows.length} laporan) berhasil diunduh ke CSV.`)
    }

    setTimeout(() => setDownloadSuccessToast(null), 4000)
  }

  // Hitung total baris pada tab aktif
  const currentTabRowCount =
    activeTab === "waktu"
      ? aggregatedTimed.length
      : activeTab === "kali"
      ? aggregatedCount.length
      : filteredDamaged.length

  return (
    <div className="flex flex-col gap-6">
      {/* Header Utama & Tombol Unduh CSV */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Rekapitulasi Alat Medis HCU
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Rekap total alat hitungan waktu, frekuensi tindakan kali, dan inventaris alat rusak
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tombol Unduh Tab Aktif */}
          <button
            type="button"
            onClick={handleDownloadActiveCategoryCsv}
            disabled={currentTabRowCount === 0}
            className={cn(
              "flex items-center gap-2 bg-[#512da8] hover:bg-[#43238c] text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer select-none",
              currentTabRowCount === 0 && "opacity-50 cursor-not-allowed hover:bg-[#512da8]"
            )}
          >
            <Download className="size-4" />
            <span>
              Download CSV (
              {activeTab === "waktu"
                ? "Hitungan Waktu"
                : activeTab === "kali"
                ? "Hitungan Kali"
                : "Alat Rusak"}
              )
            </span>
            <span className="ml-1 px-1.5 py-0.2 bg-white/20 text-white rounded-full text-[10px] font-bold">
              {currentTabRowCount}
            </span>
          </button>
        </div>
      </div>

      {/* Toast Notifikasi Unduh */}
      {downloadSuccessToast && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
          <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{downloadSuccessToast}</span>
        </div>
      )}

      {/* Komponen Bar Filter Periode 4 Opsi (Harian, Mingguan, Bulanan, Triwulan) */}
      <PeriodFilterBar
        value={filterState}
        onChange={setFilterState}
        rightAction={
          <div className="flex items-center gap-2 text-xs">
            {/* Tab Navigasi Kategori */}
            <div className="flex items-center p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl select-none">
              <button
                type="button"
                onClick={() => setActiveTab("waktu")}
                className={cn(
                  "px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer",
                  activeTab === "waktu" ? "bg-white dark:bg-neutral-900 text-[#512da8] shadow-xs" : "text-muted-foreground hover:text-neutral-900"
                )}
              >
                Hitungan Waktu ({aggregatedTimed.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("kali")}
                className={cn(
                  "px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer",
                  activeTab === "kali" ? "bg-white dark:bg-neutral-900 text-emerald-700 shadow-xs" : "text-muted-foreground hover:text-neutral-900"
                )}
              >
                Hitungan Kali ({aggregatedCount.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("rusak")}
                className={cn(
                  "px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer",
                  activeTab === "rusak" ? "bg-white dark:bg-neutral-900 text-rose-700 shadow-xs" : "text-muted-foreground hover:text-neutral-900"
                )}
              >
                Alat Rusak ({filteredDamaged.length})
              </button>
            </div>
          </div>
        }
      />

      {/* Konten Tab Tabel Rekap Sesuai Kategori Aktif */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-2xs">
        {/* Header Tabel */}
        <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-sm text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              {activeTab === "waktu" && (
                <>
                  <Clock className="size-4 text-[#512da8]" />
                  <span>Rekap Total Alat Hitungan Waktu</span>
                </>
              )}
              {activeTab === "kali" && (
                <>
                  <Activity className="size-4 text-emerald-600" />
                  <span>Rekap Total Alat Hitungan Kali</span>
                </>
              )}
              {activeTab === "rusak" && (
                <>
                  <AlertTriangle className="size-4 text-rose-600" />
                  <span>Rekap Total Alat Rusak</span>
                </>
              )}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Data terfilter berdasarkan periode {filterState.periodType} yang dipilih
            </p>
          </div>

          {/* Kotak Pencarian */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari alat / unit..."
                className="h-8.5 pl-8 pr-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs focus:outline-none focus:ring-1 focus:ring-[#512da8] w-48 sm:w-60"
              />
            </div>

            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                title="Reset Pencarian"
                className="size-8.5 flex items-center justify-center rounded-lg border border-neutral-200 dark:border-neutral-700 text-muted-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <RotateCcw className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* TABEL 1: ALAT HITUNGAN WAKTU (AGREGASI UNIT SELESAI DIGUNAKAN) */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === "waktu" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800 text-muted-foreground font-semibold">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4">Nama Alat Medis</th>
                  <th className="py-3 px-4">Nomor Unit / Jenis</th>
                  <th className="py-3 px-4 text-center">Frekuensi Digunakan</th>
                  <th className="py-3 px-4 text-right">Total Durasi (Jam:Menit)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="size-6 border-2 border-[#512da8] border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs">Memuat data rekap hitungan waktu...</span>
                      </div>
                    </td>
                  </tr>
                ) : aggregatedTimed.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <FileSpreadsheet className="size-8 text-neutral-300 dark:text-neutral-600" />
                        <span className="text-xs font-semibold">Tidak ada riwayat alat hitungan waktu yang telah selesai pada periode ini.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  aggregatedTimed.map((item, idx) => {
                    const hrs = Math.floor(item.totalMinutes / 60)
                    const mins = item.totalMinutes % 60
                    return (
                      <tr key={`${item.toolName}-${item.unitDisplay}-${idx}`} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                        <td className="py-3 px-4 text-center font-medium text-muted-foreground">{idx + 1}</td>
                        <td className="py-3 px-4 font-bold text-neutral-900 dark:text-neutral-100">{item.toolName}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-neutral-900 text-white dark:bg-neutral-700">
                            {item.unitDisplay}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-[#512da8] border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300">
                            {item.frequency}x Digunakan
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-purple-100 text-[#512da8] dark:bg-purple-950/60 dark:text-purple-300">
                            {hrs} jam {mins} menit
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TABEL 2: ALAT HITUNGAN KALI (FREKUENSI TINDAKAN MEDIS) */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === "kali" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800 text-muted-foreground font-semibold">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4">Nama Tindakan / Prosedur Medis</th>
                  <th className="py-3 px-4">Nomor Unit</th>
                  <th className="py-3 px-4 text-right">Total Frekuensi Tindakan (Kali)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="size-6 border-2 border-[#512da8] border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs">Memuat data hitungan kali...</span>
                      </div>
                    </td>
                  </tr>
                ) : aggregatedCount.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <FileSpreadsheet className="size-8 text-neutral-300 dark:text-neutral-600" />
                        <span className="text-xs font-semibold">Tidak ada data hitungan kali pada periode ini.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  aggregatedCount.map((item, idx) => (
                    <tr key={`${item.toolName}-${item.unitNumber}-${idx}`} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                      <td className="py-3 px-4 text-center font-medium text-muted-foreground">{idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-neutral-900 dark:text-neutral-100">{item.toolName}</td>
                      <td className="py-3 px-4">
                        <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                          {item.unitNumber}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50">
                          {item.totalCount} Kali
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TABEL 4: ALAT RUSAK (MAINTENANCE) */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === "rusak" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800 text-muted-foreground font-semibold">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4">Nama Alat Medis</th>
                  <th className="py-3 px-4 text-center">Jumlah Rusak</th>
                  <th className="py-3 px-4">Nomor Unit Fisik</th>
                  <th className="py-3 px-4">Tingkat Kerusakan</th>
                  <th className="py-3 px-4">Tanggal Lapor & Pelapor</th>
                  <th className="py-3 px-4">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="size-6 border-2 border-[#512da8] border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs">Memuat data alat rusak...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredDamaged.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <FileSpreadsheet className="size-8 text-neutral-300 dark:text-neutral-600" />
                        <span className="text-xs font-semibold">Tidak ada laporan alat rusak pada periode ini.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredDamaged.map((t, idx) => (
                    <tr key={t.id || idx} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                      <td className="py-3 px-4 text-center font-medium text-muted-foreground">{idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-neutral-900 dark:text-neutral-100">{t.toolName}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50">
                          {t.quantity} Unit
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {t.unitNumbers && t.unitNumbers.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {t.unitNumbers.map((num) => (
                              <span key={num} className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-neutral-900 text-white dark:bg-neutral-700">
                                #{num}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">Tanpa Nomor Unit</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border",
                            t.severity === "rusak_berat"
                              ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300"
                              : "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300"
                          )}
                        >
                          {t.severity === "rusak_berat"
                            ? "Rusak Berat"
                            : "Rusak Ringan"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-neutral-800 dark:text-neutral-200">{t.reportDate}</div>
                        <div className="text-[11px] text-muted-foreground">Oleh: {t.reportedBy}</div>
                      </td>
                      <td className="py-3 px-4 text-xs text-neutral-600 dark:text-neutral-400">
                        {t.notes || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
