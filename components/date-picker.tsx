"use client"

import * as React from "react"
import { AppDatePicker } from "@/components/ui/app-date-picker"

interface DatePickerProps {
  date: Date | undefined
  onDateChange: (date: Date | undefined) => void
  className?: string
  placeholder?: string
  size?: "sm" | "md" | "lg"
}

function formatDateToIso(d?: Date): string {
  if (!d || isNaN(d.getTime())) return ""
  const year = d.getFullYear()
  const month = d.getMonth() + 1 < 10 ? `0${d.getMonth() + 1}` : `${d.getMonth() + 1}`
  const day = d.getDate() < 10 ? `0${d.getDate()}` : `${d.getDate()}`
  return `${year}-${month}-${day}`
}

function parseIsoToDate(str: string): Date | undefined {
  if (!str) return undefined
  const parts = str.split("-")
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10)
    const m = parseInt(parts[1], 10) - 1
    const d = parseInt(parts[2], 10)
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m, d)
    }
  }
  return undefined
}

export function DatePicker({
  date,
  onDateChange,
  className,
  placeholder = "Pilih tanggal...",
  size = "md",
}: DatePickerProps) {
  const isoStr = React.useMemo(() => formatDateToIso(date), [date])

  return (
    <AppDatePicker
      value={isoStr}
      onChange={(newIso) => {
        const parsed = parseIsoToDate(newIso)
        onDateChange(parsed)
      }}
      placeholder={placeholder}
      className={className}
      size={size}
    />
  )
}
