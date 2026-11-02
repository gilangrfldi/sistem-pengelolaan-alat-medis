"use client"

import * as React from "react"
import { useState, useMemo, useEffect, useCallback } from "react"
import Link from "next/link"
import { cn } from "cn"
import {
  Plus,
  Search,
  Wrench,
  Trash2,
  Edit2,
  ArrowLeft,
  AlertCircle,
  Timer,
  Zap,
  Check,
  ShieldAlert,
} from "lucide-react"

import { AppModal } from "@/components/app-modal"
import { PaginatedTable, type TableColumn } from "@/components/paginated-table"
import {
  fetchMasterToolsFromDb,
  createMasterToolInDb,
  updateMasterToolInDb,
  deleteMasterToolInDb,
  fetchDamagedToolsFromDb,
  insertDamagedToolInDb,
  deleteDamagedToolInDb,
  fetchTimedToolsFromDb,
} from "@/lib/services/alat-service"
import { toast } from "@/components/ui/app-toast"
import {
  type MasterTool,
  type ToolCategory,
  type DamagedToolRecord,
  type TimedToolUsageRecord,
  INITIAL_MASTER_TOOLS,
  INITIAL_DAMAGED_TOOLS,
} from "../page"

export default function MasterAlatPage() {
  // ========================================================
  // STATE MASTER ALAT DARI SUPABASE DATABASE
  // ========================================================
  const [masterTools, setMasterTools] = useState<MasterTool[]>(INITIAL_MASTER_TOOLS)
  const [damagedTools, setDamagedTools] = useState<DamagedToolRecord[]>(INITIAL_DAMAGED_TOOLS)
  const [timedTools, setTimedTools] = useState<TimedToolUsageRecord[]>([])

  // Muat data langsung dari database Supabase
  useEffect(() => {
    let ignore = false
    const loadData = async () => {
      try {
        const [resMaster, resDamaged, resTimed] = await Promise.all([
          fetchMasterToolsFromDb(),
          fetchDamagedToolsFromDb(),
          fetchTimedToolsFromDb(),
        ])

        if (ignore) return

        if (resMaster.isDbConnected && resMaster.data.length > 0) {
          setMasterTools(resMaster.data)
        }
        if (resDamaged.isDbConnected) {
          setDamagedTools(resDamaged.data)
        }
        if (resTimed.isDbConnected) {
          setTimedTools(resTimed.data)
        }
      } catch (err) {
        console.error("Gagal sinkronisasi data master alat dengan Supabase:", err)
      }
    }

    void loadData()

    return () => {
      ignore = true
    }
  }, [])

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("semua")

  // Modal State
  // 1. Tambah Alat Baru
  const [showAddModal, setShowAddModal] = useState(false)
  const [formName, setFormName] = useState("")
  const [formCategory, setFormCategory] = useState<ToolCategory>("waktu")
  const [formHasUnitNumber, setFormHasUnitNumber] = useState(false)
  const [formUnitMode, setFormUnitMode] = useState<"single" | "range">("range")
  const [formSingleUnit, setFormSingleUnit] = useState<number>(1)
  const [formUnitStart, setFormUnitStart] = useState<number>(1)
  const [formUnitEnd, setFormUnitEnd] = useState<number>(20)
  const [formHasTotalUnits, setFormHasTotalUnits] = useState(false)
  const [formTotalUnits, setFormTotalUnits] = useState<number>(10)
  const [formHasLocation, setFormHasLocation] = useState(false)
  const [formLocations, setFormLocations] = useState<string[]>([""])
  const [formSubtypes, setFormSubtypes] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formError, setFormError] = useState<string | null>(null)

  // 2. Edit Alat
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingTool, setEditingTool] = useState<MasterTool | null>(null)
  const [editName, setEditName] = useState("")
  const [editCategory, setEditCategory] = useState<ToolCategory>("waktu")
  const [editHasUnitNumber, setEditHasUnitNumber] = useState(false)
  const [editUnitMode, setEditUnitMode] = useState<"single" | "range">("range")
  const [editSingleUnit, setEditSingleUnit] = useState<number>(1)
  const [editUnitStart, setEditUnitStart] = useState<number>(1)
  const [editUnitEnd, setEditUnitEnd] = useState<number>(20)
  const [editHasTotalUnits, setEditHasTotalUnits] = useState(false)
  const [editTotalUnits, setEditTotalUnits] = useState<number>(10)
  const [editHasLocation, setEditHasLocation] = useState(false)
  const [editLocations, setEditLocations] = useState<string[]>([""])
  const [editSubtypes, setEditSubtypes] = useState("")
  const [editDescription, setEditDescription] = useState("")

  // 3. Lapor Rusak
  const [showDamageModal, setShowDamageModal] = useState(false)
  const [dmgSelectedTool, setDmgSelectedTool] = useState("")
  const [dmgSelectedNumbers, setDmgSelectedNumbers] = useState<number[]>([])
  const [dmgQuantity, setDmgQuantity] = useState(1)
  const [dmgSeverity, setDmgSeverity] = useState<"rusak_ringan" | "rusak_berat">("rusak_ringan")
  const [dmgNotes, setDmgNotes] = useState("")
  const [dmgError, setDmgError] = useState<string | null>(null)

  // 4. Hapus Alat
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingTool, setDeletingTool] = useState<MasterTool | null>(null)

  // Nama perawat
  const currentNurse =
    (typeof window !== "undefined" && localStorage.getItem("sp_current_user_name")) ||
    "Staf Perawat HCU"

  // ========================================================
  // MAP KETERSEDIAAN ALAT (UNIT DIGUNAKAN & RUSAK)
  // ========================================================
  const usageStatsMap = useMemo(() => {
    const map = new Map<string, { inUse: number; damaged: number; damagedUnits: number[] }>()

    masterTools.forEach((m) => {
      // Hitung unit yang sedang dipakai di pasien (Hanya kategori waktu yang memiliki status berjalan)
      let inUseCount = 0
      if (m.category === "waktu") {
        inUseCount = timedTools.filter((t) => t.toolName === m.name && t.status === "berjalan").length
      }

      // Hitung unit yang rusak
      const dmgRecords = damagedTools.filter((d) => d.toolName === m.name)
      const dmgCount = dmgRecords.reduce((sum, d) => sum + d.quantity, 0)
      const dmgUnits = dmgRecords.flatMap((d) => d.unitNumbers)

      map.set(m.name, {
        inUse: inUseCount,
        damaged: dmgCount,
        damagedUnits: dmgUnits,
      })
    })

    return map
  }, [masterTools, timedTools, damagedTools])

  // ========================================================
  // HANDLERS MODAL
  // ========================================================

  // Buka Modal Tambah Alat
  const handleOpenAddModal = () => {
    setFormName("")
    setFormCategory("waktu")
    setFormHasUnitNumber(false)
    setFormUnitMode("range")
    setFormSingleUnit(1)
    setFormUnitStart(1)
    setFormUnitEnd(20)
    setFormHasTotalUnits(false)
    setFormTotalUnits(10)
    setFormHasLocation(false)
    setFormLocations([""])
    setFormSubtypes("")
    setFormDescription("")
    setFormError(null)
    setShowAddModal(true)
  }

  // Submit Tambah Alat Baru (Simpan ke Supabase)
  const handleSubmitAddTool = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!formName.trim()) {
      setFormError("Nama alat medis wajib diisi.")
      return
    }

    const duplicate = masterTools.find(
      (m) => m.name.toLowerCase().trim() === formName.toLowerCase().trim()
    )
    if (duplicate) {
      setFormError(`Alat "${formName}" sudah terdaftar di katalog master.`)
      return
    }

    const subtypesArr = formSubtypes
      ? formSubtypes.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined

    let locationsArr: string[] | undefined = undefined
    let totalUnitsVal = 0
    let hasUnitNumVal = false
    let unitStartVal: number | undefined = undefined
    let unitEndVal: number | undefined = undefined
    let unitNumberTypeVal: "single" | "range" | undefined = undefined

    if (formCategory === "waktu") {
      if (formHasLocation) {
        const cleaned = formLocations.map((s) => s.trim()).filter(Boolean)
        locationsArr = cleaned.length > 0 ? cleaned : undefined
      }

      if (formHasUnitNumber) {
        hasUnitNumVal = true
        unitNumberTypeVal = formUnitMode
        if (formUnitMode === "single") {
          unitStartVal = Number(formSingleUnit) || 1
          unitEndVal = unitStartVal
          totalUnitsVal = 1
        } else {
          unitStartVal = Number(formUnitStart) || 1
          unitEndVal = Math.max(unitStartVal, Number(formUnitEnd) || unitStartVal)
          totalUnitsVal = unitEndVal - unitStartVal + 1
        }
      } else if (formHasTotalUnits) {
        hasUnitNumVal = false
        totalUnitsVal = Number(formTotalUnits) || 0
      } else {
        hasUnitNumVal = false
        totalUnitsVal = 0
      }
    } else {
      // formCategory === "kali"
      totalUnitsVal = 0
      hasUnitNumVal = false
    }

    const newToolPayload: Omit<MasterTool, "id"> = {
      name: formName.trim(),
      category: formCategory,
      totalUnits: totalUnitsVal,
      hasUnitNumber: hasUnitNumVal,
      unitNumberType: unitNumberTypeVal,
      unitStartNumber: unitStartVal,
      unitEndNumber: unitEndVal,
      numberedUnitsCount: hasUnitNumVal ? totalUnitsVal : undefined,
      hasTotalUnits: formCategory === "waktu" ? formHasTotalUnits : false,
      hasLocation: formCategory === "waktu" ? formHasLocation : false,
      applicableLocations: locationsArr,
      subtypes: subtypesArr,
      description: formDescription.trim() || undefined,
    }

    try {
      const created = await createMasterToolInDb(newToolPayload)
      setMasterTools((prev) => [created, ...prev])
    } catch (err) {
      console.warn("DB offline insert master tool fallback:", err)
      const fallback: MasterTool = {
        id: `mt-${Date.now()}`,
        ...newToolPayload,
      }
      setMasterTools((prev) => [fallback, ...prev])
    }

    setShowAddModal(false)
    toast.success("Alat berhasil ditambahkan")
  }

  // Buka Modal Edit Alat
  const handleOpenEditModal = useCallback((tool: MasterTool) => {
    setEditingTool(tool)
    setEditName(tool.name)
    setEditCategory(tool.category)
    setEditHasUnitNumber(tool.hasUnitNumber ?? false)
    setEditUnitMode(tool.unitNumberType ?? (tool.unitStartNumber === tool.unitEndNumber ? "single" : "range"))
    setEditSingleUnit(tool.unitStartNumber || 1)
    setEditUnitStart(tool.unitStartNumber || 1)
    setEditUnitEnd(tool.unitEndNumber || (tool.hasUnitNumber ? tool.totalUnits : 20) || 20)
    setEditHasTotalUnits(Boolean(tool.hasTotalUnits || (!tool.hasUnitNumber && tool.totalUnits > 0)))
    setEditTotalUnits(tool.totalUnits || 10)
    setEditHasLocation(Boolean(tool.hasLocation || (tool.applicableLocations && tool.applicableLocations.length > 0)))
    setEditLocations(
      tool.applicableLocations && tool.applicableLocations.length > 0
        ? [...tool.applicableLocations]
        : [""]
    )
    setEditSubtypes(tool.subtypes?.join(", ") || "")
    setEditDescription(tool.description || "")
    setShowEditModal(true)
  }, [])

  // Submit Edit Alat (Update ke Supabase)
  const handleSubmitEditTool = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTool) return

    const subtypesArr = editSubtypes
      ? editSubtypes.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined

    let locationsArr: string[] | undefined = undefined
    let totalUnitsVal = 0
    let hasUnitNumVal = false
    let unitStartVal: number | undefined = undefined
    let unitEndVal: number | undefined = undefined
    let unitNumberTypeVal: "single" | "range" | undefined = undefined

    if (editCategory === "waktu") {
      if (editHasLocation) {
        const cleaned = editLocations.map((s) => s.trim()).filter(Boolean)
        locationsArr = cleaned.length > 0 ? cleaned : undefined
      }

      if (editHasUnitNumber) {
        hasUnitNumVal = true
        unitNumberTypeVal = editUnitMode
        if (editUnitMode === "single") {
          unitStartVal = Number(editSingleUnit) || 1
          unitEndVal = unitStartVal
          totalUnitsVal = 1
        } else {
          unitStartVal = Number(editUnitStart) || 1
          unitEndVal = Math.max(unitStartVal, Number(editUnitEnd) || unitStartVal)
          totalUnitsVal = unitEndVal - unitStartVal + 1
        }
      } else if (editHasTotalUnits) {
        hasUnitNumVal = false
        totalUnitsVal = Number(editTotalUnits) || 0
      } else {
        hasUnitNumVal = false
        totalUnitsVal = 0
      }
    } else {
      totalUnitsVal = 0
      hasUnitNumVal = false
    }

    const updates: Partial<MasterTool> = {
      name: editName.trim(),
      category: editCategory,
      totalUnits: totalUnitsVal,
      hasUnitNumber: hasUnitNumVal,
      unitNumberType: unitNumberTypeVal,
      unitStartNumber: unitStartVal,
      unitEndNumber: unitEndVal,
      numberedUnitsCount: hasUnitNumVal ? totalUnitsVal : undefined,
      hasTotalUnits: editCategory === "waktu" ? editHasTotalUnits : false,
      hasLocation: editCategory === "waktu" ? editHasLocation : false,
      applicableLocations: locationsArr,
      subtypes: subtypesArr,
      description: editDescription.trim() || undefined,
    }

    try {
      await updateMasterToolInDb(editingTool.id, updates)
    } catch (err) {
      console.warn("DB offline update master tool fallback:", err)
    }

    setMasterTools((prev) =>
      prev.map((m) => (m.id === editingTool.id ? { ...m, ...updates } : m))
    )

    setShowEditModal(false)
    setEditingTool(null)
    toast.success("Data alat berhasil diperbarui")
  }

  // Buka Modal Lapor Rusak
  const handleOpenDamageModal = useCallback((toolName?: string) => {
    const selected = toolName || (masterTools.length > 0 ? masterTools[0].name : "Infus Pump")
    setDmgSelectedTool(selected)
    setDmgSelectedNumbers([])
    setDmgQuantity(1)
    setDmgSeverity("rusak_ringan")
    setDmgNotes("")
    setDmgError(null)
    setShowDamageModal(true)
  }, [masterTools])

  // Submit Lapor Rusak (Simpan ke Supabase)
  const handleSubmitDamage = async (e: React.FormEvent) => {
    e.preventDefault()
    setDmgError(null)

    const targetTool = masterTools.find((m) => m.name === dmgSelectedTool)
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

    const now = new Date()
    const dateFormatted = `${String(now.getDate()).padStart(2, "0")}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}-${now.getFullYear()}`

    const newDamagePayload: Omit<DamagedToolRecord, "id"> = {
      toolName: dmgSelectedTool,
      quantity: finalQuantity,
      unitNumbers: finalUnitNumbers,
      reportDate: dateFormatted,
      severity: dmgSeverity,
      notes: dmgNotes.trim() || "Perlu pengecekan teknisi elektromedis",
      reportedBy: currentNurse,
    }

    try {
      const created = await insertDamagedToolInDb(newDamagePayload)
      setDamagedTools((prev) => [created, ...prev])
    } catch (err) {
      console.warn("DB offline insert damage fallback:", err)
      const fallback: DamagedToolRecord = {
        id: `dmg-${Date.now()}`,
        ...newDamagePayload,
      }
      setDamagedTools((prev) => [fallback, ...prev])
    }

    setShowDamageModal(false)
    toast.success("Laporan alat rusak terkirim")
  }

  // Buka Modal Hapus Alat
  const handleOpenDeleteModal = useCallback((tool: MasterTool) => {
    setDeletingTool(tool)
    setShowDeleteModal(true)
  }, [])

  // Konfirmasi Hapus Alat (Hapus dari Supabase)
  const handleConfirmDelete = async () => {
    if (!deletingTool) return
    try {
      await deleteMasterToolInDb(deletingTool.id)
    } catch (err) {
      console.warn("DB offline delete master tool fallback:", err)
    }
    setMasterTools((prev) => prev.filter((m) => m.id !== deletingTool.id))
    setShowDeleteModal(false)
    setDeletingTool(null)
    toast.success("Alat berhasil dihapus")
  }

  // Tandai Selesai Diperbaiki (Hapus dari Supabase)
  const handleResolveDamage = async (id: string) => {
    try {
      await deleteDamagedToolInDb(id)
    } catch (err) {
      console.warn("DB offline delete damage fallback:", err)
    }
    setDamagedTools((prev) => prev.filter((d) => d.id !== id))
    toast.success("Status perbaikan diperbarui")
  }

  // ========================================================
  // FILTERING TABEL
  // ========================================================
  const filteredTools = useMemo(() => {
    return masterTools.filter((m) => {
      const matchQuery =
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.description && m.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.subtypes && m.subtypes.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase())))

      const matchCat = categoryFilter === "semua" || m.category === categoryFilter
      return matchQuery && matchCat
    })
  }, [masterTools, searchQuery, categoryFilter])

  // ========================================================
  // DEFINISI KOLOM PAGINATED TABLE
  // ========================================================
  const columns: TableColumn<MasterTool>[] = useMemo(
    () => [
      {
        header: "Nama Alat Medis",
        render: (item) => (
          <div>
            <div className="font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
              <span>{item.name}</span>
              {item.hasUnitNumber && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-neutral-900 text-white dark:bg-neutral-800">
                  Unit {item.unitStartNumber || 1}-{item.unitEndNumber || item.numberedUnitsCount || item.totalUnits}
                </span>
              )}
            </div>
            {item.description && (
              <p className="text-[11px] text-muted-foreground mt-0.5">{item.description}</p>
            )}
            {item.subtypes && item.subtypes.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {item.subtypes.map((sub) => (
                  <span
                    key={sub}
                    className="px-1.5 py-0.2 rounded text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
                  >
                    {sub}
                  </span>
                ))}
              </div>
            )}
          </div>
        ),
      },
      {
        header: "Kategori Penggunaan",
        render: (item) => {
          if (item.category === "waktu") {
            return (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200">
                <Timer className="size-3" />
                Hitungan Waktu
              </span>
            )
          }
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200">
              <Zap className="size-3" />
              Hitungan Kali
            </span>
          )
        },
      },
      {
        header: "Spesifikasi & Unit Fisik",
        render: (item) => {
          if (item.category === "waktu") {
            return (
              <div className="space-y-1">
                {item.hasUnitNumber ? (
                  <div>
                    <span className="font-bold text-neutral-900 dark:text-neutral-100 text-xs">
                      {item.unitStartNumber === item.unitEndNumber
                        ? `Unit #${item.unitStartNumber || 1}`
                        : `Unit #${item.unitStartNumber || 1} s/d #${item.unitEndNumber || item.totalUnits}`}
                    </span>
                    <div className="text-[11px] text-muted-foreground">
                      {item.totalUnits} Unit Bernomor Fisik
                    </div>
                  </div>
                ) : item.totalUnits > 0 ? (
                  <div>
                    <span className="font-bold text-neutral-900 dark:text-neutral-100 text-xs">
                      {item.totalUnits} Total Unit Fisik
                    </span>
                    <div className="text-[11px] text-muted-foreground">Tanpa Penomoran Unit</div>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground font-medium">Bebas Kuota / Sentral</span>
                )}

                {item.applicableLocations && item.applicableLocations.length > 0 && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                      📍 {item.applicableLocations.length} Lokasi Anatomi
                    </span>
                  </div>
                )}
              </div>
            )
          }

          return (
            <div>
              <span className="font-semibold text-purple-700 dark:text-purple-300 text-xs">
                Tindakan Medis
              </span>
              <div className="text-[11px] text-muted-foreground">Frekuensi Tindakan (Per Kali)</div>
            </div>
          )
        },
      },
      {
        header: "Status Ketersediaan",
        render: (item) => {
          const stats = usageStatsMap.get(item.name) || { inUse: 0, damaged: 0, damagedUnits: [] }
          if (item.category === "kali") {
            return <div className="text-xs text-muted-foreground">Siap Prosedur (Bebas Kuota)</div>
          }
          // Kategori Waktu
          const available = Math.max(0, item.totalUnits - (stats.inUse + stats.damaged))
          return (
            <div className="flex flex-col gap-1 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Tersedia:</span>
                <span
                  className={cn(
                    "font-bold",
                    item.totalUnits === 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : available > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  )}
                >
                  {item.totalUnits > 0
                    ? available > 0
                      ? `${available} Unit`
                      : "Habis Terpakai"
                    : "Tersedia Sentral"}
                </span>
              </div>
              {stats.inUse > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Digunakan:</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {stats.inUse} Pasien
                  </span>
                </div>
              )}
              {stats.damaged > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Rusak:</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    {stats.damaged} Unit
                    {stats.damagedUnits.length > 0 && ` (#${stats.damagedUnits.join(", #")})`}
                  </span>
                </div>
              )}
            </div>
          )
        },
      },
      {
        header: "Aksi",
        className: "text-center whitespace-nowrap",
        render: (item) => (
          <div className="flex items-center justify-center gap-1.5">
            {/* Tombol Lapor Rusak */}
            <button
              type="button"
              onClick={() => handleOpenDamageModal(item.name)}
              title="Lapor kerusakan unit alat ini"
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 transition-colors cursor-pointer"
            >
              <Wrench className="size-3 text-rose-600" />
              <span>Lapor Rusak</span>
            </button>

            {/* Tombol Edit */}
            <button
              type="button"
              onClick={() => handleOpenEditModal(item)}
              title="Edit data alat"
              className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 transition cursor-pointer"
            >
              <Edit2 className="size-3.5" />
            </button>

            {/* Tombol Hapus */}
            <button
              type="button"
              onClick={() => handleOpenDeleteModal(item)}
              title="Hapus alat dari master"
              className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-600 transition cursor-pointer"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ),
      },
    ],
    [usageStatsMap, handleOpenDamageModal, handleOpenEditModal, handleOpenDeleteModal]
  )

  return (
    <div className="flex flex-col gap-6">
      {/* ======================================================== */}
      {/* HEADER UTAMA: NAVIGASI KEMBALI & TOMBOL AKSI */}
      {/* ======================================================== */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link
              href="/kelola-alat"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-[#512da8] transition-colors"
            >
              <ArrowLeft className="size-3.5" />
              <span>Kembali ke Kelola Alat</span>
            </Link>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Katalog Master Alat Medis HCU
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Pusat pengelolaan inventaris alat medis ruang HCU: tambah alat baru, pelaporan kerusakan alat, dan pembaruan unit.
          </p>
        </div>

        {/* Tombol Aksi Header */}
        <div className="w-full sm:w-auto grid grid-cols-2 sm:flex items-center gap-2">
          {/* Tombol Lapor Rusak */}
          <button
            type="button"
            onClick={() => handleOpenDamageModal()}
            className="flex items-center justify-center gap-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 text-xs sm:text-sm font-semibold px-3.5 py-2.5 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Wrench className="size-3.5" />
            <span>Lapor Alat Rusak</span>
          </button>

          {/* Tombol Tambah Alat Baru */}
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="flex items-center justify-center gap-2 bg-[#512da8] hover:bg-[#43238c] text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-all duration-200 cursor-pointer hover:shadow-md"
          >
            <Plus className="size-4" />
            <span>Tambah Alat Baru</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* BANNER STATUS KERUSAKAN ALAT (JIKA ADA UNIT RUSAK) */}
      {/* ======================================================== */}
      {damagedTools.length > 0 && (
        <div className="rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-5 text-rose-600 dark:text-rose-400" />
              <h3 className="font-bold text-sm text-rose-900 dark:text-rose-200">
                Peringatan: {damagedTools.length} Laporan Alat Medis Rusak / Servis
              </h3>
            </div>
            <span className="text-xs text-rose-700 dark:text-rose-300 font-medium">
              Unit yang rusak otomatis terkunci dari pilihan pasien
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {damagedTools.map((dmg) => (
              <div
                key={dmg.id}
                className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-neutral-900 border border-rose-100 dark:border-rose-900/40 shadow-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-neutral-900 dark:text-neutral-100">
                      {dmg.toolName}
                    </span>
                    <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                      {dmg.quantity} Unit {dmg.unitNumbers.length > 0 && `(#${dmg.unitNumbers.join(", #")})`}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {dmg.notes} • Dilaporkan: {dmg.reportDate} ({dmg.reportedBy})
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleResolveDamage(dmg.id)}
                  title="Tandai unit ini sudah selesai diperbaiki dan siap digunakan kembali"
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition cursor-pointer shrink-0"
                >
                  <Check className="size-3" />
                  <span>Selesai Servis</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TABEL MASTER INVENTARIS ALAT DENGAN FILTER & SEARCH */}
      {/* ======================================================== */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-2xs">
        <div className="p-4 sm:p-5 border-b border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Filter Kategori - Grid 3 Kolom Responsif di HP */}
          <div className="grid grid-cols-3 sm:flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800/80 rounded-xl w-full sm:w-fit select-none">
            <button
              type="button"
              onClick={() => setCategoryFilter("semua")}
              className={cn(
                "px-2 sm:px-3 py-1.5 rounded-lg text-xs font-semibold text-center truncate transition cursor-pointer",
                categoryFilter === "semua"
                  ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Semua Kategori
            </button>

            <button
              type="button"
              onClick={() => setCategoryFilter("waktu")}
              className={cn(
                "px-2 sm:px-3 py-1.5 rounded-lg text-xs font-semibold text-center truncate transition cursor-pointer",
                categoryFilter === "waktu"
                  ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Hitungan Waktu
            </button>

            <button
              type="button"
              onClick={() => setCategoryFilter("kali")}
              className={cn(
                "px-2 sm:px-3 py-1.5 rounded-lg text-xs font-semibold text-center truncate transition cursor-pointer",
                categoryFilter === "kali"
                  ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Hitungan Kali
            </button>
          </div>

          {/* Kotak Pencarian */}
          <div className="relative w-full sm:w-64">
            <Search className="size-4 absolute left-3 top-2.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari nama alat, subtipe..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs sm:text-sm h-9 border rounded-lg bg-background border-border w-full focus:outline-[#512da8]"
            />
          </div>
        </div>

        {/* Tabel Paginated */}
        <PaginatedTable
          data={filteredTools}
          columns={columns}
          keyExtractor={(item) => item.id}
          entityLabel="alat di master"
          emptyMessage="Tidak ada alat medis yang sesuai dengan pencarian."
        />
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: TAMBAH ALAT BARU KE MASTER */}
      {/* ======================================================== */}
      <AppModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Tambah Alat Medis Baru ke Master HCU"
        subtitle="Daftarkan peralatan medis baru ke dalam inventaris ruangan"
        icon={<Plus className="size-5" />}
        onSubmit={handleSubmitAddTool}
        submitText="Simpan ke Katalog Master"
        maxWidth="md"
      >
        {formError && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200">
            <AlertCircle className="size-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <div className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-neutral-900 dark:text-neutral-100 mb-1">
              Nama Alat Medis *
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Ventilator Transport, Blood Warmer..."
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-border bg-background"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-900 dark:text-neutral-100 mb-1.5">
              Kategori Penggunaan *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormCategory("waktu")}
                className={cn(
                  "p-2.5 rounded-xl border text-xs font-semibold text-center transition cursor-pointer",
                  formCategory === "waktu"
                    ? "bg-[#512da8] text-white border-[#512da8] shadow-xs"
                    : "bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-300"
                )}
              >
                1. Hitungan Waktu
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormCategory("kali")
                  setFormHasUnitNumber(false)
                  setFormHasTotalUnits(false)
                  setFormHasLocation(false)
                }}
                className={cn(
                  "p-2.5 rounded-xl border text-xs font-semibold text-center transition cursor-pointer",
                  formCategory === "kali"
                    ? "bg-[#512da8] text-white border-[#512da8] shadow-xs"
                    : "bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-300"
                )}
              >
                2. Hitungan Kali
              </button>
            </div>
          </div>

          {/* Opsi Khusus Hitungan Waktu */}
          {formCategory === "waktu" && (
            <div className="space-y-3 p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-800/40">
              <span className="block text-xs font-bold text-neutral-900 dark:text-neutral-100">
                Pilihan Konfigurasi Fitur Alat:
              </span>

              {/* Checkbox 1: Nomor Unit */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formHasUnitNumber}
                    onChange={(e) => {
                      const checked = e.target.checked
                      setFormHasUnitNumber(checked)
                      if (checked) {
                        setFormHasTotalUnits(false)
                      }
                    }}
                    className="rounded text-[#512da8] focus:ring-0"
                  />
                  <span>Memiliki Nomor Unit Fisik</span>
                </label>

                {formHasUnitNumber && (
                  <div className="pl-6 space-y-2">
                    <div className="flex items-center gap-4 text-xs">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="formUnitMode"
                          checked={formUnitMode === "single"}
                          onChange={() => setFormUnitMode("single")}
                        />
                        <span>1 Nomor Unit Saja</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="formUnitMode"
                          checked={formUnitMode === "range"}
                          onChange={() => setFormUnitMode("range")}
                        />
                        <span>Rentang Nomor Unit</span>
                      </label>
                    </div>

                    {formUnitMode === "single" ? (
                      <div>
                        <label className="block text-[11px] text-muted-foreground mb-1">Nomor Unit (Contoh: 1)</label>
                        <input
                          type="number"
                          min={1}
                          value={formSingleUnit}
                          onChange={(e) => setFormSingleUnit(Math.max(1, parseInt(e.target.value) || 1))}
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
                            value={formUnitStart}
                            onChange={(e) => setFormUnitStart(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-24 p-2 text-xs border rounded-lg bg-background font-mono font-bold"
                          />
                          <span className="text-xs text-muted-foreground">s/d</span>
                          <input
                            type="number"
                            min={1}
                            placeholder="Sampai"
                            value={formUnitEnd}
                            onChange={(e) => setFormUnitEnd(Math.max(1, parseInt(e.target.value) || 1))}
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
                    checked={formHasTotalUnits}
                    onChange={(e) => {
                      const checked = e.target.checked
                      setFormHasTotalUnits(checked)
                      if (checked) {
                        setFormHasUnitNumber(false)
                      }
                    }}
                    className="rounded text-[#512da8] focus:ring-0"
                  />
                  <span>Memiliki Total Unit Kuota Fisik (Tanpa Penomoran)</span>
                </label>

                {formHasTotalUnits && (
                  <div className="pl-6">
                    <label className="block text-[11px] text-muted-foreground mb-1">Jumlah Total Unit di Ruangan</label>
                    <input
                      type="number"
                      min={1}
                      value={formTotalUnits}
                      onChange={(e) => setFormTotalUnits(Math.max(1, parseInt(e.target.value) || 1))}
                      placeholder="Contoh: 10"
                      className="w-32 p-2 text-xs border rounded-lg bg-background font-mono font-bold"
                    />
                  </div>
                )}
              </div>

              {/* Checkbox 3: Lokasi Pemasangan Alat Anatomi */}
              <div className="space-y-2 pt-1 border-t border-neutral-200 dark:border-neutral-700">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formHasLocation}
                    onChange={(e) => setFormHasLocation(e.target.checked)}
                    className="rounded text-[#512da8] focus:ring-0"
                  />
                  <span>Memiliki Lokasi Pemasangan Anatomi</span>
                </label>

                {formHasLocation && (
                  <div className="pl-6 space-y-2">
                    <div className="space-y-1.5">
                      {formLocations.map((loc, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={loc}
                            onChange={(e) => {
                              const val = e.target.value
                              setFormLocations((prev) => {
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
                            disabled={formLocations.length <= 1}
                            onClick={() => {
                              if (formLocations.length > 1) {
                                setFormLocations((prev) => prev.filter((_, i) => i !== idx))
                              }
                            }}
                            title={formLocations.length <= 1 ? "Menyisakan minimal 1 kolom" : "Hapus kolom ini"}
                            className={cn(
                              "p-2 rounded-lg border transition",
                              formLocations.length <= 1
                                ? "opacity-30 cursor-not-allowed text-neutral-400 border-neutral-200"
                                : "text-rose-500 border-rose-200 hover:bg-rose-50 cursor-pointer dark:hover:bg-rose-950/40"
                            )}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {formLocations.length < 10 && (
                      <button
                        type="button"
                        onClick={() => setFormLocations((prev) => (prev.length < 10 ? [...prev, ""] : prev))}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 cursor-pointer"
                      >
                        <Plus className="size-3" />
                        <span>+ Tambah Lokasi Pemasangan</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {formCategory === "kali" && (
            <div className="p-3.5 rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/40 dark:bg-purple-950/20 text-xs text-purple-900 dark:text-purple-200">
              <p className="font-semibold mb-0.5">ℹ️ Kategori Hitungan Kali (Tindakan Medis)</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Alat ini dicatat berdasarkan jumlah frekuensi tindakan per pasien (contoh: EKG, GDS, Defibrilator) tanpa nomor unit fisik atau lokasi anatomi.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold mb-1">Deskripsi Tambahan</label>
            <textarea
              rows={2}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Keterangan penempatan atau fungsi khusus alat..."
              className="w-full text-xs sm:text-sm p-2 rounded-lg border border-border bg-background"
            />
          </div>
        </div>
      </AppModal>

      {/* ======================================================== */}
      {/* MODAL 2: EDIT ALAT MASTER */}
      {/* ======================================================== */}
      <AppModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Ubah Data Alat Medis"
        subtitle={`Perbarui spesifikasi atau jumlah unit ${editingTool?.name}`}
        icon={<Edit2 className="size-5" />}
        onSubmit={handleSubmitEditTool}
        submitText="Perbarui Data Alat"
        maxWidth="md"
      >
        <div className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-neutral-900 dark:text-neutral-100 mb-1">
              Nama Alat Medis *
            </label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-border bg-background"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-900 dark:text-neutral-100 mb-1.5">
              Kategori Penggunaan *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEditCategory("waktu")}
                className={cn(
                  "p-2.5 rounded-xl border text-xs font-semibold text-center transition cursor-pointer",
                  editCategory === "waktu"
                    ? "bg-[#512da8] text-white border-[#512da8] shadow-xs"
                    : "bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-300"
                )}
              >
                1. Hitungan Waktu
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditCategory("kali")
                  setEditHasUnitNumber(false)
                  setEditHasTotalUnits(false)
                  setEditHasLocation(false)
                }}
                className={cn(
                  "p-2.5 rounded-xl border text-xs font-semibold text-center transition cursor-pointer",
                  editCategory === "kali"
                    ? "bg-[#512da8] text-white border-[#512da8] shadow-xs"
                    : "bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-300"
                )}
              >
                2. Hitungan Kali
              </button>
            </div>
          </div>

          {/* Opsi Khusus Hitungan Waktu Edit */}
          {editCategory === "waktu" && (
            <div className="space-y-3 p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-800/40">
              <span className="block text-xs font-bold text-neutral-900 dark:text-neutral-100">
                Pilihan Konfigurasi Fitur Alat:
              </span>

              {/* Checkbox 1: Nomor Unit */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={editHasUnitNumber}
                    onChange={(e) => {
                      const checked = e.target.checked
                      setEditHasUnitNumber(checked)
                      if (checked) {
                        setEditHasTotalUnits(false)
                      }
                    }}
                    className="rounded text-[#512da8] focus:ring-0"
                  />
                  <span>Memiliki Nomor Unit Fisik</span>
                </label>

                {editHasUnitNumber && (
                  <div className="pl-6 space-y-2">
                    <div className="flex items-center gap-4 text-xs">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="editUnitMode"
                          checked={editUnitMode === "single"}
                          onChange={() => setEditUnitMode("single")}
                        />
                        <span>1 Nomor Unit Saja</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="editUnitMode"
                          checked={editUnitMode === "range"}
                          onChange={() => setEditUnitMode("range")}
                        />
                        <span>Rentang Nomor Unit</span>
                      </label>
                    </div>

                    {editUnitMode === "single" ? (
                      <div>
                        <label className="block text-[11px] text-muted-foreground mb-1">Nomor Unit (Contoh: 1)</label>
                        <input
                          type="number"
                          min={1}
                          value={editSingleUnit}
                          onChange={(e) => setEditSingleUnit(Math.max(1, parseInt(e.target.value) || 1))}
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
                            value={editUnitStart}
                            onChange={(e) => setEditUnitStart(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-24 p-2 text-xs border rounded-lg bg-background font-mono font-bold"
                          />
                          <span className="text-xs text-muted-foreground">s/d</span>
                          <input
                            type="number"
                            min={1}
                            placeholder="Sampai"
                            value={editUnitEnd}
                            onChange={(e) => setEditUnitEnd(Math.max(1, parseInt(e.target.value) || 1))}
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
                    checked={editHasTotalUnits}
                    onChange={(e) => {
                      const checked = e.target.checked
                      setEditHasTotalUnits(checked)
                      if (checked) {
                        setEditHasUnitNumber(false)
                      }
                    }}
                    className="rounded text-[#512da8] focus:ring-0"
                  />
                  <span>Memiliki Total Unit Kuota Fisik (Tanpa Penomoran)</span>
                </label>

                {editHasTotalUnits && (
                  <div className="pl-6">
                    <label className="block text-[11px] text-muted-foreground mb-1">Jumlah Total Unit di Ruangan</label>
                    <input
                      type="number"
                      min={1}
                      value={editTotalUnits}
                      onChange={(e) => setEditTotalUnits(Math.max(1, parseInt(e.target.value) || 1))}
                      placeholder="Contoh: 10"
                      className="w-32 p-2 text-xs border rounded-lg bg-background font-mono font-bold"
                    />
                  </div>
                )}
              </div>

              {/* Checkbox 3: Lokasi Pemasangan Alat Anatomi */}
              <div className="space-y-2 pt-1 border-t border-neutral-200 dark:border-neutral-700">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={editHasLocation}
                    onChange={(e) => setEditHasLocation(e.target.checked)}
                    className="rounded text-[#512da8] focus:ring-0"
                  />
                  <span>Memiliki Lokasi Pemasangan Anatomi</span>
                </label>

                {editHasLocation && (
                  <div className="pl-6 space-y-2">
                    <div className="space-y-1.5">
                      {editLocations.map((loc, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={loc}
                            onChange={(e) => {
                              const val = e.target.value
                              setEditLocations((prev) => {
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
                            disabled={editLocations.length <= 1}
                            onClick={() => {
                              if (editLocations.length > 1) {
                                setEditLocations((prev) => prev.filter((_, i) => i !== idx))
                              }
                            }}
                            title={editLocations.length <= 1 ? "Menyisakan minimal 1 kolom" : "Hapus kolom ini"}
                            className={cn(
                              "p-2 rounded-lg border transition",
                              editLocations.length <= 1
                                ? "opacity-30 cursor-not-allowed text-neutral-400 border-neutral-200"
                                : "text-rose-500 border-rose-200 hover:bg-rose-50 cursor-pointer dark:hover:bg-rose-950/40"
                            )}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {editLocations.length < 10 && (
                      <button
                        type="button"
                        onClick={() => setEditLocations((prev) => (prev.length < 10 ? [...prev, ""] : prev))}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 cursor-pointer"
                      >
                        <Plus className="size-3" />
                        <span>+ Tambah Lokasi Pemasangan</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {editCategory === "kali" && (
            <div className="p-3.5 rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/40 dark:bg-purple-950/20 text-xs text-purple-900 dark:text-purple-200">
              <p className="font-semibold mb-0.5">ℹ️ Kategori Hitungan Kali (Tindakan Medis)</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Alat ini dicatat berdasarkan jumlah frekuensi tindakan per pasien (contoh: EKG, GDS, Defibrilator) tanpa nomor unit fisik atau lokasi anatomi.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold mb-1">Deskripsi Tambahan</label>
            <textarea
              rows={2}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full text-xs sm:text-sm p-2 rounded-lg border border-border bg-background"
            />
          </div>
        </div>
      </AppModal>

      {/* ======================================================== */}
      {/* MODAL 3: LAPOR ALAT RUSAK */}
      {/* ======================================================== */}
      <AppModal
        isOpen={showDamageModal}
        onClose={() => setShowDamageModal(false)}
        title="Lapor Kerusakan Alat Medis"
        subtitle="Unit yang dilaporkan rusak otomatis dinonaktifkan dari pemilihan alat pasien"
        icon={<Wrench className="size-5 text-rose-500" />}
        onSubmit={handleSubmitDamage}
        submitText="Kirim Laporan Kerusakan"
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
              value={dmgSelectedTool}
              onChange={(e) => {
                setDmgSelectedTool(e.target.value)
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
            const target = masterTools.find((m) => m.name === dmgSelectedTool)

            // Kondisi 1: Memiliki Nomor Unit Fisik -> Tampilkan Grid Chip Nomor (bisa multi-select)
            if (target?.hasUnitNumber) {
              const start = target.unitStartNumber || 1
              const end = target.unitEndNumber || target.totalUnits || 21
              const total = Math.max(1, end - start + 1)

              // Nomor unit yang sudah berstatus rusak saat ini
              const alreadyDamagedNumbers = new Set(
                damagedTools
                  .filter((d) => d.toolName === dmgSelectedTool)
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
              className="w-full text-xs sm:text-sm p-2 rounded-lg border border-border bg-background cursor-pointer"
            >
              <option value="rusak_ringan">Rusak Ringan</option>
              <option value="rusak_berat">Rusak Berat</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Keterangan Kendala Kerusakan</label>
            <textarea
              rows={2}
              value={dmgNotes}
              onChange={(e) => setDmgNotes(e.target.value)}
              placeholder="Jelaskan kendala kerusakan alat secara rinci..."
              className="w-full text-xs sm:text-sm p-2 rounded-lg border border-border bg-background"
            />
          </div>
        </div>
      </AppModal>

      {/* ======================================================== */}
      {/* MODAL 4: KONFIRMASI HAPUS ALAT */}
      {/* ======================================================== */}
      <AppModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Hapus Alat dari Master Inventaris"
        subtitle={`Konfirmasi penghapusan permanen ${deletingTool?.name}`}
        icon={<Trash2 className="size-5 text-rose-500" />}
        onSubmit={(e) => {
          e.preventDefault()
          handleConfirmDelete()
        }}
        submitText="Ya, Hapus Alat"
        submitVariant="danger"
        maxWidth="md"
      >
        <div className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 space-y-3 leading-relaxed">
          <p>
            Apakah Anda yakin ingin menghapus <strong>{deletingTool?.name}</strong> dari katalog master inventaris HCU?
          </p>
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-xs">
            ⚠️ <strong>Peringatan:</strong> Alat ini tidak akan muncul lagi di formulir pemakaian pasien.
            Pastikan alat ini sudah tidak lagi terpasang pada pasien aktif.
          </div>
        </div>
      </AppModal>
    </div>
  )
}
