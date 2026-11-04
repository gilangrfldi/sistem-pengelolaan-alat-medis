"use client"

import * as React from "react"
import { DatePicker } from "@/components/date-picker"
import { AppSelect } from "@/components/ui/app-select"
import { Skeleton } from "@/components/ui/skeleton"

export function BerandaFilters() {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    () => new Date()
  )
  const [shift, setShift] = React.useState<string>("Semua")

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="w-52">
        <DatePicker date={selectedDate} onDateChange={setSelectedDate} />
      </div>

      <div className="w-48">
        <AppSelect
          value={shift}
          onChange={(val) => setShift(val)}
          options={[
            { value: "Semua", label: "Semua Shift", description: "24 Jam Operasional" },
            { value: "Pagi", label: "Pagi (07.00 - 14.00)", description: "Shift 1" },
            { value: "Siang", label: "Siang (14.00 - 21.00)", description: "Shift 2" },
            { value: "Malam", label: "Malam (21.00 - 07.00)", description: "Shift 3" },
          ]}
          headerTitle="Pilihan Shift"
          placeholder="Pilih Shift"
          aria-label="Pilih Shift"
        />
      </div>
    </div>
  )
}

export function BerandaFiltersSkeleton() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Skeleton className="h-10 w-[200px] rounded-xl" />
      <Skeleton className="h-10 w-48 rounded-xl" />
    </div>
  )
}
