import { createClient } from "@/lib/supabase/client"

/**
 * Keluar (Logout) akun secara bersih, terpusat, dan andal:
 * 1. Revoke / sign out sesi otentikasi di Supabase.
 * 2. Tandai penanda `sp_just_logged_out` di sessionStorage agar halaman login tidak memproses auto-login.
 * 3. Hapus seluruh data sesi aktif dari localStorage (`sp_current_user_*`).
 * 4. Lakukan pembersihan navigasi total ke `/login`.
 */
export async function performLogout(reason?: string) {
  try {
    const supabase = createClient()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (supabaseUrl && !supabaseUrl.includes("your-project-ref")) {
      await supabase.auth.signOut({ scope: "local" }).catch(() => {})
      await supabase.auth.signOut().catch(() => {})
    }
  } catch (err) {
    console.warn("Logout error:", err)
  }

  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem("sp_just_logged_out", "true")
      sessionStorage.removeItem("sp_oauth_pending")
      if (reason) {
        sessionStorage.setItem("sp_logout_reason", reason)
      } else {
        sessionStorage.removeItem("sp_logout_reason")
      }

      localStorage.removeItem("sp_current_user_name")
      localStorage.removeItem("sp_current_user_email")
      localStorage.removeItem("sp_current_user_role")
      localStorage.removeItem("sp_current_user_status")
      localStorage.removeItem("sp_current_user_verified")
      localStorage.removeItem("sp_oauth_intent")
    } catch {}

    window.location.href = reason ? `/masuk?logged_out=${encodeURIComponent(reason)}` : "/masuk"
  }
}
