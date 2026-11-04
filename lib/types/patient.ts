export type CareLevel = "total" | "parsial" | "minimal"

export interface Patient {
  id: string
  name: string
  gender: "L" | "P"
  rm: string
  bed: string
  careLevel: CareLevel
  admissionDate: string // Format: DD-MM-YYYY
  admissionTime: string
  admissionShiftKey: string
  nurseName: string
  status: "aktif" | "keluar"
  dischargeDate?: string
  dischargeTime?: string
  dischargeShiftKey?: string
  dischargeReason?: string
}

export interface StoredPatientRecord {
  id?: string
  name: string
  rm: string
  bed: string
  careLevel?: CareLevel
  gender?: "L" | "P"
  admissionDate?: string
  admissionTime?: string
  status?: "aktif" | "keluar"
}

export interface ShiftHistoryRecord {
  id: string
  shiftName: string
  dateLabel: string
  timeRange: string
  awal: number
  masuk: number
  keluar: number
  akhir: number
}
