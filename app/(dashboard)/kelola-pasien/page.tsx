"use client"

import * as React from "react"
import { useState, useEffect, useRef, useMemo } from "react"
import {
  UserPlus,
  LogOut,
  BedSingle,
  Activity,
  Clock,
  ShieldCheck,
  Search,
  Filter,
  Edit2,
  Calendar as CalendarIcon,
  UserCheck,
  Sun,
  SunMedium,
  Moon,
  History,
} from "lucide-react"
import { cn } from "cn"
import { StatsSection, StatItem } from "@/components/stats-section"
import { PaginatedTable, TableColumn } from "@/components/paginated-table"
import { AppSelect } from "@/components/ui/app-select"
import { format, parse } from "date-fns"
import { ModalPasienForm } from "./components/modal-pasien-form"
import { ModalPasienKeluar } from "./components/modal-pasien-keluar"
import {
  fetchPatientsFromDb,
  insertPatientInDb,
  updatePatientInDb,
} from "@/lib/services/pasien-service"
import { releaseToolsForBed } from "@/lib/services/alat-service"
import { toast } from "@/components/ui/app-toast"
import { REGULAR_BEDS, ISOLATION_BEDS, ALL_BEDS } from "@/lib/constants/beds"
import {
  type Patient,
  type CareLevel,
  type ShiftHistoryRecord,
} from "@/lib/types/patient"
import {
  type ShiftType,
  type ShiftInfo,
  getShiftInfo,
  getFormattedDate,
  getFormattedTime,
} from "@/lib/utils/date-time"

export { REGULAR_BEDS, ISOLATION_BEDS, ALL_BEDS }
export type { CareLevel, ShiftType, ShiftInfo, Patient, ShiftHistoryRecord }
export { getShiftInfo }

// Data awal pasien HCU
const initialPatients: Patient[] = []

// Fallback shift untuk SSR
const defaultShiftInfo: ShiftInfo = {
  type: "malam",
  name: "Malam",
  label: "Shift Malam",
  timeRange: "21.00 - 07.00 WIB",
  nextShiftTime: "07.00 WIB",
  shiftKey: "initial-malam",
}

// Data 3 shift sebelumnya untuk perbandingan statistik
const defaultPreviousShifts: ShiftHistoryRecord[] = []

export default function KelolaPasienPage() {
  return (
    <React.Suspense fallback={<KelolaPasienSkeleton />}>
      <KelolaPasienContent />
    </React.Suspense>
  )
}

function KelolaPasienSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse p-2">
      <div className="h-9 w-64 bg-neutral-200 dark:bg-neutral-800 rounded-lg" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-neutral-100 dark:bg-neutral-800" />
        ))}
      </div>
      <div className="h-96 rounded-2xl bg-neutral-100 dark:bg-neutral-800" />
    </div>
  )
}

function KelolaPasienContent() {
  const isHydratedRef = useRef(false)
  const [todayStr, setTodayStr] = useState("30-10-2026")
  const [currentTimeStr, setCurrentTimeStr] = useState("")

  // Info shift aktif
  const [activeShift, setActiveShift] = useState<ShiftInfo>(defaultShiftInfo)

  // State Pasien
  const [patients, setPatients] = useState<Patient[]>(initialPatients)
  const patientsRef = useRef(patients)

  useEffect(() => {
    patientsRef.current = patients
  }, [patients])

  // Pasien Awal Shift
  const [awalShift, setAwalShift] = useState<number>(0)

  // Pilihan tampilan stats shift: "current" atau ID shift sebelumnya
  const [selectedStatsView, setSelectedStatsView] = useState<string>("current")

  // Tab Pasien Aktif vs Pasien Keluar
  const [activeTab, setActiveTab] = useState<"aktif" | "keluar">("aktif")
  const [searchQuery, setSearchQuery] = useState("")
  const [filterCare, setFilterCare] = useState<"semua" | CareLevel>("semua")
  const [currentNurse, setCurrentNurse] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sp_current_user_name") || "Staf Perawat HCU"
    }
    return "Staf Perawat HCU"
  })

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDischargeModal, setShowDischargeModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)

  // Form State Tambah Pasien (Panggilan: Tn., Ny., An.)
  const [formTitle, setFormTitle] = useState<"Tn." | "Ny." | "An.">("Tn.")
  const [formRawName, setFormRawName] = useState("")
  const [formRm, setFormRm] = useState("")
  const [formBed, setFormBed] = useState("Bed 03")
  const [formCareLevel, setFormCareLevel] = useState<CareLevel>("total")
  const [formAdmissionDateObj, setFormAdmissionDateObj] = useState<Date | undefined>(new Date())
  const [formAdmissionTime, setFormAdmissionTime] = useState<string>("")
  const [formError, setFormError] = useState<string | null>(null)

  // Form State Pulangkan (BLPL)
  const [dischargeReason, setDischargeReason] = useState("Boleh Pulang (Sembuh)")
  const [dischargeDateObj, setDischargeDateObj] = useState<Date | undefined>(new Date())

  // Inisialisasi data pasien
  useEffect(() => {
    let isMounted = true

    const initData = async () => {
      try {
        const now = new Date()
        const detectedShift = getShiftInfo(now)

        setActiveShift(detectedShift)
        setTodayStr(getFormattedDate(now))
        setCurrentTimeStr(getFormattedTime(now))

        const cachedNurse = localStorage.getItem("sp_current_user_name")
        if (cachedNurse) {
          setCurrentNurse(cachedNurse.toLowerCase().startsWith("ns.") ? cachedNurse : `Ns. ${cachedNurse}`)
        }

        // Ambil data pasien dari server
        const res = await fetchPatientsFromDb()
        if (!isMounted) return

        if (res.isDbConnected) {
          setPatients(res.data)
          localStorage.setItem("sp_hcu_patients", JSON.stringify(res.data))
          const activeCount = res.data.filter((p) => p.status === "aktif").length
          setAwalShift(activeCount)
          localStorage.setItem("sp_hcu_awal_shift", String(activeCount))
          isHydratedRef.current = true
          return
        }

        // Fallback penyimpanan lokal jika offline
        const savedPatients = localStorage.getItem("sp_hcu_patients")
        if (savedPatients) {
          try {
            const parsed = JSON.parse(savedPatients) as Patient[]
            if (Array.isArray(parsed)) {
              setPatients(parsed)
              const activeCount = parsed.filter((p) => p.status === "aktif").length
              setAwalShift(activeCount)
              isHydratedRef.current = true
              return
            }
          } catch {}
        }

        // Data awal bersih (kosong)
        setPatients([])
        setAwalShift(0)
        localStorage.setItem("sp_hcu_patients", "[]")
        localStorage.setItem("sp_hcu_awal_shift", "0")
        isHydratedRef.current = true
      } catch (err) {
        console.warn("Gagal inisialisasi pasien:", err)
      }
    }

    void initData()

    return () => {
      isMounted = false
    }
  }, [])

  // Timer interval jam device & auto shift change
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      setCurrentTimeStr(getFormattedTime(now))

      const detected = getShiftInfo(now)
      if (detected.shiftKey !== activeShift.shiftKey) {
        setActiveShift(detected)
        setTodayStr(getFormattedDate(now))

        const currentActiveCount = patientsRef.current.filter((p) => p.status === "aktif").length
        setAwalShift(currentActiveCount)

        try {
          localStorage.setItem("sp_hcu_current_shift_key", detected.shiftKey)
          localStorage.setItem("sp_hcu_awal_shift", String(currentActiveCount))
        } catch {
          // Abaikan
        }
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [activeShift.shiftKey])

  // Simpan data pasien ke localStorage
  useEffect(() => {
    if (!isHydratedRef.current) return
    try {
      localStorage.setItem("sp_hcu_patients", JSON.stringify(patients))
      localStorage.setItem("sp_hcu_awal_shift", String(awalShift))
    } catch {
      // Abaikan
    }
  }, [patients, awalShift])

  // Pasien Aktif & Keluar
  const activePatients = useMemo(() => patients.filter((p) => p.status === "aktif"), [patients])
  const dischargedPatients = useMemo(() => patients.filter((p) => p.status === "keluar"), [patients])

  // Sensus shift aktif
  const masukCount = patients.filter((p) => p.admissionShiftKey === activeShift.shiftKey).length
  const keluarCount = patients.filter((p) => p.status === "keluar" && p.dischargeShiftKey === activeShift.shiftKey).length
  const akhirShift = awalShift + masukCount - keluarCount

  // Map data untuk Bed yang terisi
  const occupiedBedMap = useMemo(() => {
    const map = new Map<string, Patient>()
    activePatients.forEach((p) => map.set(p.bed, p))
    return map
  }, [activePatients])

  // Cari bed kosong pertama untuk formulir tambah
  const firstEmptyBed = ALL_BEDS.find((b) => !occupiedBedMap.has(b)) || ALL_BEDS[0]

  // Data Statistik untuk komponen StatsSection
  const currentStatsData: StatItem[] = useMemo(() => {
    let awal = awalShift
    let masuk = masukCount
    let keluar = keluarCount
    let akhir = akhirShift

    if (selectedStatsView !== "current") {
      const prev = defaultPreviousShifts.find((s) => s.id === selectedStatsView)
      if (prev) {
        awal = prev.awal
        masuk = prev.masuk
        keluar = prev.keluar
        akhir = prev.akhir
      }
    }

    return [
      {
        id: "awal_shift",
        title: "Pasien Awal Shift",
        badge: "PASIEN AWAL SHIFT",
        value: awal,
        description: "Saldo operan serah terima shift",
        color: "blue",
        icon: <UserCheck className="size-4" />,
      },
      {
        id: "pasien_masuk",
        title: "Pasien Masuk",
        badge: "PASIEN MASUK",
        value: `+${masuk}`,
        description: "Registrasi pasien baru di shift ini",
        color: "green",
        icon: <UserPlus className="size-4" />,
      },
      {
        id: "pasien_keluar",
        title: "Pasien Keluar",
        badge: "PASIEN KELUAR (BLPL)",
        value: `-${keluar}`,
        description: "Pulang atau pindah ruangan",
        color: "red",
        icon: <LogOut className="size-4" />,
      },
      {
        id: "akhir_shift",
        title: "Total Akhir Shift",
        badge: "TOTAL AKHIR SHIFT",
        value: `${akhir}`,
        description: `Awal (${awal}) + Masuk (${masuk}) - Keluar (${keluar})`,
        color: "yellow",
        icon: <BedSingle className="size-4" />,
      },
    ]
  }, [selectedStatsView, awalShift, masukCount, keluarCount, akhirShift])

  // Buka Modal Tambah Pasien
  const handleOpenAddModal = () => {
    const now = new Date()
    setFormTitle("Tn.")
    setFormRawName("")
    setFormRm("")
    setFormBed(firstEmptyBed)
    setFormCareLevel("total")
    setFormAdmissionDateObj(now)
    setFormAdmissionTime(getFormattedTime(now).slice(0, 5))
    setFormError(null)
    setShowAddModal(true)
  }

  // Submit Pasien Baru
  const handleSubmitAddPatient = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!formRawName.trim()) {
      setFormError("Nama lengkap pasien wajib diisi.")
      return
    }

    if (!formRm.trim()) {
      setFormError("Nomor Rekam Medis (RM) wajib diisi.")
      return
    }

    // Validasi No. RM pasien aktif TIDAK BOLEH SAMA
    const duplicateActive = activePatients.find((p) => p.rm.trim() === formRm.trim())
    if (duplicateActive) {
      setFormError(
        `No. RM ${formRm} sudah aktif dirawat di ${duplicateActive.bed} (${duplicateActive.name}). Pasien aktif tidak boleh memiliki No. RM ganda.`
      )
      return
    }

    // Validasi Bed terisi
    if (occupiedBedMap.has(formBed)) {
      setFormError(`${formBed} saat ini sedang terisi. Silakan pilih bed yang masih tersedia.`)
      return
    }

    const now = new Date()
    const timeStr = formAdmissionTime.trim() || getFormattedTime(now).slice(0, 5)
    const dateFormatted = formAdmissionDateObj ? format(formAdmissionDateObj, "dd-MM-yyyy") : todayStr

    const fullName = `${formTitle} ${formRawName.trim()}`
    const genderEquiv: "L" | "P" = formTitle === "Ny." ? "P" : "L"

    const newPatient: Patient = {
      id: `p-${Date.now()}`,
      name: fullName,
      gender: genderEquiv,
      rm: formRm.trim().slice(0, 10),
      bed: formBed,
      careLevel: formCareLevel,
      admissionDate: dateFormatted,
      admissionTime: timeStr,
      admissionShiftKey: activeShift.shiftKey,
      nurseName: currentNurse,
      status: "aktif",
    }

    try {
      void insertPatientInDb(newPatient)
    } catch (err) {
      console.warn("DB offline insert:", err)
    }

    const updated = [newPatient, ...patients]
    setPatients(updated)
    localStorage.setItem("sp_hcu_patients", JSON.stringify(updated))
    setShowAddModal(false)
    toast.success("Pasien berhasil ditambahkan")
  }

  // Buka Modal Pulangkan Pasien
  const handleOpenDischargeModal = (patient: Patient) => {
    setSelectedPatient(patient)
    setDischargeDateObj(new Date())
    setDischargeReason("Boleh Pulang (Sembuh)")
    setShowDischargeModal(true)
  }

  // Submit Pulangkan Pasien
  const handleConfirmDischarge = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPatient) return

    const now = new Date()
    const timeStr = getFormattedTime(now).slice(0, 5)
    const dateFormatted = dischargeDateObj ? format(dischargeDateObj, "dd-MM-yyyy") : todayStr

    // Otomatis lepaskan seluruh alat hitungan waktu aktif pada bed ini agar kembali standby di inventaris
    try {
      void releaseToolsForBed(selectedPatient.bed, currentNurse)
    } catch (err) {
      console.warn("Auto-release tools notice:", err)
    }

    const updated = patients.map((p) =>
      p.id === selectedPatient.id
        ? {
            ...p,
            status: "keluar" as const,
            dischargeDate: dateFormatted,
            dischargeTime: timeStr,
            dischargeShiftKey: activeShift.shiftKey,
            dischargeReason,
          }
        : p
    )

    try {
      void updatePatientInDb(selectedPatient.id, {
        status: "keluar",
        dischargeDate: dateFormatted,
        dischargeTime: timeStr,
        dischargeShiftKey: activeShift.shiftKey,
        dischargeReason,
      })
    } catch (err) {
      console.warn("DB offline discharge:", err)
    }

    setPatients(updated)
    localStorage.setItem("sp_hcu_patients", JSON.stringify(updated))
    setShowDischargeModal(false)
    setSelectedPatient(null)
    toast.success("Pasien berhasil dipulangkan (BLPL)")
  }

  // Buka Modal Edit
  const handleOpenEditModal = (patient: Patient) => {
    setSelectedPatient(patient)

    if (patient.name.startsWith("Tn.")) setFormTitle("Tn.")
    else if (patient.name.startsWith("Ny.")) setFormTitle("Ny.")
    else if (patient.name.startsWith("An.")) setFormTitle("An.")
    else setFormTitle(patient.gender === "P" ? "Ny." : "Tn.")

    let cleanName = patient.name
    if (cleanName.startsWith("Tn. ")) cleanName = cleanName.slice(4)
    else if (cleanName.startsWith("Ny. ")) cleanName = cleanName.slice(4)
    else if (cleanName.startsWith("An. ")) cleanName = cleanName.slice(4)

    setFormRawName(cleanName)
    setFormRm(patient.rm.slice(0, 10))
    setFormBed(patient.bed)
    setFormCareLevel(patient.careLevel)

    try {
      const parsedDate = parse(patient.admissionDate, "dd-MM-yyyy", new Date())
      setFormAdmissionDateObj(parsedDate)
    } catch {
      setFormAdmissionDateObj(new Date())
    }

    const existingTime = patient.admissionTime
      ? patient.admissionTime.replace(" WIB", "").trim()
      : getFormattedTime(new Date()).slice(0, 5)
    setFormAdmissionTime(existingTime)

    setFormError(null)
    setShowEditModal(true)
  }

  // Submit Edit
  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPatient) return

    if (!formRawName.trim() || !formRm.trim()) {
      setFormError("Nama pasien dan No. RM wajib diisi.")
      return
    }

    const duplicateActive = activePatients.find(
      (p) => p.rm.trim() === formRm.trim() && p.id !== selectedPatient.id
    )
    if (duplicateActive) {
      setFormError(
        `No. RM ${formRm} sudah terdaftar pada pasien aktif (${duplicateActive.name}) di ${duplicateActive.bed}.`
      )
      return
    }

    if (formBed !== selectedPatient.bed && occupiedBedMap.has(formBed)) {
      setFormError(`${formBed} sudah ditempati pasien lain. Silakan pilih bed yang tersedia.`)
      return
    }

    const fullName = `${formTitle} ${formRawName.trim()}`
    const genderEquiv: "L" | "P" = formTitle === "Ny." ? "P" : "L"
    const dateFormatted = formAdmissionDateObj ? format(formAdmissionDateObj, "dd-MM-yyyy") : selectedPatient.admissionDate
    const existingTime = selectedPatient.admissionTime ? selectedPatient.admissionTime.replace(" WIB", "").trim() : ""
    const timeFormatted = formAdmissionTime.trim() || existingTime || getFormattedTime(new Date()).slice(0, 5)

    const updated = patients.map((p) =>
      p.id === selectedPatient.id
        ? {
            ...p,
            name: fullName,
            gender: genderEquiv,
            rm: formRm.trim().slice(0, 10),
            bed: formBed,
            careLevel: formCareLevel,
            admissionDate: dateFormatted,
            admissionTime: timeFormatted,
          }
        : p
    )

    try {
      void updatePatientInDb(selectedPatient.id, {
        name: fullName,
        gender: genderEquiv,
        rm: formRm.trim().slice(0, 10),
        bed: formBed,
        careLevel: formCareLevel,
        admissionDate: dateFormatted,
        admissionTime: timeFormatted,
      })
    } catch (err) {
      console.warn("DB offline edit:", err)
    }

    setPatients(updated)
    localStorage.setItem("sp_hcu_patients", JSON.stringify(updated))
    setShowEditModal(false)
    setSelectedPatient(null)
    toast.success("Data pasien berhasil diperbarui")
  }

  // Filter daftar tampilan
  const filteredActiveList = useMemo(() => {
    return activePatients.filter((p) => {
      const matchQuery =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.rm.includes(searchQuery) ||
        p.bed.toLowerCase().includes(searchQuery.toLowerCase())
      const matchCare = filterCare === "semua" || p.careLevel === filterCare
      return matchQuery && matchCare
    })
  }, [activePatients, searchQuery, filterCare])

  const filteredDischargedList = useMemo(() => {
    return dischargedPatients.filter((p) => {
      const matchQuery =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.rm.includes(searchQuery) ||
        p.bed.toLowerCase().includes(searchQuery.toLowerCase())
      const matchCare = filterCare === "semua" || p.careLevel === filterCare
      return matchQuery && matchCare
    })
  }, [dischargedPatients, searchQuery, filterCare])

  // Definisi Kolom Tabel Pasien Aktif
  const activeColumns: TableColumn<Patient>[] = useMemo(
    () => [
      {
        header: "Tgl Masuk",
        className: "whitespace-nowrap",
        render: (patient) => (
          <div>
            <div className="flex items-center gap-1.5 text-neutral-800 dark:text-neutral-200 font-medium">
              <CalendarIcon className="size-3.5 text-muted-foreground" />
              <span>{patient.admissionDate}</span>
            </div>
            <span className="text-[11px] text-muted-foreground pl-5">{patient.admissionTime} WIB</span>
          </div>
        ),
      },
      {
        header: "Nama & No. RM",
        className: "whitespace-nowrap",
        render: (patient) => (
          <div>
            <div className="font-bold text-sm text-neutral-900 dark:text-neutral-100">{patient.name}</div>
            <div className="text-xs text-muted-foreground font-mono mt-0.5">{patient.rm}</div>
          </div>
        ),
      },
      {
        header: "Bed",
        className: "whitespace-nowrap",
        render: (patient) => (
          <span className="inline-flex items-center gap-1.5 font-bold text-xs px-2.5 py-1 rounded-md bg-[#512da8]/10 text-[#512da8] dark:bg-white/10 dark:text-purple-200 border border-[#512da8]/20">
            <BedSingle className="size-3.5" />
            {patient.bed}
          </span>
        ),
      },
      {
        header: "Perawatan",
        className: "whitespace-nowrap",
        render: (patient) => (
          <>
            {patient.careLevel === "total" && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-900/50">
                <Activity className="size-3.5" />
                Perawatan Total
              </span>
            )}
            {patient.careLevel === "parsial" && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50">
                <Clock className="size-3.5" />
                Perawatan Parsial
              </span>
            )}
            {patient.careLevel === "minimal" && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50">
                <ShieldCheck className="size-3.5" />
                Perawatan Minimal
              </span>
            )}
          </>
        ),
      },
      {
        header: "Perawat",
        className: "whitespace-nowrap text-muted-foreground",
        render: (patient) => (
          <div className="flex items-center gap-1.5">
            <UserCheck className="size-3.5 text-neutral-400" />
            <span className="font-medium text-neutral-700 dark:text-neutral-300">{patient.nurseName}</span>
          </div>
        ),
      },
      {
        header: "Aksi",
        className: "text-center whitespace-nowrap",
        render: (patient) => (
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenDischargeModal(patient)}
              title="Pulangkan pasien atau pindah ruangan"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900 transition-colors cursor-pointer"
            >
              <LogOut className="size-3 text-rose-600" />
              <span>Pulangkan</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenEditModal(patient)}
              title="Edit data pasien / pindah bed"
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 transition-colors cursor-pointer"
            >
              <Edit2 className="size-3" />
              <span>Edit</span>
            </button>
          </div>
        ),
      },
    ],
    []
  )

  // Definisi Kolom Tabel Pasien Keluar (BLPL)
  const dischargedColumns: TableColumn<Patient>[] = useMemo(
    () => [
      {
        header: "Tgl Masuk",
        className: "whitespace-nowrap",
        render: (patient) => (
          <div>
            <div className="flex items-center gap-1.5 text-neutral-800 dark:text-neutral-200 font-medium">
              <CalendarIcon className="size-3.5 text-muted-foreground" />
              <span>{patient.admissionDate}</span>
            </div>
            <span className="text-[11px] text-muted-foreground pl-5">{patient.admissionTime} WIB</span>
          </div>
        ),
      },
      {
        header: "Tgl Keluar",
        className: "whitespace-nowrap",
        render: (patient) => (
          <div>
            <div className="flex items-center gap-1.5 font-medium text-rose-600 dark:text-rose-400">
              <CalendarIcon className="size-3.5 text-rose-500" />
              <span>{patient.dischargeDate || "-"}</span>
            </div>
            {patient.dischargeTime && (
              <span className="text-[11px] text-rose-600/80 dark:text-rose-400/80 pl-5">
                {patient.dischargeTime} WIB
              </span>
            )}
          </div>
        ),
      },
      {
        header: "Nama & No. RM",
        className: "whitespace-nowrap",
        render: (patient) => (
          <div>
            <div className="font-bold text-sm text-neutral-900 dark:text-neutral-100">{patient.name}</div>
            <div className="text-xs text-muted-foreground font-mono mt-0.5">{patient.rm}</div>
          </div>
        ),
      },
      {
        header: "Bed Terakhir",
        className: "whitespace-nowrap",
        render: (patient) => (
          <span className="font-semibold text-xs px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
            {patient.bed}
          </span>
        ),
      },
      {
        header: "Perawatan Terakhir",
        className: "whitespace-nowrap",
        render: (patient) => (
          <span className="text-xs font-medium">
            {patient.careLevel === "total"
              ? "Perawatan Total"
              : patient.careLevel === "parsial"
              ? "Perawatan Parsial"
              : "Perawatan Minimal"}
          </span>
        ),
      },
      {
        header: "Alasan / Status Keluar",
        className: "whitespace-nowrap",
        render: (patient) => (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
            {patient.dischargeReason || "Boleh Pulang (Sembuh)"}
          </span>
        ),
      },
    ],
    []
  )

  return (
    <div className="flex flex-col gap-6">
      {/* ======================================================== */}
      {/* HEADER UTAMA: BERSIH & PROFESIONAL */}
      {/* ======================================================== */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              Kelola Pasien HCU
            </h1>

            {/* Shift Badge: Desain Elegan & Bersih */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-900 text-white dark:bg-neutral-800 dark:text-neutral-100 text-xs font-semibold shadow-xs">
              {activeShift.type === "pagi" && <Sun className="size-3.5 text-amber-400" />}
              {activeShift.type === "siang" && <SunMedium className="size-3.5 text-orange-400" />}
              {activeShift.type === "malam" && <Moon className="size-3.5 text-amber-300" />}
              <span>{activeShift.label} ({activeShift.timeRange.replace(" WIB", "")})</span>
              {currentTimeStr && (
                <span className="text-white/50 dark:text-neutral-400 font-mono text-[11px] hidden sm:inline">
                  • {currentTimeStr} WIB
                </span>
              )}
            </div>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Pemantauan ketersediaan bed, sensus pasien per-shift, dan klasifikasi tingkat perawatan.
          </p>
        </div>

        <div className="w-full sm:w-auto flex items-center gap-2">
          {/* Tombol Registrasi Pasien Masuk */}
          <button
            type="button"
            data-testid="btn-pasien-masuk"
            onClick={handleOpenAddModal}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#512da8] hover:bg-[#43238c] text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-all duration-200 cursor-pointer hover:shadow-md"
          >
            <UserPlus className="size-4" />
            <span>Pasien Masuk</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4 KARTU SENSUS PASIEN (KOMPONEN STATSSECTION) */}
      {/* 1 BARIS 2 STATS DI HP & LIHAT HISTORI 3 SHIFT */}
      {/* ======================================================== */}
      <div className="flex flex-col gap-3">
        {/* Kontrol Selector: Shift Aktif & 3 Shift Sebelumnya */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            <History className="size-4 text-muted-foreground" />
            <span>Data Sensus Shift:</span>
            <span className="text-muted-foreground font-normal">
              {selectedStatsView === "current"
                ? `${activeShift.label} (${todayStr} • ${activeShift.timeRange})`
                : defaultPreviousShifts.find((s) => s.id === selectedStatsView)?.dateLabel || ""}
            </span>
          </div>

          {/* Tab Selector 3 Shift - Responsif Grid 4 Kolom di HP */}
          {defaultPreviousShifts.length > 0 && (
            <div className="grid grid-cols-4 sm:flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800/80 rounded-xl w-full sm:w-fit select-none">
              <button
                type="button"
                onClick={() => setSelectedStatsView("current")}
                className={cn(
                  "px-2 sm:px-3 py-1.5 rounded-lg text-xs font-semibold text-center truncate transition-all cursor-pointer",
                  selectedStatsView === "current"
                    ? "bg-white dark:bg-neutral-900 text-[#512da8] dark:text-purple-300 shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                ● Shift Aktif
              </button>
              {defaultPreviousShifts.map((prev, idx) => (
                <button
                  key={prev.id}
                  type="button"
                  onClick={() => setSelectedStatsView(prev.id)}
                  className={cn(
                    "px-2 sm:px-3 py-1.5 rounded-lg text-xs font-medium text-center truncate transition-all cursor-pointer",
                    selectedStatsView === prev.id
                      ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {idx + 1} Shift Lalu
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 4 Kartu Sensus menggunakan komponen StatsSection */}
        <StatsSection stats={currentStatsData} />
      </div>

      {/* ======================================================== */}
      {/* KONTROL TAB & PENCARIAN DENGAN FILTER DI SAMPINGNYA */}
      {/* ======================================================== */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-2xs">
        <div className="p-4 sm:p-5 border-b border-neutral-100 dark:border-neutral-800 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Switcher Tab */}
          <div className="flex items-center gap-1.5 p-1 bg-neutral-100 dark:bg-neutral-800/80 rounded-xl w-fit">
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
              <span className="px-1.5 py-0.2 rounded-full text-[11px] bg-[#512da8]/15 text-[#512da8] dark:bg-purple-900/60 dark:text-purple-200">
                {activePatients.length}
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
              <span className="px-1.5 py-0.2 rounded-full text-[11px] bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-200">
                {dischargedPatients.length}
              </span>
            </button>
          </div>

          {/* Filter ditempatkan di samping search, baik di HP maupun desktop */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-56">
              <Search className="size-4 absolute left-3 top-2.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cari nama, RM, bed..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs sm:text-sm h-9 border rounded-lg bg-background border-border w-full focus:outline-[#512da8]"
              />
            </div>

            <div className="w-full sm:w-48 shrink-0">
              <AppSelect
                value={filterCare}
                onChange={(val) => setFilterCare(val as "semua" | CareLevel)}
                size="sm"
                icon={<Filter className="size-3.5 text-muted-foreground shrink-0" />}
                options={[
                  { value: "semua", label: "Semua Perawatan", description: "Seluruh tingkat perawatan" },
                  { value: "total", label: "Perawatan Total", description: "Bantuan total / bed rest" },
                  { value: "parsial", label: "Perawatan Parsial", description: "Bantuan sebagian" },
                  { value: "minimal", label: "Perawatan Minimal", description: "Mandiri dengan observasi" },
                ]}
                headerTitle="Filter Perawatan"
                aria-label="Filter Perawatan"
              />
            </div>
          </div>
        </div>

        {/* Tabel Data Pasien Aktif atau Pasien Keluar dengan Komponen PaginatedTable */}
        {activeTab === "aktif" ? (
          <PaginatedTable
            data={filteredActiveList}
            columns={activeColumns}
            keyExtractor={(p) => p.id}
            entityLabel="pasien aktif"
            emptyMessage="Tidak ada data pasien aktif yang sesuai dengan pencarian."
          />
        ) : (
          <PaginatedTable
            data={filteredDischargedList}
            columns={dischargedColumns}
            keyExtractor={(p) => p.id}
            entityLabel="pasien keluar"
            emptyMessage="Belum ada data pasien keluar (BLPL)."
          />
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL: REGISTRASI PASIEN MASUK */}
      {/* ======================================================== */}
      <ModalPasienForm
        mode="add"
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        currentNurse={currentNurse}
        formError={formError}
        formBed={formBed}
        setFormBed={setFormBed}
        occupiedBedMap={occupiedBedMap}
        formTitle={formTitle}
        setFormTitle={setFormTitle}
        formRawName={formRawName}
        setFormRawName={setFormRawName}
        formRm={formRm}
        setFormRm={setFormRm}
        formAdmissionDateObj={formAdmissionDateObj}
        setFormAdmissionDateObj={setFormAdmissionDateObj}
        formAdmissionTime={formAdmissionTime}
        setFormAdmissionTime={setFormAdmissionTime}
        formCareLevel={formCareLevel}
        setFormCareLevel={setFormCareLevel}
        onSubmit={handleSubmitAddPatient}
      />

      {/* ======================================================== */}
      {/* MODAL: KONFIRMASI PEMULANGAN PASIEN */}
      {/* ======================================================== */}
      <ModalPasienKeluar
        isOpen={showDischargeModal}
        onClose={() => setShowDischargeModal(false)}
        selectedPatient={selectedPatient}
        dischargeReason={dischargeReason}
        setDischargeReason={setDischargeReason}
        dischargeDateObj={dischargeDateObj}
        setDischargeDateObj={setDischargeDateObj}
        onConfirm={handleConfirmDischarge}
      />

      {/* ======================================================== */}
      {/* MODAL: EDIT DATA PASIEN */}
      {/* ======================================================== */}
      <ModalPasienForm
        mode="edit"
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        selectedPatient={selectedPatient}
        formError={formError}
        formBed={formBed}
        setFormBed={setFormBed}
        occupiedBedMap={occupiedBedMap}
        formTitle={formTitle}
        setFormTitle={setFormTitle}
        formRawName={formRawName}
        setFormRawName={setFormRawName}
        formRm={formRm}
        setFormRm={setFormRm}
        formAdmissionDateObj={formAdmissionDateObj}
        setFormAdmissionDateObj={setFormAdmissionDateObj}
        formAdmissionTime={formAdmissionTime}
        setFormAdmissionTime={setFormAdmissionTime}
        formCareLevel={formCareLevel}
        setFormCareLevel={setFormCareLevel}
        onSubmit={handleSubmitEdit}
      />
    </div>
  )
}
