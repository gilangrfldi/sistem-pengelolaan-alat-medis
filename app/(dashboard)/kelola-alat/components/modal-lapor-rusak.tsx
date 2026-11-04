"use client"

import * as React from "react"
import { Wrench, AlertCircle } from "lucide-react"
import { cn } from "cn"
import { AppModal } from "@/components/app-modal"
import { type MasterTool, type DamagedToolRecord } from "@/lib/types/tool"

interface ModalLaporRusakProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  submitText?: string
  masterTools: MasterTool[]
  damagedTools: DamagedToolRecord[]
  dmgSelectedTool: string
  setDmgSelectedTool: (tool: string) => void
  dmgSelectedNumbers: number[]
  setDmgSelectedNumbers: React.Dispatch<React.SetStateAction<number[]>>
  dmgQuantity: number
  setDmgQuantity: (qty: number) => void
  dmgSeverity: "rusak_ringan" | "rusak_berat"
  setDmgSeverity: (sev: "rusak_ringan" | "rusak_berat") => void
  dmgNotes: string
  setDmgNotes: (notes: string) => void
  dmgError: string | null
  setDmgError: (err: string | null) => void
  onSubmit: (e: React.FormEvent) => void
}

export function ModalLaporRusak({
  isOpen,
  onClose,
  title = "Lapor Kerusakan Alat Medis",
  subtitle = "Unit yang dilaporkan rusak otomatis dinonaktifkan dari pemilihan alat pasien",
  submitText = "Simpan Laporan Kerusakan",
  masterTools,
  damagedTools,
  dmgSelectedTool,
  setDmgSelectedTool,
  dmgSelectedNumbers,
  setDmgSelectedNumbers,
  dmgQuantity,
  setDmgQuantity,
  dmgSeverity,
  setDmgSeverity,
  dmgNotes,
  setDmgNotes,
  dmgError,
  setDmgError,
  onSubmit,
}: ModalLaporRusakProps) {
  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      icon={<Wrench className="size-5 text-rose-500" />}
      onSubmit={onSubmit}
      submitText={submitText}
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
  )
}

