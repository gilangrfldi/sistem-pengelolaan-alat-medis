export type ToolCategory = "waktu" | "kali"

export interface MasterTool {
  id: string
  name: string
  category: ToolCategory
  totalUnits: number
  hasUnitNumber: boolean
  unitNumberType?: "single" | "range"
  numberedUnitsCount?: number
  unitStartNumber?: number
  unitEndNumber?: number
  hasTotalUnits?: boolean
  hasLocation?: boolean
  applicableLocations?: string[]
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

export interface CountActionLog {
  id?: string
  timeStr: string
  dateStr?: string
  countAdded: number
  nurseName: string
  timestamp: number
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
  actionLogs?: CountActionLog[]
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

