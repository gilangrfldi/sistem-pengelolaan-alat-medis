"use client"

import * as React from "react"
import { X, Mail, AlertCircle, CheckCircle2, Loader2 } from "lucide-react"

interface ModalForgotPasswordProps {
  isOpen: boolean
  onClose: () => void
  forgotEmail: string
  setForgotEmail: (email: string) => void
  resetEmailSent: boolean
  resetError: string | null
  isSendingReset: boolean
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void | Promise<void>
}

export function ModalForgotPassword({
  isOpen,
  onClose,
  forgotEmail,
  setForgotEmail,
  resetEmailSent,
  resetError,
  isSendingReset,
  onSubmit,
}: ModalForgotPasswordProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800">
        <button
          type="button"
          onClick={onClose}
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

            <form onSubmit={onSubmit} className="space-y-4">
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
                  onClick={onClose}
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
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl bg-[#512da8] text-white font-semibold text-xs shadow-md hover:bg-[#432588] transition cursor-pointer"
              >
                Tutup dan Kembali ke Masuk
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
