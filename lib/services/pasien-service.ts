import { createClient } from "@/lib/supabase/client"
import type { Patient, CareLevel } from "@/app/(dashboard)/kelola-pasien/page"

// Tipe data tabel pasien HCU
interface PasienHcuRow {
  id: string
  name: string
  gender: "L" | "P"
  rm: string
  bed: string
  care_level: CareLevel
  admission_date: string
  admission_time: string
  admission_shift_key: string
  nurse_name: string
  status: "aktif" | "keluar"
  discharge_date: string | null
  discharge_time: string | null
  discharge_shift_key: string | null
  discharge_reason: string | null
  created_at?: string
  updated_at?: string
}

function getSupabase() {
  return createClient()
}

// ------------------------------------------------------------------------------
// 1. AMBIL SELURUH DATA PASIEN DARI SUPABASE
// ------------------------------------------------------------------------------

export async function fetchPatientsFromDb(): Promise<{
  data: Patient[]
  isDbConnected: boolean
  error?: string
}> {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from("pasien_hcu")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.warn("Supabase pasien_hcu fetch notice:", error.message)
      return { data: [], isDbConnected: false, error: error.message }
    }

    const mapped: Patient[] = ((data as PasienHcuRow[]) || []).map((row) => ({
      id: row.id,
      name: row.name,
      gender: row.gender,
      rm: row.rm,
      bed: row.bed,
      careLevel: row.care_level,
      admissionDate: row.admission_date,
      admissionTime: row.admission_time,
      admissionShiftKey: row.admission_shift_key,
      nurseName: row.nurse_name,
      status: row.status,
      dischargeDate: row.discharge_date || undefined,
      dischargeTime: row.discharge_time || undefined,
      dischargeShiftKey: row.discharge_shift_key || undefined,
      dischargeReason: row.discharge_reason || undefined,
    }))

    return { data: mapped, isDbConnected: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { data: [], isDbConnected: false, error: msg }
  }
}

// ------------------------------------------------------------------------------
// 2. TAMBAH PASIEN BARU KE SUPABASE
// ------------------------------------------------------------------------------

export async function insertPatientInDb(patient: Omit<Patient, "id">): Promise<Patient> {
  const supabase = getSupabase()
  const payload = {
    name: patient.name.trim(),
    gender: patient.gender,
    rm: patient.rm.trim(),
    bed: patient.bed,
    care_level: patient.careLevel,
    admission_date: patient.admissionDate,
    admission_time: patient.admissionTime,
    admission_shift_key: patient.admissionShiftKey,
    nurse_name: patient.nurseName,
    status: patient.status,
    discharge_date: patient.dischargeDate ?? null,
    discharge_time: patient.dischargeTime ?? null,
    discharge_shift_key: patient.dischargeShiftKey ?? null,
    discharge_reason: patient.dischargeReason ?? null,
  }

  const { data, error } = await supabase
    .from("pasien_hcu")
    .insert([payload])
    .select()
    .single()

  if (error) throw error

  const row = data as PasienHcuRow
  return {
    id: row.id,
    name: row.name,
    gender: row.gender,
    rm: row.rm,
    bed: row.bed,
    careLevel: row.care_level,
    admissionDate: row.admission_date,
    admissionTime: row.admission_time,
    admissionShiftKey: row.admission_shift_key,
    nurseName: row.nurse_name,
    status: row.status,
    dischargeDate: row.discharge_date || undefined,
    dischargeTime: row.discharge_time || undefined,
    dischargeShiftKey: row.discharge_shift_key || undefined,
    dischargeReason: row.discharge_reason || undefined,
  }
}

// ------------------------------------------------------------------------------
// 3. PERBARUI DATA PASIEN (PINDAH BED / GANTI NAMA / TINGKAT PERAWATAN)
// ------------------------------------------------------------------------------

export async function updatePatientInDb(id: string, updates: Partial<Patient>): Promise<void> {
  const supabase = getSupabase()
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (updates.name !== undefined) payload.name = updates.name.trim()
  if (updates.gender !== undefined) payload.gender = updates.gender
  if (updates.rm !== undefined) payload.rm = updates.rm.trim()
  if (updates.bed !== undefined) payload.bed = updates.bed
  if (updates.careLevel !== undefined) payload.care_level = updates.careLevel
  if (updates.admissionDate !== undefined) payload.admission_date = updates.admissionDate
  if (updates.admissionTime !== undefined) payload.admission_time = updates.admissionTime
  if (updates.nurseName !== undefined) payload.nurse_name = updates.nurseName
  if (updates.status !== undefined) payload.status = updates.status
  if (updates.dischargeDate !== undefined) payload.discharge_date = updates.dischargeDate
  if (updates.dischargeTime !== undefined) payload.discharge_time = updates.dischargeTime
  if (updates.dischargeShiftKey !== undefined) payload.discharge_shift_key = updates.dischargeShiftKey
  if (updates.dischargeReason !== undefined) payload.discharge_reason = updates.dischargeReason

  const { error } = await supabase.from("pasien_hcu").update(payload).eq("id", id)
  if (error) throw error
}

// ------------------------------------------------------------------------------
// 4. HAPUS PASIEN DARI SUPABASE
// ------------------------------------------------------------------------------

export async function deletePatientInDb(id: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from("pasien_hcu").delete().eq("id", id)
  if (error) throw error
}

// ------------------------------------------------------------------------------
// 5. HAPUS SELURUH PASIEN DARI SUPABASE (HANYA PENGELOLA)
// ------------------------------------------------------------------------------

export async function deleteAllPatientsInDb(): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from("pasien_hcu")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000")
  if (error) {
    console.warn("Supabase deleteAllPatients notice:", error.message)
  }
  if (typeof window !== "undefined") {
    localStorage.removeItem("sp_patients")
  }
}

