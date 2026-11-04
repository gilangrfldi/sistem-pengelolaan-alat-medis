"use client"

import React, { useState, useRef, useEffect, useId, useMemo } from "react"
import { Calendar as CalendarIcon, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export interface AppDatePickerProps {
  value: string // Format ISO 'YYYY-MM-DD'
  onChange: (dateStr: string) => void
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
}

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
]

const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]

function padZero(num: number): string {
  return num < 10 ? `0${num}` : `${num}`
}

export function AppDatePicker({
  value,
  onChange,
  label,
  placeholder = "Pilih tanggal...",
  className,
  triggerClassName,
  required = false,
  disabled = false,
  id,
  name,
  "aria-label": ariaLabel,
  size = "md",
}: AppDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const generatedId = useId()
  const inputId = id || generatedId

  // Parsing tanggal terpilih
  const selectedDate = useMemo(() => {
    if (!value) return null
    const parts = value.split("-")
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10)
      const m = parseInt(parts[1], 10) - 1
      const d = parseInt(parts[2], 10)
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return new Date(y, m, d)
      }
    }
    const parsed = new Date(value)
    return isNaN(parsed.getTime()) ? null : parsed
  }, [value])

  // Bulan & Tahun yang sedang ditampilkan di kalender
  const [viewDate, setViewDate] = useState<Date>(() => selectedDate || new Date())

  useEffect(() => {
    if (selectedDate) {
      setViewDate(selectedDate)
    }
  }, [selectedDate])

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

  // Format tampilan trigger: DD/MM/YYYY atau kosong
  const displayFormatted = useMemo(() => {
    if (!selectedDate) return ""
    const d = padZero(selectedDate.getDate())
    const m = padZero(selectedDate.getMonth() + 1)
    const y = selectedDate.getFullYear()
    return `${d}/${m}/${y}`
  }, [selectedDate])

  const isToday = useMemo(() => {
    if (!selectedDate) return false
    const today = new Date()
    return (
      selectedDate.getDate() === today.getDate() &&
      selectedDate.getMonth() === today.getMonth() &&
      selectedDate.getFullYear() === today.getFullYear()
    )
  }, [selectedDate])

  // Navigasi bulan
  const handlePrevMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  // Menghasilkan sel-sel hari untuk bulan aktif
  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear()
    const month = viewDate.getMonth()

    const firstDayIndex = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const daysInPrevMonth = new Date(year, month, 0).getDate()

    const days: Array<{
      dayNum: number
      dateStr: string
      isCurrentMonth: boolean
      isSelected: boolean
      isTodayCell: boolean
    }> = []

    // Hari dari bulan sebelumnya
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const prevD = daysInPrevMonth - i
      const prevM = month === 0 ? 12 : month
      const prevY = month === 0 ? year - 1 : year
      const dateStr = `${prevY}-${padZero(prevM)}-${padZero(prevD)}`
      days.push({
        dayNum: prevD,
        dateStr,
        isCurrentMonth: false,
        isSelected: value === dateStr,
        isTodayCell: false,
      })
    }

    // Hari di bulan ini
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${padZero(today.getMonth() + 1)}-${padZero(today.getDate())}`

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${padZero(month + 1)}-${padZero(d)}`
      days.push({
        dayNum: d,
        dateStr,
        isCurrentMonth: true,
        isSelected: value === dateStr,
        isTodayCell: dateStr === todayStr,
      })
    }

    // Hari di bulan berikutnya agar genap kelipatan 7
    const remaining = (7 - (days.length % 7)) % 7
    for (let d = 1; d <= remaining; d++) {
      const nextM = month === 11 ? 1 : month + 2
      const nextY = month === 11 ? year + 1 : year
      const dateStr = `${nextY}-${padZero(nextM)}-${padZero(d)}`
      days.push({
        dayNum: d,
        dateStr,
        isCurrentMonth: false,
        isSelected: value === dateStr,
        isTodayCell: false,
      })
    }

    return days
  }, [viewDate, value])

  const selectDate = (dateStr: string) => {
    onChange(dateStr)
    setIsOpen(false)
    triggerRef.current?.focus()
  }

  const setToday = () => {
    const today = new Date()
    const dateStr = `${today.getFullYear()}-${padZero(today.getMonth() + 1)}-${padZero(today.getDate())}`
    selectDate(dateStr)
  }

  const setYesterday = () => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    const dateStr = `${d.getFullYear()}-${padZero(d.getMonth() + 1)}-${padZero(d.getDate())}`
    selectDate(dateStr)
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
          "w-full rounded-xl border bg-white dark:bg-neutral-800 flex items-center justify-between gap-1.5 transition cursor-pointer shadow-2xs select-none",
          heightClass,
          isOpen
            ? "border-[#512da8] ring-2 ring-[#512da8]/20 dark:ring-purple-900/40 text-neutral-900 dark:text-neutral-100"
            : "border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:border-neutral-400 dark:hover:border-neutral-600",
          disabled && "opacity-50 cursor-not-allowed bg-neutral-100 dark:bg-neutral-900",
          triggerClassName
        )}
      >
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <CalendarIcon className="size-4 shrink-0 text-[#512da8] dark:text-purple-400" />
          <span className="font-semibold text-neutral-900 dark:text-neutral-100 font-mono text-xs sm:text-sm whitespace-nowrap">
            {displayFormatted || <span className="text-muted-foreground font-sans font-normal">{placeholder}</span>}
          </span>
        </div>

        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-neutral-400 transition-transform duration-200",
            isOpen && "rotate-180 text-[#512da8] dark:text-purple-400"
          )}
        />
      </button>

      {/* Hidden Native Input Date for E2E Tests and Form Submissions */}
      <input
        type="date"
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only pointer-events-none"
      />

      {/* Popover Kalender */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-50 bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-xl p-3.5 space-y-3 w-[280px] sm:w-[300px] animate-in fade-in-0 zoom-in-95 duration-100">
          {/* Header Kalender */}
          <div className="flex items-center justify-between px-1">
            <span className="font-bold text-xs sm:text-sm text-neutral-900 dark:text-neutral-100">
              {MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="size-7 rounded-lg border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <ChevronLeft className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="size-7 rounded-lg border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Grid Kalender */}
          <div>
            <div className="grid grid-cols-7 text-center text-[10px] font-bold text-neutral-400 dark:text-neutral-500 pb-1.5 border-b border-neutral-100 dark:border-neutral-800">
              {DAY_NAMES.map((d, i) => (
                <span key={d} className={cn(i === 0 && "text-rose-500")}>
                  {d}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 pt-1.5 text-xs text-center">
              {calendarDays.map((cell) => (
                <button
                  key={cell.dateStr}
                  type="button"
                  onClick={() => selectDate(cell.dateStr)}
                  className={cn(
                    "h-7.5 rounded-lg flex items-center justify-center font-medium transition cursor-pointer text-xs",
                    !cell.isCurrentMonth && "text-neutral-300 dark:text-neutral-600",
                    cell.isCurrentMonth && !cell.isSelected && "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800",
                    cell.isTodayCell && !cell.isSelected && "border border-[#512da8] text-[#512da8] font-bold",
                    cell.isSelected && "bg-[#512da8] text-white font-bold shadow-xs hover:bg-[#4527a0]"
                  )}
                >
                  {cell.dayNum}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Buttons Hari Ini & Kemarin */}
          <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={setToday}
                className="px-2 py-1 rounded-md bg-purple-50 text-[#512da8] font-semibold hover:bg-purple-100 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800 cursor-pointer"
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={setYesterday}
                className="px-2 py-1 rounded-md bg-neutral-50 text-neutral-600 hover:bg-neutral-100 border border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700 cursor-pointer"
              >
                Kemarin
              </button>
            </div>
            <span className="text-[10px] text-neutral-400 font-mono">WIB</span>
          </div>
        </div>
      )}
    </div>
  )
}

