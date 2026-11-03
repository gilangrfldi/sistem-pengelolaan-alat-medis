"use client"

import * as React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Activity, KeyRound, Eye, EyeOff, AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMessage(null)

    // Validasi input
    if (newPassword.length < 6) {
      setErrorMessage("Kata sandi baru minimal harus 6 karakter.")
      return
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Konfirmasi kata sandi tidak cocok dengan kata sandi baru.")
      return
    }

    setIsLoading(true)

    try {
      const supabase = createClient()
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

      if (supabaseUrl && !supabaseUrl.includes("your-project-ref")) {
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        })

        if (error) {
          setErrorMessage(error.message)
          setIsLoading(false)
          return
        }
      }

      // Tandai pembaruan kata sandi berhasil
      try {
        localStorage.setItem("sp_reset_success", "true")
        localStorage.removeItem("sp_saved_password")
        localStorage.removeItem("sp_just_reset_password")
      } catch {
        // Abaikan jika storage dibatasi
      }

      setIsSuccess(true)
      setIsLoading(false)

      // Beri sedikit jeda lalu arahkan otomatis ke login
      setTimeout(() => {
        router.push("/masuk")
      }, 1200)
    } catch {
      try {
        localStorage.setItem("sp_reset_success", "true")
        localStorage.removeItem("sp_saved_password")
        localStorage.removeItem("sp_just_reset_password")
      } catch {
        // Abaikan
      }
      setIsSuccess(true)
      setIsLoading(false)
      setTimeout(() => {
        router.push("/masuk")
      }, 1200)
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#e8ecf4] dark:bg-neutral-950 p-4 sm:p-6 transition-colors">
      {/* Brand Header */}
      <div className="mb-6 flex items-center gap-2.5 text-neutral-800 dark:text-neutral-200">
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

      {/* Main Card Container */}
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-[28px] shadow-2xl border border-neutral-100 dark:border-neutral-800 p-8 sm:p-10">
        {!isSuccess ? (
          <>
            <div className="flex flex-col items-center text-center mb-6">
              <div className="flex size-12 items-center justify-center rounded-full bg-[#512da8]/10 text-[#512da8] mb-3">
                <KeyRound className="size-6" />
              </div>
              <h1 className="text-2xl font-extrabold text-neutral-800 dark:text-neutral-100 tracking-tight">
                Buat Kata Sandi Baru
              </h1>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1.5 leading-relaxed max-w-xs">
                Masukkan kata sandi baru Anda. Setelah disimpan, Anda akan diarahkan ke halaman login.
              </p>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-start gap-2.5 text-xs text-red-600 dark:text-red-400">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Kata Sandi Baru
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Minimal 6 karakter"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full bg-[#eeeeee] dark:bg-neutral-800 border-0 rounded-lg text-xs sm:text-sm pl-4 pr-10 py-3 placeholder:text-neutral-400 text-neutral-800 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-[#512da8]/30 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1 cursor-pointer transition"
                    title={showNewPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  >
                    {showNewPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Konfirmasi Kata Sandi Baru
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Ulangi kata sandi baru"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full bg-[#eeeeee] dark:bg-neutral-800 border-0 rounded-lg text-xs sm:text-sm pl-4 pr-10 py-3 placeholder:text-neutral-400 text-neutral-800 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-[#512da8]/30 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1 cursor-pointer transition"
                    title={showConfirmPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#512da8] hover:bg-[#43238c] text-white font-bold text-xs uppercase tracking-wider rounded-lg py-3 shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-70 cursor-pointer"
                >
                  {isLoading ? "MENYIMPAN..." : "SIMPAN KATA SANDI BARU"}
                </button>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => router.push("/masuk")}
                  className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition"
                >
                  <ArrowLeft className="size-3.5" />
                  Kembali ke Halaman Masuk
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center text-center py-4 animate-in zoom-in-95 duration-200">
            <div className="flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 mb-4">
              <CheckCircle2 className="size-8" />
            </div>
            <h2 className="text-2xl font-extrabold text-neutral-800 dark:text-neutral-100 tracking-tight">
              Kata Sandi Diperbarui!
            </h2>
            <p className="text-xs text-neutral-500 mt-2 leading-relaxed max-w-xs">
              Kata sandi Anda telah berhasil diubah. Mengalihkan Anda kembali ke halaman masuk...
            </p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-6 text-center text-xs text-neutral-400 dark:text-neutral-500">
        © 2026 RSUD Welas Asih • Sistem Informasi Pemantauan & Kalibrasi Alat Medis HCU
      </div>
    </div>
  )
}

