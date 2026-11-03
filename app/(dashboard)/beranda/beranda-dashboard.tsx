"use client"

import * as React from "react"
import { useState, useEffect, useMemo } from "react"
import { Users, Activity, Clock, CheckCircle2 } from "lucide-react"
import { PeriodFilterBar } from "@/components/period-filter-bar"
import {
  PeriodFilterState,
  getInitialPeriodFilterState,
  getCurrentClientPeriodFilterState,
  getPeriodRange,
  parseAnyDate,
  extractHourFromTimeStr,
  isPeriodInFuture,
} from "@/lib/utils/period-filter"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { StatsSection, StatItem } from "@/components/stats-section"
import { BerandaPanels } from "./beranda-panels"
import { fetchPatientsFromDb } from "@/lib/services/pasien-service"
import { fetchTimedToolsFromDb } from "@/lib/services/alat-service"
import type { Patient } from "@/app/(dashboard)/kelola-pasien/page"
import type { TimedToolUsageRecord } from "@/app/(dashboard)/kelola-alat/page"

export function BerandaDashboard() {
  const [filterState, setFilterState] = useState<PeriodFilterState>(
    getInitialPeriodFilterState()
  )
  const [shift, setShift] = useState<string>("Semua")

  const [patients, setPatients] = useState<Patient[]>([])
  const [timedTools, setTimedTools] = useState<TimedToolUsageRecord[]>([])

  // Sinkronkan filterState dengan waktu lokal perangkat pengguna
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilterState(getCurrentClientPeriodFilterState())
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  // Muat data pasien & alat medis
  useEffect(() => {
    let isMounted = true

    const loadData = async () => {
      try {
        // 1. Data Pasien
        const resPasien = await fetchPatientsFromDb()
        if (!isMounted) return

        if (resPasien.isDbConnected) {
          setPatients(resPasien.data)
          if (typeof window !== "undefined") {
            localStorage.setItem("sp_hcu_patients", JSON.stringify(resPasien.data))
          }
        } else {
          const saved =
            typeof window !== "undefined"
              ? localStorage.getItem("sp_hcu_patients")
              : null
          if (saved && isMounted) {
            const parsed = JSON.parse(saved)
            if (Array.isArray(parsed)) setPatients(parsed)
          }
        }

        // 2. Data Alat Hitungan Waktu
        const resTimed = await fetchTimedToolsFromDb()
        if (!isMounted) return
        if (resTimed.isDbConnected) {
          setTimedTools(resTimed.data)
        }
      } catch (err) {
        console.warn("Gagal memuat data Beranda:", err)
      }
    }

    void loadData()
    window.addEventListener("focus", loadData)
    window.addEventListener("storage", loadData)
    return () => {
      isMounted = false
      window.removeEventListener("focus", loadData)
      window.removeEventListener("storage", loadData)
    }
  }, [])

  // =========================================================================
  // FILTERING PASIEN (PERIODE + SHIFT)
  // Sensus pasien rawat inap HCU dihitung berdasarkan kehadiran pasien di ruangan
  // =========================================================================
  const periodPatients = useMemo(() => {
    // 1. Jangan tampilkan data sensus pada periode masa depan yang belum tiba (misal: besok, minggu depan)
    if (isPeriodInFuture(filterState)) return []

    const { start, end } = getPeriodRange(filterState)

    const getShiftOrder = (sName: string): number => {
      const s = sName.toLowerCase()
      if (s.includes("pagi")) return 1
      if (s.includes("siang")) return 2
      if (s.includes("malam")) return 3
      return 0
    }

    const getShiftFromTime = (timeStr?: string | null): "pagi" | "siang" | "malam" => {
      const h = extractHourFromTimeStr(timeStr)
      if (h === null) return "pagi"
      if (h >= 7 && h < 14) return "pagi"
      if (h >= 14 && h < 21) return "siang"
      return "malam"
    }

    return patients.filter((pt) => {
      const admDate = parseAnyDate(pt.admissionDate)
      if (!admDate) return false

      // Pasien belum masuk jika tanggal masuk melebihi akhir rentang periode
      if (admDate.getTime() > end.getTime()) return false

      // Cek apakah pasien dirawat dalam periode ini
      if (pt.status === "aktif") {
        // Pasien aktif dirawat dari admDate sampai sekarang (berada di ruangan)
      } else {
        // Pasien keluar: harus keluar pada atau setelah awal periode
        const disDate = parseAnyDate(pt.dischargeDate)
        if (!disDate || disDate.getTime() < start.getTime()) return false
      }

      // 2. Filter Shift yang Presisi
      if (shift && shift !== "Semua") {
        const targetShiftOrder = getShiftOrder(shift)

        if (filterState.periodType === "harian") {
          const selectedD = parseAnyDate(filterState.selectedDate)
          if (selectedD) {
            const isSameDayAdmission =
              selectedD.getFullYear() === admDate.getFullYear() &&
              selectedD.getMonth() === admDate.getMonth() &&
              selectedD.getDate() === admDate.getDate()

            // Jika hari ini adalah hari masuk pasien, cek apakah pasien sudah masuk di shift ini
            if (isSameDayAdmission) {
              const admShift = pt.admissionShiftKey?.toLowerCase().includes("pagi")
                ? "pagi"
                : pt.admissionShiftKey?.toLowerCase().includes("siang")
                ? "siang"
                : pt.admissionShiftKey?.toLowerCase().includes("malam")
                ? "malam"
                : getShiftFromTime(pt.admissionTime)
              const admShiftOrder = getShiftOrder(admShift)

              if (targetShiftOrder < admShiftOrder) {
                // Pasien baru masuk di shift berikutnya pada hari tersebut
                return false
              }
            }

            // Jika pasien sudah keluar pada hari yang sama, cek apakah sudah pulang sebelum shift ini
            if (pt.status !== "aktif" && pt.dischargeDate) {
              const disDate = parseAnyDate(pt.dischargeDate)
              if (
                disDate &&
                selectedD.getFullYear() === disDate.getFullYear() &&
                selectedD.getMonth() === disDate.getMonth() &&
                selectedD.getDate() === disDate.getDate()
              ) {
                const disShift = getShiftFromTime(pt.dischargeTime)
                const disShiftOrder = getShiftOrder(disShift)
                if (targetShiftOrder > disShiftOrder) {
                  // Pasien sudah pulang/keluar pada shift sebelumnya
                  return false
                }
              }
            }
          }
        }
        // Pada periode Mingguan, Bulanan, dan Triwulan:
        // Pasien aktif di HCU berada di ruangan 24 jam setiap hari selama periode perawatan,
        // sehingga hadir di shift pagi, siang, maupun malam.
      }

      return true
    })
  }, [patients, filterState, shift])

  // =========================================================================
  // FILTERING ALAT MEDIS HITUNGAN WAKTU (PERIODE + SHIFT)
  // =========================================================================
  const periodTimedTools = useMemo(() => {
    // Jangan tampilkan alat jika periode yang dipilih di masa depan
    if (isPeriodInFuture(filterState)) return []

    const { start, end } = getPeriodRange(filterState)

    const getShiftOrder = (sName: string): number => {
      const s = sName.toLowerCase()
      if (s.includes("pagi")) return 1
      if (s.includes("siang")) return 2
      if (s.includes("malam")) return 3
      return 0
    }

    const getShiftFromTime = (timeStr?: string | null): "pagi" | "siang" | "malam" => {
      const h = extractHourFromTimeStr(timeStr)
      if (h === null) return "pagi"
      if (h >= 7 && h < 14) return "pagi"
      if (h >= 14 && h < 21) return "siang"
      return "malam"
    }

    return timedTools.filter((t) => {
      const toolStart = t.startedAtTimestamp
        ? new Date(t.startedAtTimestamp)
        : parseAnyDate(t.shiftKey)

      if (!toolStart) return false

      // Alat belum mulai jika waktu mulai melebihi akhir rentang periode
      if (toolStart.getTime() > end.getTime()) return false

      // Cek status alat
      if (t.status === "berjalan") {
        // Alat sedang aktif berjalan pada pasien
      } else {
        // Alat selesai: harus selesai pada atau setelah awal periode
        const toolEnd = t.endedAtTimestamp ? new Date(t.endedAtTimestamp) : null
        if (toolEnd && toolEnd.getTime() < start.getTime()) return false
      }

      // Filter Shift
      if (shift && shift !== "Semua") {
        const targetShiftOrder = getShiftOrder(shift)

        if (filterState.periodType === "harian") {
          const selectedD = parseAnyDate(filterState.selectedDate)
          if (selectedD) {
            const isSameDayStart =
              selectedD.getFullYear() === toolStart.getFullYear() &&
              selectedD.getMonth() === toolStart.getMonth() &&
              selectedD.getDate() === toolStart.getDate()

            if (isSameDayStart) {
              const startShift = getShiftFromTime(t.startTimeStr)
              const startShiftOrder = getShiftOrder(startShift)
              if (targetShiftOrder < startShiftOrder) {
                return false
              }
            }

            if (t.status === "selesai" && t.endedAtTimestamp) {
              const toolEnd = new Date(t.endedAtTimestamp)
              const isSameDayEnd =
                selectedD.getFullYear() === toolEnd.getFullYear() &&
                selectedD.getMonth() === toolEnd.getMonth() &&
                selectedD.getDate() === toolEnd.getDate()

              if (isSameDayEnd) {
                const endShift = getShiftFromTime(t.endTimeStr)
                const endShiftOrder = getShiftOrder(endShift)
                if (targetShiftOrder > endShiftOrder) {
                  return false
                }
              }
            }
          }
        }
      }

      return true
    })
  }, [timedTools, filterState, shift])

  // =========================================================================
  // STAT CARDS ITEMS (4 CARDS: TOTAL PASIEN, TOTAL CARE, PARSIAL, MINIMAL)
  // =========================================================================
  const cardItems: StatItem[] = useMemo(() => {
    const totalCount = periodPatients.length
    const totalCareCount = periodPatients.filter((p) => p.careLevel === "total").length
    const partialCareCount = periodPatients.filter((p) => p.careLevel === "parsial").length
    const minimalCareCount = periodPatients.filter((p) => p.careLevel === "minimal").length

    return [
      {
        id: "total_pasien",
        title: "Total Pasien",
        badge: "TOTAL PASIEN",
        value: totalCount,
        description: "Seluruh pasien dirawat di HCU",
        color: "blue",
        icon: <Users className="size-4" />,
      },
      {
        id: "perawatan_total",
        title: "Perawatan Total",
        badge: "PERAWATAN TOTAL",
        value: totalCareCount,
        description: "Pasien dengan ketergantungan penuh",
        color: "red",
        icon: <Activity className="size-4" />,
      },
      {
        id: "perawatan_parsial",
        title: "Perawatan Parsial",
        badge: "PERAWATAN PARSIAL",
        value: partialCareCount,
        description: "Pasien dengan bantuan sebagian",
        color: "yellow",
        icon: <Clock className="size-4" />,
      },
      {
        id: "perawatan_minimal",
        title: "Perawatan Minimal",
        badge: "PERAWATAN MINIMAL",
        value: minimalCareCount,
        description: "Pasien mandiri / observasi ringan",
        color: "green",
        icon: <CheckCircle2 className="size-4" />,
      },
    ]
  }, [periodPatients])

  return (
    <div className="flex flex-col gap-6">
      {/* Header Halaman Beranda */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Ringkasan Sensus & Pasien
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Pantau total pasien dan kategori tingkat perawatan di ruang HCU
        </p>
      </div>

      {/* Filter Periode Rekap (Harian, Mingguan, Bulanan, Triwulan) + Filter Shift */}
      <PeriodFilterBar
        value={filterState}
        onChange={setFilterState}
        rightAction={
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs font-semibold text-muted-foreground shrink-0">
              Shift:
            </span>
            <Select
              value={shift}
              onValueChange={(val) => {
                if (val) setShift(val)
              }}
            >
              <SelectTrigger className="w-full md:w-48 h-8.5 text-xs bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 font-medium">
                <SelectValue placeholder="Pilih Shift" />
              </SelectTrigger>
              <SelectContent align="end" className="w-52">
                <SelectItem value="Semua">Semua Shift</SelectItem>
                <SelectItem value="Pagi">Pagi (07.00 - 14.00)</SelectItem>
                <SelectItem value="Siang">Siang (14.00 - 21.00)</SelectItem>
                <SelectItem value="Malam">Malam (21.00 - 07.00)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      {/* 4 Kartu KPI Tingkat Perawatan Pasien */}
      <StatsSection stats={cardItems} />

      {/* Dua Panel Bawah: Kapasitas Ruangan (BOR) & Pemantauan Alat Hitungan Waktu */}
      <BerandaPanels
        patients={periodPatients}
        timedTools={periodTimedTools}
        filterState={filterState}
        shift={shift}
      />
    </div>
  )
}

