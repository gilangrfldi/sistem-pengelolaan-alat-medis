import { createClient } from "@/lib/supabase/client"
import type {
  MasterTool,
  TimedToolUsageRecord,
  CountToolUsageRecord,
  DamagedToolRecord,
  CountActionLog,
} from "@/lib/types/tool"

// Tipe data tabel alat medis
interface MasterAlatRow {
  id: string
  name: string
  category: "waktu" | "kali"
  total_units: number | null
  has_unit_number: boolean | null
  unit_start_number: number | null
  unit_end_number: number | null
  numbered_units_count: number | null
  applicable_locations: string[] | null
  subtypes: string[] | null
  description: string | null
}

interface AlatWaktuRow {
  id: string
  bed: string
  patient_name: string
  patient_rm: string
  tool_name: string
  unit_number: number | null
  status: "berjalan" | "selesai"
  start_time_str: string
  end_time_str: string | null
  started_at_timestamp: number | string
  ended_at_timestamp: number | string | null
  duration_minutes: number | null
  accumulated_minutes: number | null
  nurse_name: string
  stop_nurse_name?: string | null
  locations?: string[] | null
  shift_key: string
  notes: string | null
}

interface AlatKaliRow {
  id: string
  bed: string
  patient_name: string
  patient_rm: string
  tool_name: string
  count: number | null
  last_action_time: string
  nurse_name: string
  status?: string | null
  notes: string | null
  created_at?: string
  unit_number?: number | null
}

interface AlatRusakRow {
  id: string
  tool_name: string
  quantity: number | null
  unit_numbers: number[] | null
  report_date: string
  severity: "rusak_ringan" | "rusak_berat"
  notes: string | null
  reported_by: string
}

// Layanan data alat medis HCU
function getSupabase() {
  return createClient()
}

// ------------------------------------------------------------------------------
// 1. MASTER ALAT MEDIS
// ------------------------------------------------------------------------------

export async function fetchMasterToolsFromDb(): Promise<{
  data: MasterTool[]
  isDbConnected: boolean
  error?: string
}> {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from("master_alat")
      .select("*")
      .order("name", { ascending: true })

    if (error) {
      console.warn("Supabase master_alat fetch notice:", error.message)
      return { data: [], isDbConnected: false, error: error.message }
    }

    const mapped: MasterTool[] = ((data as MasterAlatRow[]) || []).map((row) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      totalUnits: row.total_units ?? 0,
      hasUnitNumber: row.has_unit_number ?? false,
      unitStartNumber: row.unit_start_number ?? undefined,
      unitEndNumber: row.unit_end_number ?? undefined,
      numberedUnitsCount: row.numbered_units_count ?? undefined,
      applicableLocations: row.applicable_locations ?? undefined,
      subtypes: row.subtypes ?? undefined,
      description: row.description ?? undefined,
    }))

    return { data: mapped, isDbConnected: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { data: [], isDbConnected: false, error: msg }
  }
}

export async function createMasterToolInDb(
  tool: Omit<MasterTool, "id">
): Promise<MasterTool> {
  const supabase = getSupabase()
  const payload = {
    name: tool.name.trim(),
    category: tool.category,
    total_units: tool.totalUnits,
    has_unit_number: tool.hasUnitNumber,
    unit_start_number: tool.unitStartNumber ?? null,
    unit_end_number: tool.unitEndNumber ?? null,
    numbered_units_count: tool.numberedUnitsCount ?? null,
    applicable_locations: tool.applicableLocations ?? null,
    subtypes: tool.subtypes ?? null,
    description: tool.description ?? null,
  }

  const { data, error } = await supabase
    .from("master_alat")
    .insert([payload])
    .select()
    .single()

  if (error) throw error

  return {
    id: data.id,
    name: data.name,
    category: data.category,
    totalUnits: data.total_units ?? 0,
    hasUnitNumber: data.has_unit_number ?? false,
    unitStartNumber: data.unit_start_number ?? undefined,
    unitEndNumber: data.unit_end_number ?? undefined,
    numberedUnitsCount: data.numbered_units_count ?? undefined,
    applicableLocations: data.applicable_locations ?? undefined,
    subtypes: data.subtypes ?? undefined,
    description: data.description ?? undefined,
  }
}

export async function updateMasterToolInDb(
  id: string,
  tool: Partial<MasterTool>
): Promise<void> {
  const supabase = getSupabase()
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (tool.name !== undefined) payload.name = tool.name.trim()
  if (tool.category !== undefined) payload.category = tool.category
  if (tool.totalUnits !== undefined) payload.total_units = tool.totalUnits
  if (tool.hasUnitNumber !== undefined) payload.has_unit_number = tool.hasUnitNumber
  if (tool.unitStartNumber !== undefined) payload.unit_start_number = tool.unitStartNumber
  if (tool.unitEndNumber !== undefined) payload.unit_end_number = tool.unitEndNumber
  if (tool.numberedUnitsCount !== undefined) payload.numbered_units_count = tool.numberedUnitsCount
  if (tool.applicableLocations !== undefined) payload.applicable_locations = tool.applicableLocations
  if (tool.subtypes !== undefined) payload.subtypes = tool.subtypes
  if (tool.description !== undefined) payload.description = tool.description

  const { error } = await supabase.from("master_alat").update(payload).eq("id", id)
  if (error) throw error
}

export async function deleteMasterToolInDb(id: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from("master_alat").delete().eq("id", id)
  if (error) throw error
}

// ------------------------------------------------------------------------------
// 2. ALAT HITUNGAN WAKTU (MESIN BER-TIMER & ALAT TERPASANG BERDURASI)
// ------------------------------------------------------------------------------

function parseTimestampSafe(val: unknown): number {
  if (!val) return 0
  const num = Number(val)
  if (!isNaN(num) && num > 0) return num
  const parsed = new Date(String(val)).getTime()
  return !isNaN(parsed) && parsed > 0 ? parsed : 0
}

export async function fetchTimedToolsFromDb(): Promise<{
  data: TimedToolUsageRecord[]
  isDbConnected: boolean
  error?: string
}> {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from("alat_waktu")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.warn("Supabase alat_waktu fetch notice:", error.message)
      return { data: [], isDbConnected: false, error: error.message }
    }

    const mapped: TimedToolUsageRecord[] = ((data as AlatWaktuRow[]) || []).map((row) => ({
      id: row.id,
      bed: row.bed,
      patientName: row.patient_name,
      patientRm: row.patient_rm,
      toolName: row.tool_name,
      unitNumber: row.unit_number ?? undefined,
      locations: row.locations || undefined,
      status: row.status,
      startTimeStr: row.start_time_str,
      endTimeStr: row.end_time_str || undefined,
      startedAtTimestamp: parseTimestampSafe(row.started_at_timestamp),
      endedAtTimestamp: row.ended_at_timestamp ? parseTimestampSafe(row.ended_at_timestamp) : undefined,
      durationMinutes: row.duration_minutes ?? 0,
      accumulatedMinutes: row.accumulated_minutes ?? 0,
      nurseName: row.nurse_name,
      stopNurseName: row.stop_nurse_name || undefined,
      shiftKey: row.shift_key,
      notes: row.notes || undefined,
    }))

    return { data: mapped, isDbConnected: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { data: [], isDbConnected: false, error: msg }
  }
}

export async function insertTimedToolInDb(
  record: Omit<TimedToolUsageRecord, "id">
): Promise<TimedToolUsageRecord> {
  const supabase = getSupabase()
  const payload = {
    bed: record.bed,
    patient_name: record.patientName,
    patient_rm: record.patientRm,
    tool_name: record.toolName,
    unit_number: record.unitNumber ?? null,
    locations: record.locations || [],
    status: record.status,
    start_time_str: record.startTimeStr,
    end_time_str: record.endTimeStr ?? null,
    started_at_timestamp: record.startedAtTimestamp,
    ended_at_timestamp: record.endedAtTimestamp ?? null,
    duration_minutes: record.durationMinutes,
    accumulated_minutes: record.accumulatedMinutes,
    nurse_name: record.nurseName,
    stop_nurse_name: record.stopNurseName ?? null,
    shift_key: record.shiftKey,
    notes: record.notes ?? null,
  }

  const { data, error } = await supabase
    .from("alat_waktu")
    .insert([payload])
    .select()
    .single()

  if (error) throw error

  return {
    id: data.id,
    bed: data.bed,
    patientName: data.patient_name,
    patientRm: data.patient_rm,
    toolName: data.tool_name,
    unitNumber: data.unit_number ?? undefined,
    locations: data.locations || undefined,
    status: data.status,
    startTimeStr: data.start_time_str,
    endTimeStr: data.end_time_str || undefined,
    startedAtTimestamp: Number(data.started_at_timestamp),
    endedAtTimestamp: data.ended_at_timestamp ? Number(data.ended_at_timestamp) : undefined,
    durationMinutes: data.duration_minutes ?? 0,
    accumulatedMinutes: data.accumulated_minutes ?? 0,
    nurseName: data.nurse_name,
    stopNurseName: data.stop_nurse_name || undefined,
    shiftKey: data.shift_key,
    notes: data.notes || undefined,
  }
}

export async function updateTimedToolInDb(
  id: string,
  updates: Partial<TimedToolUsageRecord>
): Promise<void> {
  const supabase = getSupabase()
  const payload: Record<string, unknown> = {}
  if (updates.status !== undefined) payload.status = updates.status
  if (updates.endTimeStr !== undefined) payload.end_time_str = updates.endTimeStr
  if (updates.endedAtTimestamp !== undefined) payload.ended_at_timestamp = updates.endedAtTimestamp
  if (updates.durationMinutes !== undefined) payload.duration_minutes = updates.durationMinutes
  if (updates.accumulatedMinutes !== undefined) payload.accumulated_minutes = updates.accumulatedMinutes
  if (updates.stopNurseName !== undefined) payload.stop_nurse_name = updates.stopNurseName
  if (updates.notes !== undefined) payload.notes = updates.notes

  const { error } = await supabase.from("alat_waktu").update(payload).eq("id", id)
  if (error) throw error
}

export async function deleteTimedToolInDb(id: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from("alat_waktu").delete().eq("id", id)
  if (error) throw error
}

// ------------------------------------------------------------------------------
// 4. ALAT HITUNGAN KALI (FREKUENSI TINDAKAN MEDIS)
// ------------------------------------------------------------------------------

export async function fetchCountToolsFromDb(): Promise<{
  data: CountToolUsageRecord[]
  isDbConnected: boolean
  error?: string
}> {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from("alat_kali")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.warn("Supabase alat_kali fetch notice:", error.message)
      return { data: [], isDbConnected: false, error: error.message }
    }

    const mapped: CountToolUsageRecord[] = ((data as AlatKaliRow[]) || []).map((row) => {
      let parsedLogs: CountActionLog[] | undefined = undefined
      let cleanNotes = row.notes
      if (cleanNotes) {
        const match = cleanNotes.match(/__ACTION_LOGS__([\s\S]*?)__END_ACTION_LOGS__/)
        if (match && match[1]) {
          try {
            parsedLogs = JSON.parse(match[1])
            cleanNotes = cleanNotes.replace(/__ACTION_LOGS__[\s\S]*?__END_ACTION_LOGS__/g, "").trim()
          } catch {}
        }
        cleanNotes = cleanNotes.replace(/__STATUS_SELESAI__/g, "").trim()
      }

      return {
        id: row.id,
        bed: row.bed,
        patientName: row.patient_name,
        patientRm: row.patient_rm,
        toolName: row.tool_name,
        unitNumber: row.unit_number ?? undefined,
        count: row.count ?? 1,
        savedCount: row.count ?? 1,
        lastActionTime: row.last_action_time,
        nurseName: row.nurse_name,
        notes: cleanNotes || undefined,
        status: "selesai",
        createdAt: row.created_at,
        actionLogs: parsedLogs,
      }
    })

    return { data: mapped, isDbConnected: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { data: [], isDbConnected: false, error: msg }
  }
}

export async function insertCountToolInDb(
  record: Omit<CountToolUsageRecord, "id">
): Promise<CountToolUsageRecord> {
  const supabase = getSupabase()
  let notesValue = record.notes || ""
  if (record.actionLogs && record.actionLogs.length > 0) {
    notesValue = `${notesValue} __ACTION_LOGS__${JSON.stringify(record.actionLogs)}__END_ACTION_LOGS__`.trim()
  }
  if (record.status === "selesai" || !record.status) {
    notesValue = notesValue ? `${notesValue} __STATUS_SELESAI__` : "__STATUS_SELESAI__"
  }

  const payload: Record<string, unknown> = {
    bed: record.bed,
    patient_name: record.patientName,
    patient_rm: record.patientRm,
    tool_name: record.toolName,
    count: record.count,
    last_action_time: record.lastActionTime,
    nurse_name: record.nurseName,
    notes: notesValue || null,
    status: record.status || "selesai",
  }

  let dataResult: AlatKaliRow | null = null
  const { data, error } = await supabase
    .from("alat_kali")
    .insert([payload])
    .select()
    .single()

  if (error) {
    // Jika kolom status belum ada di database, coba lagi tanpa status
    if (error.message?.includes("status")) {
      delete payload.status
      const retry = await supabase.from("alat_kali").insert([payload]).select().single()
      if (retry.error) throw retry.error
      dataResult = retry.data as AlatKaliRow
    } else {
      throw error
    }
  } else {
    dataResult = data as AlatKaliRow
  }

  return {
    id: dataResult.id,
    bed: dataResult.bed,
    patientName: dataResult.patient_name,
    patientRm: dataResult.patient_rm,
    toolName: dataResult.tool_name,
    unitNumber: dataResult.unit_number ?? undefined,
    count: dataResult.count ?? record.count,
    savedCount: dataResult.count ?? record.count,
    lastActionTime: dataResult.last_action_time,
    nurseName: dataResult.nurse_name,
    notes: record.notes
      ? record.notes.replace(/__ACTION_LOGS__[\s\S]*?__END_ACTION_LOGS__/g, "").replace(/__STATUS_SELESAI__/g, "").trim() || undefined
      : undefined,
    status: (dataResult.status as "draft" | "selesai") || (record.status as "draft" | "selesai") || "selesai",
    createdAt: dataResult.created_at || new Date().toISOString(),
    actionLogs: record.actionLogs,
  }
}

export async function updateCountToolInDb(
  id: string,
  updates: {
    count?: number
    lastActionTime?: string
    nurseName?: string
    status?: "draft" | "selesai"
    notes?: string
    actionLogs?: CountActionLog[]
  }
): Promise<void> {
  const supabase = getSupabase()
  const payload: Record<string, unknown> = {}
  if (updates.count !== undefined) payload.count = updates.count
  if (updates.lastActionTime !== undefined) payload.last_action_time = updates.lastActionTime
  if (updates.nurseName !== undefined) payload.nurse_name = updates.nurseName
  if (updates.status !== undefined) payload.status = updates.status

  let notesVal = updates.notes !== undefined ? updates.notes : undefined
  if (updates.actionLogs && updates.actionLogs.length > 0) {
    const cleanNotes = (notesVal || "").replace(/__ACTION_LOGS__.*?__END_ACTION_LOGS__/, "").trim()
    const logTag = `__ACTION_LOGS__${JSON.stringify(updates.actionLogs)}__END_ACTION_LOGS__`
    notesVal = cleanNotes ? `${cleanNotes} ${logTag}` : logTag
  }

  if (updates.status === "selesai") {
    // Sertakan penanda internal agar jika kolom status belum termigrasi, tetap terbaca sebagai selesai
    payload.notes = notesVal ? `${notesVal} __STATUS_SELESAI__` : "__STATUS_SELESAI__"
  } else if (notesVal !== undefined) {
    payload.notes = notesVal
  }

  const { error } = await supabase.from("alat_kali").update(payload).eq("id", id)
  if (error) {
    if (error.message?.includes("status")) {
      delete payload.status
      const retry = await supabase.from("alat_kali").update(payload).eq("id", id)
      if (retry.error) throw retry.error
    } else {
      throw error
    }
  }
}

export async function deleteCountToolInDb(id: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from("alat_kali").delete().eq("id", id)
  if (error) throw error
}

/**
 * Melepaskan seluruh alat hitungan waktu yang masih aktif pada suatu bed (misal saat pasien BLPL)
 */
export async function releaseToolsForBed(bed: string, stopNurseName: string): Promise<void> {
  try {
    const supabase = getSupabase()
    const now = new Date()
    const nowTimeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`

    const { data: runningTools, error } = await supabase
      .from("alat_waktu")
      .select("id, started_at_timestamp")
      .eq("bed", bed)
      .eq("status", "berjalan")

    if (error || !runningTools || runningTools.length === 0) return

    for (const tool of runningTools) {
      const started = Number(tool.started_at_timestamp) || now.getTime()
      const durMinutes = Math.max(1, Math.round((now.getTime() - started) / (1000 * 60)))
      await supabase
        .from("alat_waktu")
        .update({
          status: "selesai",
          end_time_str: nowTimeStr,
          ended_at_timestamp: now.getTime(),
          duration_minutes: durMinutes,
          accumulated_minutes: durMinutes,
          stop_nurse_name: stopNurseName,
        })
        .eq("id", tool.id)
    }
  } catch (err) {
    console.warn("Notice releasing tools for bed:", err)
  }
}

// ------------------------------------------------------------------------------
// 5. ALAT RUSAK / PEMELIHARAAN
// ------------------------------------------------------------------------------

export async function fetchDamagedToolsFromDb(): Promise<{
  data: DamagedToolRecord[]
  isDbConnected: boolean
  error?: string
}> {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from("alat_rusak")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.warn("Supabase alat_rusak fetch notice:", error.message)
      return { data: [], isDbConnected: false, error: error.message }
    }

    const mapped: DamagedToolRecord[] = ((data as AlatRusakRow[]) || []).map((row) => ({
      id: row.id,
      toolName: row.tool_name,
      quantity: row.quantity ?? 1,
      unitNumbers: row.unit_numbers || [],
      reportDate: row.report_date,
      severity: row.severity,
      notes: row.notes || "",
      reportedBy: row.reported_by,
    }))

    return { data: mapped, isDbConnected: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { data: [], isDbConnected: false, error: msg }
  }
}

export async function insertDamagedToolInDb(
  record: Omit<DamagedToolRecord, "id">
): Promise<DamagedToolRecord> {
  const supabase = getSupabase()
  const payload = {
    tool_name: record.toolName,
    quantity: record.quantity,
    unit_numbers: record.unitNumbers,
    report_date: record.reportDate,
    severity: record.severity,
    notes: record.notes || null,
    reported_by: record.reportedBy,
  }

  const { data, error } = await supabase
    .from("alat_rusak")
    .insert([payload])
    .select()
    .single()

  if (error) throw error

  return {
    id: data.id,
    toolName: data.tool_name,
    quantity: data.quantity,
    unitNumbers: data.unit_numbers || [],
    reportDate: data.report_date,
    severity: data.severity,
    notes: data.notes || "",
    reportedBy: data.reported_by,
  }
}

export async function deleteDamagedToolInDb(id: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from("alat_rusak").delete().eq("id", id)
  if (error) throw error
}

// ------------------------------------------------------------------------------
// PENGHAPUSAN MASSAL REKAP ALAT (HANYA PENGELOLA)
// ------------------------------------------------------------------------------

export async function deleteAllTimedToolsInDb(): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from("alat_waktu")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000")
  if (error) console.warn("Supabase deleteAllTimedTools notice:", error.message)
  if (typeof window !== "undefined") localStorage.removeItem("sp_timed_tools")
}

export async function deleteAllCountToolsInDb(): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from("alat_kali")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000")
  if (error) console.warn("Supabase deleteAllCountTools notice:", error.message)
  if (typeof window !== "undefined") localStorage.removeItem("sp_count_tools")
}

export async function deleteAllDamagedToolsInDb(): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from("alat_rusak")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000")
  if (error) console.warn("Supabase deleteAllDamagedTools notice:", error.message)
  if (typeof window !== "undefined") localStorage.removeItem("sp_damaged_tools")
}

export async function deleteAllToolRecordsInDb(): Promise<void> {
  await Promise.all([
    deleteAllTimedToolsInDb(),
    deleteAllCountToolsInDb(),
    deleteAllDamagedToolsInDb(),
  ])
}
