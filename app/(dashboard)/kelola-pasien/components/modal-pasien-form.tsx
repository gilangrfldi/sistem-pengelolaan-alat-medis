"use client"

import * as React from "react"
import { UserPlus, Edit2, AlertCircle } from "lucide-react"
import { cn } from "cn"
import { AppModal } from "@/components/app-modal"
import { BedSelector } from "@/components/bed-selector"
import { DatePicker } from "@/components/date-picker"
import { type Patient, type CareLevel } from "@/lib/types/patient"

export type PatientTitle = "Tn." | "Ny." | "An."

interface ModalPasienFormProps {
  mode: "add" | "edit"
  isOpen: boolean
  onClose: () => void
  currentNurse?: string
  formError?: string | null
  formBed: string
  setFormBed: (bed: string) => void
  occupiedBedMap: Map<string, Patient>
  formTitle: PatientTitle
  setFormTitle: (t: PatientTitle) => void
  formRawName: string
  setFormRawName: (n: string) => void
  formRm: string
  setFormRm: (rm: string) => void
  formAdmissionDateObj: Date | undefined
  setFormAdmissionDateObj: (d: Date | undefined) => void
  formAdmissionTime: string
  setFormAdmissionTime: (t: string) => void
  formCareLevel: CareLevel
  setFormCareLevel: (lvl: CareLevel) => void
  onSubmit: (e: React.FormEvent) => void
  selectedPatient?: Patient | null
}

export function ModalPasienForm({
  mode,
  isOpen,
  onClose,
  currentNurse,
  formError,
  formBed,
  setFormBed,
  occupiedBedMap,
  formTitle,
  setFormTitle,
  formRawName,
  setFormRawName,
  formRm,
  setFormRm,
  formAdmissionDateObj,
  setFormAdmissionDateObj,
  formAdmissionTime,
  setFormAdmissionTime,
  formCareLevel,
  setFormCareLevel,
  onSubmit,
  selectedPatient,
}: ModalPasienFormProps) {
  const isAdd = mode === "add"

  return (
    <AppModal
      isOpen={isOpen && (isAdd || Boolean(selectedPatient))}
      onClose={onClose}
      title={isAdd ? "Registrasi Pasien Masuk HCU" : "Ubah Data Pasien"}
      subtitle={
        isAdd ? (
          <span>
            Perawat Penginput: <strong className="text-foreground">{currentNurse}</strong>
          </span>
        ) : (
          "Perbarui nomor bed, klasifikasi perawatan, atau nomor rekam medis"
        )
      }
      icon={isAdd ? <UserPlus className="size-5" /> : <Edit2 className="size-5" />}
      onSubmit={onSubmit}
      submitText={isAdd ? "Simpan Pasien Masuk" : "Simpan Perubahan"}
      maxWidth="2xl"
    >
      {formError && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-900/50">
          <AlertCircle className="size-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Denah Pemilihan Bed */}
      <BedSelector
        title={isAdd ? "Pilih Bed Pasien" : "Pindah / Ubah Bed"}
        required
        selectedBed={formBed}
        onSelectBed={setFormBed}
        isBedDisabled={(bed) => {
          if (!isAdd && selectedPatient && bed === selectedPatient.bed) return false
          return occupiedBedMap.has(bed)
        }}
        isBedOccupied={(bed) => {
          if (!isAdd && selectedPatient && bed === selectedPatient.bed) return false
          return occupiedBedMap.has(bed)
        }}
        occupiedStyle="muted"
        legendLabels={{
          available: "Tersedia",
          occupied: "Terisi",
          selected: isAdd ? "Pilihan Anda" : "Bed Baru",
        }}
        bedStatusTexts={{
          available: "Tersedia",
          disabled: "Terisi",
          selected: "Pilihan",
        }}
        getBedTooltip={(bed, { isDisabled }) => {
          const occupant = occupiedBedMap.get(bed)
          if (!isAdd && selectedPatient && bed === selectedPatient.bed) {
            return `${bed}: Bed Pasien Saat Ini`
          }
          return isDisabled
            ? `${bed}: Terisi (${occupant?.name ?? ""} - ${occupant?.rm ?? ""})`
            : `${bed}: Tersedia`
        }}
      />

      {/* Kategori & Panggilan Pasien */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
          Kategori & Panggilan Pasien <span className="text-red-500">*</span>
        </label>

        <div className="grid grid-cols-3 gap-2 mb-2">
          <button
            type="button"
            onClick={() => setFormTitle("Tn.")}
            className={cn(
              "py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer text-center",
              formTitle === "Tn."
                ? "bg-[#512da8] text-white border-[#512da8] shadow-xs"
                : "border-border text-muted-foreground hover:bg-neutral-50 dark:hover:bg-neutral-800"
            )}
          >
            Tn. (Laki-laki)
          </button>
          <button
            type="button"
            onClick={() => setFormTitle("Ny.")}
            className={cn(
              "py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer text-center",
              formTitle === "Ny."
                ? "bg-[#512da8] text-white border-[#512da8] shadow-xs"
                : "border-border text-muted-foreground hover:bg-neutral-50 dark:hover:bg-neutral-800"
            )}
          >
            Ny. (Perempuan)
          </button>
          <button
            type="button"
            onClick={() => setFormTitle("An.")}
            className={cn(
              "py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer text-center",
              formTitle === "An."
                ? "bg-[#512da8] text-white border-[#512da8] shadow-xs"
                : "border-border text-muted-foreground hover:bg-neutral-50 dark:hover:bg-neutral-800"
            )}
          >
            An. (Anak-anak)
          </button>
        </div>

        <div className="flex rounded-lg border border-border overflow-hidden focus-within:ring-2 focus-within:ring-[#512da8]/30 focus-within:border-[#512da8]">
          <div className="bg-neutral-100 dark:bg-neutral-800 px-3.5 py-2 text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-200 border-r border-border flex items-center select-none">
            {formTitle}
          </div>
          <input
            type="text"
            placeholder="Nama lengkap pasien..."
            value={formRawName}
            onChange={(e) => setFormRawName(e.target.value)}
            className="flex-1 px-3 py-2 text-xs sm:text-sm bg-background border-none outline-none text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* No. RM & Tanggal Masuk */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Nomor Rekam Medis (RM) <span className="text-red-500">*</span>
            </label>
            <span className="text-[10px] text-muted-foreground font-mono">
              {formRm.length}/10 digit
            </span>
          </div>
          <input
            type="text"
            inputMode="numeric"
            maxLength={10}
            placeholder="Contoh: 0102098 (maks 10 digit)"
            value={formRm}
            onChange={(e) => setFormRm(e.target.value.replace(/\D/g, "").slice(0, 10))}
            className="w-full text-xs sm:text-sm border rounded-lg px-3 py-2 bg-background border-border focus:outline-[#512da8] font-mono"
          />
          <span className="text-[10px] text-muted-foreground mt-0.5 block">
            Maksimal 10 digit angka. No. RM pasien aktif tidak boleh sama.
          </span>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Tanggal & Jam Masuk HCU
            </label>
            <span className="text-[10px] text-muted-foreground font-mono">WIB</span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            <div className="col-span-3">
              <DatePicker
                date={formAdmissionDateObj}
                onDateChange={setFormAdmissionDateObj}
                className="w-full justify-start text-xs sm:text-sm"
              />
            </div>
            <div className="col-span-2">
              <input
                type="time"
                value={formAdmissionTime}
                onChange={(e) => setFormAdmissionTime(e.target.value)}
                className="w-full h-9 text-xs sm:text-sm border rounded-lg px-2.5 py-1.5 bg-background border-border focus:outline-[#512da8] font-mono text-center"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Klasifikasi Tingkat Perawatan */}
      <div>
        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
          {isAdd ? "Klasifikasi Tingkat Perawatan" : "Ubah Tingkat Perawatan"} <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setFormCareLevel("total")}
            className={cn(
              "py-2 px-3 rounded-lg text-xs font-semibold border text-center transition-all cursor-pointer",
              formCareLevel === "total"
                ? "bg-red-500 text-white border-red-600 shadow-xs"
                : "border-border text-muted-foreground hover:bg-neutral-50 dark:hover:bg-neutral-800"
            )}
          >
            Perawatan Total
          </button>
          <button
            type="button"
            onClick={() => setFormCareLevel("parsial")}
            className={cn(
              "py-2 px-3 rounded-lg text-xs font-semibold border text-center transition-all cursor-pointer",
              formCareLevel === "parsial"
                ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                : "border-border text-muted-foreground hover:bg-neutral-50 dark:hover:bg-neutral-800"
            )}
          >
            Perawatan Parsial
          </button>
          <button
            type="button"
            onClick={() => setFormCareLevel("minimal")}
            className={cn(
              "py-2 px-3 rounded-lg text-xs font-semibold border text-center transition-all cursor-pointer",
              formCareLevel === "minimal"
                ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                : "border-border text-muted-foreground hover:bg-neutral-50 dark:hover:bg-neutral-800"
            )}
          >
            Perawatan Minimal
          </button>
        </div>
      </div>
    </AppModal>
  )
}
