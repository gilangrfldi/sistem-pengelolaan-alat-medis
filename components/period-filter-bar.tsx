"use client"

import * as React from "react"
import { Calendar, Filter, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  FilterPeriodType,
  PeriodFilterState,
  MONTH_NAMES_ID,
  QUARTER_NAMES_ID,
  getPeriodRange,
  formatYmd,
  parseAnyDate,
  getMondayOfWeek,
} from "@/lib/utils/period-filter"

export interface PeriodFilterBarProps {
  value: PeriodFilterState
  onChange: (next: PeriodFilterState) => void
  className?: string
  rightAction?: React.ReactNode
}

export function PeriodFilterBar({ value, onChange, className, rightAction }: PeriodFilterBarProps) {
  const { periodType, selectedDate, selectedWeekStart, selectedMonth, selectedYear, selectedQuarter } = value
  const { label: activePeriodLabel } = getPeriodRange(value)

  const baseYear = value.selectedYear || 2026
  const yearOptions = [baseYear - 2, baseYear - 1, baseYear, baseYear + 1]

  const handlePeriodTypeChange = (type: FilterPeriodType) => {
    onChange({ ...value, periodType: type })
  }

  // Navigasi cepat maju/mundur
  const handleStepPeriod = (direction: -1 | 1) => {
    if (periodType === "harian") {
      const d = parseAnyDate(selectedDate) || new Date()
      d.setDate(d.getDate() + direction)
      onChange({ ...value, selectedDate: formatYmd(d) })
    } else if (periodType === "mingguan") {
      const d = parseAnyDate(selectedWeekStart) || getMondayOfWeek(new Date())
      d.setDate(d.getDate() + direction * 7)
      onChange({ ...value, selectedWeekStart: formatYmd(d) })
    } else if (periodType === "bulanan") {
      let nextMonth = selectedMonth + direction
      let nextYear = selectedYear
      if (nextMonth < 1) {
        nextMonth = 12
        nextYear -= 1
      } else if (nextMonth > 12) {
        nextMonth = 1
        nextYear += 1
      }
      onChange({ ...value, selectedMonth: nextMonth, selectedYear: nextYear })
    } else if (periodType === "triwulan") {
      let nextQ = selectedQuarter + direction
      let nextYear = selectedYear
      if (nextQ < 1) {
        nextQ = 4
        nextYear -= 1
      } else if (nextQ > 4) {
        nextQ = 1
        nextYear += 1
      }
      onChange({ ...value, selectedQuarter: nextQ, selectedYear: nextYear })
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 p-3.5 sm:p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xs",
        className
      )}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Tab 4 Pilihan Filter Periode - Responsif Mobile Grid 4 Kolom & Desktop Flex */}
        <div className="grid grid-cols-4 sm:flex items-center gap-1 sm:gap-1.5 p-1 bg-neutral-100 dark:bg-neutral-800/60 rounded-xl select-none w-full sm:w-fit">
          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-muted-foreground mr-1">
            <Filter className="size-3.5" />
            <span>Periode:</span>
          </div>

          <button
            type="button"
            onClick={() => handlePeriodTypeChange("harian")}
            className={cn(
              "px-2 sm:px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer text-center truncate",
              periodType === "harian"
                ? "bg-[#512da8] text-white shadow-xs"
                : "text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white"
            )}
          >
            Harian
          </button>

          <button
            type="button"
            onClick={() => handlePeriodTypeChange("mingguan")}
            className={cn(
              "px-2 sm:px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer text-center truncate",
              periodType === "mingguan"
                ? "bg-[#512da8] text-white shadow-xs"
                : "text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white"
            )}
          >
            Mingguan
          </button>

          <button
            type="button"
            onClick={() => handlePeriodTypeChange("bulanan")}
            className={cn(
              "px-2 sm:px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer text-center truncate",
              periodType === "bulanan"
                ? "bg-[#512da8] text-white shadow-xs"
                : "text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white"
            )}
          >
            Bulanan
          </button>

          <button
            type="button"
            onClick={() => handlePeriodTypeChange("triwulan")}
            className={cn(
              "px-2 sm:px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer text-center truncate",
              periodType === "triwulan"
                ? "bg-[#512da8] text-white shadow-xs"
                : "text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white"
            )}
          >
            Triwulan
          </button>
        </div>

        {/* Tombol Aksi Kanan (seperti Tombol Download CSV atau Filter Shift) */}
        {rightAction && <div className="w-full md:w-auto shrink-0">{rightAction}</div>}
      </div>

      {/* Kontrol Spesifik Sesuai Periode yang Aktif - Responsif Mobile & Desktop */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2.5 border-t border-neutral-100 dark:border-neutral-800 text-xs">
        <div className="flex items-center justify-between sm:justify-start gap-1.5 sm:gap-2 w-full sm:w-auto">
          {/* Tombol Step Mundur */}
          <button
            type="button"
            onClick={() => handleStepPeriod(-1)}
            title="Mundur 1 Periode"
            className="size-8 shrink-0 flex items-center justify-center rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 cursor-pointer transition-colors"
          >
            <ChevronLeft className="size-4" />
          </button>

          {/* 1. KONTROL HARIAN */}
          {periodType === "harian" && (
            <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
              <label className="text-[11px] font-semibold text-muted-foreground hidden md:inline">Pilih Tanggal:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => onChange({ ...value, selectedDate: e.target.value })}
                className="h-8.5 px-2.5 sm:px-3 w-full sm:w-auto rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#512da8]"
              />
            </div>
          )}

          {/* 2. KONTROL MINGGUAN */}
          {periodType === "mingguan" && (
            <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
              <label className="text-[11px] font-semibold text-muted-foreground hidden md:inline">Mulai Senin:</label>
              <input
                type="date"
                value={selectedWeekStart}
                onChange={(e) => {
                  const picked = parseAnyDate(e.target.value) || new Date()
                  const monday = getMondayOfWeek(picked)
                  onChange({ ...value, selectedWeekStart: formatYmd(monday) })
                }}
                className="h-8.5 px-2.5 sm:px-3 w-full sm:w-auto rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#512da8]"
              />
            </div>
          )}

          {/* 3. KONTROL BULANAN */}
          {periodType === "bulanan" && (
            <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
              <select
                value={selectedMonth}
                onChange={(e) => onChange({ ...value, selectedMonth: Number(e.target.value) })}
                className="h-8.5 px-2 sm:px-3 flex-1 sm:flex-initial rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#512da8] cursor-pointer"
              >
                {MONTH_NAMES_ID.map((name, idx) => (
                  <option key={name} value={idx + 1}>
                    {name}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => onChange({ ...value, selectedYear: Number(e.target.value) })}
                className="h-8.5 px-2 sm:px-3 w-20 sm:w-auto rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#512da8] cursor-pointer"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 4. KONTROL TRIWULAN */}
          {periodType === "triwulan" && (
            <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
              <select
                value={selectedQuarter}
                onChange={(e) => onChange({ ...value, selectedQuarter: Number(e.target.value) })}
                className="h-8.5 px-2 sm:px-3 flex-1 sm:flex-initial rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#512da8] cursor-pointer"
              >
                {QUARTER_NAMES_ID.map((q) => (
                  <option key={q.q} value={q.q}>
                    {q.label}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => onChange({ ...value, selectedYear: Number(e.target.value) })}
                className="h-8.5 px-2 sm:px-3 w-20 sm:w-auto rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#512da8] cursor-pointer"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tombol Step Maju */}
          <button
            type="button"
            onClick={() => handleStepPeriod(1)}
            title="Maju 1 Periode"
            className="size-8 shrink-0 flex items-center justify-center rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 cursor-pointer transition-colors"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        {/* Badge Periode Terpilih */}
        <div className="flex items-center justify-center sm:justify-end gap-1.5 text-muted-foreground font-medium text-[11px] sm:text-xs bg-neutral-50 dark:bg-neutral-800/40 sm:bg-transparent py-1.5 px-2.5 sm:p-0 rounded-lg">
          <Calendar className="size-3.5 text-[#512da8] shrink-0" />
          <span className="truncate">
            Rentang Aktif: <strong className="text-neutral-900 dark:text-neutral-100 font-semibold">{activePeriodLabel}</strong>
          </span>
        </div>
      </div>
    </div>
  )
}
