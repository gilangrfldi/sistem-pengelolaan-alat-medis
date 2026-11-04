"use client"

import * as React from "react"
import { Plus, Edit2, AlertCircle, Trash2 } from "lucide-react"
import { cn } from "cn"
import { AppModal } from "@/components/app-modal"
import { type ToolCategory } from "@/lib/types/tool"

interface ModalMasterAlatFormProps {
  mode: "add" | "edit"
  isOpen: boolean
  onClose: () => void
  toolNameForSubtitle?: string
  formError?: string | null
  name: string
  setName: (val: string) => void
  category: ToolCategory
  setCategory: (val: ToolCategory) => void
  hasUnitNumber: boolean
  setHasUnitNumber: (val: boolean) => void
  unitMode: "single" | "range"
  setUnitMode: (val: "single" | "range") => void
  singleUnit: number
  setSingleUnit: (val: number) => void
  unitStart: number
  setUnitStart: (val: number) => void
  unitEnd: number
  setUnitEnd: (val: number) => void
  hasTotalUnits: boolean
  setHasTotalUnits: (val: boolean) => void
  totalUnits: number
  setTotalUnits: (val: number) => void
  hasLocation: boolean
  setHasLocation: (val: boolean) => void
  locations: string[]
  setLocations: React.Dispatch<React.SetStateAction<string[]>>
  description: string
  setDescription: (val: string) => void
  onSubmit: (e: React.FormEvent) => void
}

export function ModalMasterAlatForm({
  mode,
  isOpen,
  onClose,
  toolNameForSubtitle,
  formError,
  name,
  setName,
  category,
  setCategory,
  hasUnitNumber,
  setHasUnitNumber,
  unitMode,
  setUnitMode,
  singleUnit,
  setSingleUnit,
  unitStart,
  setUnitStart,
  unitEnd,
  setUnitEnd,
  hasTotalUnits,
  setHasTotalUnits,
  totalUnits,
  setTotalUnits,
  hasLocation,
  setHasLocation,
  locations,
  setLocations,
  description,
  setDescription,
  onSubmit,
}: ModalMasterAlatFormProps) {
  const isAdd = mode === "add"

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title={isAdd ? "Tambah Alat Medis Baru ke Master HCU" : "Ubah Data Alat Medis"}
      subtitle={
        isAdd
          ? "Daftarkan peralatan medis baru ke dalam inventaris ruangan"
          : `Perbarui spesifikasi atau jumlah unit ${toolNameForSubtitle ?? ""}`
      }
      icon={isAdd ? <Plus className="size-5" /> : <Edit2 className="size-5" />}
      onSubmit={onSubmit}
      submitText={isAdd ? "Simpan ke Katalog Master" : "Perbarui Data Alat"}
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
            placeholder={isAdd ? "Contoh: Ventilator Transport, Blood Warmer..." : undefined}
            value={name}
            onChange={(e) => setName(e.target.value)}
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
              onClick={() => setCategory("waktu")}
              className={cn(
                "p-2.5 rounded-xl border text-xs font-semibold text-center transition cursor-pointer",
                category === "waktu"
                  ? "bg-[#512da8] text-white border-[#512da8] shadow-xs"
                  : "bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-300"
              )}
            >
              1. Hitungan Waktu
            </button>
            <button
              type="button"
              onClick={() => {
                setCategory("kali")
                setHasUnitNumber(false)
                setHasTotalUnits(false)
                setHasLocation(false)
              }}
              className={cn(
                "p-2.5 rounded-xl border text-xs font-semibold text-center transition cursor-pointer",
                category === "kali"
                  ? "bg-[#512da8] text-white border-[#512da8] shadow-xs"
                  : "bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-300"
              )}
            >
              2. Hitungan Kali
            </button>
          </div>
        </div>

        {/* Opsi Khusus Hitungan Waktu */}
        {category === "waktu" && (
          <div className="space-y-3 p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-800/40">
            <span className="block text-xs font-bold text-neutral-900 dark:text-neutral-100">
              Pilihan Konfigurasi Fitur Alat:
            </span>

            {/* Checkbox 1: Nomor Unit */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasUnitNumber}
                  onChange={(e) => {
                    const checked = e.target.checked
                    setHasUnitNumber(checked)
                    if (checked) {
                      setHasTotalUnits(false)
                    }
                  }}
                  className="rounded text-[#512da8] focus:ring-0"
                />
                <span>Memiliki Nomor Unit Fisik</span>
              </label>

              {hasUnitNumber && (
                <div className="pl-6 space-y-2">
                  <div className="flex items-center gap-4 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name={isAdd ? "formUnitMode" : "editUnitMode"}
                        checked={unitMode === "single"}
                        onChange={() => setUnitMode("single")}
                      />
                      <span>1 Nomor Unit Saja</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name={isAdd ? "formUnitMode" : "editUnitMode"}
                        checked={unitMode === "range"}
                        onChange={() => setUnitMode("range")}
                      />
                      <span>Rentang Nomor Unit</span>
                    </label>
                  </div>

                  {unitMode === "single" ? (
                    <div>
                      <label className="block text-[11px] text-muted-foreground mb-1">Nomor Unit (Contoh: 1)</label>
                      <input
                        type="number"
                        min={1}
                        value={singleUnit}
                        onChange={(e) => setSingleUnit(Math.max(1, parseInt(e.target.value) || 1))}
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
                          value={unitStart}
                          onChange={(e) => setUnitStart(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-24 p-2 text-xs border rounded-lg bg-background font-mono font-bold"
                        />
                        <span className="text-xs text-muted-foreground">s/d</span>
                        <input
                          type="number"
                          min={1}
                          placeholder="Sampai"
                          value={unitEnd}
                          onChange={(e) => setUnitEnd(Math.max(1, parseInt(e.target.value) || 1))}
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
                  checked={hasTotalUnits}
                  onChange={(e) => {
                    const checked = e.target.checked
                    setHasTotalUnits(checked)
                    if (checked) {
                      setHasUnitNumber(false)
                    }
                  }}
                  className="rounded text-[#512da8] focus:ring-0"
                />
                <span>Memiliki Total Unit Kuota Fisik (Tanpa Penomoran)</span>
              </label>

              {hasTotalUnits && (
                <div className="pl-6">
                  <label className="block text-[11px] text-muted-foreground mb-1">Jumlah Total Unit di Ruangan</label>
                  <input
                    type="number"
                    min={1}
                    value={totalUnits}
                    onChange={(e) => setTotalUnits(Math.max(1, parseInt(e.target.value) || 1))}
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
                  checked={hasLocation}
                  onChange={(e) => setHasLocation(e.target.checked)}
                  className="rounded text-[#512da8] focus:ring-0"
                />
                <span>Memiliki Lokasi Pemasangan Anatomi</span>
              </label>

              {hasLocation && (
                <div className="pl-6 space-y-2">
                  <div className="space-y-1.5">
                    {locations.map((loc, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={loc}
                          onChange={(e) => {
                            const val = e.target.value
                            setLocations((prev) => {
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
                          disabled={locations.length <= 1}
                          onClick={() => {
                            if (locations.length > 1) {
                              setLocations((prev) => prev.filter((_, i) => i !== idx))
                            }
                          }}
                          title={locations.length <= 1 ? "Menyisakan minimal 1 kolom" : "Hapus kolom ini"}
                          className={cn(
                            "p-2 rounded-lg border transition",
                            locations.length <= 1
                              ? "opacity-30 cursor-not-allowed text-neutral-400 border-neutral-200"
                              : "text-rose-500 border-rose-200 hover:bg-rose-50 cursor-pointer dark:hover:bg-rose-950/40"
                          )}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {locations.length < 10 && (
                    <button
                      type="button"
                      onClick={() => setLocations((prev) => (prev.length < 10 ? [...prev, ""] : prev))}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 cursor-pointer"
                    >
                      <Plus className="size-3" />
                      <span>Tambah Lokasi Pemasangan</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {category === "kali" && (
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
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Keterangan penempatan atau fungsi khusus alat..."
            className="w-full text-xs sm:text-sm p-2 rounded-lg border border-border bg-background"
          />
        </div>
      </div>
    </AppModal>
  )
}
