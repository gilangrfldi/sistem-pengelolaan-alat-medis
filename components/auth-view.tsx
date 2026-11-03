"use client"

import { useState, useEffect, useRef, FormEvent } from "react"
import { useRouter } from "next/navigation"
import {
  Eye,
  EyeOff,
  Activity,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  X,
  Mail,
  Loader2,
} from "lucide-react"
import { cn } from "cn"
import { createClient } from "@/lib/supabase/client"
import {
  getLocalNurses,
  saveLocalNurses,
  NurseAccount,
  NurseRole,
  NurseStatus,
} from "@/lib/services/nurse-service"

interface AuthViewProps {
  initialMode?: "masuk" | "daftar"
}

// Validasi ketat format email
function validateStrictEmail(email: string): { isValid: boolean; error?: string } {
  const trimmed = email.trim().toLowerCase()
  if (!trimmed) {
    return { isValid: false, error: "Email wajib diisi." }
  }

  const basicRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  if (!basicRegex.test(trimmed)) {
    return { isValid: false, error: "Format email tidak valid. Contoh: perawat@gmail.com" }
  }

  const parts = trimmed.split("@")
  if (parts.length !== 2) {
    return { isValid: false, error: "Format email tidak valid." }
  }

  const domain = parts[1]
  const typoDomains: Record<string, string> = {
    "gmil.com": "gmail.com",
    "gmai.com": "gmail.com",
    "gmial.com": "gmail.com",
    "gmail.co": "gmail.com",
    "yahoo.co": "yahoo.com",
    "yaho.com": "yahoo.com",
    "hotmial.com": "hotmail.com",
  }

  if (typoDomains[domain]) {
    return {
      isValid: false,
      error: `Domain email tidak valid. Apakah maksud Anda: ${parts[0]}@${typoDomains[domain]}?`,
    }
  }

  return { isValid: true }
}

// Cek apakah callback OAuth Google sedang aktif di URL browser
function hasOAuthCallbackMarkers(): boolean {
  if (typeof window === "undefined") return false
  const hasHashToken = window.location.hash.includes("access_token=")
  const hasCode = window.location.search.includes("code=")
  const hasPendingIntent =
    Boolean(sessionStorage.getItem("sp_oauth_pending")) ||
    Boolean(localStorage.getItem("sp_oauth_intent"))
  return hasHashToken || hasCode || hasPendingIntent
}

function checkIsGoogleSession(user: {
  app_metadata?: { provider?: string; providers?: string[] }
  identities?: Array<{ provider?: string }>
}): boolean {
  return (
    user.app_metadata?.provider === "google" ||
    (Array.isArray(user.app_metadata?.providers) &&
      user.app_metadata.providers.includes("google")) ||
    (Array.isArray(user.identities) &&
      user.identities.some((id) => id.provider === "google"))
  )
}

export function AuthView({ initialMode = "masuk" }: AuthViewProps) {
  const router = useRouter()

  // State tampilan: Masuk (false) atau Buat Akun (true)
  const [isSignUp, setIsSignUp] = useState<boolean>(initialMode === "daftar")

  // Form Masuk
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [showLoginPassword, setShowLoginPassword] = useState(false)

  // Form Buat Akun
  const [regName, setRegName] = useState("")
  const [regEmail, setRegEmail] = useState("")
  const [regPassword, setRegPassword] = useState("")
  const [showRegPassword, setShowRegPassword] = useState(false)

  // Status Proses & Notifikasi
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Modal Lupa Kata Sandi
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [forgotEmail, setForgotEmail] = useState("")
  const [isSendingReset, setIsSendingReset] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const [resetEmailSent, setResetEmailSent] = useState(false)

  // Ref penahan duplikasi eksekusi OAuth
  const isHandlingAuthRef = useRef(false)

  // 1. Sinkronisasi mode dengan popstate (Back/Forward)
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== "undefined") {
        if (window.location.pathname.includes("/daftar")) {
          setIsSignUp(true)
          setAuthError(null)
          setSuccessMessage(null)
        } else {
          setIsSignUp(false)
          setAuthError(null)
          setSuccessMessage(null)
        }
      }
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  // Fungsi transisi halus Masuk <-> Daftar dengan pembaruan URL tanpa reload
  const toggleToSignUp = () => {
    setAuthError(null)
    setSuccessMessage(null)
    setIsSignUp(true)
    if (typeof window !== "undefined" && window.location.pathname !== "/daftar") {
      window.history.pushState(null, "", "/daftar")
    }
  }

  const toggleToSignIn = () => {
    setAuthError(null)
    setSuccessMessage(null)
    setIsSignUp(false)
    if (typeof window !== "undefined" && window.location.pathname !== "/masuk") {
      window.history.pushState(null, "", "/masuk")
    }
  }

  // 2. Baca kredensial tersimpan (Ingat Saya) pasca-hidrasi
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const isRemembered = localStorage.getItem("sp_remember_me") === "true"
        if (isRemembered) {
          setRememberMe(true)
          const savedEmail = localStorage.getItem("sp_saved_email")
          const savedPassword = localStorage.getItem("sp_saved_password")
          if (savedEmail) setLoginEmail(savedEmail)
          if (savedPassword) setLoginPassword(savedPassword)
        }
      } catch {
        // Abaikan jika localStorage tidak didukung
      }
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  // 3. Baca pesan logout / error query parameter pasca-hidrasi
  useEffect(() => {
    if (typeof window === "undefined") return
    const timer = setTimeout(() => {
      const params = new URLSearchParams(window.location.search)
      const errParam = params.get("sp_auth_err")
      const loggedOutParam = params.get("logged_out")

      if (loggedOutParam === "deleted") {
        setAuthError("Sesi Anda telah berakhir karena akun telah dihapus oleh pengelola.")
        window.history.replaceState({}, document.title, window.location.pathname)
      } else if (errParam) {
        setAuthError(decodeURIComponent(errParam))
        window.history.replaceState({}, document.title, window.location.pathname)
      }
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  // 4. Penanganan Callback Google OAuth
  useEffect(() => {
    const supabase = createClient()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!supabaseUrl || supabaseUrl.includes("your-project-ref")) {
      return
    }

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
      if (!hasOAuthCallbackMarkers()) return

      if (isHandlingAuthRef.current) return
      isHandlingAuthRef.current = true

      setIsLoading(true)
      setIsGoogleLoading(true)

      const userEmail = session.user.email || ""
      const oauthIntent =
        typeof window !== "undefined"
          ? sessionStorage.getItem("sp_oauth_pending") || localStorage.getItem("sp_oauth_intent")
          : null

      const isGoogleSignUp =
        oauthIntent === "signup" ||
        (typeof window !== "undefined" && window.location.pathname.includes("/daftar"))

      try {
        // Bersihkan parameter OAuth di URL
        if (typeof window !== "undefined" && window.history && (window.location.search || window.location.hash)) {
          window.history.replaceState({}, document.title, window.location.pathname)
        }

        // Cek baris profil pengguna di tabel profiles
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, role, status, full_name, is_verified, created_at")
          .or(`id.eq.${session.user.id},email.ilike.${userEmail}`)
          .maybeSingle()

        // Hitung total profil di database untuk deteksi akun pertama
        let totalCount = 1
        try {
          const { count } = await supabase.from("profiles").select("id", { count: "exact", head: true })
          totalCount = count ?? 0
        } catch {}

        // KASUS A: PENGGUNA MEMILIH "MASUK DENGAN GOOGLE" TETAPI AKUN BELUM TERDAFTAR
        if (!isGoogleSignUp && !profile && totalCount > 0) {
          if (typeof window !== "undefined") {
            sessionStorage.removeItem("sp_oauth_pending")
            localStorage.removeItem("sp_oauth_intent")
          }
          await supabase.auth.signOut({ scope: "local" }).catch(() => {})
          setIsLoading(false)
          setIsGoogleLoading(false)
          isHandlingAuthRef.current = false
          setAuthError("Akun belum terdaftar. Silakan lakukan pendaftaran terlebih dahulu.")
          return
        }

        // Bersihkan marker OAuth
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("sp_oauth_pending")
          localStorage.removeItem("sp_oauth_intent")
        }

        const name =
          session.user.user_metadata?.full_name ||
          session.user.user_metadata?.name ||
          profile?.full_name ||
          userEmail.split("@")[0]

        let targetRole: NurseRole = "perawat"
        let targetStatus: NurseStatus = "pending"

        if (totalCount === 0) {
          // Pengguna paling pertama di sistem selalu menjadi Super Admin (Pengelola)
          targetRole = "pengelola"
          targetStatus = "aktif"
        } else if (profile?.role === "pengelola") {
          // Lindungi hak super admin pengelola
          targetRole = "pengelola"
          targetStatus = (profile.status as NurseStatus) || "aktif"
        } else if (isGoogleSignUp) {
          // Pendaftaran baru atau DAFTAR ULANG akun perawat yang telah dihapus:
          // Selalu didaftarkan dari awal sebagai perawat pending menunggu verifikasi/aktivasi pengelola
          targetRole = "perawat"
          targetStatus = "pending"
        } else if (profile) {
          // Masuk biasa dengan akun yang sudah ada
          targetRole = (profile.role as NurseRole) || "perawat"
          targetStatus = (profile.status as NurseStatus) || "pending"
        }

        // Simpan / perbarui ke tabel profiles Supabase
        try {
          await supabase.from("profiles").upsert({
            id: session.user.id,
            full_name: name,
            email: userEmail,
            role: targetRole,
            status: targetStatus,
            is_verified: true, // Google OAuth email selalu terverifikasi
            updated_at: new Date().toISOString(),
          })
        } catch (e) {
          console.warn("Google profile upsert error:", e)
        }

        // Perbarui antrean lokal akun perawat
        try {
          const cached = getLocalNurses()
          const existingIdx = cached.findIndex(
            (n) => n.id === session.user.id || n.email.toLowerCase() === userEmail.toLowerCase()
          )
          const nurseItem: NurseAccount = {
            id: session.user.id,
            fullName: name,
            email: userEmail,
            role: targetRole,
            status: targetStatus,
            isVerified: true,
            createdAt: profile?.created_at || new Date().toISOString(),
          }
          if (existingIdx >= 0) {
            cached[existingIdx] = { ...cached[existingIdx], ...nurseItem }
          } else {
            cached.unshift(nurseItem)
          }
          saveLocalNurses(cached)
        } catch {}

        // Simpan sesi aktif ke localStorage
        localStorage.setItem("sp_current_user_name", name)
        localStorage.setItem("sp_current_user_email", userEmail)
        localStorage.setItem("sp_current_user_role", targetRole)
        localStorage.setItem("sp_current_user_status", targetStatus)
        localStorage.setItem("sp_current_user_verified", "true")

        router.replace("/beranda")
      } catch (err) {
        console.error("Google sign in session error:", err)
        setIsLoading(false)
        setIsGoogleLoading(false)
        isHandlingAuthRef.current = false
        setAuthError("Terjadi kendala saat memproses autentikasi Google.")
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session?.user) return
      const isGoogleUser = checkIsGoogleSession(session.user)

      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && isGoogleUser && hasOAuthCallbackMarkers()) {
        void handleGoogleUserSession(session)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  // 5. Submit Form Masuk (Email & Password)
  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setAuthError(null)
    setSuccessMessage(null)

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
    } catch {}

    try {
      const supabase = createClient()
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

      if (supabaseUrl && !supabaseUrl.includes("your-project-ref")) {
        const trimmedEmail = loginEmail.trim()
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password: loginPassword,
        })

        if (error) {
          let errorMsg = error.message
          if (error.message === "Invalid login credentials") {
            try {
              const { data: existingUser } = await supabase
                .from("profiles")
                .select("id")
                .ilike("email", trimmedEmail)
                .maybeSingle()

              if (!existingUser) {
                errorMsg = "Akun belum terdaftar. Silakan lakukan pendaftaran terlebih dahulu."
              } else {
                errorMsg = "Kata sandi yang Anda masukkan salah. Silakan periksa kembali."
              }
            } catch {
              errorMsg = "Akun belum terdaftar atau kata sandi tidak cocok. Silakan periksa kembali."
            }
          } else if (error.message.includes("Email not confirmed")) {
            errorMsg = "Email belum dikonfirmasi. Harap periksa kotak masuk atau spam email Anda dan klik tautan konfirmasi untuk verifikasi."
          }
          setAuthError(errorMsg)
          setIsLoading(false)
          return
        }

        if (data?.user) {
          const isConfirmed = Boolean(data.user.email_confirmed_at)

          const { data: profile } = await supabase
            .from("profiles")
            .select("role, status, full_name, is_verified")
            .eq("id", data.user.id)
            .maybeSingle()

          let totalProfilesCount = 1
          try {
            const { count } = await supabase.from("profiles").select("id", { count: "exact", head: true })
            totalProfilesCount = count ?? 0
          } catch {}

          // Jika akun telah dihapus oleh pengelola
          if (!profile && totalProfilesCount > 0) {
            await supabase.auth.signOut()
            if (typeof window !== "undefined") {
              localStorage.removeItem("sp_current_user_name")
              localStorage.removeItem("sp_current_user_email")
              localStorage.removeItem("sp_current_user_role")
              localStorage.removeItem("sp_current_user_status")
              localStorage.removeItem("sp_current_user_verified")
              localStorage.removeItem("sp_remember_me")
            }
            setAuthError("Akun belum terdaftar. Silakan lakukan pendaftaran terlebih dahulu.")
            setIsLoading(false)
            return
          }

          const name = data.user.user_metadata?.full_name || profile?.full_name || trimmedEmail.split("@")[0]
          const verified = Boolean(profile?.is_verified || isConfirmed)

          if (profile) {
            const role = profile.role || "perawat"
            const status = (!verified && role !== "pengelola") ? "pending" : (profile.status || "aktif")

            if (isConfirmed && !profile.is_verified) {
              await supabase.from("profiles").update({ is_verified: true }).eq("id", data.user.id)
            }

            localStorage.setItem("sp_current_user_name", profile.full_name || name)
            localStorage.setItem("sp_current_user_email", data.user.email || trimmedEmail)
            localStorage.setItem("sp_current_user_role", role)
            localStorage.setItem("sp_current_user_status", status)
            localStorage.setItem("sp_current_user_verified", verified ? "true" : "false")
          } else {
            const role = "pengelola"
            const status = "aktif"

            try {
              await supabase.from("profiles").upsert({
                id: data.user.id,
                full_name: name,
                email: trimmedEmail,
                role,
                status,
                is_verified: true,
              })
            } catch {}

            localStorage.setItem("sp_current_user_name", name)
            localStorage.setItem("sp_current_user_email", trimmedEmail)
            localStorage.setItem("sp_current_user_role", role)
            localStorage.setItem("sp_current_user_status", status)
            localStorage.setItem("sp_current_user_verified", "true")
          }

          router.replace("/beranda")
          return
        }
      } else {
        // Fallback demo lokal jika Supabase belum terhubung
        await new Promise((res) => setTimeout(res, 600))
        const localNurses = getLocalNurses()
        const user = localNurses.find((n) => n.email.toLowerCase() === loginEmail.trim().toLowerCase())

        if (user) {
          localStorage.setItem("sp_current_user_name", user.fullName)
          localStorage.setItem("sp_current_user_email", user.email)
          localStorage.setItem("sp_current_user_role", user.role)
          localStorage.setItem("sp_current_user_status", user.status)
          localStorage.setItem("sp_current_user_verified", user.isVerified ? "true" : "false")
        } else {
          localStorage.setItem("sp_current_user_name", loginEmail.split("@")[0] || "Staf Medis")
          localStorage.setItem("sp_current_user_email", loginEmail)
          localStorage.setItem("sp_current_user_role", "perawat")
          localStorage.setItem("sp_current_user_status", "aktif")
          localStorage.setItem("sp_current_user_verified", "true")
        }

        router.replace("/beranda")
        return
      }
    } catch {
      setAuthError("Terjadi kendala saat memproses masuk. Silakan coba lagi.")
    } finally {
      setIsLoading(false)
    }
  }

  // 6. Submit Form Buat Akun (Nama, Email, Password)
  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setAuthError(null)
    setSuccessMessage(null)

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
        let existingProfile = null
        try {
          const { data } = await supabase
            .from("profiles")
            .select("id, email")
            .ilike("email", regEmail.trim())
            .maybeSingle()
          existingProfile = data

          if (existingProfile) {
            setAuthError("Email ini sudah terdaftar. Silakan klik tombol 'MASUK' atau gunakan 'Masuk dengan Google'.")
            setIsLoading(false)
            return
          }
        } catch {}

        const origin =
          typeof window !== "undefined" && window.location.origin
            ? window.location.origin
            : "https://sita-med.vercel.app"
        const redirectUrl = `${origin}/masuk`

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

        // Jika akun pernah terdaftar di auth.users sebelumnya (misal setelah dihapus dari profiles oleh pengelola)
        const isAuthUserExists =
          (error &&
            (error.message.toLowerCase().includes("already registered") ||
              error.message.toLowerCase().includes("user already exists"))) ||
          (signUpData?.user &&
            Array.isArray(signUpData.user.identities) &&
            signUpData.user.identities.length === 0)

        if (isAuthUserExists && !existingProfile) {
          const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
            email: regEmail,
            password: regPassword,
          })

          if (!signInErr && signInData?.user) {
            try {
              await supabase.from("profiles").upsert({
                id: signInData.user.id,
                full_name: regName,
                email: regEmail,
                role: "perawat",
                status: "pending",
                is_verified: Boolean(signInData.user.email_confirmed_at),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
            } catch {}

            try {
              const cached = getLocalNurses()
              const existingIdx = cached.findIndex((n) => n.email.toLowerCase() === regEmail.toLowerCase())
              if (existingIdx >= 0) {
                cached[existingIdx] = {
                  ...cached[existingIdx],
                  fullName: regName,
                  isVerified: Boolean(signInData.user.email_confirmed_at),
                  status: "pending",
                }
              } else {
                cached.unshift({
                  id: signInData.user.id,
                  fullName: regName,
                  email: regEmail,
                  role: "perawat",
                  status: "pending",
                  isVerified: Boolean(signInData.user.email_confirmed_at),
                  createdAt: new Date().toISOString(),
                })
              }
              saveLocalNurses(cached)
            } catch {}

            await supabase.auth.signOut()
            setLoginEmail(regEmail)
            setLoginPassword(regPassword)
            setSuccessMessage("Pendaftaran ulang berhasil! Akun Anda sedang menunggu otorisasi dari pengelola HCU.")
            toggleToSignIn()
            setIsLoading(false)
            return
          }
        }

        if (error) {
          let msg = error.message
          if (
            error.message.toLowerCase().includes("already registered") ||
            error.message.toLowerCase().includes("user already exists")
          ) {
            msg = "Email ini sudah terdaftar. Silakan klik tombol 'MASUK' atau gunakan 'Masuk dengan Google'."
          } else if (error.message.includes("Database error saving new user")) {
            msg = "Terjadi kendala saat mendaftarkan akun. Silakan coba kembali beberapa saat lagi."
          }
          setAuthError(msg)
          setIsLoading(false)
          return
        }

        if (signUpData?.user && Array.isArray(signUpData.user.identities) && signUpData.user.identities.length === 0) {
          setAuthError("Email ini sudah terdaftar. Silakan klik tombol 'MASUK' atau gunakan 'Masuk dengan Google'.")
          setIsLoading(false)
          return
        }

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

      // Catat ke daftar perawat lokal
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
      toggleToSignIn()
      setIsLoading(false)
    } catch {
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
      toggleToSignIn()
      setIsLoading(false)
    }
  }

  // 7. Masuk atau Daftar Menggunakan Akun Google
  const handleGoogleSignIn = async (mode: "login" | "signup" = "login") => {
    setIsLoading(true)
    setIsGoogleLoading(true)
    setAuthError(null)
    setSuccessMessage(null)

    if (typeof window !== "undefined") {
      sessionStorage.setItem("sp_oauth_pending", mode)
      localStorage.setItem("sp_oauth_intent", mode)
    }

    try {
      const supabase = createClient()
      const origin =
        typeof window !== "undefined" && window.location.origin
          ? window.location.origin
          : "https://sita-med.vercel.app"
      const targetPath = mode === "signup" ? "/daftar" : "/masuk"
      const redirectUrl = `${origin}${targetPath}`

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
        },
      })

      if (error) {
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("sp_oauth_pending")
          localStorage.removeItem("sp_oauth_intent")
        }
        setAuthError(`Gagal menghubungkan ke Google: ${error.message}`)
        setIsLoading(false)
        setIsGoogleLoading(false)
      }
    } catch (err: unknown) {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("sp_oauth_pending")
        localStorage.removeItem("sp_oauth_intent")
      }
      const msg =
        err instanceof Error ? err.message : "Terjadi kendala saat menghubungkan ke akun Google."
      setAuthError(msg)
      setIsLoading(false)
      setIsGoogleLoading(false)
    }
  }

  // 8. Kirim Tautan Reset Kata Sandi
  const handleSendResetEmail = async (e: FormEvent<HTMLFormElement>) => {
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
            msg = "Batas pengiriman email tercapai. Silakan tunggu beberapa saat sebelum mencoba kembali."
          }
          setResetError(msg)
          setIsSendingReset(false)
          return
        }
      } else {
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
        
        {/* Form Masuk */}
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
              placeholder="Email terdaftar"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              required
              className="w-full bg-[#eeeeee] dark:bg-neutral-800 border-0 rounded-lg text-xs sm:text-sm px-4 py-3 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 text-neutral-800 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-[#512da8]/30 transition"
            />

            {/* Input Kata Sandi */}
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

            {/* Ingat Saya & Lupa Kata Sandi */}
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
                {isLoading && !isGoogleLoading ? "MEMPROSES..." : "MASUK"}
              </button>
            </div>

            {/* Pemisah */}
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

            {/* Masuk dengan Google */}
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
              <span>{isGoogleLoading ? "Memproses Akun Google..." : "Masuk dengan Google"}</span>
            </button>

            {/* Mobile Toggle */}
            <div className="md:hidden pt-4 text-xs text-neutral-500">
              Belum punya akun?{" "}
              <button
                type="button"
                onClick={toggleToSignUp}
                className="font-bold text-[#512da8] underline cursor-pointer"
              >
                Daftar sekarang
              </button>
            </div>
          </form>
        </div>

        {/* Form Buat Akun */}
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
              placeholder="Nama lengkap perawat"
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              required
              className="w-full bg-[#eeeeee] dark:bg-neutral-800 border-0 rounded-lg text-xs sm:text-sm px-4 py-3 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 text-neutral-800 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-[#512da8]/30 transition"
            />
            <input
              type="email"
              placeholder="Email dinas atau pribadi"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              required
              className="w-full bg-[#eeeeee] dark:bg-neutral-800 border-0 rounded-lg text-xs sm:text-sm px-4 py-3 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 text-neutral-800 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-[#512da8]/30 transition"
            />

            {/* Input Kata Sandi Registrasi */}
            <div className="relative w-full">
              <input
                type={showRegPassword ? "text" : "password"}
                placeholder="Kata sandi (minimal 6 karakter)"
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
                {isLoading && !isGoogleLoading ? "MENDAFTARKAN..." : "DAFTAR"}
              </button>
            </div>

            {/* Pemisah */}
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

            {/* Daftar dengan Google */}
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
              <span>{isGoogleLoading ? "Memproses Akun Google..." : "Daftar dengan Google"}</span>
            </button>

            {/* Mobile Toggle */}
            <div className="md:hidden pt-4 text-xs text-neutral-500">
              Sudah memiliki akun?{" "}
              <button
                type="button"
                onClick={toggleToSignIn}
                className="font-bold text-[#512da8] underline cursor-pointer"
              >
                Masuk di sini
              </button>
            </div>
          </form>
        </div>

        {/* Panel Animasi Geser */}
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
              <div className="animate-in fade-in zoom-in-95 duration-500 flex flex-col items-center">
                <h2 className="text-3xl font-extrabold tracking-tight mb-3">
                  Selamat Datang Kembali!
                </h2>
                <p className="text-xs sm:text-sm text-white/90 leading-relaxed max-w-[280px] mb-8 font-light">
                  Sudah memiliki akun terdaftar? Masuk dengan data akun Anda untuk kembali memantau dan mengelola alat medis.
                </p>
                <button
                  type="button"
                  onClick={toggleToSignIn}
                  className="border-2 border-white/90 text-white hover:bg-white hover:text-[#512da8] font-bold text-xs uppercase tracking-wider px-10 py-2.5 rounded-lg transition-all duration-200 cursor-pointer shadow-sm"
                >
                  MASUK
                </button>
              </div>
            ) : (
              <div className="animate-in fade-in zoom-in-95 duration-500 flex flex-col items-center">
                <h2 className="text-3xl font-extrabold tracking-tight mb-3">
                  Halo, Rekan!
                </h2>
                <p className="text-xs sm:text-sm text-white/90 leading-relaxed max-w-[280px] mb-8 font-light">
                  Daftarkan diri dengan informasi pribadi Anda untuk menggunakan seluruh fitur sistem pengelolaan alat medis RSUD Welas Asih.
                </p>
                <button
                  type="button"
                  onClick={toggleToSignUp}
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

      {/* Footer */}
      <div className="mt-5 text-center text-xs text-neutral-400 dark:text-neutral-500">
        © 2026 RSUD Welas Asih • Sistem Informasi Pemantauan & Kalibrasi Alat Medis HCU
      </div>

      {/* Modal Lupa Kata Sandi */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1 rounded-lg cursor-pointer transition"
            >
              <X className="size-5" />
            </button>

            {!resetEmailSent ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-[#512da8]/10 text-[#512da8] dark:bg-purple-950/40 dark:text-purple-300">
                    <Mail className="size-4.5" />
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                    Atur Ulang Kata Sandi
                  </h3>
                </div>

                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4 leading-relaxed">
                  Masukkan email akun perawat yang terdaftar. Kami akan mengirimkan tautan untuk mengatur ulang kata sandi Anda.
                </p>

                {resetError && (
                  <div className="mb-4 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-center gap-2 text-xs text-red-600 dark:text-red-400 text-left">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>{resetError}</span>
                  </div>
                )}

                <form onSubmit={handleSendResetEmail} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Email Akun
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="nama@email.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full bg-[#eeeeee] dark:bg-neutral-800 border-0 rounded-lg text-xs sm:text-sm px-4 py-2.5 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 text-neutral-800 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-[#512da8]/30 transition"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      disabled={isSendingReset}
                      className="px-4 py-2 rounded-lg text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isSendingReset}
                      className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#512da8] hover:bg-[#43238c] text-white text-xs font-semibold shadow-md transition cursor-pointer disabled:opacity-60"
                    >
                      {isSendingReset ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin" />
                          <span>Mengirim...</span>
                        </>
                      ) : (
                        <span>Kirim Tautan</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="text-center py-2 space-y-3">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                  <CheckCircle2 className="size-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                    Tautan Reset Berhasil Dikirim
                  </h3>
                  <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto leading-relaxed">
                    Kami telah mengirimkan instruksi dan tautan untuk membuat kata sandi baru ke{" "}
                    <strong className="text-neutral-800 dark:text-neutral-200">{forgotEmail}</strong>.
                    Silakan periksa kotak masuk atau spam email Anda.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#512da8] text-white font-semibold text-xs shadow-md hover:bg-[#432588] transition cursor-pointer"
                  >
                    Tutup dan Kembali ke Masuk
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
