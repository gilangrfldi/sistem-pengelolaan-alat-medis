"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import {
  User,
  Mail,
  KeyRound,
  ShieldAlert,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  Send,
  Loader2,
  Clock,
  Sparkles,
  X,
  BadgeCheck,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { performLogout } from "@/lib/services/auth-service"
import {
  updateNurseProfileInDb,
  deleteNurseAccountInDb,
  NurseRole,
  NurseStatus,
} from "@/lib/services/nurse-service"
import { getInitials } from "@/components/nav-user"
import { toast } from "@/components/ui/app-toast"

export default function PengaturanAkunPage() {
  // State Profil Pengguna
  const [userId, setUserId] = useState<string>("")
  const [fullName, setFullName] = useState<string>("")
  const [email, setEmail] = useState<string>("")
  const [role, setRole] = useState<NurseRole>("perawat")
  const [status, setStatus] = useState<NurseStatus>("aktif")
  const [isVerified, setIsVerified] = useState<boolean>(false)

  // State Form Edit Profil
  const [nameInput, setNameInput] = useState<string>("")
  const [emailInput, setEmailInput] = useState<string>("")
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false)
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null)
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null)

  // State Form Kata Sandi
  const [newPassword, setNewPassword] = useState<string>("")
  const [confirmPassword, setConfirmPassword] = useState<string>("")
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false)
  const [isSavingPassword, setIsSavingPassword] = useState<boolean>(false)
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState<string | null>(null)
  const [passwordErrorMsg, setPasswordErrorMsg] = useState<string | null>(null)

  // State Reset / Lupa Kata Sandi
  const [isSendingReset, setIsSendingReset] = useState<boolean>(false)
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null)
  const [resetErrorMsg, setResetErrorMsg] = useState<string | null>(null)

  // State Modal Hapus Akun & Countdown 5 Detik
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false)
  const [deleteCountdown, setDeleteCountdown] = useState<number>(5)
  const [isDeletingAccount, setIsDeletingAccount] = useState<boolean>(false)

  // Ambil Data Profil Pengguna Saat Komponen Dipasang
  useEffect(() => {
    let ignore = false

    const loadUserData = async () => {
      // 1. Prioritas data cache lokal
      const cachedName = localStorage.getItem("sp_current_user_name") || "Ns. Staf Medis"
      const cachedEmail = localStorage.getItem("sp_current_user_email") || ""
      const cachedRole = (localStorage.getItem("sp_current_user_role") as NurseRole) || "perawat"
      const cachedStatus = (localStorage.getItem("sp_current_user_status") as NurseStatus) || "aktif"
      const cachedVerified = localStorage.getItem("sp_current_user_verified") === "true"

      if (!ignore) {
        setFullName(cachedName)
        setEmail(cachedEmail)
        setNameInput(cachedName)
        setEmailInput(cachedEmail)
        setRole(cachedRole)
        setStatus(cachedStatus)
        setIsVerified(cachedVerified)
      }

      // 2. Sinkronisasi dengan Supabase Auth
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (user && !ignore) {
          setUserId(user.id)
          const metaName = user.user_metadata?.full_name || cachedName
          const authEmail = user.email || cachedEmail
          const verified = Boolean(user.email_confirmed_at)

          setFullName(metaName)
          setEmail(authEmail)
          setNameInput(metaName)
          setEmailInput(authEmail)
          setIsVerified(verified)

          localStorage.setItem("sp_current_user_name", metaName)
          localStorage.setItem("sp_current_user_email", authEmail)
          localStorage.setItem("sp_current_user_verified", verified ? "true" : "false")
        }
      } catch (err) {
        console.warn("Gagal memuat auth pengguna:", err)
      }
    }

    void loadUserData()

    return () => {
      ignore = true
    }
  }, [])

  // Timer Countdown 5 Detik untuk Modal Hapus Akun
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null
    if (showDeleteModal && deleteCountdown > 0) {
      timer = setInterval(() => {
        setDeleteCountdown((prev) => (prev > 0 ? prev - 1 : 0))
      }, 1000)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [showDeleteModal, deleteCountdown])

  // =========================================================================
  // HANDLER: SIMPAN PERUBAHAN PROFIL (NAMA & EMAIL)
  // =========================================================================
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileSuccessMsg(null)
    setProfileErrorMsg(null)

    const trimmedName = nameInput.trim()
    const trimmedEmail = emailInput.trim().toLowerCase()

    if (!trimmedName) {
      setProfileErrorMsg("Nama lengkap tidak boleh kosong.")
      return
    }

    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setProfileErrorMsg("Format alamat email tidak valid.")
      return
    }

    setIsSavingProfile(true)

    try {
      const supabase = createClient()
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

      // Update Supabase Auth jika online
      if (supabaseUrl && !supabaseUrl.includes("your-project-ref")) {
        const { error: authErr } = await supabase.auth.updateUser({
          email: trimmedEmail !== email ? trimmedEmail : undefined,
          data: { full_name: trimmedName },
        })
        if (authErr) {
          console.warn("Notice auth update:", authErr.message)
        }
      }

      // Update Database profiles & localStorage
      await updateNurseProfileInDb(
        { id: userId || undefined, email },
        { fullName: trimmedName, email: trimmedEmail }
      )

      localStorage.setItem("sp_current_user_name", trimmedName)
      localStorage.setItem("sp_current_user_email", trimmedEmail)

      setFullName(trimmedName)
      setEmail(trimmedEmail)
      setProfileSuccessMsg("Profil dan kontak medis Anda berhasil diperbarui.")
      toast.success("Profil berhasil diperbarui")
    } catch (err: unknown) {
      setProfileErrorMsg(
        err instanceof Error ? err.message : "Gagal memperbarui profil pengguna."
      )
    } finally {
      setIsSavingProfile(false)
    }
  }

  // =========================================================================
  // HANDLER: GANTI KATA SANDI BARU
  // =========================================================================
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordSuccessMsg(null)
    setPasswordErrorMsg(null)

    if (newPassword.length < 6) {
      setPasswordErrorMsg("Kata sandi baru minimal harus 6 karakter.")
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordErrorMsg("Konfirmasi kata sandi tidak cocok dengan kata sandi baru.")
      return
    }

    setIsSavingPassword(true)

    try {
      const supabase = createClient()
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

      if (supabaseUrl && !supabaseUrl.includes("your-project-ref")) {
        const { error } = await supabase.auth.updateUser({ password: newPassword })
        if (error) throw error
      } else {
        // Simulasi jika database offline
        await new Promise((res) => setTimeout(res, 600))
      }

      setPasswordSuccessMsg("Kata sandi akun Anda berhasil diperbarui dengan aman.")
      setNewPassword("")
      setConfirmPassword("")
      toast.success("Kata sandi berhasil diperbarui")
    } catch (err: unknown) {
      setPasswordErrorMsg(
        err instanceof Error ? err.message : "Gagal mengubah kata sandi akun."
      )
    } finally {
      setIsSavingPassword(false)
    }
  }

  // =========================================================================
  // HANDLER: KIRIM LINK RESET KATA SANDI (LUPA PASSWORD)
  // =========================================================================
  const handleSendResetPassword = async () => {
    setResetSuccessMsg(null)
    setResetErrorMsg(null)
    setIsSendingReset(true)

    try {
      const supabase = createClient()
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const redirectUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/reset-password`
          : undefined

      if (supabaseUrl && !supabaseUrl.includes("your-project-ref") && email) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: redirectUrl,
        })
        if (error) throw error
      } else {
        // Simulasi pengiriman jika offline
        await new Promise((res) => setTimeout(res, 700))
      }

      setResetSuccessMsg(
        `Tautan reset kata sandi telah dikirim ke ${email}. Silakan periksa kotak masuk atau spam email Anda.`
      )
      toast.success("Email reset sandi terkirim")
    } catch (err: unknown) {
      setResetErrorMsg(
        err instanceof Error ? err.message : "Gagal mengirimkan tautan reset kata sandi."
      )
    } finally {
      setIsSendingReset(false)
    }
  }

  // =========================================================================
  // HANDLER: BUKA MODAL KONFIRMASI HAPUS AKUN DENGAN COUNTDOWN 5 DETIK
  // =========================================================================
  const handleOpenDeleteModal = () => {
    setDeleteCountdown(5)
    setShowDeleteModal(true)
  }

  // =========================================================================
  // HANDLER: EKSEKUSI PENGHAPUSAN AKUN PERMANEN
  // =========================================================================
  const handleExecuteDeleteAccount = async () => {
    if (deleteCountdown > 0) return

    setIsDeletingAccount(true)

    try {
      const supabase = createClient()
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

      // 1. Dapatkan user ID & hapus permanen dari Supabase auth & profiles
      let targetId = userId
      if (!targetId && supabaseUrl && !supabaseUrl.includes("your-project-ref")) {
        try {
          const { data } = await supabase.auth.getUser()
          if (data?.user?.id) targetId = data.user.id
        } catch {}
      }

      if (targetId) {
        await deleteNurseAccountInDb(targetId)
      } else {
        const currentEmail = localStorage.getItem("sp_current_user_email")
        if (currentEmail) {
          try {
            await supabase.from("profiles").delete().eq("email", currentEmail)
          } catch {}
        }
      }

      setShowDeleteModal(false)
      toast.success("Akun berhasil dihapus")
      await performLogout()
    } catch (err) {
      console.error("Gagal menghapus akun:", err)
      setIsDeletingAccount(false)
    }
  }

  const initials = getInitials(fullName)

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full pb-12">
      {/* Header Halaman Pengaturan Akun */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Pengaturan Akun
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Kelola profil pribadi, kredensial keamanan akun medis, dan preferensi akun Anda.
        </p>
      </div>

      {/* ========================================================================= */}
      {/* KARTU 1: RINGKASAN PROFIL & INFORMASI PRIBADI                             */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/50">
          <div className="flex items-center gap-4">
            <div className="size-14 sm:size-16 rounded-2xl bg-[#F5F3FF] text-[#512DA8] dark:bg-purple-950/60 dark:text-purple-300 border border-[#DDD6FE] dark:border-purple-800 flex items-center justify-center font-bold text-lg sm:text-xl shadow-2xs shrink-0">
              {initials}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-foreground">
                  {fullName}
                </h2>
                {isVerified && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                    <BadgeCheck className="size-3 text-emerald-600" />
                    Terverifikasi
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground mt-0.5">{email}</span>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#F5F3FF] text-[#512DA8] dark:bg-purple-950/80 dark:text-purple-300 border border-[#DDD6FE] dark:border-purple-800">
                  {role === "pengelola" ? "Pengelola HCU (Admin)" : "Staf Perawat HCU"}
                </span>
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                  Status: {status === "aktif" ? "Aktif" : status === "pending" ? "Menunggu Izin" : "Nonaktif"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Form Ganti Nama & Email */}
        <form onSubmit={handleSaveProfile} className="mt-6 flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <User className="size-4 text-[#512DA8]" />
            Informasi Pribadi & Kontak Medis
          </h3>

          {profileSuccessMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
              <span>{profileSuccessMsg}</span>
            </div>
          )}

          {profileErrorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
              <AlertTriangle className="size-4 shrink-0 text-rose-600" />
              <span>{profileErrorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Nama Lengkap & Gelar
              </label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Contoh: Ns. Budi Santoso, S.Kep"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-[#512DA8]/30 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Alamat Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="email@rsud-welasasih.go.id"
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-[#512DA8]/30 transition"
                />
                <Mail className="absolute right-3.5 top-3 size-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSavingProfile}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#512DA8] hover:bg-[#43238c] text-white text-xs sm:text-sm font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {isSavingProfile ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4" />
                  <span>Simpan Perubahan Profil</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ========================================================================= */}
      {/* KARTU 2: KEAMANAN & KATA SANDI (GANTI PASSWORD & LUPA PASSWORD)           */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-7 shadow-xs flex flex-col gap-6">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <KeyRound className="size-4 text-[#512DA8]" />
            Kredensial Keamanan & Kata Sandi
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Perbarui kata sandi Anda secara berkala untuk menjaga kerahasiaan operasional ruang HCU.
          </p>
        </div>

        {passwordSuccessMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            <span>{passwordSuccessMsg}</span>
          </div>
        )}

        {passwordErrorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0 text-rose-600" />
            <span>{passwordErrorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSavePassword} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Kata Sandi Baru
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 pr-10 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-[#512DA8]/30 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                >
                  {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Konfirmasi Kata Sandi Baru
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi kata sandi baru"
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 pr-10 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-[#512DA8]/30 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                >
                  {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isSavingPassword || !newPassword}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-800 dark:hover:bg-neutral-700 text-xs sm:text-sm font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {isSavingPassword ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Menyimpan Kata Sandi...</span>
                </>
              ) : (
                <>
                  <KeyRound className="size-4" />
                  <span>Perbarui Kata Sandi</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Fitur Lupa Kata Sandi */}
        <div className="pt-5 border-t border-border/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-foreground">
              Lupa Kata Sandi Anda?
            </span>
            <span className="text-[11px] text-muted-foreground">
              Kami akan mengirimkan instruksi dan tautan pemulihan resmi ke alamat email Anda ({email}).
            </span>
          </div>

          <button
            type="button"
            onClick={handleSendResetPassword}
            disabled={isSendingReset}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-border hover:bg-muted text-xs font-semibold text-foreground transition cursor-pointer disabled:opacity-50"
          >
            {isSendingReset ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Mengirim Tautan...</span>
              </>
            ) : (
              <>
                <Send className="size-3.5 text-[#512DA8]" />
                <span>Kirim Link Reset Password</span>
              </>
            )}
          </button>
        </div>

        {resetSuccessMsg && (
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300 flex items-center gap-2">
            <Sparkles className="size-4 shrink-0 text-blue-600" />
            <span>{resetSuccessMsg}</span>
          </div>
        )}

        {resetErrorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0 text-rose-600" />
            <span>{resetErrorMsg}</span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* KARTU 3: ZONA BAHAYA (HAPUS AKUN)                                         */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/10 p-5 sm:p-7 shadow-xs flex flex-col gap-4">
        <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
          <ShieldAlert className="size-5" />
          <h3 className="text-sm sm:text-base font-bold">Zona Bahaya Akun</h3>
        </div>

        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          Setelah akun medis Anda dihapus, seluruh hak akses ke dasbor ruang HCU, catatan pemantauan alat, dan riwayat operan shift akan dicabut secara permanen.
          Tindakan ini tidak dapat dibatalkan.
        </p>

        <div className="flex justify-start pt-1">
          <button
            type="button"
            onClick={handleOpenDeleteModal}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition cursor-pointer"
          >
            <Trash2 className="size-4" />
            <span>Hapus Akun Medis Saya</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL KONFIRMASI HAPUS AKUN DENGAN COUNTDOWN 5 DETIK                      */}
      {/* ========================================================================= */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-7 shadow-2xl border border-rose-200 dark:border-rose-900/80 animate-in zoom-in-95 duration-200">
            {/* Tombol Tutup */}
            <button
              type="button"
              onClick={() => setShowDeleteModal(false)}
              className="absolute top-5 right-5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 cursor-pointer"
            >
              <X className="size-5" />
            </button>

            {/* Header Modal */}
            <div className="flex flex-col items-center text-center">
              <div className="size-16 rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800 flex items-center justify-center mb-4">
                <AlertTriangle className="size-8" />
              </div>

              <h3 className="text-lg sm:text-xl font-bold text-foreground">
                Konfirmasi Penghapusan Akun
              </h3>

              <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">
                Apakah Anda benar-benar yakin ingin menghapus akun{" "}
                <strong className="text-foreground">{email}</strong>? Tindakan ini bersifat permanen dan tidak dapat dipulihkan.
              </p>
            </div>

            {/* Banner Timer Countdown 5 Detik */}
            <div className="mt-5 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center gap-3">
              <div className="size-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-extrabold text-base shrink-0 animate-pulse">
                {deleteCountdown > 0 ? deleteCountdown : "0"}
              </div>
              <div className="flex flex-col text-xs text-rose-900 dark:text-rose-200">
                {deleteCountdown > 0 ? (
                  <>
                    <span className="font-bold flex items-center gap-1">
                      <Clock className="size-3.5 text-rose-600" />
                      Menunggu konfirmasi keamanan ({deleteCountdown} detik)
                    </span>
                    <span className="text-[11px] text-rose-700/80 dark:text-rose-300/80 mt-0.5">
                      Tombol hapus akun dapat diklik setelah hitungan mundur selesai.
                    </span>
                  </>
                ) : (
                  <>
                    <span className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="size-3.5 text-emerald-600" />
                      Konfirmasi keamanan terbuka
                    </span>
                    <span className="text-[11px] text-muted-foreground mt-0.5">
                      Anda dapat menekan tombol konfirmasi untuk melanjutkan penghapusan.
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Tombol Aksi Modal */}
            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="w-full py-2.5 rounded-xl border border-border text-xs sm:text-sm font-semibold text-foreground hover:bg-muted transition cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={deleteCountdown > 0 || isDeletingAccount}
                onClick={handleExecuteDeleteAccount}
                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-semibold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shadow-sm"
              >
                {isDeletingAccount ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : deleteCountdown > 0 ? (
                  <span>Hapus Akun ({deleteCountdown}s)</span>
                ) : (
                  <>
                    <Trash2 className="size-4" />
                    <span>Hapus Akun Permanen</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

