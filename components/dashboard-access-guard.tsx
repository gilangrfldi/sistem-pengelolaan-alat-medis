"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { ShieldAlert, RotateCcw, LogOut, CheckCircle2, Settings, Activity } from "lucide-react"
import { cn } from "cn"
import { createClient } from "@/lib/supabase/client"
import { performLogout } from "@/lib/services/auth-service"
import { NurseStatus, NurseRole } from "@/lib/services/nurse-service"

interface DashboardAccessGuardProps {
  children: React.ReactNode
}

export function DashboardAccessGuard({ children }: DashboardAccessGuardProps) {
  const pathname = usePathname()
  const [isChecking, setIsChecking] = useState(true)
  const [userRole, setUserRole] = useState<NurseRole>("perawat")
  const [userStatus, setUserStatus] = useState<NurseStatus>("pending")
  const [userName, setUserName] = useState<string>("Staf Medis")
  const [userEmail, setUserEmail] = useState<string>("")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null)

  const clearSessionAndRedirectToLogin = React.useCallback(async () => {
    await performLogout("deleted")
  }, [])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    setRefreshMessage(null)

    try {
      const cachedEmail = typeof window !== "undefined" ? localStorage.getItem("sp_current_user_email") || "" : ""
      const cachedName = typeof window !== "undefined" ? localStorage.getItem("sp_current_user_name") || "Staf Medis" : "Staf Medis"
      const cachedRole = (typeof window !== "undefined" ? localStorage.getItem("sp_current_user_role") : null) as NurseRole || "perawat"
      const cachedStatus = (typeof window !== "undefined" ? localStorage.getItem("sp_current_user_status") : null) as NurseStatus || "pending"

      setUserName(cachedName)
      setUserEmail(cachedEmail)

      const supabase = createClient()
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      if (supabaseUrl && !supabaseUrl.includes("your-project-ref")) {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        const emailToCheck = (cachedEmail || authUser?.email || "").trim()

        if (!authUser && !emailToCheck) {
          await clearSessionAndRedirectToLogin()
          return
        }

        let profile = null
        if (authUser?.id) {
          const { data } = await supabase
            .from("profiles")
            .select("id, role, status, full_name, is_verified")
            .eq("id", authUser.id)
            .maybeSingle()
          profile = data
        }

        if (!profile && emailToCheck) {
          const { data } = await supabase
            .from("profiles")
            .select("id, role, status, full_name, is_verified")
            .eq("email", emailToCheck.toLowerCase())
            .maybeSingle()
          profile = data
        }

        if (!profile) {
          // Akun sudah dihapus oleh pengelola
          await clearSessionAndRedirectToLogin()
          return
        }

        if (profile) {
          const role = (profile.role as NurseRole) || "perawat"
          const status = (profile.status as NurseStatus) || "pending"

          setUserRole(role)
          setUserStatus(status)
          if (profile.full_name) setUserName(profile.full_name)

          localStorage.setItem("sp_current_user_role", role)
          localStorage.setItem("sp_current_user_status", status)
          if (profile.full_name) {
            localStorage.setItem("sp_current_user_name", profile.full_name)
          }
          setIsChecking(false)
          setIsRefreshing(false)
          return
        }
      }

      setUserRole(cachedRole)
      setUserStatus(cachedStatus)
    } finally {
      setIsChecking(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    let ignore = false
    const supabase = createClient()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    const check = async (isBackground = false) => {
      try {
        const cachedEmail = typeof window !== "undefined" ? localStorage.getItem("sp_current_user_email") || "" : ""
        const cachedName = typeof window !== "undefined" ? localStorage.getItem("sp_current_user_name") || "Staf Medis" : "Staf Medis"
        const cachedRole = (typeof window !== "undefined" ? localStorage.getItem("sp_current_user_role") : null) as NurseRole || "perawat"
        const cachedStatus = (typeof window !== "undefined" ? localStorage.getItem("sp_current_user_status") : null) as NurseStatus || "pending"

        if (supabaseUrl && !supabaseUrl.includes("your-project-ref")) {
          // 1. Ambil data sesi Supabase Auth
          const { data: { user: authUser } } = await supabase.auth.getUser()
          const emailToCheck = (cachedEmail || authUser?.email || "").trim()

          // Jika tidak ada user dan tidak ada email di cache, alihkan ke login
          if (!authUser && !emailToCheck) {
            if (!ignore) {
              await clearSessionAndRedirectToLogin()
            }
            return
          }

          // 2. Periksa apakah profil masih ada di tabel profiles secara terisolasi tanpa filter .or()
          let profile = null
          if (authUser?.id) {
            const { data } = await supabase
              .from("profiles")
              .select("id, role, status, full_name, is_verified")
              .eq("id", authUser.id)
              .maybeSingle()
            profile = data
          }

          if (!profile && emailToCheck) {
            const { data } = await supabase
              .from("profiles")
              .select("id, role, status, full_name, is_verified")
              .eq("email", emailToCheck.toLowerCase())
              .maybeSingle()
            profile = data
          }

          if (!ignore) {
            // Jika baris profil tidak ditemukan (akun dihapus pengelola), alihkan seketika
            if (!profile) {
              await clearSessionAndRedirectToLogin()
              return
            }

            if (profile) {
              const role = (profile.role as NurseRole) || "perawat"
              const status = (profile.status as NurseStatus) || "pending"

              setUserRole(role)
              setUserStatus(status)
              if (profile.full_name) setUserName(profile.full_name)
              setUserEmail(emailToCheck || profile.full_name)

              localStorage.setItem("sp_current_user_role", role)
              localStorage.setItem("sp_current_user_status", status)
              if (profile.full_name) {
                localStorage.setItem("sp_current_user_name", profile.full_name)
              }
              if (!isBackground) setIsChecking(false)
              return
            }
          }
        }

        // Mode offline fallback jika database tidak terkoneksi
        if (!ignore) {
          setUserRole(cachedRole)
          setUserStatus(cachedStatus)
          setUserName(cachedName)
          setUserEmail(cachedEmail)
          if (!isBackground) setIsChecking(false)
        }
      } catch {
        if (!ignore && !isBackground) setIsChecking(false)
      }
    }

    // Eksekusi pemeriksaan awal saat komponen dimuat
    void check(false)

    // 1. Supabase Realtime: mendeteksi perubahan seketika (DELETE / UPDATE) pada tabel profiles
    const channel = supabase
      .channel(`guard-profiles-realtime-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        () => {
          if (!ignore) {
            void check(true)
          }
        }
      )
      .subscribe()

    // 2. Heartbeat interval: polling kilat setiap 2.5 detik sebagai pengaman jika websocket terputus/terhalang
    const heartbeatTimer = setInterval(() => {
      if (!ignore) {
        void check(true)
      }
    }, 2500)

    // 3. Deteksi saat tab browser kembali aktif atau fokus
    const onFocusOrVisible = () => {
      if (document.visibilityState === "visible" && !ignore) {
        void check(true)
      }
    }
    window.addEventListener("focus", onFocusOrVisible)
    document.addEventListener("visibilitychange", onFocusOrVisible)

    return () => {
      ignore = true
      clearInterval(heartbeatTimer)
      void supabase.removeChannel(channel)
      window.removeEventListener("focus", onFocusOrVisible)
      document.removeEventListener("visibilitychange", onFocusOrVisible)
    }
  }, [clearSessionAndRedirectToLogin])

  const handleLogout = async () => {
    await performLogout()
  }

  // Menu Pengaturan Akun selalu dapat diakses oleh akun mana pun (termasuk yang belum aktif)
  if (pathname === "/pengaturan-akun") {
    return <>{children}</>
  }

  // Proteksi hak akses: Menu Kelola Perawat hanya dapat diakses oleh Pengelola HCU
  if (!isChecking && pathname.startsWith("/kelola-perawat") && userRole !== "pengelola") {
    return (
      <div className="flex flex-1 items-center justify-center p-4 min-h-[70vh]">
        <div className="flex flex-col items-center max-w-md w-full text-center p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
          <div className="size-14 rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center justify-center mb-3">
            <ShieldAlert className="size-7" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Akses Ditolak</h2>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            Halaman Kelola Staf Perawat hanya dapat diakses oleh Kepala Ruangan atau Pengelola Utama HCU.
          </p>
          <Link
            href="/beranda"
            className="mt-5 px-5 py-2.5 rounded-xl bg-[#512da8] text-white text-xs font-bold hover:bg-[#432588] transition shadow-xs"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    )
  }

  const isAccessAllowed = userRole === "pengelola" || userStatus === "aktif"

  return (
    <>
      {/* 1. Tampilan Loading saat verifikasi awal berlangsung */}
      {isChecking && (
        <div className="flex flex-1 items-center justify-center min-h-[60vh] w-full">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="size-11 rounded-2xl bg-[#512da8]/10 text-[#512da8] dark:bg-purple-950/40 dark:text-purple-300 flex items-center justify-center shadow-2xs">
              <Activity className="size-5.5 animate-spin text-[#512da8] dark:text-purple-300" />
            </div>
            <p className="text-xs font-semibold text-muted-foreground animate-pulse">
              Memverifikasi hak akses staf...
            </p>
          </div>
        </div>
      )}

      {/* 2. JIKA STATUS PENDING ATAU NONAKTIF: Tampilkan layar penahan izin pengelola dengan tata letak profesional */}
      {!isChecking && !isAccessAllowed && (
        <div className="flex flex-1 items-center justify-center p-4 min-h-[70vh]">
          <div className="flex flex-col items-center justify-center max-w-lg w-full mx-auto text-center p-6 sm:p-8 rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
            {/* Ikon Perisai Medis */}
            <div className="size-16 rounded-2xl bg-[#F5F3FF] text-[#512DA8] dark:bg-purple-950/60 dark:text-purple-300 border border-[#DDD6FE] dark:border-purple-800 flex items-center justify-center mb-4 shadow-2xs">
              <ShieldAlert className="size-8" />
            </div>

            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#F5F3FF] text-[#512DA8] dark:bg-purple-950/80 dark:text-purple-200 border border-[#DDD6FE] dark:border-purple-800 mb-2">
              {userStatus === "pending"
                ? "Menunggu Otorisasi Pengelola HCU"
                : "Hak Akses Belum Diaktifkan"}
            </span>

            <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              Aktivasi Akses Diperlukan
            </h2>

            <p className="text-xs sm:text-sm text-muted-foreground mt-2.5 leading-relaxed">
              Halo, <strong className="text-foreground">{userName}</strong> ({userEmail || "Akun Anda"}). Pendaftaran dan email Anda telah terverifikasi.
              Demi keamanan dan kepatuhan standar rekam medis di Ruang HCU RSUD Welas Asih, setiap staf memerlukan otorisasi langsung dari Kepala Ruangan / Pengelola HCU sebelum dapat mengakses sistem.
            </p>

            {/* Prosedur Verifikasi Profesional */}
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-neutral-800 text-left text-xs text-foreground mt-4 w-full space-y-2">
              <p className="font-bold text-[#512da8] dark:text-purple-300 text-xs">
                Prosedur Aktivasi Akun:
              </p>
              <div className="space-y-2 text-[11px] sm:text-xs text-muted-foreground">
                <div className="flex items-start gap-2.5">
                  <span className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-[#512da8] text-white font-bold text-[10px] mt-0.5">
                    1
                  </span>
                  <span>
                    Lakukan konfirmasi penugasan dinas Anda kepada Kepala Ruangan atau Pengelola HCU.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-[#512da8] text-white font-bold text-[10px] mt-0.5">
                    2
                  </span>
                  <span>
                    Pengelola akan memverifikasi data kepegawaian dan mengaktifkan hak akses klinis akun Anda.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-[#512da8] text-white font-bold text-[10px] mt-0.5">
                    3
                  </span>
                  <span>
                    Setelah disetujui, tekan tombol <strong>Periksa Status</strong> di bawah untuk membuka akses aplikasi.
                  </span>
                </div>
              </div>
            </div>

            {refreshMessage && (
              <div className="flex items-center gap-2 mt-3 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="size-4" />
                <span>{refreshMessage}</span>
              </div>
            )}

            {/* Tombol Aksi */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 mt-6 w-full">
              <button
                type="button"
                onClick={async () => {
                  await handleRefresh()
                  setRefreshMessage("Pengecekan status akun berhasil.")
                }}
                disabled={isRefreshing}
                className="w-full sm:flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#512da8] hover:bg-[#432588] text-white text-xs sm:text-sm font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className={cn("size-4", isRefreshing && "animate-spin")} />
                <span>{isRefreshing ? "Memeriksa..." : "Periksa Status"}</span>
              </button>

              <Link
                href="/pengaturan-akun"
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 text-xs sm:text-sm font-semibold transition"
              >
                <Settings className="size-4" />
                <span>Pengaturan Akun</span>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 text-xs sm:text-sm font-semibold transition cursor-pointer"
              >
                <LogOut className="size-4" />
                <span>Keluar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Konten Utama Segmen: Selalu dirender agar Next.js layout validator tidak mendeteksi dropped segment, namun disembunyikan via CSS jika sedang diverifikasi atau tidak berhak */}
      <div className={cn("flex-1 w-full", (!isAccessAllowed || isChecking) && "hidden")}>
        {children}
      </div>
    </>
  )
}
