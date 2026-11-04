"use client"

import * as React from "react"
import { LogOut } from "lucide-react"
import { AppModal } from "@/components/app-modal"
import { DatePicker } from "@/components/date-picker"
import { type Patient } from "@/lib/types/patient"

interface ModalPasienKeluarProps {
  isOpen: boolean
  onClose: () => void
  selectedPatient: Patient | null
  dischargeReason: string
  setDischargeReason: (val: string) => void
  dischargeDateObj: Date | undefined
  setDischargeDateObj: (date: Date | undefined) => void
  onConfirm: (e: React.FormEvent) => void
}

export function ModalPasienKeluar({
  isOpen,
  onClose,
  selectedPatient,
  dischargeReason,
  setDischargeReason,
  dischargeDateObj,
  setDischargeDateObj,
  onConfirm,
}: ModalPasienKeluarProps) {
  return (
    <AppModal
      isOpen={isOpen && Boolean(selectedPatient)}
      onClose={onClose}
      title="Konfirmasi Pemulangan Pasien"
      subtitle="Catat status kepulangan atau perpindahan ruangan pasien"
      icon={<LogOut className="size-5" />}
      iconClassName="bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300"
      onSubmit={onConfirm}
      submitText="Konfirmasi Pulangkan"
      submitVariant="danger"
      maxWidth="md"
    >
      {selectedPatient && (
        <>
          <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl text-xs space-y-1.5 border border-neutral-100 dark:border-neutral-800">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nama Pasien:</span>
              <span className="font-bold text-neutral-900 dark:text-neutral-100">{selectedPatient.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">No. Rekam Medis:</span>
              <span className="font-mono font-semibold">{selectedPatient.rm}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bed Saat Ini:</span>
              <span className="font-bold text-[#512da8] dark:text-purple-300">{selectedPatient.bed}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Alasan / Status Pemulangan <span className="text-red-500">*</span>
            </label>
            <select
              value={dischargeReason}
              onChange={(e) => setDischargeReason(e.target.value)}
              className="w-full text-xs sm:text-sm border rounded-lg px-3 py-2 bg-background border-border focus:outline-[#512da8]"
            >
              <option value="Boleh Pulang (Sembuh)">Boleh Pulang (BLPL / Sembuh)</option>
              <option value="Pindah Ruang Rawat Inap">Pindah Ruang Rawat Inap Biasa</option>
              <option value="Rujuk ke RS Lain">Rujuk ke Rumah Sakit Lain</option>
              <option value="Pulang Atas Permintaan Sendiri">Pulang Atas Permintaan Sendiri (APS)</option>
              <option value="Meninggal Dunia">Meninggal Dunia</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Tanggal Pemulangan
            </label>
            <DatePicker
              date={dischargeDateObj}
              onDateChange={setDischargeDateObj}
              className="w-full justify-start text-xs sm:text-sm"
            />
          </div>
        </>
      )}
    </AppModal>
  )
}
