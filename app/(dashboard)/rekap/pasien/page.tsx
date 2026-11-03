"use client"

import * as React from "react"
import { useState, useEffect, useMemo, useSyncExternalStore } from "react"
import {
  Download,
  Users,
  UserCheck,
  LogOut,
  Activity,
  Search,
  RotateCcw,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Filter,
  Calendar,
  BedSingle,
  User,
  Trash2,
  AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { PeriodFilterBar } from "@/components/period-filter-bar"
import {
  PeriodFilterState,
  getInitialPeriodFilterState,
  getCurrentClientPeriodFilterState,
  getPeriodRange,
  isDateWithinPeriod,
  parseAnyDate,
} from "@/lib/utils/period-filter"
import { exportToCsv } from "@/lib/utils/csv-export"
import { fetchPatientsFromDb, deleteAllPatientsInDb } from "@/lib/services/pasien-service"
import { AppModal } from "@/components/app-modal"
import type { Patient } from "@/app/(dashboard)/kelola-pasien/page"

export default function RekapPasienPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [filterState, setFilterState] = useState<PeriodFilterState>(getInitialPeriodFilterState())
  const [activeTab, setActiveTab] = useState<"aktif" | "keluar">("aktif")
  const [careFilter, setCareFilter] = useState<"semua" | "total" | "parsial" | "minimal">("semua")
  const [searchTerm, setSearchTerm] = useState("")
  const [downloadSuccessToast, setDownloadSuccessToast] = useState<string | null>(null)

  // State Hak Akses Pengelola & Modal Hapus Total Pasien
  const currentUserRole = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("storage", onStoreChange)
      return () => window.removeEventListener("storage", onStoreChange)
    },
    () => {
      if (typeof window === "undefined") return "perawat"
      return localStorage.getItem("sp_current_user_role") || "perawat"
    },
    () => "perawat"
  )
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false)
  const [deleteCountdown, setDeleteCountdown] = useState(5)
  const [isDeletingAll, setIsDeletingAll] = useState(false)
  const [deleteSuccessToast, setDeleteSuccessToast] = useState<string | null>(null)
  const isPengelola = currentUserRole === "pengelola"

  // Countdown timer 5 detik saat modal konfirmasi hapus terbuka
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (showDeleteAllModal && deleteCountdown > 0) {
      timer = setTimeout(() => {
        setDeleteCountdown((prev) => prev - 1)
      }, 1000)
    }
    return () => clearTimeout(timer)
  }, [showDeleteAllModal, deleteCountdown])

  const handleOpenDeleteAllModal = () => {
    setDeleteCountdown(5)
    setShowDeleteAllModal(true)
  }

  const handleConfirmDeleteAll = async () => {
    if (deleteCountdown > 0 || isDeletingAll) return
    setIsDeletingAll(true)
    try {
      await deleteAllPatientsInDb()
      setPatients([])
      setShowDeleteAllModal(false)
      setDeleteSuccessToast("Seluruh data rekap pasien berhasil dihapus total dari database.")
      setTimeout(() => setDeleteSuccessToast(null), 5000)
    } catch (err) {
      console.error("Gagal menghapus data pasien:", err)
      alert("Gagal menghapus data pasien dari database.")
    } finally {
      setIsDeletingAll(false)
    }
  }

  // Sinkronkan periode filter dengan waktu lokal pengguna di sisi klien
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilterState(getCurrentClientPeriodFilterState())
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  // Ambil data pasien dari database Supabase
  useEffect(() => {
    let ignore = false
    async function loadData() {
      try {
        setLoading(true)
        const res = await fetchPatientsFromDb()
        if (!ignore && res.data) {
          setPatients(res.data)
        }
      } catch (err) {
        console.warn("Gagal memuat pasien untuk rekap:", err)
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    loadData()
    return () => {
      ignore = true
    }
  }, [])

  // Filter pasien sesuai periode yang aktif (Perhitungan sensus perawatan rawat inap HCU)
  const periodPatients = useMemo(() => {
    const { start, end } = getPeriodRange(filterState)

    return patients.filter((pt) => {
      const admDate = parseAnyDate(pt.admissionDate)
      if (!admDate) {
        return isDateWithinPeriod(pt.admissionDate, filterState)
      }

      // Pasien harus masuk sebelum atau pada akhir periode yang dipilih
      if (admDate.getTime() > end.getTime()) return false

      if (pt.status === "aktif" || !pt.dischargeDate) {
        // Pasien aktif: sedang dirawat, masuk hitungan jika admissionDate <= akhir periode
        return true
      } else {
        // Pasien keluar: harus keluar pada atau setelah awal periode
        const disDate = parseAnyDate(pt.dischargeDate)
        if (!disDate) return false
        return disDate.getTime() >= start.getTime()
      }
    })
  }, [patients, filterState])

  // Kalkulasi statistik ringkasan (urutan: Total Pasien | Perawatan Total | Perawatan Parsial | Perawatan Minimal | Pasien Aktif | Pasien Keluar)
  const stats = useMemo(() => {
    const total = periodPatients.length
    const totalCare = periodPatients.filter((p) => p.careLevel === "total").length
    const partialCare = periodPatients.filter((p) => p.careLevel === "parsial").length
    const minimalCare = periodPatients.filter((p) => p.careLevel === "minimal").length
    const active = periodPatients.filter((p) => p.status === "aktif").length
    const discharged = periodPatients.filter((p) => p.status === "keluar").length

    return { total, totalCare, partialCare, minimalCare, active, discharged }
  }, [periodPatients])

  // Data pasien yang ditampilkan berdasarkan tab aktif, filter perawatan, dan pencarian
  const displayedPatients = useMemo(() => {
    return periodPatients.filter((pt) => {
      // 1. Tab aktif vs keluar
      if (activeTab === "aktif" && pt.status !== "aktif") return false
      if (activeTab === "keluar" && pt.status !== "keluar") return false

      // 2. Filter tingkat ketergantungan
      if (careFilter !== "semua" && pt.careLevel !== careFilter) return false

      // 3. Pencarian nama / RM / Bed
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        const matchName = pt.name.toLowerCase().includes(q)
        const matchRm = pt.rm.toLowerCase().includes(q)
        const matchBed = pt.bed.toLowerCase().includes(q)
        if (!matchName && !matchRm && !matchBed) return false
      }

      return true
    })
  }, [periodPatients, activeTab, careFilter, searchTerm])

  // Hitung jumlah untuk masing-masing tab
  const activeCount = useMemo(() => {
    return periodPatients.filter((p) => p.status === "aktif").length
  }, [periodPatients])

  const dischargedCount = useMemo(() => {
    return periodPatients.filter((p) => p.status === "keluar").length
  }, [periodPatients])

  // Definisi 6 Card Statistik Sesuai Urutan dan Gaya Image 3 / StatsSection
  const cardItems = [
    {
      id: "total_pasien",
      title: "Total Pasien",
      badge: "TOTAL PASIEN",
      value: stats.total,
      description: "Seluruh pasien periode ini",
      containerClass:
        "bg-[#BAE6FD] text-[#075985] border-[#7DD3FC] dark:bg-[#0C4A6E]/80 dark:text-[#E0F2FE] dark:border-[#0284C7]",
      iconBg: "bg-black/8 dark:bg-white/10 text-[#075985] dark:text-[#E0F2FE]",
      badgeClass: "text-[#075985]/80 dark:text-[#E0F2FE]/80",
      valueClass: "text-[#075985] dark:text-[#E0F2FE]",
      descClass: "text-[#075985]/85 dark:text-[#E0F2FE]/85",
      icon: <Users className="size-4" />,
    },
    {
      id: "perawatan_total",
      title: "Perawatan Total",
      badge: "PERAWATAN TOTAL",
      value: stats.totalCare,
      description: "Ketergantungan penuh",
      containerClass:
        "bg-[#FECDD3] text-[#881337] border-[#FDA4AF] dark:bg-[#881337]/80 dark:text-[#FFE4E6] dark:border-[#E11D48]",
      iconBg: "bg-black/8 dark:bg-white/10 text-[#881337] dark:text-[#FFE4E6]",
      badgeClass: "text-[#881337]/80 dark:text-[#FFE4E6]/80",
      valueClass: "text-[#881337] dark:text-[#FFE4E6]",
      descClass: "text-[#881337]/85 dark:text-[#FFE4E6]/85",
      icon: <Activity className="size-4" />,
    },
    {
      id: "perawatan_parsial",
      title: "Perawatan Parsial",
      badge: "PERAWATAN PARSIAL",
      value: stats.partialCare,
      description: "Bantuan sebagian",
      containerClass:
        "bg-[#FEF08A] text-[#713F12] border-[#FDE047] dark:bg-[#713F12]/80 dark:text-[#FEF9C3] dark:border-[#CA8A04]",
      iconBg: "bg-black/8 dark:bg-white/10 text-[#713F12] dark:text-[#FEF9C3]",
      badgeClass: "text-[#713F12]/80 dark:text-[#FEF9C3]/80",
      valueClass: "text-[#713F12] dark:text-[#FEF9C3]",
      descClass: "text-[#713F12]/85 dark:text-[#FEF9C3]/85",
      icon: <Clock className="size-4" />,
    },
    {
      id: "perawatan_minimal",
      title: "Perawatan Minimal",
      badge: "PERAWATAN MINIMAL",
      value: stats.minimalCare,
      description: "Mandiri / observasi ringan",
      containerClass:
        "bg-[#BBF7D0] text-[#14532D] border-[#86EFAC] dark:bg-[#14532D]/80 dark:text-[#DCFCE7] dark:border-[#16A34A]",
      iconBg: "bg-black/8 dark:bg-white/10 text-[#14532D] dark:text-[#DCFCE7]",
      badgeClass: "text-[#14532D]/80 dark:text-[#DCFCE7]/80",
      valueClass: "text-[#14532D] dark:text-[#DCFCE7]",
      descClass: "text-[#14532D]/85 dark:text-[#DCFCE7]/85",
      icon: <CheckCircle2 className="size-4" />,
    },
    {
      id: "pasien_aktif",
      title: "Pasien Aktif",
      badge: "PASIEN AKTIF",
      value: stats.active,
      description: "Sedang dirawat di HCU",
      containerClass:
        "bg-[#A7F3D0] text-[#065F46] border-[#6EE7B7] dark:bg-[#065F46]/80 dark:text-[#D1FAE5] dark:border-[#059669]",
      iconBg: "bg-black/8 dark:bg-white/10 text-[#065F46] dark:text-[#D1FAE5]",
      badgeClass: "text-[#065F46]/80 dark:text-[#D1FAE5]/80",
      valueClass: "text-[#065F46] dark:text-[#D1FAE5]",
      descClass: "text-[#065F46]/85 dark:text-[#D1FAE5]/85",
      icon: <UserCheck className="size-4" />,
    },
    {
      id: "pasien_keluar",
      title: "Pasien Keluar",
      badge: "PASIEN KELUAR",
      value: stats.discharged,
      description: "Pindah ruangan / BLPL",
      containerClass:
        "bg-[#E9D5FF] text-[#581C87] border-[#D8B4FE] dark:bg-[#581C87]/80 dark:text-[#F3E8FF] dark:border-[#9333EA]",
      iconBg: "bg-black/8 dark:bg-white/10 text-[#581C87] dark:text-[#F3E8FF]",
      badgeClass: "text-[#581C87]/80 dark:text-[#F3E8FF]/80",
      valueClass: "text-[#581C87] dark:text-[#F3E8FF]",
      descClass: "text-[#581C87]/85 dark:text-[#F3E8FF]/85",
      icon: <LogOut className="size-4" />,
    },
  ]

  // Fungsi Unduh CSV Sesuai Tab Aktif
  const handleDownloadCsv = () => {
    const { label } = getPeriodRange(filterState)
    const timestampStr = new Date().toISOString().slice(0, 10)
    const fileName = `rekap_pasien_${activeTab}_${filterState.periodType}_${timestampStr}.csv`

    const periodTypeMap = {
      harian: "Harian" as const,
      mingguan: "Mingguan" as const,
      bulanan: "Bulanan" as const,
      triwulan: "Triwulan" as const,
    }

    if (activeTab === "aktif") {
      const headers = [
        "No",
        "Nama Pasien",
        "Jenis Kelamin",
        "No Rekam Medis (RM)",
        "Nomor Bed",
        "Tingkat Ketergantungan",
        "Tanggal Masuk",
        "Jam Masuk",
        "Shift Masuk",
        "Perawat Penanggung Jawab",
      ]
      const rows = displayedPatients.map((p, idx) => [
        idx + 1,
        p.name,
        p.gender === "L" ? "Laki-laki" : "Perempuan",
        p.rm,
        p.bed,
        p.careLevel === "total" ? "Total Care" : p.careLevel === "parsial" ? "Partial Care" : "Minimal Care",
        p.admissionDate,
        p.admissionTime,
        p.admissionShiftKey || "-",
        p.nurseName || "-",
      ])

      exportToCsv({
        fileName,
        headers,
        rows,
        category: "Rekap Pasien",
        periodType: periodTypeMap[filterState.periodType],
        periodDetail: label,
      })
    } else {
      const headers = [
        "No",
        "Nama Pasien",
        "Jenis Kelamin",
        "No Rekam Medis (RM)",
        "Nomor Bed Terakhir",
        "Tingkat Ketergantungan",
        "Tanggal Masuk",
        "Tanggal Keluar",
        "Jam Keluar",
        "Alasan Keluar",
        "Perawat Penanggung Jawab",
      ]
      const rows = displayedPatients.map((p, idx) => [
        idx + 1,
        p.name,
        p.gender === "L" ? "Laki-laki" : "Perempuan",
        p.rm,
        p.bed,
        p.careLevel === "total" ? "Total Care" : p.careLevel === "parsial" ? "Partial Care" : "Minimal Care",
        p.admissionDate,
        p.dischargeDate || "-",
        p.dischargeTime || "-",
        p.dischargeReason || "-",
        p.nurseName || "-",
      ])

      exportToCsv({
        fileName,
        headers,
        rows,
        category: "Rekap Pasien",
        periodType: periodTypeMap[filterState.periodType],
        periodDetail: label,
      })
    }

    setDownloadSuccessToast(
      `Rekap pasien ${activeTab === "aktif" ? "aktif" : "keluar"} (${displayedPatients.length} baris) berhasil diunduh ke CSV.`
    )
    setTimeout(() => setDownloadSuccessToast(null), 4000)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header Utama & Tombol Unduh CSV */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Rekapitulasi Pasien HCU
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Laporan sensus dan tingkat ketergantungan pasien periode harian, mingguan, bulanan, dan triwulan
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tombol Hapus Seluruh Pasien - KHUSUS PENGELOLA */}
          {isPengelola && (
            <button
              type="button"
              onClick={handleOpenDeleteAllModal}
              disabled={patients.length === 0}
              className={cn(
                "flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer w-fit select-none",
                patients.length === 0 && "opacity-50 cursor-not-allowed hover:bg-red-600"
              )}
            >
              <Trash2 className="size-4" />
              <span>Hapus Rekap Pasien</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleDownloadCsv}
            disabled={displayedPatients.length === 0}
            className={cn(
              "flex items-center gap-2 bg-[#512da8] hover:bg-[#43238c] text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer w-fit select-none",
              displayedPatients.length === 0 && "opacity-50 cursor-not-allowed hover:bg-[#512da8]"
            )}
          >
            <Download className="size-4" />
            <span>
              Download Rekap CSV ({activeTab === "aktif" ? "Pasien Aktif" : "Pasien Keluar"})
            </span>
            <span className="ml-1 px-1.5 py-0.2 bg-white/20 text-white rounded-full text-[10px] font-bold">
              {displayedPatients.length}
            </span>
          </button>
        </div>
      </div>

      {/* Toast Notifikasi Berhasil Hapus / Unduh */}
      {deleteSuccessToast && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 text-xs font-semibold">
          <CheckCircle2 className="size-4 shrink-0 text-red-600 dark:text-red-400" />
          <span>{deleteSuccessToast}</span>
        </div>
      )}

      {/* Toast Notifikasi Unduh */}
      {downloadSuccessToast && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
          <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{downloadSuccessToast}</span>
        </div>
      )}

      {/* 1. KARTU STATISTIK REKAP PASIEN (DI ATAS FILTER) */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {cardItems.map((item) => (
          <div
            key={item.id}
            className={cn(
              "rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between min-h-[110px] sm:min-h-[120px] border shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md select-none",
              item.containerClass
            )}
          >
            {/* Baris Atas: Ikon di kiri, Badge di kanan */}
            <div className="flex items-center justify-between">
              <div
                className={cn(
                  "flex items-center justify-center size-7 sm:size-8 rounded-lg",
                  item.iconBg
                )}
              >
                {item.icon}
              </div>
              <span
                className={cn(
                  "text-[10px] sm:text-[11px] font-bold tracking-wider uppercase",
                  item.badgeClass
                )}
              >
                {item.badge}
              </span>
            </div>

            {/* Bagian Tengah: Angka Statistik Besar */}
            <div className="mt-2.5 sm:mt-3">
              <span
                suppressHydrationWarning
                className={cn(
                  "text-2xl sm:text-3xl font-extrabold tracking-tight",
                  item.valueClass
                )}
              >
                {item.value}
              </span>
            </div>

            {/* Baris Bawah: Keterangan deskripsi */}
            <div className="mt-1">
              <span
                suppressHydrationWarning
                className={cn(
                  "text-[11px] sm:text-xs font-medium leading-tight",
                  item.descClass
                )}
              >
                {item.description}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* 2. KOMPONEN BAR FILTER PERIODE (DI BAWAH KARTU STATISTIK) */}
      <PeriodFilterBar
        value={filterState}
        onChange={setFilterState}
      />

      {/* 3. TABEL DATA REKAP PASIEN DENGAN TAB SEGMENTED CONTROL */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-2xs">
        {/* Header Tabel dengan Tab Aktif vs Keluar & Filter Pencarian */}
        <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Segmented Control untuk Tab Pasien Aktif vs Keluar (Sesuai Image 2) */}
          <div className="flex p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800 gap-1 w-fit select-none">
            <button
              type="button"
              onClick={() => setActiveTab("aktif")}
              className={cn(
                "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer",
                activeTab === "aktif"
                  ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span>Pasien Aktif</span>
              <span className="px-1.5 py-0.2 rounded-full text-[11px] font-bold bg-[#512da8]/15 text-[#512da8] dark:bg-purple-900/60 dark:text-purple-200">
                {activeCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("keluar")}
              className={cn(
                "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer",
                activeTab === "keluar"
                  ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span>Pasien Keluar (BLPL)</span>
              <span className="px-1.5 py-0.2 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-200">
                {dischargedCount}
              </span>
            </button>
          </div>

          {/* Kotak Pencarian & Filter Perawatan (Sesuai Image 2) */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-56">
              <Search className="size-4 absolute left-3 top-2.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cari nama, RM, bed..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs sm:text-sm h-9 border rounded-lg bg-background border-border w-full focus:outline-[#512da8]"
              />
            </div>

            <div className="flex items-center gap-1.5 border rounded-lg px-2 sm:px-2.5 h-9 text-xs sm:text-sm bg-background border-border shrink-0">
              <Filter className="size-3.5 text-muted-foreground shrink-0" />
              <select
                value={careFilter}
                onChange={(e) => setCareFilter(e.target.value as "semua" | "total" | "parsial" | "minimal")}
                className="bg-transparent border-none outline-none text-xs sm:text-sm cursor-pointer"
              >
                <option value="semua">Semua Perawatan</option>
                <option value="total">Perawatan Total</option>
                <option value="parsial">Perawatan Parsial</option>
                <option value="minimal">Perawatan Minimal</option>
              </select>
            </div>

            {(searchTerm || careFilter !== "semua") && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("")
                  setCareFilter("semua")
                }}
                title="Reset Filter"
                className="size-9 flex items-center justify-center rounded-lg border border-neutral-200 dark:border-neutral-700 text-muted-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer shrink-0"
              >
                <RotateCcw className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Tabel Data Pasien */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800 text-muted-foreground font-semibold">
              <tr>
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">Tgl Masuk</th>
                <th className="py-3 px-4">Nama & No. RM</th>
                <th className="py-3 px-4">{activeTab === "aktif" ? "Bed" : "Bed Terakhir"}</th>
                <th className="py-3 px-4">Perawatan</th>
                {activeTab === "keluar" && <th className="py-3 px-4">Tgl & Alasan Keluar</th>}
                <th className="py-3 px-4">Perawat PJ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {loading ? (
                <tr>
                  <td colSpan={activeTab === "keluar" ? 7 : 6} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="size-6 border-2 border-[#512da8] border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs">Memuat data rekap sensus pasien...</span>
                    </div>
                  </td>
                </tr>
              ) : displayedPatients.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === "keluar" ? 7 : 6} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileSpreadsheet className="size-8 text-neutral-300 dark:text-neutral-600" />
                      <span className="text-xs font-semibold">
                        Tidak ada data pasien {activeTab === "aktif" ? "aktif" : "keluar"} pada periode ini.
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Coba ubah filter periode (Harian, Mingguan, Bulanan, Triwulan) di atas.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                displayedPatients.map((pt, idx) => {
                  const careBadge =
                    pt.careLevel === "total" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50">
                        <Activity className="size-3 text-rose-600 dark:text-rose-400" />
                        Perawatan Total
                      </span>
                    ) : pt.careLevel === "parsial" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50">
                        <Clock className="size-3 text-amber-600 dark:text-amber-400" />
                        Perawatan Parsial
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50">
                        <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />
                        Perawatan Minimal
                      </span>
                    )

                  return (
                    <tr
                      key={pt.id || idx}
                      className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors"
                    >
                      <td className="py-3 px-4 text-center font-medium text-muted-foreground">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-medium text-neutral-800 dark:text-neutral-200">
                          <Calendar className="size-3.5 text-muted-foreground shrink-0" />
                          <span>{pt.admissionDate}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground ml-5">{pt.admissionTime} WIB</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-neutral-900 dark:text-neutral-100">{pt.name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {pt.rm} • {pt.gender === "L" ? "Laki-laki" : "Perempuan"}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#512da8]/10 text-[#512da8] border border-[#512da8]/20 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/50">
                          <BedSingle className="size-3.5 shrink-0" />
                          {pt.bed}
                        </span>
                      </td>
                      <td className="py-3 px-4">{careBadge}</td>
                      {activeTab === "keluar" && (
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 font-medium text-rose-600 dark:text-rose-400 text-xs">
                            <LogOut className="size-3.5 shrink-0" />
                            <span>
                              {pt.dischargeDate || "-"} ({pt.dischargeTime || "-"} WIB)
                            </span>
                          </div>
                          {pt.dischargeReason && (
                            <div className="text-[11px] text-muted-foreground ml-5">
                              {pt.dischargeReason}
                            </div>
                          )}
                        </td>
                      )}
                      <td className="py-3 px-4 text-neutral-700 dark:text-neutral-300 text-xs">
                        <div className="flex items-center gap-1.5">
                          <User className="size-3.5 text-muted-foreground shrink-0" />
                          <span>{pt.nurseName || "-"}</span>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Tabel Rekap Pasien */}
        {!loading && displayedPatients.length > 0 && (
          <div className="p-3.5 border-t border-neutral-100 dark:border-neutral-800 text-xs text-muted-foreground flex items-center justify-between">
            <span>
              Menampilkan <strong>{displayedPatients.length}</strong> pasien{" "}
              {activeTab === "aktif" ? "aktif dirawat" : "keluar (BLPL)"}
            </span>
            <span className="text-[11px]">
              Periode: <strong>{getPeriodRange(filterState).label}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Modal Konfirmasi Hapus Rekap Pasien */}
      <AppModal
        isOpen={showDeleteAllModal}
        onClose={() => {
          if (!isDeletingAll) setShowDeleteAllModal(false)
        }}
        title="Konfirmasi Hapus Rekap Pasien"
        subtitle="Tindakan Berisiko (Khusus Pengelola)"
        icon={<AlertTriangle className="size-5 text-red-600" />}
        onSubmit={(e) => {
          e.preventDefault()
          void handleConfirmDeleteAll()
        }}
        submitText={
          deleteCountdown > 0
            ? `Konfirmasi Hapus (${deleteCountdown}s)`
            : isDeletingAll
            ? "Menghapus..."
            : "Ya, Hapus Rekap Pasien"
        }
        submitVariant="danger"
        isSubmitting={isDeletingAll || deleteCountdown > 0}
        maxWidth="lg"
      >
        <div className="space-y-3.5 text-xs text-foreground">
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-800 dark:text-red-300 leading-relaxed space-y-1.5">
            <p className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="size-4 shrink-0 text-red-600" />
              Peringatan Penghapusan Rekap Pasien
            </p>
            <p>
              Tindakan ini akan <strong>menghapus seluruh data rekap pasien</strong> (baik pasien aktif maupun pasien keluar/BLPL) secara permanen dari server dan arsip lokal sistem.
            </p>
            <p className="text-[11px] text-red-700/80 dark:text-red-400">
              Data yang sudah dihapus tidak dapat dipulihkan kembali. Pastikan Anda telah mengunduh laporan CSV rekap pasien terlebih dahulu jika datanya masih dibutuhkan.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 text-[11px] text-muted-foreground">
            Total pasien yang akan dihapus: <strong className="text-foreground">{patients.length} pasien</strong>.
            {deleteCountdown > 0 ? (
              <span className="block mt-1 text-amber-600 dark:text-amber-400 font-semibold">
                Tombol konfirmasi hapus akan aktif dalam {deleteCountdown} detik...
              </span>
            ) : (
              <span className="block mt-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                Silakan klik tombol konfirmasi di bawah jika Anda yakin.
              </span>
            )}
          </div>
        </div>
      </AppModal>
    </div>
  )
}
