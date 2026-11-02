"use client"

import * as React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "cn"
import {
  Activity,
  ArrowRight,
  X,
  Mail,
  CheckCircle2,
  KeyRound,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import {
  getLocalNurses,
  saveLocalNurses,
  NurseAccount,
  NurseRole,
  NurseStatus,
} from "@/lib/services/nurse-service"
import { validateStrictEmail } from "@/lib/utils/validate-email"

export default function LoginPage() {
  const router = useRouter()
  // false = Sign In (Masuk), true = Sign Up (Buat Akun)
  // Inisialisasi default false agar identik antara server SSR dan client render (mencegah Hydration Mismatch)
  const [isSignUp, setIsSignUp] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [existingGoogleAccount, setExistingGoogleAccount] = useState<string | null>(null)
  const [showExistingGoogleModal, setShowExistingGoogleModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      try {
        if (localStorage.getItem("sp_reset_success") === "true") {
          return "Kata sandi berhasil diperbarui! Silakan klik Masuk."
        }
      } catch {
        // Abaikan jika storage dibatasi
      }
    }
    return null
  })

  // Inisialisasi data "Ingat Saya" dari localStorage secara lazy
  const [rememberMe, setRememberMe] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("sp_remember_me") === "true"
      } catch {
        return false
      }
    }
    return false
  })

  // State Form Masuk
  const [loginEmail, setLoginEmail] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        if (localStorage.getItem("sp_remember_me") === "true") {
          return localStorage.getItem("sp_saved_email") || ""
        }
      } catch {
        // Abaikan jika storage dibatasi
      }
    }
    return ""
  })

  const [loginPassword, setLoginPassword] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const justReset = localStorage.getItem("sp_just_reset_password")
        if (justReset) {
          return justReset
        }
        if (localStorage.getItem("sp_remember_me") === "true") {
          return localStorage.getItem("sp_saved_password") || ""
        }
      } catch {
        // Abaikan jika storage dibatasi
      }
    }
    return ""
  })

  // Bersihkan penanda reset dan dengarkan konfirmasi email via tautan email
  React.useEffect(() => {
    const initTimer = setTimeout(() => {
      try {
        if (localStorage.getItem("sp_oauth_intent") === "signup") {
          setIsSignUp(true)
        }
        localStorage.removeItem("sp_just_reset_password")
        localStorage.removeItem("sp_reset_success")
      } catch {
        // Abaikan jika localStorage tidak aktif
      }
    }, 0)

    // Deteksi jika pengguna baru saja membuka tautan verifikasi email Supabase atau login via Google OAuth
    try {
      const supabase = createClient()

      // Helper untuk mendeteksi apakah sesi ini berasal dari Google OAuth
      const checkIsGoogleSession = (user: {
        app_metadata?: { provider?: string; providers?: string[] }
        identities?: Array<{ provider?: string }>
      }): boolean => {
        if (!user) return false
        if (user.app_metadata?.provider === "google") return true
        if (Array.isArray(user.app_metadata?.providers) && user.app_metadata.providers.includes("google")) return true
        if (Array.isArray(user.identities) && user.identities.some((i) => i.provider === "google")) return true
        if (typeof window !== "undefined") {
          if (Boolean(localStorage.getItem("sp_oauth_intent"))) return true
          if (window.location.hash.includes("access_token") || window.location.search.includes("code=")) return true
        }
        return false
      }

      // Helper pemrosesan sesi login/daftar pengguna Google
      const handleGoogleUserSession = async (session: {
        user: {
          id: string
          email?: string
          app_metadata?: { provider?: string; providers?: string[] }
          identities?: Array<{ provider?: string }>
          user_metadata?: { full_name?: string; name?: string }
          created_at?: string
        }
      }) => {
        if (!session?.user) return
        const isGoogleUser = checkIsGoogleSession(session.user)
        if (!isGoogleUser) return

        const userEmail = session.user.email || ""
        const oauthIntent = typeof window !== "undefined" ? localStorage.getItem("sp_oauth_intent") : null

        try {
          // Cek apakah akun/profil sudah terdaftar sebelumnya di database Supabase
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, role, status, full_name, is_verified, created_at")
            .eq("id", session.user.id)
            .maybeSingle()

          const authUserCreatedAt = session.user.created_at
            ? new Date(session.user.created_at).getTime()
            : 0
          // Akun dianggap sudah ada jika profil ditemukan atau akun auth dibuat lebih dari 20 detik yang lalu
          const isAlreadyRegistered = Boolean(profile) || (authUserCreatedAt > 0 && Date.now() - authUserCreatedAt > 20000)

          // JIKA PENGGUNA MEMILIH "DAFTAR DENGAN GOOGLE" TETAPI AKUNNYA SUDAH TERDAFTAR SEBELUMNYA:
          if (oauthIntent === "signup" && isAlreadyRegistered) {
            if (typeof window !== "undefined") {
              localStorage.removeItem("sp_oauth_intent")
            }
            // Keluar dari sesi auth agar tidak langsung auto-login ke dashboard
            await supabase.auth.signOut()

            setIsLoading(false)
            setIsSignUp(true)
            setExistingGoogleAccount(userEmail)
            setShowExistingGoogleModal(true)
            setAuthError(null)
            return
          }

          // JIKA MASUK (LOGIN) ATAU PENDAFTARAN GOOGLE BARU
          if (typeof window !== "undefined") {
            localStorage.removeItem("sp_oauth_intent")
          }
          setIsLoading(true)

          const name =
            session.user.user_metadata?.full_name ||
            session.user.user_metadata?.name ||
            userEmail.split("@")[0]

          let role = profile?.role || "perawat"
          if (!profile) {
            try {
              const { count } = await supabase
                .from("profiles")
                .select("id", { count: "exact", head: true })
              if (!count || count === 0) {
                role = "pengelola"
              }
            } catch {}
          }

          const status = profile?.status || "aktif"
          const verified = true

          try {
            await supabase.from("profiles").upsert({
              id: session.user.id,
              full_name: profile?.full_name || name,
              email: userEmail,
              role,
              status,
              is_verified: verified,
              updated_at: new Date().toISOString(),
            })
          } catch (e) {
            console.warn("Google profile upsert error:", e)
          }

          try {
            const cached = getLocalNurses()
            const existingIdx = cached.findIndex((n) => n.email.toLowerCase() === userEmail.toLowerCase())
            const nurseItem: NurseAccount = {
              id: session.user.id,
              fullName: profile?.full_name || name,
              email: userEmail,
              role: role as NurseRole,
              status: status as NurseStatus,
              isVerified: verified,
              createdAt: new Date().toISOString(),
            }
            if (existingIdx >= 0) {
              cached[existingIdx] = { ...cached[existingIdx], ...nurseItem }
            } else {
              cached.unshift(nurseItem)
            }
            saveLocalNurses(cached)
          } catch {}

          localStorage.setItem("sp_current_user_name", profile?.full_name || name)
          localStorage.setItem("sp_current_user_email", userEmail)
          localStorage.setItem("sp_current_user_role", role)
          localStorage.setItem("sp_current_user_status", status)
          localStorage.setItem("sp_current_user_verified", "true")

          setIsLoading(false)
          router.replace("/beranda")
        } catch (err) {
          console.error("Google sign in session error:", err)
          setIsLoading(false)
          router.replace("/beranda")
        }
      }

      // 1. Periksa sesi langsung saat komponen dimuat
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session && checkIsGoogleSession(session.user)) {
          void handleGoogleUserSession(session)
        }
      })

      // 2. Dengarkan perubahan status otentikasi
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!session?.user) return
        const isGoogleUser = checkIsGoogleSession(session.user)

        if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
          if (isGoogleUser) {
            void handleGoogleUserSession(session)
            return
          }
        }

        // Tautan verifikasi email manual Supabase
        if (session.user.email_confirmed_at && !isGoogleUser) {
          try {
            await supabase
              .from("profiles")
              .update({ is_verified: true, updated_at: new Date().toISOString() })
              .eq("id", session.user.id)
            setAuthError(null)
            setSuccessMessage(
              "Email Anda telah berhasil diverifikasi! Silakan klik Masuk."
            )
            if (session.user.email) setLoginEmail(session.user.email)
          } catch {
            // Abaikan jika offline
          }
        }
      })
      return () => {
        clearTimeout(initTimer)
        subscription.unsubscribe()
      }
    } catch {
      // Abaikan jika inisialisasi gagal
    }
    return () => {
      clearTimeout(initTimer)
    }
  }, [router])

  const [showLoginPassword, setShowLoginPassword] = useState(false)

  // State Form Daftar (Hanya: Nama Lengkap, Email, Password)
  const [regName, setRegName] = useState("")
  const [regEmail, setRegEmail] = useState("")
  const [regPassword, setRegPassword] = useState("")
  const [showRegPassword, setShowRegPassword] = useState(false)

  // State Modal Lupa Kata Sandi (Solusi 2: Email Otomatis Supabase)
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [forgotEmail, setForgotEmail] = useState("")
  const [isSendingReset, setIsSendingReset] = useState(false)
  const [resetEmailSent, setResetEmailSent] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)

  // Kunci scroll halaman utama saat modal lupa sandi atau modal akun terdaftar terbuka
  React.useEffect(() => {
    if (!showForgotModal && !showExistingGoogleModal) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [showForgotModal, showExistingGoogleModal])

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setAuthError(null)
    setSuccessMessage(null)

    // Simpan atau hapus data jika "Ingat Saya" dicentang
    try {
      if (rememberMe) {
        localStorage.setItem("sp_remember_me", "true")
        localStorage.setItem("sp_saved_email", loginEmail)
        localStorage.setItem("sp_saved_password", loginPassword)
      } else {
        localStorage.removeItem("sp_remember_me")
        localStorage.removeItem("sp_saved_email")
        localStorage.removeItem("sp_saved_password")
      }
    } catch {
      // Abaikan jika localStorage tidak didukung
    }

    try {
      const supabase = createClient()
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

      // Jalankan otentikasi nyata jika kredensial Supabase sudah diisi
      if (supabaseUrl && !supabaseUrl.includes("your-project-ref")) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password: loginPassword,
        })

        if (error) {
          let errorMsg = error.message
          if (error.message === "Invalid login credentials") {
            errorMsg = "Email atau kata sandi tidak cocok. Silakan periksa kembali."
          } else if (error.message.includes("Email not confirmed")) {
            errorMsg = "Email belum dikonfirmasi. Harap periksa kotak masuk atau spam email Anda dan klik tautan konfirmasi untuk verifikasi."
          }
          setAuthError(errorMsg)
          setIsLoading(false)
          return
        }

        if (data?.user) {
          const name = data.user.user_metadata?.full_name || loginEmail.split("@")[0]
          const isVerified = Boolean(data.user.email_confirmed_at)
          localStorage.setItem("sp_current_user_name", name)
          localStorage.setItem("sp_current_user_email", data.user.email || loginEmail)
          localStorage.setItem("sp_current_user_verified", isVerified ? "true" : "false")

          // Ambil role & status dari profiles
          try {
            const { data: profile } = await supabase
              .from("profiles")
              .select("role, status, full_name, is_verified")
              .eq("id", data.user.id)
              .maybeSingle()

            if (profile) {
              const role = profile.role || "perawat"
              const isConfirmed = Boolean(data.user.email_confirmed_at)
              const verified = Boolean(profile.is_verified || isConfirmed)
              
              // Jika email belum diverifikasi dan bukan pengelola, status tidak boleh aktif
              const status = (!verified && role !== "pengelola")
                ? "pending"
                : (profile.status || "aktif")

              if (isConfirmed && !profile.is_verified) {
                await supabase.from("profiles").update({ is_verified: true }).eq("id", data.user.id)
              }

              localStorage.setItem("sp_current_user_role", role)
              localStorage.setItem("sp_current_user_status", status)
              localStorage.setItem("sp_current_user_verified", verified ? "true" : "false")
              if (profile.full_name) localStorage.setItem("sp_current_user_name", profile.full_name)
            } else {
              // Jika baris di profiles belum ada
              let role = "perawat"
              try {
                const { count } = await supabase.from("profiles").select("id", { count: "exact", head: true })
                if (!count || count === 0) role = "pengelola"
              } catch {}

              const isConfirmed = Boolean(data.user.email_confirmed_at)
              const status = role === "pengelola" ? "aktif" : (isConfirmed ? "aktif" : "pending")
              const verified = isConfirmed

              try {
                await supabase.from("profiles").upsert({
                  id: data.user.id,
                  full_name: name,
                  email: loginEmail,
                  role,
                  status,
                  is_verified: verified,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
              } catch (recreateErr) {
                console.warn("Re-create profile notice:", recreateErr)
              }

              // Simpan juga ke cache perawat lokal agar langsung terdeteksi
              try {
                const cached = getLocalNurses()
                const existingIdx = cached.findIndex((n) => n.email.toLowerCase() === loginEmail.toLowerCase())
                const nurseItem: NurseAccount = {
                  id: data.user.id,
                  fullName: name,
                  email: loginEmail,
                  role: role as NurseRole,
                  status: status as NurseStatus,
                  isVerified: verified,
                  createdAt: new Date().toISOString(),
                }
                if (existingIdx >= 0) {
                  cached[existingIdx] = nurseItem
                } else {
                  cached.unshift(nurseItem)
                }
                saveLocalNurses(cached)
              } catch {}

              localStorage.setItem("sp_current_user_role", role)
              localStorage.setItem("sp_current_user_status", status)
              localStorage.setItem("sp_current_user_verified", verified ? "true" : "false")
            }
          } catch {
            const cachedRole = localStorage.getItem("sp_current_user_role") || "perawat"
            localStorage.setItem("sp_current_user_role", cachedRole)
            localStorage.setItem("sp_current_user_status", "aktif")
          }
        }
      } else {
        const cachedRole = localStorage.getItem("sp_current_user_role") || "perawat"
        localStorage.setItem("sp_current_user_email", loginEmail)
        localStorage.setItem("sp_current_user_role", cachedRole)
        localStorage.setItem("sp_current_user_status", "aktif")
        localStorage.setItem("sp_current_user_verified", "true")
      }

      setIsLoading(false)
      router.push("/beranda")
    } catch {
      setIsLoading(false)
      router.push("/beranda")
    }
  }

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setAuthError(null)
    setSuccessMessage(null)

    // Validasi sintaks & domain ketat (cegah typo domain seperti @gmil.com, @gmail.co, dll.)
    const emailCheck = validateStrictEmail(regEmail)
    if (!emailCheck.isValid) {
      setAuthError(emailCheck.error || "Format email tidak valid.")
      setIsLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

      if (supabaseUrl && !supabaseUrl.includes("your-project-ref")) {
        // Cek terlebih dahulu apakah email sudah terdaftar di profiles Supabase
        try {
          const { data: existingProfile } = await supabase
            .from("profiles")
            .select("id, email")
            .ilike("email", regEmail.trim())
            .maybeSingle()

          if (existingProfile) {
            setAuthError("Email ini sudah terdaftar. Silakan klik tab 'Masuk' atau gunakan tombol 'Masuk dengan Google'.")
            setIsLoading(false)
            return
          }
        } catch {
          // Lanjutkan jika pengecekan awal terhambat
        }

        const redirectUrl =
          typeof window !== "undefined" ? `${window.location.origin}/login` : undefined
        const { data: signUpData, error } = await supabase.auth.signUp({
          email: regEmail,
          password: regPassword,
          options: {
            data: {
              full_name: regName,
            },
            emailRedirectTo: redirectUrl,
          },
        })

        if (error) {
          let msg = error.message
          if (
            error.message.toLowerCase().includes("already registered") ||
            error.message.toLowerCase().includes("user already exists")
          ) {
            msg = "Email ini sudah terdaftar. Silakan klik tab 'Masuk' atau gunakan tombol 'Masuk dengan Google'."
          } else if (error.message.includes("Database error saving new user")) {
            msg = "Gagal menyimpan akun (kendala trigger pada database Supabase). Silakan jalankan pembaruan skrip SQL terbaru di SQL Editor Supabase."
          }
          setAuthError(msg)
          setIsLoading(false)
          return
        }

        // Jika Supabase mengembalikan identities kosong, artinya user sudah terdaftar (mekanisme anti-enumeration Supabase)
        if (signUpData?.user && Array.isArray(signUpData.user.identities) && signUpData.user.identities.length === 0) {
          setAuthError("Email ini sudah terdaftar. Silakan klik tab 'Masuk' atau gunakan tombol 'Masuk dengan Google'.")
          setIsLoading(false)
          return
        }

        // Pastikan akun perawat baru langsung tercatat di tabel profiles sebagai pending & is_verified: false
        if (signUpData?.user) {
          try {
            await supabase.from("profiles").upsert({
              id: signUpData.user.id,
              full_name: regName,
              email: regEmail,
              role: "perawat",
              status: "pending",
              is_verified: Boolean(signUpData.user.email_confirmed_at),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
          } catch (upsertErr) {
            console.warn("Direct profile upsert notice:", upsertErr)
          }
        }
      }

      // Catat juga di penyimpanan lokal perawat agar langsung terlihat di halaman Kelola Perawat
      try {
        const cached = getLocalNurses()
        const existingIdx = cached.findIndex((n) => n.email.toLowerCase() === regEmail.toLowerCase())
        if (existingIdx >= 0) {
          cached[existingIdx] = {
            ...cached[existingIdx],
            fullName: regName,
            isVerified: false,
            status: "pending",
          }
        } else {
          cached.unshift({
            id: `nurse-${Date.now()}`,
            fullName: regName,
            email: regEmail,
            role: "perawat",
            status: "pending",
            isVerified: false,
            createdAt: new Date().toISOString(),
          })
        }
        saveLocalNurses(cached)
      } catch {}

      // Pindah ke form login dan data terisi otomatis dari input pendaftaran tadi
      localStorage.setItem("sp_current_user_name", regName)
      localStorage.setItem("sp_current_user_email", regEmail)
      localStorage.setItem("sp_current_user_verified", "false")

      setLoginEmail(regEmail)
      setLoginPassword(regPassword)
      setSuccessMessage("Akun berhasil didaftarkan! Tautan verifikasi telah dikirimkan ke email Anda. Silakan verifikasi email Anda sebelum masuk.")
      setIsSignUp(false)
      setIsLoading(false)
    } catch {
      // Offline fallback: tetap catat perawat ke antrean Kelola Perawat
      try {
        const cached = getLocalNurses()
        const existingIdx = cached.findIndex((n) => n.email.toLowerCase() === regEmail.toLowerCase())
        if (existingIdx >= 0) {
          cached[existingIdx] = {
            ...cached[existingIdx],
            fullName: regName,
            isVerified: false,
            status: "pending",
          }
        } else {
          cached.unshift({
            id: `nurse-${Date.now()}`,
            fullName: regName,
            email: regEmail,
            role: "perawat",
            status: "pending",
            isVerified: false,
            createdAt: new Date().toISOString(),
          })
        }
        saveLocalNurses(cached)
      } catch {}

      localStorage.setItem("sp_current_user_name", regName)
      localStorage.setItem("sp_current_user_email", regEmail)
      localStorage.setItem("sp_current_user_verified", "false")

      setLoginEmail(regEmail)
      setLoginPassword(regPassword)
      setSuccessMessage("Akun berhasil didaftarkan! Tautan verifikasi telah dikirimkan ke email Anda. Silakan verifikasi email Anda sebelum masuk.")
      setIsSignUp(false)
      setIsLoading(false)
    }
  }

  // Otentikasi Masuk/Daftar menggunakan Google OAuth
  const handleGoogleSignIn = async (mode: "login" | "signup" = "login") => {
    setIsLoading(true)
    setAuthError(null)
    setSuccessMessage(null)
    setExistingGoogleAccount(null)
    if (typeof window !== "undefined") {
      localStorage.setItem("sp_oauth_intent", mode)
    }
    try {
      const supabase = createClient()
      const redirectUrl =
        typeof window !== "undefined" ? `${window.location.origin}/login` : undefined
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
        },
      })
      if (error) {
        setAuthError(`Gagal menghubungkan ke Google: ${error.message}`)
        setIsLoading(false)
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Terjadi kendala saat menghubungkan ke akun Google."
      setAuthError(msg)
      setIsLoading(false)
    }
  }

  const handleSendResetEmail = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSendingReset(true)
    setResetError(null)

    try {
      const supabase = createClient()
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

      if (supabaseUrl && !supabaseUrl.includes("your-project-ref")) {
        const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
          redirectTo: `${window.location.origin}/reset-password`,
        })

        if (error) {
          let msg = error.message
          if (error.message.toLowerCase().includes("rate limit")) {
            msg = "Batas kuota email bawaan Supabase tercapai (maks. 3-4 email/jam pada server gratis Supabase). Silakan tunggu beberapa saat atau hubungkan Custom SMTP di Supabase."
          }
          setResetError(msg)
          setIsSendingReset(false)
          return
        }
      } else {
        // Simulasi jika kredensial belum dipasang
        await new Promise((res) => setTimeout(res, 600))
      }

      setIsSendingReset(false)
      setResetEmailSent(true)
    } catch (err: unknown) {
      setResetError(err instanceof Error ? err.message : "Gagal mengirim tautan reset")
      setIsSendingReset(false)
    }
  }

  const handleOpenForgotModal = () => {
    setForgotEmail(loginEmail || "")
    setResetEmailSent(false)
    setResetError(null)
    setShowForgotModal(true)
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#e8ecf4] dark:bg-neutral-950 p-4 sm:p-6 transition-colors relative">
      {/* Brand Header */}
      <div className="mb-5 flex items-center gap-2.5 text-neutral-800 dark:text-neutral-200">
        <div className="flex size-8 items-center justify-center rounded-lg bg-[#512da8] text-white shadow-sm">
          <Activity className="size-4" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sm tracking-tight">RSUD Welas Asih</span>
          <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
            Sistem Pengelolaan Alat Medis Ruang HCU
          </span>
        </div>
      </div>

      {/* Main Double Card Container */}
      <div className="relative w-full max-w-[850px] min-h-[500px] bg-white dark:bg-neutral-900 rounded-[32px] shadow-2xl overflow-hidden flex flex-col md:flex-row border border-neutral-100 dark:border-neutral-800">
        
        {/* ======================================================== */}
        {/* FORM MASUK (Sign In) */}
        {/* ======================================================== */}
        <div
          className={cn(
            "w-full md:w-1/2 p-8 sm:p-12 flex flex-col justify-center items-center text-center transition-all duration-700 ease-in-out order-2 md:order-1",
            isSignUp
              ? "md:opacity-0 md:pointer-events-none md:translate-x-full hidden md:flex"
              : "opacity-100 translate-x-0 flex"
          )}
        >
          <h1 className="text-3xl font-extrabold text-neutral-800 dark:text-neutral-100 mb-2 tracking-tight">
            Masuk
          </h1>

          <p className="text-xs text-neutral-400 dark:text-neutral-500 font-normal mb-5">
            Gunakan email dan kata sandi akun Anda
          </p>

          {/* Pesan Sukses Pasca Pendaftaran */}
          {successMessage && !isSignUp && (
            <div className="w-full max-w-[310px] mb-3 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex items-start gap-2 text-xs text-emerald-700 dark:text-emerald-300 text-left">
              <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {authError && !isSignUp && (
            <div className="w-full max-w-[310px] mb-4 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-center gap-2 text-xs text-red-600 dark:text-red-400 text-left">
              <AlertCircle className="size-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleSignIn} className="w-full max-w-[310px] space-y-3.5">
            <input
              type="email"
              placeholder="Email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              required
              className="w-full bg-[#eeeeee] dark:bg-neutral-800 border-0 rounded-lg text-xs sm:text-sm px-4 py-3 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 text-neutral-800 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-[#512da8]/30 transition"
            />

            {/* Input Kata Sandi dengan Ikon Mata */}
            <div className="relative w-full">
              <input
                type={showLoginPassword ? "text" : "password"}
                placeholder="Kata Sandi"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                className="w-full bg-[#eeeeee] dark:bg-neutral-800 border-0 rounded-lg text-xs sm:text-sm pl-4 pr-10 py-3 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 text-neutral-800 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-[#512da8]/30 transition"
              />
              <button
                type="button"
                onClick={() => setShowLoginPassword(!showLoginPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1 cursor-pointer transition"
                title={showLoginPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
              >
                {showLoginPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>

            {/* Baris Bawah Input: Ingat Saya (Kiri) & Lupa Kata Sandi (Kanan) */}
            <div className="flex items-center justify-between text-xs pt-0.5">
              <label className="flex items-center gap-1.5 cursor-pointer text-neutral-600 dark:text-neutral-400 select-none hover:text-neutral-900 dark:hover:text-neutral-200 transition">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="size-3.5 rounded accent-[#512da8] cursor-pointer"
                />
                <span>Ingat saya</span>
              </label>

              <button
                type="button"
                onClick={handleOpenForgotModal}
                className="text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition cursor-pointer"
              >
                Lupa Kata Sandi Anda?
              </button>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="bg-[#512da8] hover:bg-[#43238c] text-white font-bold text-xs uppercase tracking-wider rounded-lg px-12 py-3 shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-70 cursor-pointer w-full"
              >
                {isLoading ? "MEMPROSES..." : "MASUK"}
              </button>
            </div>

            {/* Pemisah "atau" */}
            <div className="relative my-2.5">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-neutral-200 dark:border-neutral-700" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-white dark:bg-neutral-900 px-2 text-neutral-400 font-semibold">
                  atau
                </span>
              </div>
            </div>

            {/* Tombol Masuk dengan Google */}
            <button
              type="button"
              onClick={() => handleGoogleSignIn("login")}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white hover:bg-neutral-50 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-100 font-semibold text-xs transition shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <svg className="size-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.36 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.15 0 9.92 0 12s.45 3.85 1.24 5.42l4.04-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Masuk dengan Google</span>
            </button>

            {/* Mobile Toggle Trigger */}
            <div className="md:hidden pt-4 text-xs text-neutral-500">
              Belum punya akun?{" "}
              <button
                type="button"
                onClick={() => {
                  setAuthError(null)
                  setSuccessMessage(null)
                  setExistingGoogleAccount(null)
                  setIsSignUp(true)
                }}
                className="font-bold text-[#512da8] underline"
              >
                Daftar sekarang
              </button>
            </div>
          </form>
        </div>

        {/* ======================================================== */}
        {/* FORM BUAT AKUN (Sign Up) - Hanya Nama, Email, Password */}
        {/* ======================================================== */}
        <div
          className={cn(
            "w-full md:w-1/2 p-8 sm:p-12 flex flex-col justify-center items-center text-center transition-all duration-700 ease-in-out order-2 md:order-2",
            isSignUp
              ? "opacity-100 translate-x-0 flex"
              : "md:opacity-0 md:pointer-events-none md:-translate-x-full hidden md:flex"
          )}
        >
          <h1 className="text-3xl font-extrabold text-neutral-800 dark:text-neutral-100 mb-2 tracking-tight">
            Buat Akun
          </h1>

          <p className="text-xs text-neutral-400 dark:text-neutral-500 font-normal mb-6">
            Daftarkan akun staf baru untuk mengakses sistem
          </p>

          {authError && isSignUp && (
            <div className="w-full max-w-[310px] mb-4 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-center gap-2 text-xs text-red-600 dark:text-red-400 text-left">
              <AlertCircle className="size-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleSignUp} className="w-full max-w-[310px] space-y-3.5">
            <input
              type="text"
              placeholder="Nama Lengkap"
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              required
              className="w-full bg-[#eeeeee] dark:bg-neutral-800 border-0 rounded-lg text-xs sm:text-sm px-4 py-3 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 text-neutral-800 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-[#512da8]/30 transition"
            />
            <input
              type="email"
              placeholder="Email"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              required
              className="w-full bg-[#eeeeee] dark:bg-neutral-800 border-0 rounded-lg text-xs sm:text-sm px-4 py-3 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 text-neutral-800 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-[#512da8]/30 transition"
            />

            {/* Input Kata Sandi Registrasi dengan Ikon Mata */}
            <div className="relative w-full">
              <input
                type={showRegPassword ? "text" : "password"}
                placeholder="Kata Sandi (min. 6 karakter)"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-[#eeeeee] dark:bg-neutral-800 border-0 rounded-lg text-xs sm:text-sm pl-4 pr-10 py-3 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 text-neutral-800 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-[#512da8]/30 transition"
              />
              <button
                type="button"
                onClick={() => setShowRegPassword(!showRegPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1 cursor-pointer transition"
                title={showRegPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
              >
                {showRegPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="bg-[#512da8] hover:bg-[#43238c] text-white font-bold text-xs uppercase tracking-wider rounded-lg px-12 py-3 shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-70 cursor-pointer w-full"
              >
                {isLoading ? "MENDAFTARKAN..." : "DAFTAR"}
              </button>
            </div>

            {/* Pemisah "atau" */}
            <div className="relative my-2.5">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-neutral-200 dark:border-neutral-700" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-white dark:bg-neutral-900 px-2 text-neutral-400 font-semibold">
                  atau
                </span>
              </div>
            </div>

            {/* Tombol Daftar dengan Google */}
            <button
              type="button"
              onClick={() => handleGoogleSignIn("signup")}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white hover:bg-neutral-50 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-100 font-semibold text-xs transition shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <svg className="size-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.36 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.15 0 9.92 0 12s.45 3.85 1.24 5.42l4.04-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Daftar dengan Google</span>
            </button>

            {/* Mobile Toggle Trigger */}
            <div className="md:hidden pt-4 text-xs text-neutral-500">
              Sudah memiliki akun?{" "}
              <button
                type="button"
                onClick={() => {
                  setAuthError(null)
                  setSuccessMessage(null)
                  setExistingGoogleAccount(null)
                  setIsSignUp(false)
                }}
                className="font-bold text-[#512da8] underline"
              >
                Masuk di sini
              </button>
            </div>
          </form>
        </div>

        {/* ======================================================== */}
        {/* SLIDING PURPLE OVERLAY PANEL */}
        {/* ======================================================== */}
        <div
          className={cn(
            "hidden md:flex absolute top-0 h-full w-1/2 z-20 transition-transform duration-700 ease-in-out overflow-hidden pointer-events-auto",
            isSignUp ? "translate-x-0" : "translate-x-full"
          )}
        >
          <div
            className={cn(
              "w-full h-full bg-[#512da8] flex flex-col items-center justify-center text-center px-10 text-white transition-all duration-700 shadow-xl",
              isSignUp
                ? "rounded-r-[130px] rounded-br-[90px]"
                : "rounded-l-[130px] rounded-bl-[90px]"
            )}
          >
            {isSignUp ? (
              // Tampilan saat di mode Buat Akun -> Ajakan Masuk
              <div className="animate-in fade-in zoom-in-95 duration-500 flex flex-col items-center">
                <h2 className="text-3xl font-extrabold tracking-tight mb-3">
                  Selamat Datang Kembali!
                </h2>
                <p className="text-xs sm:text-sm text-white/90 leading-relaxed max-w-[280px] mb-8 font-light">
                  Sudah memiliki akun terdaftar? Masuk dengan data akun Anda untuk kembali memantau dan mengelola alat medis.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setAuthError(null)
                    setSuccessMessage(null)
                    setExistingGoogleAccount(null)
                    setIsSignUp(false)
                  }}
                  className="border-2 border-white/90 text-white hover:bg-white hover:text-[#512da8] font-bold text-xs uppercase tracking-wider px-10 py-2.5 rounded-lg transition-all duration-200 cursor-pointer shadow-sm"
                >
                  MASUK
                </button>
              </div>
            ) : (
              // Tampilan saat di mode Masuk -> Ajakan Buat Akun
              <div className="animate-in fade-in zoom-in-95 duration-500 flex flex-col items-center">
                <h2 className="text-3xl font-extrabold tracking-tight mb-3">
                  Halo, Rekan!
                </h2>
                <p className="text-xs sm:text-sm text-white/90 leading-relaxed max-w-[280px] mb-8 font-light">
                  Daftarkan diri dengan informasi pribadi Anda untuk menggunakan seluruh fitur sistem pengelolaan alat medis RSUD Welas Asih.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setAuthError(null)
                    setSuccessMessage(null)
                    setExistingGoogleAccount(null)
                    setIsSignUp(true)
                  }}
                  className="border-2 border-white/90 text-white hover:bg-white hover:text-[#512da8] font-bold text-xs uppercase tracking-wider px-10 py-2.5 rounded-lg transition-all duration-200 cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  DAFTAR
                  <ArrowRight className="size-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Footer Info */}
      <div className="mt-5 text-center text-xs text-neutral-400 dark:text-neutral-500">
        © 2026 RSUD Welas Asih • Sistem Informasi Pemantauan & Kalibrasi Alat Medis HCU
      </div>

      {/* ======================================================== */}
      {/* MODAL: LUPA KATA SANDI (Solusi 2: Email Otomatis Supabase) */}
      {/* ======================================================== */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl p-6 sm:p-7 shadow-2xl border border-neutral-100 dark:border-neutral-800 animate-in zoom-in-95 duration-200">
            {/* Tombol Tutup */}
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 cursor-pointer"
            >
              <X className="size-5" />
            </button>

            {!resetEmailSent ? (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-[#512da8]/10 text-[#512da8]">
                    <KeyRound className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-neutral-800 dark:text-neutral-100">
                      Atur Ulang Kata Sandi
                    </h3>
                    <p className="text-xs text-neutral-500">Layanan Email Otomatis Supabase</p>
                  </div>
                </div>

                <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed mb-4">
                  Masukkan email akun Anda. Sistem akan mengirimkan tautan pemulihan kata sandi langsung ke email tersebut tanpa perlu server email khusus.
                </p>

                {resetError && (
                  <div className="mb-4 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-start gap-2 text-xs text-red-600 dark:text-red-400">
                    <AlertCircle className="size-4 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{resetError}</span>
                  </div>
                )}

                <form onSubmit={handleSendResetEmail} className="space-y-3.5">
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 size-4 text-neutral-400" />
                    <input
                      type="email"
                      placeholder="Masukkan alamat email Anda"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                      className="w-full bg-[#eeeeee] dark:bg-neutral-800 border-0 rounded-lg text-xs sm:text-sm pl-10 pr-4 py-3 placeholder:text-neutral-400 text-neutral-800 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-[#512da8]/30 transition"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="w-1/3 py-2.5 px-4 rounded-lg text-xs font-semibold text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isSendingReset}
                      className="w-2/3 bg-[#512da8] hover:bg-[#43238c] text-white py-2.5 px-4 rounded-lg text-xs font-semibold transition disabled:opacity-70 shadow-md cursor-pointer"
                    >
                      {isSendingReset ? "Mengirim..." : "Kirim Tautan Reset"}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="text-center py-2">
                <div className="flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 mx-auto mb-3">
                  <CheckCircle2 className="size-6" />
                </div>
                <h3 className="font-bold text-base text-neutral-800 dark:text-neutral-100 mb-1.5">
                  Tautan Pemulihan Terkirim!
                </h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed mb-5">
                  Instruksi pemulihan kata sandi telah dikirim ke{" "}
                  <strong className="text-neutral-800 dark:text-neutral-100">{forgotEmail}</strong>.
                  Silakan periksa kotak masuk (inbox) atau folder spam email Anda.
                </p>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="w-full bg-[#512da8] hover:bg-[#43238c] text-white py-2.5 px-4 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Selesai & Kembali ke Login
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* ======================================================== */}
      {/* POPUP MODAL: AKUN GOOGLE SUDAH TERDAFTAR */}
      {/* ======================================================== */}
      {showExistingGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-white dark:bg-neutral-900 rounded-2xl p-6 sm:p-7 shadow-2xl border border-neutral-100 dark:border-neutral-800 text-center animate-in zoom-in-95 duration-200">
            {/* Tombol Tutup Silang */}
            <button
              type="button"
              onClick={() => setShowExistingGoogleModal(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 cursor-pointer transition"
            >
              <X className="size-5" />
            </button>

            <div className="flex size-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 mx-auto mb-3.5">
              <AlertCircle className="size-6" />
            </div>

            <h3 className="font-bold text-base text-neutral-800 dark:text-neutral-100 mb-1.5">
              Akun Sudah Terdaftar
            </h3>

            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed mb-5">
              Akun Google <strong className="text-neutral-800 dark:text-neutral-100">{existingGoogleAccount}</strong> sudah terdaftar di sistem. Anda tidak perlu mendaftar lagi, silakan masuk ke akun Anda.
            </p>

            <button
              type="button"
              onClick={() => {
                setShowExistingGoogleModal(false)
                if (existingGoogleAccount) setLoginEmail(existingGoogleAccount)
                setExistingGoogleAccount(null)
                setIsSignUp(false)
                setAuthError(null)
              }}
              className="w-full bg-[#512da8] hover:bg-[#43238c] text-white py-2.5 px-4 rounded-xl text-xs font-bold transition cursor-pointer shadow-md"
            >
              Ke Halaman Masuk
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
