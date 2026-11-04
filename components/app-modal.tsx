"use client"

import * as React from "react"
import { X } from "lucide-react"
import { cn } from "cn"

export interface AppModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: React.ReactNode
  icon?: React.ReactNode
  iconClassName?: string
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl"
  onSubmit?: (e: React.FormEvent) => void
  submitText?: string
  submitVariant?: "primary" | "danger"
  isSubmitting?: boolean
  cancelText?: string
  footer?: React.ReactNode
  showFooter?: boolean
  children: React.ReactNode
}

const maxWidthMap = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
}

export function AppModal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  iconClassName,
  maxWidth = "2xl",
  onSubmit,
  submitText = "Simpan",
  submitVariant = "primary",
  isSubmitting = false,
  cancelText = "Batal",
  footer,
  showFooter = true,
  children,
}: AppModalProps) {
  // Nonaktifkan scroll pada halaman utama (background) saat modal terbuka
  React.useEffect(() => {
    if (!isOpen) return

    // Hitung lebar scrollbar browser saat ini untuk mencegah layout shift (loncatan layout)
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth

    const originalBodyOverflow = document.body.style.overflow
    const originalBodyPaddingRight = document.body.style.paddingRight
    const originalHtmlOverflow = document.documentElement.style.overflow

    // Kunci scroll body dan html
    document.body.style.overflow = "hidden"
    document.documentElement.style.overflow = "hidden"

    if (scrollBarWidth > 0) {
      document.body.style.paddingRight = `${scrollBarWidth}px`
    }

    // Tutup modal jika tombol keyboard Escape ditekan
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      document.body.style.overflow = originalBodyOverflow
      document.documentElement.style.overflow = originalHtmlOverflow
      document.body.style.paddingRight = originalBodyPaddingRight
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const modalContent = (
    <>
      {/* 1. Header Modal - Pinned di Atas */}
      <div className="flex items-center justify-between p-5 sm:p-6 pb-4 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
        <div className="flex items-center gap-3">
          {icon && (
            <div
              className={cn(
                "flex size-10 items-center justify-center rounded-xl shrink-0",
                iconClassName || "bg-[#512da8]/15 text-[#512da8] dark:bg-white/10 dark:text-white"
              )}
            >
              {icon}
            </div>
          )}
          <div>
            <h3 className="font-bold text-base text-neutral-900 dark:text-neutral-100">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          title="Tutup Modal"
        >
          <X className="size-5" />
        </button>
      </div>

      {/* 2. Body Modal - Scrollable di dalam Modal */}
      <div className="p-5 sm:p-6 overflow-y-auto overscroll-contain flex-1 min-h-0 space-y-4">
        {children}
      </div>

      {/* 3. Footer Modal - Pinned di Bawah */}
      {showFooter && (
        <div className="flex items-center justify-end gap-2.5 p-4 sm:px-6 border-t border-neutral-100 dark:border-neutral-800 shrink-0 bg-neutral-50/60 dark:bg-neutral-900/60">
          {footer ? (
            footer
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs sm:text-sm font-medium rounded-lg border border-border hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                {cancelText}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  "px-5 py-2 text-xs sm:text-sm font-semibold rounded-lg text-white shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
                  submitVariant === "danger"
                    ? "bg-rose-600 hover:bg-rose-700 disabled:hover:bg-rose-600"
                    : "bg-[#512da8] hover:bg-[#43238c] disabled:hover:bg-[#512da8]"
                )}
              >
                {submitText}
              </button>
            </>
          )}
        </div>
      )}
    </>
  )

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 overscroll-contain animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "relative w-full bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-100 dark:border-neutral-800 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200",
          maxWidthMap[maxWidth]
        )}
      >
        {onSubmit ? (
          <form onSubmit={onSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
            {modalContent}
          </form>
        ) : (
          modalContent
        )}
      </div>
    </div>
  )
}

