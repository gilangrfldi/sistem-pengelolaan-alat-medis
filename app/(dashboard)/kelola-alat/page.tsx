"use client"

import * as React from "react"
import { useState, useMemo, useEffect, useCallback } from "react"
import Link from "next/link"
import { cn } from "cn"
import {
  Activity,
  Stethoscope,
  Clock,
  Plus,
  RotateCcw,
  Check,
  AlertCircle,
  Square,
  Wrench,
  CheckCircle2,
  Trash2,
  Timer,
  Zap,
  Sun,
  SunMedium,
  Moon,
  Layers,
  History,
  Play,
} from "lucide-react"

import { StatsSection, type StatItem } from "@/components/stats-section"
import { AppModal } from "@/components/app-modal"
import { BedSelector } from "@/components/bed-selector"
import { LiveStopwatch, getStartDateStr } from "@/components/live-stopwatch"
import {
  fetchMasterToolsFromDb,
  createMasterToolInDb,
  fetchTimedToolsFromDb,
  insertTimedToolInDb,
  updateTimedToolInDb,
  deleteTimedToolInDb,
  fetchCountToolsFromDb,
  insertCountToolInDb,
  updateCountToolInDb,
  deleteCountToolInDb,
  fetchDamagedToolsFromDb,
  insertDamagedToolInDb,
} from "@/lib/services/alat-service"
import { fetchPatientsFromDb } from "@/lib/services/pasien-service"
import { toast } from "@/components/ui/app-toast"

// ========================================================
// TIPE DATA & INTERFACE KELOLA ALAT MEDIS HCU (2 KATEGORI: 'waktu' & 'kali')
// ========================================================

export type ToolCategory = "waktu" | "kali"

export interface MasterTool {
  id: string
  name: string
  category: ToolCategory
  totalUnits: number // 0 jika tidak dibatasi / gas sentral
  hasUnitNumber: boolean
  unitNumberType?: "single" | "range"
  numberedUnitsCount?: number // Misal 40 untuk Infus Pump (1-40)
  unitStartNumber?: number // Nomor unit awal, misal 1
  unitEndNumber?: number // Nomor unit akhir, misal 40
  hasTotalUnits?: boolean
  hasLocation?: boolean
  applicableLocations?: string[] // Daftar lokasi pemasangan anatomi
  subtypes?: string[]
  description?: string
}

export interface TimedToolUsageRecord {
  id: string
  bed: string
  patientName: string
  patientRm: string
  toolName: string
  unitNumber?: number
  locations?: string[]
  status: "berjalan" | "selesai"
  startTimeStr: string
  endTimeStr?: string
  startedAtTimestamp: number
  endedAtTimestamp?: number
  durationMinutes: number
  accumulatedMinutes: number
  nurseName: string
  stopNurseName?: string
  shiftKey: string
  notes?: string
}

export interface CountToolUsageRecord {
  id: string
  toolName: string
  bed: string
  patientName: string
  patientRm: string
  count: number
  savedCount?: number
  lastActionTime: string
  nurseName: string
  unitNumber?: number
  notes?: string
  status?: "draft" | "selesai"
  createdAt?: string
}

export interface DamagedToolRecord {
  id: string
  toolName: string
  quantity: number
  unitNumbers: number[]
  reportDate: string
  severity: "rusak_ringan" | "rusak_berat"
  notes: string
  reportedBy: string
}

export interface ShiftInfo {
  type: "pagi" | "siang" | "malam"
  name: string
  label: string
  timeRange: string
  nextShiftTime: string
  shiftKey: string
}

// ========================================================
// DATA MASTER & REFERENSI AWAL HCU
// ========================================================

const REGULAR_BEDS = Array.from({ length: 19 }, (_, i) => {
  const num = String(i + 1).padStart(2, "0")
  return `Bed ${num}`
})
const ISOLATION_BEDS = ["Isolasi 1", "Isolasi 2"]
const ALL_BEDS = [...REGULAR_BEDS, ...ISOLATION_BEDS]

const INITIAL_PATIENTS_MAP: Record<string, { name: string; rm: string; admissionDate?: string; admissionTime?: string }> = {}

export const INITIAL_MASTER_TOOLS: MasterTool[] = [
  // 1. Alat yang digunakan dalam hitungan waktu (Mesin Ber-Timer & Alat Terpasang Berdurasi)
  {
    id: "mt-1",
    name: "Infus Intravena perifer",
    category: "waktu",
    totalUnits: 0,
    hasUnitNumber: false,
    hasLocation: true,
    applicableLocations: ["Tangan Kanan", "Tangan Kiri", "Kaki Kanan", "Kaki Kiri"],
  },
  {
    id: "mt-2",
    name: "CVC (Central Venous Catheter)",
    category: "waktu",
    totalUnits: 0,
    hasUnitNumber: false,
    hasLocation: true,
    applicableLocations: ["Leher", "Dada", "Pangkal Paha"],
    description: "Vena jugularis interna, vena subklavia, atau vena femoralis",
  },
  {
    id: "mt-3",
    name: "CDL (Catheter Double Lumen)",
    category: "waktu",
    totalUnits: 0,
    hasUnitNumber: false,
    hasLocation: true,
    applicableLocations: ["Leher", "Dada", "Pangkal Paha"],
  },
  {
    id: "mt-4",
    name: "Nasogastric Tube (NGT)",
    category: "waktu",
    totalUnits: 0,
    hasUnitNumber: false,
    hasLocation: true,
    applicableLocations: ["Hidung / Lambung"],
  },
  {
    id: "mt-5",
    name: "DC / Kondom Kateter",
    category: "waktu",
    totalUnits: 0,
    hasUnitNumber: false,
    hasLocation: true,
    applicableLocations: ["Uretra / Saluran Kemih"],
    subtypes: ["Dower Catheter (DC)", "Kondom Kateter"],
  },
  {
    id: "mt-6",
    name: "Kancing Kuning",
    category: "waktu",
    totalUnits: 0,
    hasUnitNumber: false,
    hasLocation: true,
    applicableLocations: ["Gelang Identitas Pasien"],
  },
  {
    id: "mt-7",
    name: "Tanda Risiko Jatuh",
    category: "waktu",
    totalUnits: 0,
    hasUnitNumber: false,
    hasLocation: true,
    applicableLocations: ["Tempat Tidur / Pagar Bed Pasien"],
  },
  {
    id: "mt-8",
    name: "Infus Pump",
    category: "waktu",
    totalUnits: 40,
    hasUnitNumber: true,
    unitNumberType: "range",
    unitStartNumber: 1,
    unitEndNumber: 40,
    numberedUnitsCount: 40,
    description: "Unit nomor 1 s/d 40",
  },
  {
    id: "mt-9",
    name: "Syringe Pump",
    category: "waktu",
    totalUnits: 14,
    hasUnitNumber: true,
    unitNumberType: "range",
    unitStartNumber: 1,
    unitEndNumber: 14,
    numberedUnitsCount: 14,
    description: "Unit nomor 1 s/d 14",
  },
  {
    id: "mt-10",
    name: "Monitor",
    category: "waktu",
    totalUnits: 21,
    hasUnitNumber: true,
    unitNumberType: "range",
    unitStartNumber: 1,
    unitEndNumber: 21,
    numberedUnitsCount: 21,
  },
  {
    id: "mt-11",
    name: "Bed Elektrik",
    category: "waktu",
    totalUnits: 21,
    hasUnitNumber: true,
    unitNumberType: "range",
    unitStartNumber: 1,
    unitEndNumber: 21,
    numberedUnitsCount: 21,
  },
  {
    id: "mt-12",
    name: "Blanket Penghangat",
    category: "waktu",
    totalUnits: 2,
    hasUnitNumber: false,
    hasTotalUnits: true,
    description: "2 unit fisik tanpa penomoran",
  },
  {
    id: "mt-13",
    name: "Hepafilter",
    category: "waktu",
    totalUnits: 2,
    hasUnitNumber: false,
    hasTotalUnits: true,
    description: "2 unit fisik tanpa penomoran",
  },
  {
    id: "mt-14",
    name: "Oksigen",
    category: "waktu",
    totalUnits: 0,
    hasUnitNumber: false,
    subtypes: ["Nasal Canula", "Simple Mask", "NRM (Non-Rebreathing Mask)", "HFNC (High Flow Nasal Cannula)"],
  },

  // 2. Alat yang digunakan dalam hitungan kali (Tindakan / Prosedur Medis)
  { id: "mt-15", name: "EKG (Elektrokardiogram)", category: "kali", totalUnits: 0, hasUnitNumber: false },
  { id: "mt-16", name: "Echo", category: "kali", totalUnits: 0, hasUnitNumber: false },
  { id: "mt-17", name: "Defibrilator", category: "kali", totalUnits: 0, hasUnitNumber: false },
  { id: "mt-18", name: "Restrain Pasien", category: "kali", totalUnits: 0, hasUnitNumber: false },
  { id: "mt-19", name: "Suction Portable", category: "kali", totalUnits: 0, hasUnitNumber: false },
  { id: "mt-20", name: "Suction Dinding", category: "kali", totalUnits: 0, hasUnitNumber: false },
  { id: "mt-21", name: "BVM Anak", category: "kali", totalUnits: 0, hasUnitNumber: false },
  { id: "mt-22", name: "BVM Dewasa", category: "kali", totalUnits: 0, hasUnitNumber: false },
  { id: "mt-23", name: "Alat Cek Gula Darah (GDS)", category: "kali", totalUnits: 0, hasUnitNumber: false },
]

// Data pemakaian alat medis HCU (Dihapus data lokal dummy, kini tersinkronisasi murni dengan Supabase)
export const INITIAL_TIMED_TOOLS: TimedToolUsageRecord[] = []
export const INITIAL_COUNT_TOOLS: CountToolUsageRecord[] = []
export const INITIAL_DAMAGED_TOOLS: DamagedToolRecord[] = []

interface StoredPatientRecord {
  bed: string
  name: string
  rm: string
  status: string
  admissionDate?: string
  admissionTime?: string
}

// Helper konversi menit ke format 'X jam Y menit'
function formatDuration(minutes: number): string {
  if (minutes < 1) return "< 1 menit"
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} menit`
  if (m === 0) return `${h} jam`
  return `${h} jam ${m} menit`
}

// Helper hitung selisih jam 'HH:mm' ke menit
function calculateMinutesDifference(startStr: string, endStr: string): number {
  const [sh, sm] = startStr.split(":").map(Number)
  const [eh, em] = endStr.split(":").map(Number)
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return 0
  let diff = eh * 60 + em - (sh * 60 + sm)
  if (diff < 0) diff += 24 * 60 // Lewat tengah malam
  return diff
}

const DEFAULT_SHIFT_INFO: ShiftInfo = {
  type: "pagi",
  name: "Pagi",
  label: "Shift Pagi",
  timeRange: "07.00 - 14.00 WIB",
  nextShiftTime: "14.00 WIB",
  shiftKey: "2026-10-30-pagi",
}

export default function KelolaAlatPage() {
  // ========================================================
  // STATE DATA DARI DATABASE SUPABASE (DATA ASLI RUANG HCU)
  // ========================================================
  const [masterTools, setMasterTools] = useState<MasterTool[]>(INITIAL_MASTER_TOOLS)
  const [timedTools, setTimedTools] = useState<TimedToolUsageRecord[]>(INITIAL_TIMED_TOOLS)
  const [countTools, setCountTools] = useState<CountToolUsageRecord[]>(INITIAL_COUNT_TOOLS)
  const [damagedTools, setDamagedTools] = useState<DamagedToolRecord[]>(INITIAL_DAMAGED_TOOLS)

  // Mapping Pasien Aktif per Bed (Sinkron dengan Menu Kelola Pasien)
  const [activePatientsMap, setActivePatientsMap] = useState<
    Record<string, { name: string; rm: string; admissionDate?: string; admissionTime?: string }>
  >(INITIAL_PATIENTS_MAP)

  // 1. Sinkronisasi Data Pasien Aktif HCU (Hanya bed dengan pasien aktif yang bisa dipilih)
  useEffect(() => {
    let ignore = false
    const syncPatients = async () => {
      try {
        const res = await fetchPatientsFromDb()
        if (ignore) return
        if (res.isDbConnected) {
          const map: Record<string, { name: string; rm: string; admissionDate?: string; admissionTime?: string }> = {}
          res.data
            .filter((p) => p.status === "aktif")
            .forEach((p) => {
              map[p.bed] = {
                name: p.name,
                rm: p.rm,
                admissionDate: p.admissionDate,
                admissionTime: p.admissionTime,
              }
            })
          setActivePatientsMap(map)
          localStorage.setItem("sp_hcu_patients", JSON.stringify(res.data))
          return
        }
      } catch {}

      try {
        const saved = localStorage.getItem("sp_hcu_patients")
        if (saved && !ignore) {
          const list = JSON.parse(saved) as StoredPatientRecord[]
          if (Array.isArray(list)) {
            const map: Record<string, { name: string; rm: string; admissionDate?: string; admissionTime?: string }> = {}
            list
              .filter((p) => p.status === "aktif")
              .forEach((p) => {
                map[p.bed] = {
                  name: p.name,
                  rm: p.rm,
                  admissionDate: p.admissionDate,
                  admissionTime: p.admissionTime,
                }
              })
            setActivePatientsMap(map)
            return
          }
        }
      } catch {}
      if (!ignore) setActivePatientsMap({})
    }

    void syncPatients()
    window.addEventListener("focus", syncPatients)
    window.addEventListener("storage", syncPatients)
    return () => {
      ignore = true
      window.removeEventListener("focus", syncPatients)
      window.removeEventListener("storage", syncPatients)
    }
  }, [])

  // 2. Muat Data Alat Medis Asli dari Database Supabase
  useEffect(() => {
    let ignore = false
    const loadData = async () => {
      try {
        const [resMaster, resTimed, resCount, resDamaged] = await Promise.all([
          fetchMasterToolsFromDb(),
          fetchTimedToolsFromDb(),
          fetchCountToolsFromDb(),
          fetchDamagedToolsFromDb(),
        ])

        if (ignore) return

        if (resMaster.isDbConnected && resMaster.data.length > 0) {
          setMasterTools(resMaster.data)
        }
        if (resTimed.isDbConnected) {
          setTimedTools(resTimed.data)
        }
        if (resCount.isDbConnected) {
          setCountTools(resCount.data)
        }
        if (resDamaged.isDbConnected) {
          setDamagedTools(resDamaged.data)
        }
      } catch (err) {
        console.error("Gagal sinkronisasi data alat dari Supabase:", err)
      }
    }

    void loadData()

    return () => {
      ignore = true
    }
  }, [])

  // Shift & Waktu Sekarang
  const [currentTimeStr, setCurrentTimeStr] = useState("")
  const [activeShift, setActiveShift] = useState<ShiftInfo>(DEFAULT_SHIFT_INFO)

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTimeStr(getFormattedTime(now))
      setActiveShift(getShiftInfo(now))
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  // User / Perawat login saat ini
  const [currentNurse, setCurrentNurse] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sp_current_user_name") || "Staf Perawat HCU"
    }
    return "Staf Perawat HCU"
  })
  useEffect(() => {
    const timer = setTimeout(() => {
      const cached = localStorage.getItem("sp_current_user_name")
      if (cached) {
        setCurrentNurse(cached.startsWith("Ns.") ? cached : `Ns. ${cached}`)
      }
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  // Bed Terpilih
  const [selectedBedRaw, setSelectedBedRaw] = useState<string>("Bed 01")

  // Auto-select Bed Pertama yang Memiliki Pasien jika Bed Terpilih Kosong (Derived State)
  const selectedBedForPanel = useMemo(() => {
    if (activePatientsMap[selectedBedRaw]) {
      return selectedBedRaw
    }
    const occupied = ALL_BEDS.find((b) => Boolean(activePatientsMap[b]))
    return occupied || selectedBedRaw
  }, [activePatientsMap, selectedBedRaw])

  const setSelectedBedForPanel = setSelectedBedRaw

  // ========================================================
  // STATE MODAL
  // ========================================================
  // 1. Modal Catat / Pasang Alat ke Bed
  const [showAttachModal, setShowAttachModal] = useState(false)
  const [formBed, setFormBed] = useState("Bed 01")
  const [formCategory, setFormCategory] = useState<ToolCategory>("waktu")
  const [formToolName, setFormToolName] = useState("")
  const [formLocations, setFormLocations] = useState<string[]>([])
  const [formUnitNumber, setFormUnitNumber] = useState<number | null>(null)
  const [formTimeMode, setFormTimeMode] = useState<"now" | "admission" | "manual">("now")
  const [formManualStart, setFormManualStart] = useState("08:00")
  const [formManualEnd, setFormManualEnd] = useState("")
  const [formCountNumber, setFormCountNumber] = useState(1)
  const [formNotes, setFormNotes] = useState("")
  const [formError, setFormError] = useState<string | null>(null)

  // 2. Modal Selesai / Lepas Alat Ber-Timer (Koreksi Jam)
  const [showStopTimerModal, setShowStopTimerModal] = useState(false)
  const [selectedTimedTool, setSelectedTimedTool] = useState<TimedToolUsageRecord | null>(null)
  const [stopTimeInput, setStopTimeInput] = useState("")
  const [stopCalculatedMinutes, setStopCalculatedMinutes] = useState(0)

  // 3. Modal Lapor Alat Rusak
  const [showDamageModal, setShowDamageModal] = useState(false)
  const [dmgToolName, setDmgToolName] = useState("Infus Pump")
  const [dmgSelectedNumbers, setDmgSelectedNumbers] = useState<number[]>([])
  const [dmgQuantity, setDmgQuantity] = useState(1)
  const [dmgSeverity, setDmgSeverity] = useState<"rusak_ringan" | "rusak_berat">("rusak_ringan")
  const [dmgNotes, setDmgNotes] = useState("")
  const [dmgError, setDmgError] = useState<string | null>(null)

  // 4. Modal Tambah Alat Baru ke Master
  const [showAddMasterModal, setShowAddMasterModal] = useState(false)
  const [newMasterName, setNewMasterName] = useState("")
  const [newMasterCategory, setNewMasterCategory] = useState<ToolCategory>("waktu")
  const [newMasterHasUnitNumber, setNewMasterHasUnitNumber] = useState(false)
  const [newMasterUnitMode, setNewMasterUnitMode] = useState<"single" | "range">("range")
  const [newMasterSingleUnit, setNewMasterSingleUnit] = useState(1)
  const [newMasterRangeStart, setNewMasterRangeStart] = useState(1)
  const [newMasterRangeEnd, setNewMasterRangeEnd] = useState(20)
  const [newMasterHasTotalUnits, setNewMasterHasTotalUnits] = useState(false)
  const [newMasterTotalUnits, setNewMasterTotalUnits] = useState(10)
  const [newMasterHasLocation, setNewMasterHasLocation] = useState(false)
  const [newMasterLocations, setNewMasterLocations] = useState<string[]>([""])
  const [newMasterSubtypes, setNewMasterSubtypes] = useState("")
  const [newMasterDescription, setNewMasterDescription] = useState("")

  // 5. Modal Konfirmasi Reset Sensus Shift
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false)

  // 6. Modal Konfirmasi Hapus Catatan Alat / Tindakan
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{
    type: "waktu" | "kali"
    id: string
    name: string
    bed: string
  } | null>(null)

  const [savingCountId, setSavingCountId] = useState<string | null>(null)

  // ========================================================
  // MAP & DERIVED STATE (UNIT TERPAKAI & RUSAK)
  // ========================================================

  // Unit alat ber-nomor yang sedang dipakai di bed lain
  const occupiedUnitMap = useMemo(() => {
    const map = new Map<string, { bed: string; patient: string }>()
    timedTools.forEach((t) => {
      if (t.status === "berjalan" && t.unitNumber) {
        map.set(`${t.toolName}#${t.unitNumber}`, { bed: t.bed, patient: t.patientName })
      }
    })
    return map
  }, [timedTools])

  // Unit alat yang sedang dilaporkan rusak
  const damagedUnitSet = useMemo(() => {
    const set = new Set<string>()
    damagedTools.forEach((d) => {
      d.unitNumbers.forEach((num) => {
        set.add(`${d.toolName}#${num}`)
      })
    })
    return set
  }, [damagedTools])

  // Statistik Alat Medis HCU untuk StatsSection
  const statsData: StatItem[] = useMemo(() => {
    // 1. Total Unit Alat Terdaftar
    const totalUnitsCount = masterTools.reduce((acc, t) => acc + (t.totalUnits || 0), 0)

    // 2. Total Alat yang Sedang Digunakan (Timer Berjalan)
    const activeTimed = timedTools.filter((t) => t.status === "berjalan").length
    const totalInUse = activeTimed

    // 3. Total Alat Rusak
    const totalDamaged = damagedTools.reduce((acc, d) => acc + d.quantity, 0)

    // 4. Alat Tersedia Siap Pakai
    const totalAvailable = Math.max(0, totalUnitsCount - (activeTimed + totalDamaged))

    return [
      {
        id: "total",
        title: "Total Alat Medis",
        badge: "TOTAL ALAT MEDIS",
        value: totalUnitsCount,
        description: "Inventaris peralatan HCU",
        color: "blue",
        icon: <Activity className="size-4" />,
      },
      {
        id: "in_use",
        title: "Sedang Digunakan",
        badge: "SEDANG DIGUNAKAN",
        value: totalInUse,
        description: `${activeTimed} alat aktif berjalan`,
        color: "green",
        icon: <Stethoscope className="size-4" />,
      },
      {
        id: "available",
        title: "Tersedia Siap Pakai",
        badge: "TERSEDIA",
        value: totalAvailable,
        description: "Siap digunakan kapan saja",
        color: "yellow",
        icon: <CheckCircle2 className="size-4" />,
      },
      {
        id: "damaged",
        title: "Perlu Perbaikan",
        badge: "RUSAK",
        value: totalDamaged,
        description: "Dalam pemeliharaan teknisi",
        color: "red",
        icon: <Wrench className="size-4" />,
      },
    ]
  }, [masterTools, timedTools, damagedTools])

  // Reset Sensus Shift
  const handleResetShiftSensus = useCallback(() => {
    // Kosongkan durasi dan set hitungan kali ke 0 untuk shift baru
    setCountTools([])
    setTimedTools((prev) =>
      prev.map((t) => ({
        ...t,
        accumulatedMinutes: t.status === "berjalan" ? t.durationMinutes : 0,
      }))
    )
    setShowResetConfirmModal(false)
  }, [])

  // ========================================================
  // HANDLERS UNTUK MODAL
  // ========================================================

  // Buka modal pasang alat
  const handleOpenAttachModal = (bedName?: string) => {
    setFormError(null)

    // Periksa apakah ada pasien aktif di HCU
    const occupiedBeds = ALL_BEDS.filter((b) => Boolean(activePatientsMap[b]))
    if (occupiedBeds.length === 0) {
      alert("Belum ada pasien aktif yang terdaftar di ruang HCU. Silakan daftarkan pasien terlebih dahulu di menu Kelola Pasien.")
      return
    }

    const targetBed =
      bedName && activePatientsMap[bedName]
        ? bedName
        : selectedBedForPanel && activePatientsMap[selectedBedForPanel]
        ? selectedBedForPanel
        : occupiedBeds[0]

    setFormBed(targetBed)
    setFormCategory("waktu")
    const firstTimed = masterTools.find((m) => m.category === "waktu")?.name || "Infus Pump"
    setFormToolName(firstTimed)
    const masterObj = masterTools.find((m) => m.name === firstTimed)
    if (masterObj?.applicableLocations && masterObj.applicableLocations.length === 1) {
      setFormLocations([masterObj.applicableLocations[0]])
    } else {
      setFormLocations([])
    }
    setFormUnitNumber(null)
    setFormTimeMode("now")
    setFormManualStart("08:00")
    setFormManualEnd("")
    setFormCountNumber(1)
    setFormNotes("")
    setFormError(null)
    setShowAttachModal(true)
  }

  // Submit pemasangan alat baru (Tersinkron dengan Database Supabase)
  const handleSubmitAttach = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const patient = activePatientsMap[formBed]
    if (!patient) {
      setFormError("Bed yang dipilih belum terisi pasien. Silakan pilih bed yang terisi pasien.")
      return
    }
    const now = new Date()
    const nowTimeStr = getFormattedTime(now).slice(0, 5)

    if (formCategory === "waktu") {
      if (!formToolName) {
        setFormError("Pilih alat hitungan waktu yang digunakan.")
        return
      }

      const master = masterTools.find((m) => m.name === formToolName)

      // Validasi 1: Jika punya nomor unit fisik
      if (master?.hasUnitNumber) {
        if (!formUnitNumber) {
          setFormError("Pilih nomor unit alat yang digunakan.")
          return
        }

        // Validasi nomor alat tidak sedang dipakai
        if (occupiedUnitMap.has(`${formToolName}#${formUnitNumber}`)) {
          const occ = occupiedUnitMap.get(`${formToolName}#${formUnitNumber}`)
          setFormError(`Unit #${formUnitNumber} sedang dipakai di ${occ?.bed} (${occ?.patient})!`)
          return
        }

        // Validasi nomor alat tidak rusak
        if (damagedUnitSet.has(`${formToolName}#${formUnitNumber}`)) {
          setFormError(`Unit #${formUnitNumber} saat ini berstatus RUSAK!`)
          return
        }
      } else {
        // Validasi 2: Jika tidak punya nomor unit fisik, cek kuota total unit di ruangan
        if (master && master.totalUnits > 0) {
          const inUseCount = timedTools.filter((t) => t.toolName === formToolName && t.status === "berjalan").length
          const damagedCount = damagedTools.filter((d) => d.toolName === formToolName).reduce((sum, d) => sum + d.quantity, 0)
          const remainingUnits = Math.max(0, master.totalUnits - (inUseCount + damagedCount))

          if (remainingUnits <= 0) {
            setFormError(`Semua unit ${formToolName} (${master.totalUnits}/${master.totalUnits} unit) sedang digunakan pada pasien lain atau dalam perbaikan teknisi. Alat tidak dapat dipasang.`)
            return
          }
        }
      }

      let duration = 0
      let isCompleted = false
      let endStr: string | undefined = undefined

      if (formTimeMode === "manual" && formManualEnd) {
        duration = calculateMinutesDifference(formManualStart, formManualEnd)
        isCompleted = true
        endStr = formManualEnd
      }

      let resolvedLocations: string[] | undefined = undefined
      if (master?.applicableLocations && master.applicableLocations.length > 0) {
        if (master.applicableLocations.length === 1) {
          resolvedLocations = [master.applicableLocations[0]]
        } else {
          if (formLocations.length === 0) {
            setFormError(`Pilih lokasi pemasangan anatomi untuk ${formToolName}.`)
            return
          }
          resolvedLocations = formLocations
        }
      }

      // Cek apakah nomor alat yang sama pernah dipakai sebelumnya di bed ini untuk akumulasi
      const prevUsed = timedTools.find(
        (t) => t.bed === formBed && t.toolName === formToolName && t.unitNumber === formUnitNumber
      )
      const prevAccumulated = prevUsed ? prevUsed.accumulatedMinutes : 0

      let resolvedStartTimestamp = Date.now()
      let resolvedStartTimeStr = nowTimeStr

      if (formTimeMode === "admission") {
        const rawTime = patient.admissionTime ? patient.admissionTime.replace(" WIB", "").trim() : nowTimeStr
        resolvedStartTimeStr = rawTime
        if (patient.admissionDate && rawTime) {
          try {
            const parts = patient.admissionDate.split("-").map(Number)
            const [hour, min] = rawTime.split(":").map(Number)
            if (parts.length === 3 && !isNaN(hour) && !isNaN(min)) {
              const d = new Date(parts[2], parts[1] - 1, parts[0], hour, min, 0)
              resolvedStartTimestamp = d.getTime()
            }
          } catch {}
        }
      } else if (formTimeMode === "manual" && formManualStart) {
        resolvedStartTimeStr = formManualStart
        const [mh, mm] = formManualStart.split(":").map(Number)
        if (!isNaN(mh) && !isNaN(mm)) {
          const d = new Date()
          d.setHours(mh, mm, 0, 0)
          if (d.getTime() > Date.now()) {
            d.setDate(d.getDate() - 1)
          }
          resolvedStartTimestamp = d.getTime()
        }
      }

      const payload: Omit<TimedToolUsageRecord, "id"> = {
        bed: formBed,
        patientName: patient.name,
        patientRm: patient.rm,
        toolName: formToolName,
        unitNumber: formUnitNumber || undefined,
        locations: resolvedLocations,
        status: isCompleted ? "selesai" : "berjalan",
        startTimeStr: resolvedStartTimeStr,
        endTimeStr: endStr,
        startedAtTimestamp: resolvedStartTimestamp,
        endedAtTimestamp: isCompleted ? Date.now() : undefined,
        durationMinutes: duration,
        accumulatedMinutes: prevAccumulated + duration,
        nurseName: currentNurse,
        stopNurseName: isCompleted ? currentNurse : undefined,
        shiftKey: activeShift.shiftKey,
        notes: formNotes || undefined,
      }

      try {
        const saved = await insertTimedToolInDb(payload)
        setTimedTools((prev) => [saved, ...prev])
      } catch (err) {
        console.warn("DB offline fallback untuk alat waktu:", err)
        const fallback: TimedToolUsageRecord = {
          id: `time-${Date.now()}`,
          ...payload,
        }
        setTimedTools((prev) => [fallback, ...prev])
      }
    } else if (formCategory === "kali") {
      if (!formToolName) {
        setFormError("Pilih alat hitungan kali.")
        return
      }

      // Cek apakah sudah ada catatan untuk bed ini
      const existing = countTools.find((c) => c.bed === formBed && c.toolName === formToolName)
      const fullActionTimeStr = `${nowTimeStr} WIB (${getFormattedDate(now)})`
      const nowIso = new Date().toISOString()
      if (existing) {
        const nextCount = (existing.savedCount ?? existing.count) + formCountNumber
        try {
          await updateCountToolInDb(existing.id, {
            count: nextCount,
            lastActionTime: fullActionTimeStr,
            nurseName: currentNurse,
            status: "selesai",
          })
        } catch (err) {
          console.warn("DB offline update count:", err)
        }
        setCountTools((prev) =>
          prev.map((c) =>
            c.id === existing.id
              ? {
                  ...c,
                  count: nextCount,
                  savedCount: nextCount,
                  lastActionTime: fullActionTimeStr,
                  nurseName: currentNurse,
                  status: "selesai",
                  createdAt: nowIso,
                }
              : c
          )
        )
      } else {
        const payload: Omit<CountToolUsageRecord, "id"> = {
          toolName: formToolName,
          bed: formBed,
          patientName: patient.name,
          patientRm: patient.rm,
          count: formCountNumber,
          savedCount: formCountNumber,
          lastActionTime: fullActionTimeStr,
          nurseName: currentNurse,
          notes: formNotes || undefined,
          status: "selesai",
        }

        try {
          const saved = await insertCountToolInDb(payload)
          setCountTools((prev) => [
            {
              ...saved,
              count: formCountNumber,
              savedCount: formCountNumber,
              status: "selesai",
              createdAt: saved.createdAt || nowIso,
            },
            ...prev,
          ])
        } catch (err) {
          console.warn("DB offline fallback count:", err)
          const fallback: CountToolUsageRecord = {
            id: `count-${Date.now()}`,
            ...payload,
            createdAt: nowIso,
          }
          setCountTools((prev) => [fallback, ...prev])
        }
      }
    }

    setShowAttachModal(false)
    toast.success("Alat berhasil dipasang")
  }

  // Buka modal hentikan timer alat
  const handleOpenStopTimerModal = (record: TimedToolUsageRecord) => {
    setSelectedTimedTool(record)
    const nowTimeStr = getFormattedTime(new Date()).slice(0, 5)
    setStopTimeInput(nowTimeStr)

    // Hitung estimasi menit awal
    const mins = calculateMinutesDifference(record.startTimeStr, nowTimeStr)
    setStopCalculatedMinutes(mins)
    setShowStopTimerModal(true)
  }

  // Update kalkulasi waktu saat input jam selesai diubah
  const handleStopTimeChange = (newEndTime: string) => {
    setStopTimeInput(newEndTime)
    if (selectedTimedTool) {
      const mins = calculateMinutesDifference(selectedTimedTool.startTimeStr, newEndTime)
      setStopCalculatedMinutes(mins)
    }
  }

  // Konfirmasi penyelesaian timer alat (Update ke Supabase)
  const handleConfirmStopTimer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTimedTool) return

    const duration = calculateMinutesDifference(selectedTimedTool.startTimeStr, stopTimeInput)
    const endTimestamp = Date.now()
    const nextAccumulated = selectedTimedTool.accumulatedMinutes + duration
    const finalStopNurse = currentNurse

    try {
      await updateTimedToolInDb(selectedTimedTool.id, {
        status: "selesai",
        endTimeStr: stopTimeInput,
        endedAtTimestamp: endTimestamp,
        durationMinutes: duration,
        accumulatedMinutes: nextAccumulated,
        stopNurseName: finalStopNurse,
      })
    } catch (err) {
      console.warn("DB offline update timer:", err)
    }

    setTimedTools((prev) =>
      prev.map((t) =>
        t.id === selectedTimedTool.id
          ? {
              ...t,
              status: "selesai",
              endTimeStr: stopTimeInput,
              endedAtTimestamp: endTimestamp,
              durationMinutes: duration,
              accumulatedMinutes: nextAccumulated,
              stopNurseName: finalStopNurse,
            }
          : t
      )
    )

    setShowStopTimerModal(false)
    setSelectedTimedTool(null)
    toast.success("Alat berhasil dilepas")
  }

  // Buka modal konfirmasi hapus alat waktu (mesin ber-timer)
  const handleRequestDeleteTimed = (item: TimedToolUsageRecord) => {
    setDeleteConfirmTarget({
      type: "waktu",
      id: item.id,
      name: `${item.toolName}${item.unitNumber ? ` #${item.unitNumber}` : ""}`,
      bed: item.bed,
    })
  }

  // Buka modal konfirmasi hapus tindakan medis (hitungan kali)
  const handleRequestDeleteCount = (item: CountToolUsageRecord) => {
    setDeleteConfirmTarget({
      type: "kali",
      id: item.id,
      name: `${item.toolName} (${item.count}x)`,
      bed: item.bed,
    })
  }

  // Eksekusi Hapus Alat / Tindakan setelah konfirmasi modal
  const handleExecuteDelete = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!deleteConfirmTarget) return

    if (deleteConfirmTarget.type === "waktu") {
      await handleDeleteTimedTool(deleteConfirmTarget.id)
    } else {
      try {
        await deleteCountToolInDb(deleteConfirmTarget.id)
      } catch (err) {
        console.warn("DB offline delete count tool:", err)
      }
      setCountTools((prev) => prev.filter((c) => c.id !== deleteConfirmTarget.id))
    }
    setDeleteConfirmTarget(null)
    toast.success("Data alat berhasil dihapus")
  }

  // Update nilai counter tindakan medis saat perawat klik [+] atau [-] (draft mode)
  const handleUpdateCountDraft = (id: string, delta: number) => {
    const nowTimeStr = getFormattedTime(new Date()).slice(0, 5)
    setCountTools((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const nextCount = Math.max(1, c.count + delta)
          return {
            ...c,
            count: nextCount,
            lastActionTime: `${nowTimeStr} WIB`,
            nurseName: currentNurse,
          }
        }
        return c
      })
    )
  }

  // Simpan Tindakan Medis ke Supabase (masuk ke Rekap & Riwayat secara permanen di database)
  const handleSaveCountTool = async (id: string) => {
    const target = countTools.find((c) => c.id === id)
    if (!target) return
    const now = new Date()
    const nowTimeStr = getFormattedTime(now).slice(0, 5)
    const fullActionTimeStr = `${nowTimeStr} WIB (${getFormattedDate(now)})`

    setSavingCountId(id)
    try {
      await updateCountToolInDb(id, {
        count: target.count,
        lastActionTime: fullActionTimeStr,
        nurseName: currentNurse,
        status: "selesai",
        notes: target.notes,
      })
    } catch (err) {
      console.warn("DB offline update count:", err)
    } finally {
      setSavingCountId(null)
    }

    setCountTools((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              savedCount: target.count,
              lastActionTime: fullActionTimeStr,
              nurseName: currentNurse,
              status: "selesai",
              createdAt: new Date().toISOString(),
            }
          : c
      )
    )
    toast.success("Tindakan berhasil disimpan")
  }

  // Hapus Catatan Alat Waktu Langsung (Internal)
  const handleDeleteTimedTool = async (id: string) => {
    try {
      await deleteTimedToolInDb(id)
    } catch (err) {
      console.warn("DB offline delete timed tool:", err)
    }
    setTimedTools((prev) => prev.filter((t) => t.id !== id))
  }



  // Submit Lapor Alat Rusak (Simpan ke Supabase)
  const handleSubmitDamage = async (e: React.FormEvent) => {
    e.preventDefault()
    setDmgError(null)

    const targetTool = masterTools.find((m) => m.name === dmgToolName)
    let finalQuantity = dmgQuantity
    let finalUnitNumbers: number[] = []

    if (targetTool?.hasUnitNumber) {
      if (dmgSelectedNumbers.length === 0) {
        setDmgError("Pilih minimal satu nomor unit fisik yang mengalami kerusakan.")
        return
      }
      finalUnitNumbers = [...dmgSelectedNumbers].sort((a, b) => a - b)
      finalQuantity = finalUnitNumbers.length
    } else {
      if (finalQuantity < 1) {
        setDmgError("Jumlah unit rusak minimal 1 unit.")
        return
      }
      if (targetTool && targetTool.totalUnits > 0 && finalQuantity > targetTool.totalUnits) {
        setDmgError(
          `Jumlah unit rusak tidak boleh melebihi total inventaris (${targetTool.totalUnits} unit).`
        )
        return
      }
      finalUnitNumbers = []
    }

    const payload: Omit<DamagedToolRecord, "id"> = {
      toolName: dmgToolName,
      quantity: finalQuantity,
      unitNumbers: finalUnitNumbers,
      reportDate: getFormattedDate(new Date()),
      severity: dmgSeverity,
      notes: dmgNotes || "Perlu pengecekan teknisi",
      reportedBy: currentNurse,
    }

    try {
      const saved = await insertDamagedToolInDb(payload)
      setDamagedTools((prev) => [saved, ...prev])
    } catch (err) {
      console.warn("DB offline insert damage:", err)
      const fallback: DamagedToolRecord = {
        id: `dmg-${Date.now()}`,
        ...payload,
      }
      setDamagedTools((prev) => [fallback, ...prev])
    }

    setShowDamageModal(false)
    setDmgSelectedNumbers([])
    setDmgNotes("")
    setDmgError(null)
    toast.success("Laporan alat rusak terkirim")
  }



  // Submit Tambah Alat Baru ke Master (Simpan ke Supabase)
  const handleSubmitAddMaster = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMasterName.trim()) return

    const subtypesArr = newMasterSubtypes
      ? newMasterSubtypes.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined

    let calculatedTotal = 0
    let hasUnit = false
    let uStart: number | undefined = undefined
    let uEnd: number | undefined = undefined
    let numCount: number | undefined = undefined
    let locsArr: string[] | undefined = undefined

    if (newMasterCategory === "waktu") {
      if (newMasterHasUnitNumber) {
        hasUnit = true
        if (newMasterUnitMode === "single") {
          const val = Math.max(1, Number(newMasterSingleUnit) || 1)
          uStart = val
          uEnd = val
          numCount = 1
          calculatedTotal = 1
        } else {
          const startVal = Math.max(1, Number(newMasterRangeStart) || 1)
          const endVal = Math.max(startVal, Number(newMasterRangeEnd) || startVal)
          uStart = startVal
          uEnd = endVal
          numCount = endVal - startVal + 1
          calculatedTotal = numCount
        }
      } else if (newMasterHasTotalUnits) {
        calculatedTotal = Math.max(1, Number(newMasterTotalUnits) || 1)
      } else {
        calculatedTotal = 0
      }

      if (newMasterHasLocation) {
        const cleaned = newMasterLocations.map((s) => s.trim()).filter(Boolean)
        locsArr = cleaned.length > 0 ? cleaned : undefined
      }
    } else {
      // Hitungan Kali: tidak ada nomor unit atau lokasi pemasangan
      calculatedTotal = 0
      hasUnit = false
      locsArr = undefined
    }

    const newTool: Omit<MasterTool, "id"> = {
      name: newMasterName.trim(),
      category: newMasterCategory,
      totalUnits: calculatedTotal,
      hasUnitNumber: hasUnit,
      unitNumberType: hasUnit ? newMasterUnitMode : undefined,
      unitStartNumber: uStart,
      unitEndNumber: uEnd,
      numberedUnitsCount: numCount,
      hasTotalUnits: newMasterHasTotalUnits,
      hasLocation: newMasterHasLocation,
      applicableLocations: locsArr,
      subtypes: subtypesArr,
      description: newMasterDescription || undefined,
    }

    try {
      const saved = await createMasterToolInDb(newTool)
      setMasterTools((prev) => [...prev, saved])
    } catch (err) {
      console.warn("DB offline insert master tool:", err)
      const fallback: MasterTool = {
        id: `mt-${Date.now()}`,
        ...newTool,
      }
      setMasterTools((prev) => [...prev, fallback])
    }

    setShowAddMasterModal(false)
    setNewMasterName("")
    setNewMasterCategory("waktu")
    setNewMasterHasUnitNumber(false)
    setNewMasterHasTotalUnits(false)
    setNewMasterHasLocation(false)
    setNewMasterLocations([""])
    setNewMasterDescription("")
    setNewMasterSubtypes("")
  }

  // Data panel bed yang sedang dipilih
  const currentBedPatient = activePatientsMap[selectedBedForPanel]
  // Hanya alat hitungan waktu yang SEDANG BERJALAN yang tampil di panel aktif atas (masih ada tombol Lepas & Hapus)
  const currentBedTimed = timedTools.filter((t) => t.bed === selectedBedForPanel && t.status === "berjalan")
  // Tindakan medis aktif yang dicatat di bed ini
  const currentBedCount = countTools.filter((c) => c.bed === selectedBedForPanel)

  // Riwayat Penggunaan & Pemasangan Alat di Bed Ini (Log Audit Siapa Pasang & Lepas)
  // Menampilkan alat waktu yang sudah dilepas dan tindakan medis yang sudah disimpan
  const currentBedHistory = useMemo(() => {
    const list: {
      id: string
      toolName: string
      category: "waktu" | "kali"
      unitNumber?: number
      locations?: string[]
      status: "berjalan" | "selesai"
      timeRange: string
      durationText?: string
      startNurse: string
      stopNurse?: string
      timestamp: number
    }[] = []

    // 1. Alat Hitungan Waktu - HANYA YANG SUDAH DILEPAS / SELESAI
    timedTools
      .filter((t) => t.bed === selectedBedForPanel && t.status === "selesai")
      .forEach((t) => {
        const hrs = Math.floor(t.durationMinutes / 60)
        const mins = t.durationMinutes % 60
        const durStr = `${hrs > 0 ? `${hrs} jam ` : ""}${mins} menit`
        list.push({
          id: t.id,
          toolName: t.toolName,
          category: "waktu",
          unitNumber: t.unitNumber,
          locations: t.locations,
          status: "selesai",
          timeRange: `${t.startTimeStr} - ${t.endTimeStr || "-"} WIB`,
          durationText: durStr,
          startNurse: t.nurseName,
          stopNurse: t.stopNurseName || (t.status === "selesai" ? t.nurseName : undefined),
          timestamp: t.endedAtTimestamp || t.startedAtTimestamp,
        })
      })

    // 2. Alat Hitungan Kali (Tindakan Medis) - HANYA YANG SUDAH DISIMPAN DI DATABASE
    countTools
      .filter((c) => c.bed === selectedBedForPanel && c.status === "selesai")
      .forEach((c) => {
        list.push({
          id: c.id,
          toolName: c.toolName,
          category: "kali",
          status: "selesai",
          timeRange: `${c.lastActionTime}`,
          durationText: `${c.savedCount ?? c.count}x Tindakan`,
          startNurse: c.nurseName,
          timestamp: c.createdAt ? new Date(c.createdAt).getTime() : 0,
        })
      })

    return list.sort((a, b) => b.timestamp - a.timestamp)
  }, [timedTools, countTools, selectedBedForPanel])

  // ========================================================
  // RENDER UTAMA HALAMAN KELOLA ALAT
  // ========================================================
  return (
    <div className="flex flex-col gap-6">
      {/* ======================================================== */}
      {/* HEADER UTAMA: BERSIH, PROFESIONAL & AKSI CEPAT */}
      {/* ======================================================== */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              Kelola Alat Medis HCU
            </h1>

            {/* Shift Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-900 text-white dark:bg-neutral-800 dark:text-neutral-100 text-xs font-semibold shadow-xs">
              {activeShift.type === "pagi" && <Sun className="size-3.5 text-amber-400" />}
              {activeShift.type === "siang" && <SunMedium className="size-3.5 text-orange-400" />}
              {activeShift.type === "malam" && <Moon className="size-3.5 text-amber-300" />}
              <span>
                {activeShift.label} ({activeShift.timeRange.replace(" WIB", "")})
              </span>
              {currentTimeStr && (
                <span className="text-white/50 dark:text-neutral-400 font-mono text-[11px] hidden sm:inline">
                  • {currentTimeStr} WIB
                </span>
              )}
            </div>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Pencatatan alat terpasang, operasional mesin ber-timer, frekuensi tindakan medis, dan inventaris HCU.
          </p>
        </div>

        {/* Tombol Aksi Global: Hanya Master Alat */}
        <div className="flex items-center gap-2">
          <Link
            href="/kelola-alat/master-alat"
            className="flex items-center gap-1.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 text-neutral-700 dark:text-neutral-200 text-xs sm:text-sm font-semibold px-3.5 py-2.5 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Layers className="size-3.5 text-[#512da8]" />
            <span>Master Alat</span>
          </Link>
        </div>
      </div>

      <StatsSection stats={statsData} />

      {/* ======================================================== */}
      {/* TAMPILAN PEMANTAUAN PER BED (BED-CENTRIC) */}
      {/* ======================================================== */}
      <div className="flex flex-col lg:flex-row gap-6">
          {/* Kolom Kiri: Denah 21 Bed HCU (Gaya Bioskop) */}
          <div className="w-full lg:w-5/12 flex flex-col gap-4">
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 sm:p-5 shadow-2xs">
              <BedSelector
                title="Denah Bed Ruang HCU"
                subtitle="Klik bed untuk memeriksa alat yang aktif digunakan"
                columnsClass="grid-cols-4 sm:grid-cols-5"
                selectedBed={selectedBedForPanel}
                onSelectBed={(bed) => {
                  if (activePatientsMap[bed]) {
                    setSelectedBedForPanel(bed)
                  }
                }}
                isBedDisabled={(bed) => !activePatientsMap[bed]}
                occupiedStyle="green"
                getBedVariant={(bed, { isDisabled }) => {
                  if (isDisabled) return "empty"
                  const totalActiveTools = timedTools.filter((t) => t.bed === bed && t.status === "berjalan").length
                  if (totalActiveTools > 0) return "occupied"
                  return "available"
                }}
                legendLabels={{
                  available: "Tersedia",
                  occupied: "Alat Aktif",
                  disabled: "Kosong",
                  selected: "Pilihan Anda",
                }}
                getBedStatusText={(bed, { isSelected, isDisabled }) => {
                  if (isDisabled) return "Kosong"
                  const totalActiveTools = timedTools.filter((t) => t.bed === bed && t.status === "berjalan").length

                  if (totalActiveTools > 0) {
                    return (
                      <span
                        className={cn(
                          "px-1.5 py-0.5 rounded-full text-[9px] font-bold leading-none",
                          isSelected
                            ? "bg-white text-[#512da8]"
                            : "bg-neutral-900 text-white dark:bg-neutral-700"
                        )}
                      >
                        {totalActiveTools} Alat
                      </span>
                    )
                  }
                  return isSelected ? "Pilihan" : "Tersedia"
                }}
                getBedTooltip={(bed, { isDisabled }) => {
                  const patient = activePatientsMap[bed]
                  return isDisabled
                    ? `${bed}: Kosong (Tidak ada pasien aktif)`
                    : `${bed}: ${patient?.name ?? ""} (RM: ${patient?.rm ?? ""})`
                }}
              />
            </div>
          </div>

          {/* Kolom Kanan: Dasbor Alat Terpasang di Bed Terpilih */}
          <div className="w-full lg:w-7/12 flex flex-col gap-4 scroll-mt-24" id="detail-bed-panel">
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 sm:p-5 shadow-2xs flex-1">
              {/* Header Bed Pasien */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800 gap-3">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-neutral-900 dark:text-neutral-100">
                        {selectedBedForPanel}
                      </h3>
                      {currentBedPatient ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          Pasien Aktif
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-100 text-muted-foreground">
                          Bed Kosong
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {currentBedPatient
                        ? `${currentBedPatient.name} (RM: ${currentBedPatient.rm})`
                        : "Tidak ada pasien yang terdaftar di bed ini saat ini"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!currentBedPatient}
                  onClick={() => {
                    if (currentBedPatient) handleOpenAttachModal(selectedBedForPanel)
                  }}
                  title={!currentBedPatient ? "Bed belum terisi pasien" : undefined}
                  className={cn(
                    "w-full sm:w-auto flex items-center justify-center gap-1.5 text-xs font-semibold px-3.5 py-2.5 rounded-lg shadow-2xs transition",
                    !currentBedPatient
                      ? "opacity-40 cursor-not-allowed bg-neutral-200 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500"
                      : "bg-[#512da8] hover:bg-[#43238c] text-white cursor-pointer"
                  )}
                >
                  <Plus className="size-3.5" />
                  <span>Pasang Alat di Bed Ini</span>
                </button>
              </div>

              {/* 1. Alat Hitungan Waktu (Mesin Ber-Timer & Alat Terpasang Berdurasi) */}
              <div className="mt-5">
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Timer className="size-3.5 text-[#512da8]" />
                    Alat Hitungan Waktu ({currentBedTimed.length})
                  </h4>
                </div>

                {currentBedTimed.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 text-center text-xs text-muted-foreground bg-neutral-50/50 dark:bg-neutral-800/30">
                    Tidak ada alat hitungan waktu yang sedang aktif di bed ini.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Alat Waktu */}
                    {currentBedTimed.map((timeItem) => (
                      <div
                        key={timeItem.id}
                        className={cn(
                          "flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-xl border transition gap-3",
                          timeItem.status === "berjalan"
                            ? "border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20 dark:border-emerald-900/40"
                            : "border-neutral-200 bg-neutral-50/40 dark:bg-neutral-800/30"
                        )}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs sm:text-sm text-neutral-900 dark:text-neutral-100">
                              {timeItem.toolName}
                            </span>
                            {timeItem.unitNumber && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-neutral-900 text-white dark:bg-neutral-800">
                                #{timeItem.unitNumber}
                              </span>
                            )}
                            {timeItem.locations && timeItem.locations.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {timeItem.locations.map((loc) => (
                                  <span
                                    key={loc}
                                    className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                                  >
                                    {loc}
                                  </span>
                                ))}
                              </div>
                            )}
                            {timeItem.status === "berjalan" ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                                Aktif
                              </span>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">Selesai</span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground mt-1">
                            <span>
                              Tanggal: <strong>{getStartDateStr(timeItem.startedAtTimestamp, timeItem.shiftKey)}</strong>
                            </span>
                            <span>•</span>
                            <span>
                              Mulai: <strong>{timeItem.startTimeStr} WIB</strong>
                            </span>
                            {timeItem.status === "berjalan" ? (
                              <>
                                <span>•</span>
                                <span className="inline-flex items-center gap-1">
                                  Durasi:{" "}
                                  <LiveStopwatch
                                    startedAtTimestamp={timeItem.startedAtTimestamp}
                                    startTimeStr={timeItem.startTimeStr}
                                  />
                                </span>
                              </>
                            ) : (
                              timeItem.endTimeStr && (
                                <>
                                  <span>•</span>
                                  <span>
                                    Selesai: <strong>{timeItem.endTimeStr} WIB</strong>
                                  </span>
                                  <span>•</span>
                                  <span>
                                    Durasi: <strong>{formatDuration(timeItem.durationMinutes)}</strong>
                                  </span>
                                </>
                              )
                            )}
                          </div>
                          {timeItem.notes && (
                            <div className="text-[10px] text-muted-foreground/90 italic truncate mt-0.5">
                              Catatan: {timeItem.notes}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-center">
                          {timeItem.status === "berjalan" && (
                            <button
                              type="button"
                              onClick={() => handleOpenStopTimerModal(timeItem)}
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition cursor-pointer"
                            >
                              <Square className="size-3 fill-current" />
                              <span>Lepas Sekarang</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRequestDeleteTimed(timeItem)}
                            title="Hapus rekaman alat ini"
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                    ))}

                  </div>
                )}
              </div>

              {/* 2. Alat Hitungan Kali (Tindakan) */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Zap className="size-3.5 text-purple-500" />
                    Frekuensi Tindakan Medis ({currentBedCount.length})
                  </h4>
                </div>

                {currentBedCount.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 text-center text-xs text-muted-foreground bg-neutral-50/50 dark:bg-neutral-800/30">
                    Belum ada tindakan medis yang dicatat di bed ini.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {currentBedCount.map((c) => (
                      <div
                        key={c.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xs gap-2.5"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 truncate">
                            {c.toolName}
                          </div>
                          <div className="text-[10px] text-muted-foreground">Terakhir: {c.lastActionTime}</div>
                          {c.notes && (
                            <div className="text-[10px] text-muted-foreground/90 italic truncate mt-0.5">
                              Catatan: {c.notes}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-center">
                          {/* Stepper Counter */}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateCountDraft(c.id, -1)}
                              className="size-6 rounded border border-neutral-200 dark:border-neutral-700 flex items-center justify-center font-bold text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                              title="Kurangi frekuensi tindakan"
                            >
                              -
                            </button>
                            <span className="px-2 py-0.5 rounded bg-neutral-900 text-white font-mono text-xs font-bold">
                              {c.count}x
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateCountDraft(c.id, 1)}
                              className="size-6 rounded border border-neutral-200 dark:border-neutral-700 flex items-center justify-center font-bold text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                              title="Tambah frekuensi tindakan"
                            >
                              +
                            </button>
                          </div>

                          {/* Tombol Simpan (Masuk ke Rekap & Riwayat) */}
                          <button
                            type="button"
                            disabled={savingCountId === c.id}
                            onClick={() => handleSaveCountTool(c.id)}
                            className={cn(
                              "inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg text-white shadow-xs transition cursor-pointer disabled:opacity-50",
                              c.count !== (c.savedCount ?? c.count)
                                ? "bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-400 ring-offset-1 dark:ring-offset-neutral-900"
                                : "bg-emerald-600 hover:bg-emerald-700"
                            )}
                            title={
                              c.count !== (c.savedCount ?? c.count)
                                ? `Simpan perubahan (${c.savedCount ?? c.count}x ➔ ${c.count}x) ke riwayat`
                                : "Simpan tindakan ini ke rekap dan riwayat"
                            }
                          >
                            <Check className="size-3" />
                            <span>Simpan</span>
                          </button>

                          {/* Tombol Hapus (Popup Konfirmasi) */}
                          <button
                            type="button"
                            onClick={() => handleRequestDeleteCount(c)}
                            title="Hapus rekaman tindakan ini"
                            className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. RIWAYAT PEMASANGAN & PENGGUNAAN ALAT DI BED INI (LOG AUDIT PERAWAT) */}
              <div className="mt-6 pt-5 border-t border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <History className="size-3.5 text-[#512da8]" />
                    Riwayat Penggunaan & Pemasangan Alat di Bed Ini ({currentBedHistory.length})
                  </h4>
                </div>

                {currentBedHistory.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 text-center text-xs text-muted-foreground bg-neutral-50/50 dark:bg-neutral-800/30">
                    Belum ada riwayat aktivitas pemasangan atau penggunaan alat di bed ini.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-2 sm:pr-2.5">
                    {currentBedHistory.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-800/40 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-bold text-neutral-900 dark:text-neutral-100">
                            <span>{item.toolName}</span>
                            {item.unitNumber && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-neutral-900 text-white dark:bg-neutral-700">
                                #{item.unitNumber}
                              </span>
                            )}
                            {item.locations && item.locations.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {item.locations.map((loc) => (
                                  <span
                                    key={loc}
                                    className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                  >
                                    {loc}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-semibold",
                              item.status === "berjalan"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : "bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300"
                            )}
                          >
                            {item.status === "berjalan" ? "Aktif / Berjalan" : "Selesai / Dilepas"}
                          </span>
                        </div>

                        <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
                          <div>
                            Waktu: <strong className="text-neutral-700 dark:text-neutral-300">{item.timeRange}</strong>
                          </div>
                          {item.durationText && (
                            <div>
                              {item.category === "kali" ? "Frekuensi: " : "Durasi: "}
                              <strong className="text-neutral-700 dark:text-neutral-300">{item.durationText}</strong>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 border-t border-neutral-200/60 dark:border-neutral-700/60 text-[11px]">
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">
                              {item.category === "kali" ? "Dicatat oleh:" : "Dipasang / Dimulai oleh:"}
                            </span>
                            <strong className="text-neutral-800 dark:text-neutral-200">{item.startNurse}</strong>
                          </div>
                          {item.category === "waktu" && item.status === "selesai" && item.stopNurse && (
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">Dilepas / Dihentikan oleh:</span>
                              <strong className="text-[#512da8] dark:text-purple-300">{item.stopNurse}</strong>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      {/* ======================================================== */}
      {/* MODAL 1: CATAT / PASANG ALAT KE BED (TEMPLATE APPMODAL) */}
      {/* ======================================================== */}
      <AppModal
        isOpen={showAttachModal}
        onClose={() => setShowAttachModal(false)}
        title="Catat & Pasang Alat Medis HCU"
        subtitle={
          <span>
            Perawat Penginput: <strong className="text-foreground">{currentNurse}</strong>
          </span>
        }
        icon={<Stethoscope className="size-5" />}
        onSubmit={handleSubmitAttach}
        submitText="Simpan & Pasang Alat"
        maxWidth="2xl"
      >
        {formError && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200">
            <AlertCircle className="size-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Informasi Bed Pasien Terpilih */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[#512da8] text-white font-bold text-xs shadow-xs">
              {formBed.replace("Bed ", "B-")}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                  {formBed}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  Pasien Aktif
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activePatientsMap[formBed]
                  ? `${activePatientsMap[formBed].name} (RM: ${activePatientsMap[formBed].rm})`
                  : "Pasien HCU"}
              </p>
            </div>
          </div>
        </div>

        {/* Kelompok Kategori Alat Medis */}
        <div>
          <label className="block text-xs font-bold text-neutral-900 dark:text-neutral-100 mb-1.5">
            Kelompok Kategori Alat Medis *
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setFormCategory("waktu")
                const firstTimed = masterTools.find((m) => m.category === "waktu")?.name || ""
                setFormToolName(firstTimed)
                setFormUnitNumber(null)
                const master = masterTools.find((m) => m.name === firstTimed)
                if (master?.applicableLocations && master.applicableLocations.length === 1) {
                  setFormLocations([master.applicableLocations[0]])
                } else {
                  setFormLocations([])
                }
              }}
              className={cn(
                "p-2.5 rounded-xl border text-xs font-semibold text-center transition cursor-pointer",
                formCategory === "waktu"
                  ? "bg-[#512da8] text-white border-[#512da8] shadow-xs"
                  : "bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700"
              )}
            >
              1. Hitungan Waktu
            </button>

            <button
              type="button"
              onClick={() => {
                setFormCategory("kali")
                const firstCount = masterTools.find((m) => m.category === "kali")?.name || "EKG (Elektrokardiogram)"
                setFormToolName(firstCount)
                setFormLocations([])
                setFormUnitNumber(null)
              }}
              className={cn(
                "p-2.5 rounded-xl border text-xs font-semibold text-center transition cursor-pointer",
                formCategory === "kali"
                  ? "bg-[#512da8] text-white border-[#512da8] shadow-xs"
                  : "bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700"
              )}
            >
              2. Hitungan Kali
            </button>
          </div>
        </div>

        {/* 3. Input Khusus Sesuai Kategori */}
        {formCategory === "waktu" && (() => {
          const selectedMaster = masterTools.find((m) => m.name === formToolName)
          const hasUnitNum = selectedMaster?.hasUnitNumber ?? false
          const startNum = selectedMaster?.unitStartNumber || 1
          const endNum =
            selectedMaster?.unitEndNumber ||
            selectedMaster?.numberedUnitsCount ||
            selectedMaster?.totalUnits ||
            21
          const totalUnitsCount = Math.max(1, endNum - startNum + 1)

          // Ketersediaan alat tanpa nomor unit
          const inUseCount = timedTools.filter(
            (t) => t.toolName === formToolName && t.status === "berjalan"
          ).length
          const damagedCount = damagedTools
            .filter((d) => d.toolName === formToolName)
            .reduce((sum, d) => sum + d.quantity, 0)
          const totalQuota = selectedMaster?.totalUnits || 0
          const remainingUnits = Math.max(0, totalQuota - (inUseCount + damagedCount))
          const isAllInUse = !hasUnitNum && totalQuota > 0 && remainingUnits <= 0

          return (
            <div className="space-y-3.5 p-3.5 rounded-xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20">
              <div>
                <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                  Pilih Alat Hitungan Waktu *
                </label>
                <select
                  value={formToolName}
                  onChange={(e) => {
                    const chosen = e.target.value
                    setFormToolName(chosen)
                    setFormUnitNumber(null)
                    const m = masterTools.find((item) => item.name === chosen)
                    if (m?.applicableLocations && m.applicableLocations.length === 1) {
                      setFormLocations([m.applicableLocations[0]])
                    } else {
                      setFormLocations([])
                    }
                  }}
                  className="w-full text-xs sm:text-sm p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 cursor-pointer"
                >
                  {masterTools
                    .filter((m) => m.category === "waktu")
                    .map((m) => (
                      <option key={m.id} value={m.name}>
                        {m.name}{" "}
                        {m.hasUnitNumber
                          ? `(Unit #${m.unitStartNumber || 1} - #${m.unitEndNumber || m.totalUnits})`
                          : m.totalUnits > 0
                          ? `(${m.totalUnits} Unit)`
                          : m.applicableLocations && m.applicableLocations.length > 0
                          ? "(Alat Anatomi Tubuh)"
                          : "(Sentral)"}
                      </option>
                    ))}
                </select>
              </div>

              {/* Lokasi Pemasangan Anatomi jika alat memilikinya */}
              {selectedMaster?.applicableLocations && selectedMaster.applicableLocations.length > 0 && (
                <div className="space-y-2 pt-1 border-t border-amber-200/60 dark:border-amber-900/40">
                  {selectedMaster.applicableLocations.length === 1 ? (
                    <div className="p-3 rounded-xl bg-white dark:bg-neutral-800/80 border border-blue-200 dark:border-blue-800/60 flex items-center gap-2.5 shadow-2xs">
                      <CheckCircle2 className="size-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                        Lokasi Pemasangan Anatomi: {selectedMaster.applicableLocations[0]} (Pasti & Otomatis)
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1.5">
                        Pilih Lokasi Pemasangan Anatomi:
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {selectedMaster.applicableLocations.map((loc) => {
                          const isChecked = formLocations.includes(loc)
                          return (
                            <label
                              key={loc}
                              className={cn(
                                "flex items-center gap-1.5 p-2 rounded-lg border text-xs cursor-pointer select-none transition",
                                isChecked
                                  ? "bg-blue-100/80 border-blue-400 font-semibold text-blue-900 dark:bg-blue-950 dark:text-blue-200 shadow-2xs"
                                  : "bg-white dark:bg-neutral-800 border-neutral-200 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50"
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormLocations((prev) => [...prev, loc])
                                  } else {
                                    setFormLocations((prev) => prev.filter((l) => l !== loc))
                                  }
                                }}
                                className="rounded text-[#512da8] focus:ring-0"
                              />
                              <span>{loc}</span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 1. Jika Memiliki Nomor Unit Fisik */}
              {hasUnitNum && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                      Pilih Nomor Unit {formToolName} (Rentang #{startNum} s/d #{endNum}) *
                    </label>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="flex items-center gap-1">
                        <span className="size-2 rounded bg-neutral-900" /> Dipilih
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="size-2 rounded bg-rose-200 border border-rose-400" /> Dipakai/Rusak
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-8 sm:grid-cols-10 gap-1.5 max-h-36 overflow-y-auto p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800">
                    {Array.from({ length: totalUnitsCount }, (_, i) => startNum + i).map((num) => {
                      const isOccupied = occupiedUnitMap.has(`${formToolName}#${num}`)
                      const isDamaged = damagedUnitSet.has(`${formToolName}#${num}`)
                      const isSelected = formUnitNumber === num
                      const occInfo = occupiedUnitMap.get(`${formToolName}#${num}`)

                      return (
                        <button
                          key={num}
                          type="button"
                          disabled={isOccupied || isDamaged}
                          onClick={() => setFormUnitNumber(num)}
                          title={
                            isDamaged
                              ? `Unit #${num}: Rusak`
                              : isOccupied
                              ? `Unit #${num}: Dipakai di ${occInfo?.bed}`
                              : `Unit #${num}: Siap Pakai`
                          }
                          className={cn(
                            "py-1.5 rounded text-xs font-bold transition text-center",
                            isSelected
                              ? "bg-neutral-900 text-white shadow-xs"
                              : isDamaged
                              ? "bg-rose-100 text-rose-500 border border-rose-300 cursor-not-allowed line-through"
                              : isOccupied
                              ? "bg-rose-50 text-rose-600 border border-rose-200 cursor-not-allowed opacity-60"
                              : "bg-neutral-100 text-neutral-700 hover:bg-[#512da8] hover:text-white cursor-pointer"
                          )}
                        >
                          {num}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 2. Jika Tidak Memiliki Nomor Unit Fisik */}
              {!hasUnitNum && totalQuota > 0 && (
                <div>
                  {isAllInUse ? (
                    <div className="p-3.5 rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 text-xs">
                      <div className="flex items-center gap-2 font-bold mb-1">
                        <AlertCircle className="size-4 text-rose-600 dark:text-rose-400 shrink-0" />
                        <span>Semua Unit Sedang Digunakan ({inUseCount}/{totalQuota} Unit)</span>
                      </div>
                      <p className="leading-relaxed">
                        Seluruh unit fisik <strong>{formToolName}</strong> saat ini sedang beroperasi pada pasien lain atau dalam perbaikan teknisi. Anda tidak dapat memasang alat ini sampai ada unit yang selesai dilepas.
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Ketersediaan Unit di Ruangan HCU:</span>
                      </div>
                      <span className="font-bold">
                        Tersisa {remainingUnits} dari {totalQuota} unit ({inUseCount} sedang digunakan)
                      </span>
                    </div>
                  )}
                </div>
              )}

              {!hasUnitNum && totalQuota === 0 && (
                <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/60 text-neutral-700 dark:text-neutral-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>Suplai Sentral HCU (Siap Digunakan Kapan Saja Tanpa Batasan Unit)</span>
                </div>
              )}

              {/* Pilihan Mode Waktu Mulai: Realtime Sekarang vs Sesuai Jam Masuk vs Manual */}
              <div>
                <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                  Metode Waktu Mulai:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormTimeMode("now")}
                    className={cn(
                      "p-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer text-center",
                      formTimeMode === "now"
                        ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                        : "bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700/50"
                    )}
                  >
                    <Play className="size-3 fill-current" />
                    <span>Mulai Sekarang (Otomatis)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormTimeMode("admission")}
                    className={cn(
                      "p-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer text-center",
                      formTimeMode === "admission"
                        ? "bg-sky-600 text-white border-sky-700 shadow-xs"
                        : "bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700/50"
                    )}
                  >
                    <Clock className="size-3" />
                    <span>
                      Sesuai Jam Masuk ({activePatientsMap[formBed]?.admissionTime?.replace(" WIB", "") || "Pasien"})
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormTimeMode("manual")}
                    className={cn(
                      "p-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer text-center",
                      formTimeMode === "manual"
                        ? "bg-[#512da8] text-white border-[#512da8] shadow-xs"
                        : "bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700/50"
                    )}
                  >
                    <Clock className="size-3" />
                    <span>Input Rentang Jam Manual</span>
                  </button>
                </div>

                {formTimeMode === "admission" && (
                  <div className="p-2.5 rounded-lg border border-sky-200 dark:border-sky-900/60 bg-sky-50/70 dark:bg-sky-950/20 text-sky-800 dark:text-sky-300 text-xs flex items-center gap-2 mt-2">
                    <CheckCircle2 className="size-4 shrink-0 text-sky-600 dark:text-sky-400" />
                    <span>
                      Waktu mulai alat diselaraskan dengan waktu registrasi pasien di bed ini:{" "}
                      <strong>
                        {activePatientsMap[formBed]?.admissionDate || "Hari ini"} pukul{" "}
                        {activePatientsMap[formBed]?.admissionTime || "00:00"} WIB
                      </strong>
                    </span>
                  </div>
                )}

                {formTimeMode === "manual" && (
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div>
                      <label className="block text-[11px] text-muted-foreground mb-1">Jam Mulai</label>
                      <input
                        type="time"
                        value={formManualStart}
                        onChange={(e) => setFormManualStart(e.target.value)}
                        className="w-full p-2 text-xs border rounded-lg bg-white dark:bg-neutral-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-muted-foreground mb-1">
                        Jam Selesai (Opsional)
                      </label>
                      <input
                        type="time"
                        value={formManualEnd}
                        placeholder="Biarkan kosong jika masih berjalan"
                        onChange={(e) => setFormManualEnd(e.target.value)}
                        className="w-full p-2 text-xs border rounded-lg bg-white dark:bg-neutral-800"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })()}

        {formCategory === "kali" && (
          <div className="space-y-3 p-3.5 rounded-xl border border-purple-100 dark:border-purple-900/40 bg-purple-50/40 dark:bg-purple-950/20">
            <div>
              <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                Pilih Alat Hitungan Kali *
              </label>
              <select
                value={formToolName}
                onChange={(e) => setFormToolName(e.target.value)}
                className="w-full text-xs sm:text-sm p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 cursor-pointer"
              >
                {masterTools
                  .filter((m) => m.category === "kali")
                  .map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                Jumlah Tindakan (Berapa Kali)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFormCountNumber((prev) => Math.max(1, prev - 1))}
                  className="size-8 rounded-lg border border-neutral-300 flex items-center justify-center font-bold text-sm bg-white cursor-pointer"
                >
                  -
                </button>
                <span className="font-mono font-bold text-base px-4 py-1 rounded-lg bg-neutral-900 text-white">
                  {formCountNumber}x
                </span>
                <button
                  type="button"
                  onClick={() => setFormCountNumber((prev) => prev + 1)}
                  className="size-8 rounded-lg border border-neutral-300 flex items-center justify-center font-bold text-sm bg-white cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Catatan / Keterangan Tambahan */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Catatan Tambahan (Opsional)
            </label>
            <span className="text-[10px] text-muted-foreground font-mono">
              {formNotes.length}/50
            </span>
          </div>
          <input
            type="text"
            maxLength={50}
            value={formNotes}
            onChange={(e) => setFormNotes(e.target.value.slice(0, 50))}
            placeholder="Ringkas (maks 50 karakter), contoh: Kecepatan 20 tpm, syringe 50cc..."
            className="w-full text-xs sm:text-sm p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
          />
        </div>
      </AppModal>

      {/* ======================================================== */}
      {/* MODAL 2: KONFIRMASI LEPAS / SELESAI ALAT BER-TIMER */}
      {/* ======================================================== */}
      <AppModal
        isOpen={showStopTimerModal}
        onClose={() => setShowStopTimerModal(false)}
        title="Konfirmasi Selesai & Lepas Alat"
        subtitle="Periksa dan koreksi jam selesai alat medis jika diperlukan"
        icon={<Square className="size-5 text-amber-500 fill-current" />}
        onSubmit={handleConfirmStopTimer}
        submitText="Konfirmasi & Lepas Alat"
        maxWidth="md"
      >
        {selectedTimedTool && (
          <div className="space-y-4 text-xs sm:text-sm">
            <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Alat Medis:</span>
                <span className="font-bold text-neutral-900 dark:text-neutral-100">
                  {selectedTimedTool.toolName}{" "}
                  {selectedTimedTool.unitNumber ? `#${selectedTimedTool.unitNumber}` : ""}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lokasi Bed:</span>
                <span className="font-semibold">{selectedTimedTool.bed} ({selectedTimedTool.patientName})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Perawat Pemasang (Mulai):</span>
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">{selectedTimedTool.nurseName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Perawat Penyelesai (Stop):</span>
                <span className="font-semibold text-[#512da8] dark:text-purple-300">{currentNurse}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Jam Mulai:</span>
                <span className="font-mono font-bold text-emerald-600">{selectedTimedTool.startTimeStr} WIB</span>
              </div>
            </div>

            {/* Input Jam Selesai dengan Fitur Koreksi Manual */}
            <div>
              <label className="block text-xs font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                Jam Selesai / Dilepas (Koreksi jika terlambat input):
              </label>
              <input
                type="time"
                value={stopTimeInput}
                onChange={(e) => handleStopTimeChange(e.target.value)}
                required
                className="w-full p-2.5 text-sm border rounded-lg bg-background border-border font-mono font-bold focus:outline-[#512da8]"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Default terisi jam saat ini. Anda dapat memajukan jam jika alat sebenarnya sudah dilepas lebih awal.
              </p>
            </div>

            {/* Preview Durasi Otomatis */}
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                Lama Pemakaian Terhitung:
              </span>
              <span className="font-mono font-bold text-amber-900 dark:text-amber-100 text-base">
                {formatDuration(stopCalculatedMinutes)}
              </span>
            </div>
          </div>
        )}
      </AppModal>

      {/* ======================================================== */}
      {/* MODAL 3: LAPOR ALAT RUSAK / PEMELIHARAAN */}
      {/* ======================================================== */}
      <AppModal
        isOpen={showDamageModal}
        onClose={() => setShowDamageModal(false)}
        title="Lapor Alat Rusak / Perbaikan"
        subtitle="Alat yang rusak otomatis dinonaktifkan dari pemilihan alat pasien"
        icon={<Wrench className="size-5 text-rose-500" />}
        onSubmit={handleSubmitDamage}
        submitText="Simpan Laporan Kerusakan"
        submitVariant="danger"
        maxWidth="md"
      >
        {dmgError && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200">
            <AlertCircle className="size-4 shrink-0" />
            <span>{dmgError}</span>
          </div>
        )}

        <div className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold mb-1">Pilih Alat Rusak *</label>
            <select
              value={dmgToolName}
              onChange={(e) => {
                setDmgToolName(e.target.value)
                setDmgSelectedNumbers([])
                setDmgQuantity(1)
                setDmgError(null)
              }}
              className="w-full text-xs sm:text-sm p-2 rounded-lg border border-border bg-background cursor-pointer"
            >
              {masterTools.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name}{" "}
                  {m.hasUnitNumber
                    ? `(Unit #${m.unitStartNumber || 1}-${m.unitEndNumber || m.totalUnits})`
                    : m.totalUnits > 0
                    ? `(${m.totalUnits} unit)`
                    : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Kondisi Dinamis Form Lapor Rusak Berdasarkan Jenis Master Tool */}
          {(() => {
            const target = masterTools.find((m) => m.name === dmgToolName)

            // Kondisi 1: Memiliki Nomor Unit Fisik -> Tampilkan Grid Chip Nomor (bisa multi-select)
            if (target?.hasUnitNumber) {
              const start = target.unitStartNumber || 1
              const end = target.unitEndNumber || target.totalUnits || 21
              const total = Math.max(1, end - start + 1)

              // Nomor unit yang sudah berstatus rusak saat ini
              const alreadyDamagedNumbers = new Set(
                damagedTools
                  .filter((d) => d.toolName === dmgToolName)
                  .flatMap((d) => d.unitNumbers)
              )

              return (
                <div className="space-y-2 p-3 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/20">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                      Pilih Nomor Unit {target.name} yang Rusak *
                    </label>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="flex items-center gap-1 text-neutral-800 dark:text-neutral-200">
                        <span className="size-2 rounded bg-neutral-900 dark:bg-white" /> Dipilih
                      </span>
                      <span className="flex items-center gap-1 text-rose-600">
                        <span className="size-2 rounded bg-rose-200 border border-rose-400" /> Sudah Rusak
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-8 sm:grid-cols-10 gap-1.5 max-h-40 overflow-y-auto p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800">
                    {Array.from({ length: total }, (_, i) => start + i).map((num) => {
                      const isAlreadyDamaged = alreadyDamagedNumbers.has(num)
                      const isSelected = dmgSelectedNumbers.includes(num)

                      return (
                        <button
                          key={num}
                          type="button"
                          disabled={isAlreadyDamaged}
                          onClick={() => {
                            setDmgSelectedNumbers((prev) => {
                              const next = prev.includes(num)
                                ? prev.filter((n) => n !== num)
                                : [...prev, num]
                              setDmgQuantity(Math.max(1, next.length))
                              return next
                            })
                          }}
                          title={
                            isAlreadyDamaged
                              ? `Unit #${num}: Sudah dilaporkan rusak`
                              : isSelected
                              ? `Unit #${num}: Dipilih rusak (klik untuk batal)`
                              : `Unit #${num}: Klik untuk pilih rusak`
                          }
                          className={cn(
                            "py-1.5 rounded text-xs font-bold transition text-center cursor-pointer select-none",
                            isSelected
                              ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-xs"
                              : isAlreadyDamaged
                              ? "bg-rose-100 text-rose-500 border border-rose-300 cursor-not-allowed line-through opacity-70"
                              : "bg-neutral-100 text-neutral-700 hover:bg-rose-600 hover:text-white"
                          )}
                        >
                          {num}
                        </button>
                      )
                    })}
                  </div>

                  <div className="flex items-center justify-between text-xs font-semibold pt-1 text-rose-800 dark:text-rose-300">
                    <span>
                      Unit Terpilih:{" "}
                      {dmgSelectedNumbers.length > 0
                        ? `#${[...dmgSelectedNumbers].sort((a, b) => a - b).join(", #")}`
                        : "Belum ada unit yang dipilih"}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-rose-200/70 text-rose-900 text-[11px] font-bold">
                      Total: {dmgSelectedNumbers.length} Unit
                    </span>
                  </div>
                </div>
              )
            }

            // Kondisi 2: Tidak Memiliki Nomor Unit, Tapi Memiliki Jumlah Unit Fisik
            if (target && target.totalUnits > 0) {
              return (
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Jumlah Unit Rusak (Tersedia {target.totalUnits} Unit di Ruangan HCU) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={target.totalUnits}
                    value={dmgQuantity}
                    onChange={(e) =>
                      setDmgQuantity(
                        Math.max(
                          1,
                          Math.min(target.totalUnits, parseInt(e.target.value) || 1)
                        )
                      )
                    }
                    className="w-full text-xs sm:text-sm p-2 rounded-lg border border-border bg-background font-mono font-bold"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Alat ini tidak memiliki nomor unit fisik. Masukkan berapa unit yang mengalami kerusakan.
                  </p>
                </div>
              )
            }

            // Kondisi 3: Tidak Memiliki Jumlah Unit Maupun Nomor Unit
            return (
              <div>
                <label className="block text-xs font-semibold mb-1">Jumlah Unit Rusak *</label>
                <input
                  type="number"
                  min={1}
                  value={dmgQuantity}
                  onChange={(e) =>
                    setDmgQuantity(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  className="w-full text-xs sm:text-sm p-2 rounded-lg border border-border bg-background font-mono font-bold"
                />
              </div>
            )
          })()}

          <div>
            <label className="block text-xs font-semibold mb-1">Tingkat Kerusakan</label>
            <select
              value={dmgSeverity}
              onChange={(e) =>
                setDmgSeverity(
                  e.target.value as "rusak_ringan" | "rusak_berat"
                )
              }
              className="w-full text-xs sm:text-sm p-2 rounded-lg border border-border bg-background"
            >
              <option value="rusak_ringan">Rusak Ringan (Kendala Sensor/Kabel)</option>
              <option value="rusak_berat">Rusak Berat (Tidak Berfungsi)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Keterangan Kerusakan</label>
            <textarea
              rows={2}
              value={dmgNotes}
              onChange={(e) => setDmgNotes(e.target.value)}
              placeholder="Jelaskan kendala kerusakan alat..."
              className="w-full text-xs sm:text-sm p-2 rounded-lg border border-border bg-background"
            />
          </div>
        </div>
      </AppModal>

      {/* ======================================================== */}
      {/* MODAL 4: TAMBAH ALAT BARU KE MASTER INVENTARIS */}
      {/* ======================================================== */}
      <AppModal
        isOpen={showAddMasterModal}
        onClose={() => setShowAddMasterModal(false)}
        title="Tambah Alat Medis Baru ke Master HCU"
        subtitle="Daftarkan peralatan medis baru ke dalam inventaris ruangan"
        icon={<Plus className="size-5" />}
        onSubmit={handleSubmitAddMaster}
        submitText="Tambahkan ke Katalog"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1">Nama Alat Medis *</label>
            <input
              type="text"
              required
              value={newMasterName}
              onChange={(e) => setNewMasterName(e.target.value)}
              placeholder="Contoh: Ventilator Transport, Blood Warmer..."
              className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-border bg-background"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5">Kategori Penggunaan *</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setNewMasterCategory("waktu")}
                className={cn(
                  "p-2.5 rounded-xl border text-xs font-semibold text-center transition cursor-pointer",
                  newMasterCategory === "waktu"
                    ? "bg-[#512da8] text-white border-[#512da8] shadow-xs"
                    : "bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-300"
                )}
              >
                1. Hitungan Waktu
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewMasterCategory("kali")
                  setNewMasterHasUnitNumber(false)
                  setNewMasterHasTotalUnits(false)
                  setNewMasterHasLocation(false)
                }}
                className={cn(
                  "p-2.5 rounded-xl border text-xs font-semibold text-center transition cursor-pointer",
                  newMasterCategory === "kali"
                    ? "bg-[#512da8] text-white border-[#512da8] shadow-xs"
                    : "bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-300"
                )}
              >
                2. Hitungan Kali
              </button>
            </div>
          </div>

          {/* Opsi Khusus Hitungan Waktu */}
          {newMasterCategory === "waktu" && (
            <div className="space-y-3 p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-800/40">
              <span className="block text-xs font-bold text-neutral-900 dark:text-neutral-100">
                Pilihan Konfigurasi Fitur Alat:
              </span>

              {/* Checkbox 1: Nomor Unit */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newMasterHasUnitNumber}
                    onChange={(e) => {
                      const checked = e.target.checked
                      setNewMasterHasUnitNumber(checked)
                      if (checked) {
                        setNewMasterHasTotalUnits(false)
                      }
                    }}
                    className="rounded text-[#512da8] focus:ring-0"
                  />
                  <span>Memiliki Nomor Unit Fisik</span>
                </label>

                {newMasterHasUnitNumber && (
                  <div className="pl-6 space-y-2">
                    <div className="flex items-center gap-4 text-xs">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="unitMode"
                          checked={newMasterUnitMode === "single"}
                          onChange={() => setNewMasterUnitMode("single")}
                        />
                        <span>1 Nomor Unit Saja</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="unitMode"
                          checked={newMasterUnitMode === "range"}
                          onChange={() => setNewMasterUnitMode("range")}
                        />
                        <span>Rentang Nomor Unit</span>
                      </label>
                    </div>

                    {newMasterUnitMode === "single" ? (
                      <div>
                        <label className="block text-[11px] text-muted-foreground mb-1">Nomor Unit (Contoh: 1)</label>
                        <input
                          type="number"
                          min={1}
                          value={newMasterSingleUnit}
                          onChange={(e) => setNewMasterSingleUnit(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-32 p-2 text-xs border rounded-lg bg-background font-mono font-bold"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[11px] text-muted-foreground mb-1">Rentang Nomor (Contoh: Unit 1 s/d 20)</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            placeholder="Dari"
                            value={newMasterRangeStart}
                            onChange={(e) => setNewMasterRangeStart(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-24 p-2 text-xs border rounded-lg bg-background font-mono font-bold"
                          />
                          <span className="text-xs text-muted-foreground">s/d</span>
                          <input
                            type="number"
                            min={1}
                            placeholder="Sampai"
                            value={newMasterRangeEnd}
                            onChange={(e) => setNewMasterRangeEnd(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-24 p-2 text-xs border rounded-lg bg-background font-mono font-bold"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Checkbox 2: Total Unit */}
              <div className="space-y-2 pt-1 border-t border-neutral-200 dark:border-neutral-700">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newMasterHasTotalUnits}
                    onChange={(e) => {
                      const checked = e.target.checked
                      setNewMasterHasTotalUnits(checked)
                      if (checked) {
                        setNewMasterHasUnitNumber(false)
                      }
                    }}
                    className="rounded text-[#512da8] focus:ring-0"
                  />
                  <span>Memiliki Total Unit Kuota Fisik (Tanpa Penomoran)</span>
                </label>

                {newMasterHasTotalUnits && (
                  <div className="pl-6">
                    <label className="block text-[11px] text-muted-foreground mb-1">Jumlah Total Unit di Ruangan</label>
                    <input
                      type="number"
                      min={1}
                      value={newMasterTotalUnits}
                      onChange={(e) => setNewMasterTotalUnits(Math.max(1, parseInt(e.target.value) || 1))}
                      placeholder="Contoh: 10"
                      className="w-32 p-2 text-xs border rounded-lg bg-background font-mono font-bold"
                    />
                  </div>
                )}
              </div>

              {/* Checkbox 3: Lokasi Pemasangan Alat */}
              <div className="space-y-2 pt-1 border-t border-neutral-200 dark:border-neutral-700">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newMasterHasLocation}
                    onChange={(e) => setNewMasterHasLocation(e.target.checked)}
                    className="rounded text-[#512da8] focus:ring-0"
                  />
                  <span>Memiliki Lokasi Pemasangan Anatomi</span>
                </label>

                {newMasterHasLocation && (
                  <div className="pl-6 space-y-2">
                    <div className="space-y-1.5">
                      {newMasterLocations.map((loc, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={loc}
                            onChange={(e) => {
                              const val = e.target.value
                              setNewMasterLocations((prev) => {
                                const next = [...prev]
                                next[idx] = val
                                return next
                              })
                            }}
                            placeholder={`Lokasi ${idx + 1} (Contoh: Tangan Kanan, Leher...)`}
                            className="flex-1 p-2 text-xs border rounded-lg bg-background"
                          />
                          <button
                            type="button"
                            disabled={newMasterLocations.length <= 1}
                            onClick={() => {
                              if (newMasterLocations.length > 1) {
                                setNewMasterLocations((prev) => prev.filter((_, i) => i !== idx))
                              }
                            }}
                            title={newMasterLocations.length <= 1 ? "Menyisakan minimal 1 kolom" : "Hapus kolom ini"}
                            className={cn(
                              "p-2 rounded-lg border transition",
                              newMasterLocations.length <= 1
                                ? "opacity-30 cursor-not-allowed text-neutral-400 border-neutral-200"
                                : "text-rose-500 border-rose-200 hover:bg-rose-50 cursor-pointer dark:hover:bg-rose-950/40"
                            )}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {newMasterLocations.length < 10 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (newMasterLocations.length < 10) {
                            setNewMasterLocations((prev) => [...prev, ""])
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-dashed border-[#512da8]/40 text-[#512da8] hover:bg-[#512da8]/5 transition cursor-pointer"
                      >
                        <Plus className="size-3.5" />
                        <span>+ Tambah Lokasi Pemasangan ({newMasterLocations.length}/10)</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {newMasterCategory === "kali" && (
            <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/40 text-xs text-purple-900 dark:text-purple-200">
              Kategori <strong>Hitungan Kali</strong> mencatat frekuensi tindakan medis (misal: EKG, GDS, Suction) tanpa memerlukan nomor unit fisik atau lokasi pemasangan anatomi.
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold mb-1">Deskripsi Tambahan (Opsional)</label>
            <textarea
              rows={2}
              value={newMasterDescription}
              onChange={(e) => setNewMasterDescription(e.target.value)}
              placeholder="Keterangan penempatan atau fungsi khusus alat..."
              className="w-full text-xs sm:text-sm p-2 rounded-lg border border-border bg-background"
            />
          </div>
        </div>
      </AppModal>

      {/* ======================================================== */}
      {/* MODAL 5: KONFIRMASI RESET SENSUS SHIFT */}
      {/* ======================================================== */}
      <AppModal
        isOpen={showResetConfirmModal}
        onClose={() => setShowResetConfirmModal(false)}
        title="Reset Sensus Alat Shift Baru"
        subtitle="Mulai penghitungan operan shift baru untuk ruang HCU"
        icon={<RotateCcw className="size-5 text-amber-500" />}
        onSubmit={(e) => {
          e.preventDefault()
          handleResetShiftSensus()
        }}
        submitText="Ya, Reset Sensus Shift"
        submitVariant="primary"
        maxWidth="md"
      >
        <div className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 space-y-3 leading-relaxed">
          <p>
            Tindakan ini akan mereset <strong>total lama pemakaian mesin ber-timer</strong> dan{" "}
            <strong>hitungan kali tindakan</strong> menjadi nol untuk persiapan serah terima shift baru.
          </p>
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-200 text-xs">
            ⚠️ <strong>Perhatian:</strong> Mesin yang sedang aktif berjalan di pasien tidak akan dimatikan,
            hanya akumulasi shift sebelumnya yang diarsipkan.
          </div>
        </div>
      </AppModal>

      {/* ======================================================== */}
      {/* MODAL 6: KONFIRMASI HAPUS CATATAN ALAT / TINDAKAN */}
      {/* ======================================================== */}
      <AppModal
        isOpen={Boolean(deleteConfirmTarget)}
        onClose={() => setDeleteConfirmTarget(null)}
        title={deleteConfirmTarget?.type === "waktu" ? "Hapus Catatan Alat Medis?" : "Hapus Catatan Tindakan Medis?"}
        subtitle={
          deleteConfirmTarget
            ? `Konfirmasi pembatalan pemakaian alat pada ${deleteConfirmTarget.bed}`
            : undefined
        }
        icon={<Trash2 className="size-5 text-rose-500" />}
        onSubmit={handleExecuteDelete}
        submitText="Ya, Hapus Data"
        submitVariant="danger"
        maxWidth="md"
      >
        <div className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 space-y-3 leading-relaxed">
          <p>
            Apakah Anda yakin ingin menghapus data{" "}
            <strong>{deleteConfirmTarget?.name}</strong> dari{" "}
            <strong>{deleteConfirmTarget?.bed}</strong>?
          </p>
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-200 text-xs">
            ⚠️ <strong>Perhatian:</strong> Data ini akan dihapus secara permanen dari sistem dan{" "}
            <strong>tidak akan dicatat ke dalam riwayat pemakaian maupun rekap laporan</strong>.
          </div>
        </div>
      </AppModal>
    </div>
  )
}

// ========================================================
// FUNGSI HELPER WAKTU & SHIFT RUANG HCU
// ========================================================

export function getShiftInfo(now: Date): ShiftInfo {
  const hours = now.getHours()
  const minutes = now.getMinutes()
  const timeVal = hours + minutes / 60

  const yy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, "0")
  const dd = String(now.getDate()).padStart(2, "0")
  const dateStr = `${yy}-${mm}-${dd}`

  if (timeVal >= 7 && timeVal < 14) {
    return {
      type: "pagi",
      name: "Pagi",
      label: "Shift Pagi",
      timeRange: "07.00 - 14.00 WIB",
      nextShiftTime: "14.00 WIB",
      shiftKey: `${dateStr}-pagi`,
    }
  } else if (timeVal >= 14 && timeVal < 21) {
    return {
      type: "siang",
      name: "Siang",
      label: "Shift Siang",
      timeRange: "14.00 - 21.00 WIB",
      nextShiftTime: "21.00 WIB",
      shiftKey: `${dateStr}-siang`,
    }
  } else {
    let shiftDateStr = dateStr
    if (timeVal < 7) {
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      const yyy = yesterday.getFullYear()
      const ymm = String(yesterday.getMonth() + 1).padStart(2, "0")
      const ydd = String(yesterday.getDate()).padStart(2, "0")
      shiftDateStr = `${yyy}-${ymm}-${ydd}`
    }

    return {
      type: "malam",
      name: "Malam",
      label: "Shift Malam",
      timeRange: "21.00 - 07.00 WIB",
      nextShiftTime: "07.00 WIB",
      shiftKey: `${shiftDateStr}-malam`,
    }
  }
}

function getFormattedDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = d.getFullYear()
  return `${day}-${month}-${year}`
}

function getFormattedTime(d: Date): string {
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  const ss = String(d.getSeconds()).padStart(2, "0")
  return `${hh}:${mm}:${ss}`
}
