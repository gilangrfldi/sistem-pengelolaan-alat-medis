"use client"

import * as React from "react"
import { X, AlertCircle } from "lucide-react"

interface ModalAlreadyRegisteredProps {
  isOpen: boolean
  email: string
  onContinueLogin: () => void
  onSwitchAccount: () => void
}

export function ModalAlreadyRegistered({
  isOpen,
  email,
  onContinueLogin,
  onSwitchAccount,
}: ModalAlreadyRegisteredProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 sm:p-7 shadow-2xl dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 text-center animate-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={onSwitchAccount}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded-lg cursor-pointer transition"
        >
          <X className="size-5" />
        </button>

        <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 mx-auto mb-3.5 border border-amber-200 dark:border-amber-800">
          <AlertCircle className="size-7" />
        </div>

        <h3 className="font-bold text-base sm:text-lg text-neutral-800 dark:text-neutral-100 mb-2">
          Akun Sudah Terdaftar
        </h3>

        <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed mb-6">
          Akun Google <strong className="text-neutral-800 dark:text-neutral-100">{email}</strong> sudah terdaftar di sistem. Anda tidak perlu mendaftar ulang.
        </p>

        <div className="space-y-2">
          <button
            type="button"
            onClick={onContinueLogin}
            className="w-full bg-[#512da8] hover:bg-[#43238c] text-white py-2.5 px-4 rounded-xl text-xs font-bold transition cursor-pointer shadow-md"
          >
            Lanjutkan Masuk ke Sistem
          </button>

          <button
            type="button"
            onClick={onSwitchAccount}
            className="w-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 py-2.5 px-4 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            Gunakan Akun Lain / Ke Halaman Masuk
          </button>
        </div>
      </div>
    </div>
  )
}

