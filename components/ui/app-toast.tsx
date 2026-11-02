"use client"

import * as React from "react"
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react"
import { cn } from "cn"

export type ToastType = "success" | "error" | "info"

export interface ToastItem {
  id: string
  message: string
  type: ToastType
  duration?: number
}

type ToastListener = (toasts: ToastItem[]) => void

let toasts: ToastItem[] = []
const listeners = new Set<ToastListener>()

function notify() {
  listeners.forEach((listener) => listener([...toasts]))
}

export const toast = {
  success(message: string, duration = 3500) {
    const id = `toast-${Date.now()}-${Math.random()}`
    toasts = [...toasts, { id, message, type: "success", duration }]
    notify()
    setTimeout(() => {
      toast.dismiss(id)
    }, duration)
  },
  error(message: string, duration = 4000) {
    const id = `toast-${Date.now()}-${Math.random()}`
    toasts = [...toasts, { id, message, type: "error", duration }]
    notify()
    setTimeout(() => {
      toast.dismiss(id)
    }, duration)
  },
  info(message: string, duration = 3500) {
    const id = `toast-${Date.now()}-${Math.random()}`
    toasts = [...toasts, { id, message, type: "info", duration }]
    notify()
    setTimeout(() => {
      toast.dismiss(id)
    }, duration)
  },
  dismiss(id: string) {
    toasts = toasts.filter((t) => t.id !== id)
    notify()
  },
}

export function AppToaster() {
  const [items, setItems] = React.useState<ToastItem[]>([])

  React.useEffect(() => {
    listeners.add(setItems)
    return () => {
      listeners.delete(setItems)
    }
  }, [])

  if (items.length === 0) return null

  return (
    <div
      aria-live="polite"
      aria-label="Notifikasi"
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[99999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      {items.map((t) => {
        const isSuccess = t.type === "success"
        const isError = t.type === "error"

        return (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-2xl shadow-lg border backdrop-blur-md transition-all duration-300 ease-out animate-in slide-in-from-bottom-3 fade-in",
              isSuccess &&
                "bg-white dark:bg-neutral-900 border-emerald-200 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-100 shadow-emerald-500/10",
              isError &&
                "bg-white dark:bg-neutral-900 border-rose-200 dark:border-rose-800/60 text-rose-950 dark:text-rose-100 shadow-rose-500/10",
              !isSuccess &&
                !isError &&
                "bg-white dark:bg-neutral-900 border-purple-200 dark:border-purple-800/60 text-purple-950 dark:text-purple-100 shadow-purple-500/10"
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {isSuccess && (
                <div className="size-7 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="size-4 shrink-0" />
                </div>
              )}
              {isError && (
                <div className="size-7 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <AlertCircle className="size-4 shrink-0" />
                </div>
              )}
              {!isSuccess && !isError && (
                <div className="size-7 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-[#512da8] dark:text-purple-300 flex items-center justify-center shrink-0">
                  <Info className="size-4 shrink-0" />
                </div>
              )}
              <span className="text-xs sm:text-sm font-semibold truncate text-neutral-800 dark:text-neutral-100">
                {t.message}
              </span>
            </div>

            <button
              type="button"
              onClick={() => toast.dismiss(t.id)}
              className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer shrink-0"
              title="Tutup notifikasi"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

