import { createClient } from "@/lib/supabase/client"

// Tipe data akun perawat & pengelola
export type NurseRole = "pengelola" | "perawat"
export type NurseStatus = "aktif" | "pending" | "nonaktif"

export interface NurseAccount {
  id: string
  fullName: string
  email: string
  role: NurseRole
  status: NurseStatus
  isVerified: boolean
  createdAt: string
}

interface ProfileRow {
  id: string
  full_name: string
  email: string
  role?: string
  status?: string
  is_verified?: boolean
  created_at: string
  updated_at: string
}

function getSupabase() {
  return createClient()
}

// ------------------------------------------------------------------------------
// 1. AMBIL SELURUH DAFTAR AKUN PERAWAT
// ------------------------------------------------------------------------------

export async function fetchNurseAccounts(): Promise<{
  data: NurseAccount[]
  isDbConnected: boolean
  error?: string
}> {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.warn("Supabase profiles notice:", error.message)
      const cached = getLocalNurses()
      return { data: cached, isDbConnected: false, error: error.message }
    }

    if (data) {
      const mapped: NurseAccount[] = (data as ProfileRow[]).map((p) => {
        const isPengelola = p.role === "pengelola"

        // Pengelola selalu terverifikasi; perawat biasa murni mengikuti status is_verified dari database
        const isVerified = isPengelola ? true : Boolean(p.is_verified)
        const status = (p.status as NurseStatus) || (isPengelola ? "aktif" : "pending")

        return {
          id: p.id,
          fullName: p.full_name,
          email: p.email,
          role: (p.role as NurseRole) || (isPengelola ? "pengelola" : "perawat"),
          status,
          isVerified,
          createdAt: p.created_at,
        }
      })

      saveLocalNurses(mapped)
      return { data: mapped, isDbConnected: true }
    }

    return { data: [], isDbConnected: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    const cached = getLocalNurses()
    return { data: cached, isDbConnected: false, error: msg }
  }
}

// ------------------------------------------------------------------------------
// 2. TOGGLE STATUS AKTIF / NONAKTIF AKUN PERAWAT
// ------------------------------------------------------------------------------

export async function updateNurseStatusInDb(
  id: string,
  newStatus: NurseStatus
): Promise<void> {
  try {
    const supabase = getSupabase()
    const payload: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    }
    await supabase.from("profiles").update(payload).eq("id", id)
  } catch (err) {
    console.warn("Offline update nurse status:", err)
  }

  // Update localStorage
  const current = getLocalNurses()
  const updated = current.map((n) =>
    n.id === id
      ? {
          ...n,
          status: newStatus,
        }
      : n
  )
  saveLocalNurses(updated)
}

// ------------------------------------------------------------------------------
// 2.1 TOGGLE VERIFIKASI MANUAL OLEH PENGELOLA
// ------------------------------------------------------------------------------

export async function toggleNurseVerificationInDb(
  id: string,
  currentVerified: boolean
): Promise<boolean> {
  const nextVerified = !currentVerified
  try {
    const supabase = getSupabase()
    await supabase
      .from("profiles")
      .update({ is_verified: nextVerified, updated_at: new Date().toISOString() })
      .eq("id", id)
  } catch (err) {
    console.warn("Offline toggle verification:", err)
  }

  const current = getLocalNurses()
  const updated = current.map((n) =>
    n.id === id ? { ...n, isVerified: nextVerified } : n
  )
  saveLocalNurses(updated)
  return nextVerified
}

// ------------------------------------------------------------------------------
// 3. UPDATE PROFIL PERAWAT (NAMA & EMAIL)
// ------------------------------------------------------------------------------

export async function updateNurseProfileInDb(
  identifier: { id?: string; email?: string },
  updates: { fullName?: string; email?: string }
): Promise<void> {
  try {
    const supabase = getSupabase()
    const dbUpdates: Record<string, string> = { updated_at: new Date().toISOString() }
    if (updates.fullName !== undefined) dbUpdates.full_name = updates.fullName
    if (updates.email !== undefined) dbUpdates.email = updates.email

    if (identifier.id) {
      await supabase.from("profiles").update(dbUpdates).eq("id", identifier.id)
    } else if (identifier.email) {
      await supabase.from("profiles").update(dbUpdates).eq("email", identifier.email)
    }
  } catch (err) {
    console.warn("Offline update nurse profile:", err)
  }

  // Update localStorage
  const current = getLocalNurses()
  const updated = current.map((n) => {
    const match =
      (identifier.id && n.id === identifier.id) ||
      (identifier.email && n.email.toLowerCase() === identifier.email.toLowerCase())
    if (match) {
      return {
        ...n,
        ...(updates.fullName ? { fullName: updates.fullName } : {}),
        ...(updates.email ? { email: updates.email } : {}),
      }
    }
    return n
  })
  saveLocalNurses(updated)
}

// ------------------------------------------------------------------------------
// 4. HAPUS AKUN PERAWAT
// ------------------------------------------------------------------------------

export async function deleteNurseAccountInDb(id: string, email?: string): Promise<void> {
  try {
    const supabase = getSupabase()
    // 1. Coba hapus secara permanen via RPC (menghapus dari profiles dan auth.users)
    const { error: rpcError } = await supabase.rpc("delete_user_account", { target_user_id: id })
    if (rpcError) {
      console.warn("RPC delete_user_account notice:", rpcError.message)
    }

    // 2. Hapus langsung dari tabel profiles secara terisolasi tanpa filter .or()
    const { error: delError } = await supabase.from("profiles").delete().eq("id", id)
    if (delError) {
      console.warn("Profiles delete notice:", delError.message)
    }
    if (email) {
      await supabase.from("profiles").delete().eq("email", email.trim().toLowerCase())
    }
  } catch (err) {
    console.warn("Offline delete nurse account:", err)
    try {
      const supabase = getSupabase()
      await supabase.from("profiles").delete().eq("id", id)
      if (email) {
        await supabase.from("profiles").delete().eq("email", email.trim().toLowerCase())
      }
    } catch {}
  }

  const current = getLocalNurses()
  const updated = current.filter(
    (n) => n.id !== id && (!email || n.email.toLowerCase() !== email.toLowerCase())
  )
  saveLocalNurses(updated)
}

// ------------------------------------------------------------------------------
// 4. TRANSFER KEPEMILIKAN PENGELOLA (SUPER ADMIN)
// ------------------------------------------------------------------------------

export async function transferOwnershipInDb(
  oldOwnerEmail: string,
  newOwnerEmail: string,
  newOwnerName?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = getSupabase()

    // 1. Cek apakah email baru sudah terdaftar di profiles
    const { data: existingNew } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", newOwnerEmail.trim())
      .single()

    if (existingNew) {
      // Jadikan akun yang ada sebagai pengelola aktif
      await supabase
        .from("profiles")
        .update({ role: "pengelola", status: "aktif", is_verified: true, updated_at: new Date().toISOString() })
        .eq("id", existingNew.id)
    } else {
      // Buat akun pengelola baru jika belum terdaftar
      await supabase.from("profiles").insert([
        {
          full_name: newOwnerName || newOwnerEmail.split("@")[0],
          email: newOwnerEmail.trim(),
          role: "pengelola",
          status: "aktif",
          is_verified: true,
        },
      ])
    }

    // 2. Turunkan peran pengelola lama menjadi perawat biasa (TIDAK DIHAPUS)
    await supabase
      .from("profiles")
      .update({ role: "perawat", updated_at: new Date().toISOString() })
      .ilike("email", oldOwnerEmail.trim())

    // 3. Sinkronisasi data lokal
    const current = getLocalNurses()
    let foundNew = false

    const updated = current.map((n) => {
      if (n.email.toLowerCase() === oldOwnerEmail.toLowerCase()) {
        return { ...n, role: "perawat" as NurseRole }
      }
      if (n.email.toLowerCase() === newOwnerEmail.toLowerCase()) {
        foundNew = true
        return {
          ...n,
          fullName: newOwnerName || n.fullName,
          role: "pengelola" as NurseRole,
          status: "aktif" as NurseStatus,
          isVerified: true,
        }
      }
      return n
    })

    if (!foundNew) {
      updated.unshift({
        id: `n-${Date.now()}`,
        fullName: newOwnerName || newOwnerEmail.split("@")[0],
        email: newOwnerEmail.trim(),
        role: "pengelola",
        status: "aktif",
        isVerified: true,
        createdAt: new Date().toISOString(),
      })
    }
    saveLocalNurses(updated)

    // Perbarui peran di sesi lokal jika user saat ini adalah pemilik lama
    if (typeof window !== "undefined") {
      const currentLoginEmail = localStorage.getItem("sp_current_user_email") || ""
      if (currentLoginEmail.toLowerCase() === oldOwnerEmail.toLowerCase()) {
        localStorage.setItem("sp_current_user_role", "perawat")
      }
    }

    return {
      success: true,
      message: `Kepemilikan berhasil ditransfer ke ${newOwnerEmail}. Peran akun ${oldOwnerEmail} diturunkan menjadi perawat biasa.`,
    }
  } catch (err: unknown) {
    console.warn("Transfer offline fallback notice:", err)
    // Fallback lokal jika database offline
    const current = getLocalNurses()
    let foundNew = false

    const updated = current.map((n) => {
      if (n.email.toLowerCase() === oldOwnerEmail.toLowerCase()) {
        return { ...n, role: "perawat" as NurseRole }
      }
      if (n.email.toLowerCase() === newOwnerEmail.toLowerCase()) {
        foundNew = true
        return {
          ...n,
          fullName: newOwnerName || n.fullName,
          role: "pengelola" as NurseRole,
          status: "aktif" as NurseStatus,
          isVerified: true,
        }
      }
      return n
    })

    if (!foundNew) {
      updated.unshift({
        id: `n-${Date.now()}`,
        fullName: newOwnerName || newOwnerEmail.split("@")[0],
        email: newOwnerEmail.trim(),
        role: "pengelola",
        status: "aktif",
        isVerified: true,
        createdAt: new Date().toISOString(),
      })
    }
    saveLocalNurses(updated)

    if (typeof window !== "undefined") {
      const currentLoginEmail = localStorage.getItem("sp_current_user_email") || ""
      if (currentLoginEmail.toLowerCase() === oldOwnerEmail.toLowerCase()) {
        localStorage.setItem("sp_current_user_role", "perawat")
      }
    }

    return {
      success: true,
      message: `Kepemilikan berhasil ditransfer ke ${newOwnerEmail}. Peran akun ${oldOwnerEmail} diturunkan menjadi perawat biasa.`,
    }
  }
}

// ------------------------------------------------------------------------------
// HELPER PENYIMPANAN LOKAL (OFFLINE SYNC)
// ------------------------------------------------------------------------------

export function getLocalNurses(): NurseAccount[] {
  if (typeof window === "undefined") return []
  try {
    const saved = localStorage.getItem("sp_nurse_accounts")
    if (saved) {
      const parsed = JSON.parse(saved) as NurseAccount[]
      if (Array.isArray(parsed)) {
        return parsed.map((n) => ({
          ...n,
          isVerified: Boolean(n.isVerified),
        }))
      }
    }
  } catch {}
  return []
}

export function saveLocalNurses(list: NurseAccount[]) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem("sp_nurse_accounts", JSON.stringify(list))
  } catch {}
}
