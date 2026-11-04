"use client"

import React, { useState, useRef, useEffect, useId, useMemo } from "react"
import { Clock, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export interface AppTimePickerProps {
  value: string // Format 'HH:mm' e.g. '18:22'
  onChange: (timeStr: string) => void
  label?: string
  placeholder?: string
  className?: string
  triggerClassName?: string
  required?: boolean
  disabled?: boolean
  id?: string
  name?: string
  "aria-label"?: string
  size?: "sm" | "md" | "lg"
  showNowButton?: boolean
}

function padZero(num: number): string {
  return num < 10 ? `0${num}` : `${num}`
}

export function AppTimePicker({
  value,
  onChange,
  label,
  placeholder = "Pilih jam...",
  className,
  triggerClassName,
  required = false,
  disabled = false,
  id,
  name,
  "aria-label": ariaLabel,
  size = "md",
  showNowButton = true,
}: AppTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const generatedId = useId()
  const inputId = id || generatedId

  // Parsing jam dan menit saat ini dari value
  const { currentHour, currentMinute } = useMemo(() => {
    if (!value || !value.includes(":")) {
      const now = new Date()
      return {
        currentHour: padZero(now.getHours()),
        currentMinute: padZero(now.getMinutes()),
      }
    }
    const parts = value.split(":")
    const h = parseInt(parts[0], 10)
    const m = parseInt(parts[1], 10)
    return {
      currentHour: !isNaN(h) && h >= 0 && h < 24 ? padZero(h) : "00",
      currentMinute: !isNaN(m) && m >= 0 && m < 60 ? padZero(m) : "00",
    }
  }, [value])

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const hoursList = useMemo(() => Array.from({ length: 24 }, (_, i) => padZero(i)), [])
  const minutesList = useMemo(() => Array.from({ length: 60 }, (_, i) => padZero(i)), [])

  const handleSelectHour = (newHour: string) => {
    onChange(`${newHour}:${currentMinute}`)
  }

  const handleSelectMinute = (newMinute: string) => {
    onChange(`${currentHour}:${newMinute}`)
  }

  const handleSetCurrentTime = () => {
    const now = new Date()
    const nowStr = `${padZero(now.getHours())}:${padZero(now.getMinutes())}`
    onChange(nowStr)
  }

  const heightClass =
    size === "sm" ? "h-8.5 text-xs px-2.5" : size === "lg" ? "h-12 text-sm px-3.5" : "h-10 sm:h-11 text-xs sm:text-sm px-3"

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1.5"
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        id={inputId}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={ariaLabel || label || placeholder}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={cn(
          "w-full rounded-xl border bg-white dark:bg-neutral-800 flex items-center justify-between gap-2 transition cursor-pointer shadow-2xs select-none",
          heightClass,
          isOpen
            ? "border-[#512da8] ring-2 ring-[#512da8]/20 dark:ring-purple-900/40 text-neutral-900 dark:text-neutral-100"
            : "border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:border-neutral-400 dark:hover:border-neutral-600",
          disabled && "opacity-50 cursor-not-allowed bg-neutral-100 dark:bg-neutral-900",
          triggerClassName
        )}
      >
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <Clock className="size-4 shrink-0 text-[#512da8] dark:text-purple-400" />
          <span className="font-semibold text-neutral-900 dark:text-neutral-100 font-mono text-xs sm:text-sm whitespace-nowrap">
            {value ? `${value} WIB` : <span className="text-muted-foreground font-sans font-normal">{placeholder}</span>}
          </span>
        </div>

        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-neutral-400 transition-transform duration-200",
            isOpen && "rotate-180 text-[#512da8] dark:text-purple-400"
          )}
        />
      </button>

      {/* Hidden Native Input Time for Form Submissions & Playwright Test Compatibility */}
      <input
        type="time"
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only pointer-events-none"
      />

      {/* Popover Pemilih Jam */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-50 bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-xl p-3.5 space-y-3 w-[260px] sm:w-[280px] animate-in fade-in-0 zoom-in-95 duration-100">
          {/* Header Display Waktu Digital */}
          <div className="p-2.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/50 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[#512da8] dark:text-purple-300">
              <Clock className="size-3.5" />
              <span className="text-xs font-bold">Waktu:</span>
            </div>
            <div className="text-sm sm:text-base font-bold font-mono text-[#512da8] dark:text-purple-300 tracking-wider">
              {currentHour} : {currentMinute} <span className="text-xs font-sans font-medium text-neutral-500 dark:text-neutral-400">WIB</span>
            </div>
          </div>

          {/* Kolom Pemilih Jam & Menit Scrollable */}
          <div className="grid grid-cols-2 gap-2 text-center">
            <div>
              <span className="block text-[10px] font-bold text-neutral-400 dark:text-neutral-500 mb-1 uppercase tracking-wider">
                Jam (00-23)
              </span>
              <div className="h-32 overflow-y-auto rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/50 p-1 space-y-1">
                {hoursList.map((h) => {
                  const isSelected = h === currentHour
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => handleSelectHour(h)}
                      className={cn(
                        "w-full py-1 rounded text-xs font-medium transition cursor-pointer font-mono",
                        isSelected
                          ? "bg-[#512da8] text-white font-bold shadow-2xs dark:bg-[#512da8]"
                          : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                      )}
                    >
                      {h}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <span className="block text-[10px] font-bold text-neutral-400 dark:text-neutral-500 mb-1 uppercase tracking-wider">
                Menit (00-59)
              </span>
              <div className="h-32 overflow-y-auto rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/50 p-1 space-y-1">
                {minutesList.map((m) => {
                  const isSelected = m === currentMinute
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleSelectMinute(m)}
                      className={cn(
                        "w-full py-1 rounded text-xs font-medium transition cursor-pointer font-mono",
                        isSelected
                          ? "bg-[#512da8] text-white font-bold shadow-2xs dark:bg-[#512da8]"
                          : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                      )}
                    >
                      {m}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Footer Aksi Sederhana (Tanpa shortcut shift klinis, hanya reset jam sekarang & tutup) */}
          <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
            {showNowButton ? (
              <button
                type="button"
                onClick={handleSetCurrentTime}
                className="text-[11px] font-bold text-[#512da8] dark:text-purple-400 hover:underline cursor-pointer"
              >
                Jam Sekarang
              </button>
            ) : <div />}

            <button
              type="button"
              onClick={() => {
                setIsOpen(false)
                triggerRef.current?.focus()
              }}
              className="px-2.5 py-1 rounded-lg bg-[#512da8] text-white text-[11px] font-bold hover:bg-[#4527a0] transition cursor-pointer shadow-2xs"
            >
              Selesai
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

