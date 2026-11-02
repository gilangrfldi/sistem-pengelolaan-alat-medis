"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { ShieldAlert, RotateCcw, LogOut, CheckCircle2, Settings } from "lucide-react"
import { cn } from "cn"
import { createClient } from "@/lib/supabase/client"
import { NurseStatus, NurseRole } from "@/lib/services/nurse-service"

interface DashboardAccessGuardProps {
  children: React.ReactNode
}

export function DashboardAccessGuard({ children }: DashboardAccessGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isChecking, setIsChecking] = useState(true)
  const [userRole, setUserRole] = useState<NurseRole>("perawat")
  const [userStatus, setUserStatus] = useState<NurseStatus>("aktif")
  const [userName, setUserName] = useState<string>("Staf Medis")
  const [userEmail, setUserEmail] = useState<string>("")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    setRefreshMessage(null)

    try {
      const cachedEmail = localStorage.getItem("sp_current_user_email") || ""
      const cachedName = localStorage.getItem("sp_current_user_name") || "Staf Medis"
      const cachedRole = (localStorage.getItem("sp_current_user_role") as NurseRole) || "perawat"
      const cachedStatus = (localStorage.getItem("sp_current_user_status") as NurseStatus) || "aktif"

      setUserName(cachedName)
      setUserEmail(cachedEmail)

      const isOwner = cachedRole === "pengelola"

      if (isOwner) {
        setUserRole("pengelola")
        setUserStatus("aktif")
        setIsChecking(false)
        setIsRefreshing(false)
        return
      }

      const supabase = createClient()
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      if (supabaseUrl && !supabaseUrl.includes("your-project-ref") && cachedEmail) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, status, full_name")
          .eq("email", cachedEmail)
          .single()

        if (profile) {
          const role = (profile.role as NurseRole) || "perawat"
          const status = (profile.status as NurseStatus) || "pending"

          setUserRole(role)
          setUserStatus(status)
          if (profile.full_name) setUserName(profile.full_name)

          localStorage.setItem("sp_current_user_role", role)
          localStorage.setItem("sp_current_user_status", status)
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
    const check = async () => {
      try {
        const cachedEmail = localStorage.getItem("sp_current_user_email") || ""
        const cachedName = localStorage.getItem("sp_current_user_name") || "Staf Medis"
        const cachedRole = (localStorage.getItem("sp_current_user_role") as NurseRole) || "perawat"
        const cachedStatus = (localStorage.getItem("sp_current_user_status") as NurseStatus) || "aktif"

        const isOwner = cachedRole === "pengelola"

        if (isOwner) {
          if (!ignore) {
            setUserRole("pengelola")
            setUserStatus("aktif")
            setUserName(cachedName)
            setUserEmail(cachedEmail)
            setIsChecking(false)
          }
          return
        }

        const supabase = createClient()
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        if (supabaseUrl && !supabaseUrl.includes("your-project-ref") && cachedEmail) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role, status, full_name")
            .eq("email", cachedEmail)
            .single()

          if (!ignore && profile) {
            const role = (profile.role as NurseRole) || "perawat"
            const status = (profile.status as NurseStatus) || "pending"

            setUserRole(role)
            setUserStatus(status)
            if (profile.full_name) setUserName(profile.full_name)
            setUserEmail(cachedEmail)

            localStorage.setItem("sp_current_user_role", role)
            localStorage.setItem("sp_current_user_status", status)
            setIsChecking(false)
            return
          }
        }

        if (!ignore) {
          setUserRole(cachedRole)
          setUserStatus(cachedStatus)
          setUserName(cachedName)
          setUserEmail(cachedEmail)
          setIsChecking(false)
        }
      } catch {
        if (!ignore) setIsChecking(false)
      }
    }

    void check()

    return () => {
      ignore = true
    }
  }, [])

  const handleLogout = async () => {
    try {
      const supabase = createClient()
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      if (supabaseUrl && !supabaseUrl.includes("your-project-ref")) {
        await supabase.auth.signOut()
      }
    } catch {}

    if (typeof window !== "undefined") {
      localStorage.removeItem("sp_current_user_name")
      localStorage.removeItem("sp_current_user_email")
      localStorage.removeItem("sp_current_user_role")
      localStorage.removeItem("sp_current_user_status")
      localStorage.removeItem("sp_remember_me")
    }
    router.push("/login")
  }

  // Menu Pengaturan Akun selalu dapat diakses oleh akun mana pun (termasuk yang belum aktif)
  if (pathname === "/pengaturan-akun") {
    return <>{children}</>
  }

  // Jika sedang memverifikasi awal, tampilkan children atau skeleton halus
  if (isChecking) {
    return <div className="flex-1 w-full">{children}</div>
  }

  // Jika pengguna adalah Pengelola atau statusnya Aktif, izinkan akses penuh
  if (userRole === "pengelola" || userStatus === "aktif") {
    return <>{children}</>
  }

  // JIKA STATUS PENDING ATAU NONAKTIF: Tampilkan layar penahan izin pengelola dengan tata letak profesional
  return (
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
  )
}
