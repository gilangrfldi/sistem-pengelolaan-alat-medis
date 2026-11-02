"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  ChevronsUpDownIcon,
  BadgeCheck,
  Settings,
  LogOutIcon,
  Mail,
  X,
  CheckCircle2,
  Send,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

// Fungsi Helper: Mengambil inisial nama pertama dan kedua
// Contoh: "Budi Santoso" -> "BS", "Budi Santoso Putra" -> "BS", "Budi" -> "BU"
export function getInitials(name: string): string {
  if (!name) return "US"
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  return "US"
}

interface NavUserProps {
  user?: {
    username?: string
    avatar?: string
  }
}

export function NavUser({ user }: NavUserProps) {
  const router = useRouter()
  const { isMobile } = useSidebar()

  // State Profil Pengguna - Nilai awal konsisten antara Server dan Client untuk mencegah Hydration Mismatch
  const [userName, setUserName] = useState<string>(() => user?.username || "Staf Perawat")
  const [userEmail, setUserEmail] = useState<string>("")
  const [isVerified, setIsVerified] = useState<boolean>(false)

  // State Modal Verifikasi Email
  const [showVerifyModal, setShowVerifyModal] = useState<boolean>(false)
  const [isSendingLink, setIsSendingLink] = useState<boolean>(false)
  const [linkSent, setLinkSent] = useState<boolean>(false)
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null)

  // Ambil data profil dari cache lokal dan Supabase Auth setelah komponen terpasang di client
  useEffect(() => {
    // 1. Ambil dari cache lokal terlebih dahulu setelah mount
    try {
      const cachedName = localStorage.getItem("sp_current_user_name")
      const cachedEmail = localStorage.getItem("sp_current_user_email")
      const cachedVerified = localStorage.getItem("sp_current_user_verified")

      if (cachedName || cachedEmail || cachedVerified !== null) {
        queueMicrotask(() => {
          if (cachedName) setUserName(cachedName)
          if (cachedEmail) setUserEmail(cachedEmail)
          if (cachedVerified !== null) setIsVerified(cachedVerified === "true")
        })
      }
    } catch {
      // Abaikan jika localStorage tidak didukung
    }

    // 2. Ambil data pengguna terbaru dari Supabase Auth
    async function loadUser() {
      try {
        const supabase = createClient()
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        if (!supabaseUrl || supabaseUrl.includes("your-project-ref")) return

        const {
          data: { user: authUser },
        } = await supabase.auth.getUser()
        if (authUser) {
          const name =
            authUser.user_metadata?.full_name ||
            authUser.email?.split("@")[0] ||
            "Staf Medis"
          const email = authUser.email || ""

          let query = supabase.from("profiles").select("id, is_verified, role")
          if (email) {
            query = query.or(`id.eq.${authUser.id},email.ilike.${email}`)
          } else {
            query = query.eq("id", authUser.id)
          }

          const { data: profile, error } = await query.maybeSingle()

          if (!error && !profile) {
            // Akun telah dihapus oleh pengelola dari database
            try {
              await supabase.auth.signOut()
            } catch {}
            if (typeof window !== "undefined") {
              localStorage.removeItem("sp_current_user_name")
              localStorage.removeItem("sp_current_user_email")
              localStorage.removeItem("sp_current_user_role")
              localStorage.removeItem("sp_current_user_status")
              localStorage.removeItem("sp_current_user_verified")
              localStorage.removeItem("sp_remember_me")
            }
            router.replace("/login")
            return
          }

          const verified =
            profile?.role === "pengelola" ||
            Boolean(authUser.email_confirmed_at) ||
            Boolean(profile?.is_verified)

          setUserName(name)
          setUserEmail(email)
          setIsVerified(verified)

          localStorage.setItem("sp_current_user_name", name)
          localStorage.setItem("sp_current_user_email", email)
          localStorage.setItem("sp_current_user_verified", verified ? "true" : "false")
        }
      } catch {
        // Abaikan jika gagal memuat auth
      }
    }

    loadUser()
  }, [router])

  // Kirim Link Verifikasi Email via Supabase
  const handleSendVerificationEmail = async () => {
    setIsSendingLink(true)
    setVerifyMessage(null)

    try {
      const supabase = createClient()
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

      if (supabaseUrl && !supabaseUrl.includes("your-project-ref")) {
        const { error } = await supabase.auth.resend({
          type: "signup",
          email: userEmail,
          options: {
            emailRedirectTo: `${window.location.origin}/beranda`,
          },
        })

        if (error) {
          setVerifyMessage(error.message)
          setIsSendingLink(false)
          return
        }
      } else {
        // Simulasi jika kredensial belum ada
        await new Promise((res) => setTimeout(res, 600))
      }

      setIsSendingLink(false)
      setLinkSent(true)
    } catch (err: unknown) {
      setVerifyMessage(err instanceof Error ? err.message : "Gagal mengirim link")
      setIsSendingLink(false)
    }
  }

  // Fungsi konfirmasi manual untuk pengujian
  const handleConfirmVerification = () => {
    setIsVerified(true)
    localStorage.setItem("sp_current_user_verified", "true")
    setShowVerifyModal(false)
    setLinkSent(false)
  }

  // Fungsi Keluar (Logout) Akun
  const handleLogout = async () => {
    try {
      const supabase = createClient()
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      if (supabaseUrl && !supabaseUrl.includes("your-project-ref")) {
        await supabase.auth.signOut()
      }
    } catch {
      // Abaikan jika gagal sign out
    }

    // Bersihkan sesi aktif lokal jika tidak dicentang "Ingat saya"
    try {
      if (localStorage.getItem("sp_remember_me") !== "true") {
        localStorage.removeItem("sp_current_user_name")
        localStorage.removeItem("sp_current_user_email")
        localStorage.removeItem("sp_current_user_verified")
      }
    } catch {
      // Abaikan jika localStorage tidak aktif
    }

    // Arahkan ke /login dan segarkan router
    router.push("/login")
    router.refresh()
  }

  const initials = getInitials(userName)

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <SidebarMenuButton
                  size="lg"
                  className="text-white hover:bg-white/10 hover:text-white data-[state=open]:bg-white/10 transition-colors"
                />
              }
            >
              <Avatar className="size-8 rounded-lg">
                <AvatarFallback
                  suppressHydrationWarning
                  className="bg-white/20 text-white font-semibold text-xs"
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span
                  suppressHydrationWarning
                  className="truncate font-medium text-white"
                >
                  {userName}
                </span>
                <span
                  suppressHydrationWarning
                  className="truncate text-[11px] text-white/70 flex items-center"
                >
                  <span suppressHydrationWarning className="truncate">{userEmail}</span>
                  {isVerified && (
                    <BadgeCheck className="size-3.5 text-emerald-400 fill-emerald-400/20 shrink-0 ml-1.5" />
                  )}
                </span>
              </div>
              <ChevronsUpDownIcon className="ml-auto size-4 text-white/70 shrink-0" />
            </DropdownMenuTrigger>

            <DropdownMenuContent
              className="w-64 p-2 shadow-xl rounded-xl border border-border"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={8}
            >
              <DropdownMenuGroup>
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2.5 px-2 py-2 text-left text-sm">
                    <Avatar className="size-9 rounded-lg">
                      <AvatarFallback
                        suppressHydrationWarning
                        className="bg-[#512da8]/15 text-[#512da8] dark:bg-white/15 dark:text-white font-bold text-sm"
                      >
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left leading-tight overflow-hidden">
                      <div
                        suppressHydrationWarning
                        className="font-semibold text-sm truncate text-foreground"
                      >
                        {userName}
                      </div>
                      <div
                        suppressHydrationWarning
                        className="flex items-center gap-1 text-xs text-muted-foreground truncate mt-0.5"
                      >
                        <span suppressHydrationWarning className="truncate">{userEmail}</span>
                        {isVerified && (
                          <BadgeCheck className="size-3.5 text-emerald-500 fill-emerald-500/20 shrink-0" />
                        )}
                      </div>
                    </div>
                  </div>
                </DropdownMenuLabel>

                {/* Status Verifikasi Email & Tombol Tindakan */}
                <div className="px-1 py-1">
                  {isVerified ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-md border border-emerald-200 dark:border-emerald-900/50">
                      <BadgeCheck className="size-4 text-emerald-600 shrink-0" />
                      <span>Email Terverifikasi</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setLinkSent(false)
                        setVerifyMessage(null)
                        setShowVerifyModal(true)
                      }}
                      className="flex items-center justify-between w-full px-2.5 py-1.5 text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-950/60 rounded-md border border-amber-200 dark:border-amber-900/50 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5">
                        <Mail className="size-3.5 text-amber-600 shrink-0" />
                        <span>Belum Verifikasi</span>
                      </div>
                      <span className="underline font-semibold text-[11px]">Verifikasi Email</span>
                    </button>
                  )}
                </div>
              </DropdownMenuGroup>

              <DropdownMenuSeparator className="my-1.5" />

              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() => router.push("/pengaturan-akun")}
                  className="cursor-pointer"
                >
                  <Settings className="size-4 mr-1 text-muted-foreground" />
                  Pengaturan Akun
                </DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOutIcon className="size-4 mr-1" />
                Keluar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      {/* ======================================================== */}
      {/* POPUP MODAL: VERIFIKASI EMAIL PENGGUNA */}
      {/* ======================================================== */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl p-6 sm:p-7 shadow-2xl border border-neutral-100 dark:border-neutral-800 animate-in zoom-in-95 duration-200">
            {/* Tombol Tutup */}
            <button
              type="button"
              onClick={() => setShowVerifyModal(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 cursor-pointer"
            >
              <X className="size-5" />
            </button>

            {!linkSent ? (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
                    <Mail className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-neutral-800 dark:text-neutral-100">
                      Verifikasi Email Akun
                    </h3>
                    <p className="text-xs text-neutral-500">Konfirmasi kepemilikan email staf</p>
                  </div>
                </div>

                <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed mb-4">
                  Klik tombol di bawah untuk mengirimkan tautan konfirmasi ke alamat email Anda:{" "}
                  <strong className="text-neutral-900 dark:text-neutral-100">{userEmail}</strong>.
                </p>

                {verifyMessage && (
                  <div className="mb-4 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-xs text-red-600 dark:text-red-400">
                    {verifyMessage}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowVerifyModal(false)}
                    className="w-1/3 py-2.5 px-4 rounded-lg text-xs font-semibold text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleSendVerificationEmail}
                    disabled={isSendingLink}
                    className="w-2/3 bg-[#512da8] hover:bg-[#43238c] text-white py-2.5 px-4 rounded-lg text-xs font-semibold transition disabled:opacity-70 shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Send className="size-3.5" />
                    {isSendingLink ? "Mengirim..." : "Kirim Link Konfirmasi"}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-2">
                <div className="flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 mx-auto mb-3">
                  <CheckCircle2 className="size-6" />
                </div>
                <h3 className="font-bold text-base text-neutral-800 dark:text-neutral-100 mb-1.5">
                  Link Konfirmasi Terkirim!
                </h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed mb-5">
                  Kami telah mengirimkan tautan konfirmasi ke{" "}
                  <strong className="text-neutral-900 dark:text-neutral-100">{userEmail}</strong>.
                  Silakan buka email Anda dan klik konfirmasi untuk memverifikasi akun.
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleConfirmVerification}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-4 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <BadgeCheck className="size-4" />
                    Saya Sudah Konfirmasi di Email
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowVerifyModal(false)}
                    className="w-full py-2 px-4 rounded-lg text-xs text-neutral-500 hover:text-neutral-700 transition"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
