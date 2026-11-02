"use client"

import * as React from "react"
import { DatePicker } from "@/components/date-picker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

export function BerandaFilters() {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    () => new Date()
  )
  const [shift, setShift] = React.useState<string>("Semua")

  return (
    <div className="flex flex-wrap items-center gap-3">
      <DatePicker date={selectedDate} onDateChange={setSelectedDate} />

      <Select
        value={shift}
        onValueChange={(val) => {
          if (val) setShift(val)
        }}
      >
        <SelectTrigger className="w-48 h-9 text-xs sm:text-sm">
          <SelectValue placeholder="Pilih Shift" />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false} align="start" className="w-48 min-w-48">
          <SelectItem value="Semua">Semua Shift</SelectItem>
          <SelectItem value="Pagi">Pagi (07.00 - 14.00)</SelectItem>
          <SelectItem value="Siang">Siang (14.00 - 21.00)</SelectItem>
          <SelectItem value="Malam">Malam (21.00 - 07.00)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

export function BerandaFiltersSkeleton() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Skeleton className="h-9 w-[200px]" />
      <Skeleton className="h-9 w-36" />
    </div>
  )
}

