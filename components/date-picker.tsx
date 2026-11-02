"use client"

import * as React from "react"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"

import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  date: Date | undefined
  onDateChange: (date: Date | undefined) => void
  className?: string
}

export function DatePicker({ date, onDateChange, className }: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className={cn("w-[200px] h-9 justify-start text-left font-normal", className)}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            <span suppressHydrationWarning>
              {date ? (
                format(date, "d MMMM yyyy", { locale: id })
              ) : (
                <span className="text-muted-foreground">Pilih tanggal</span>
              )}
            </span>
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(selectedDate) => {
            if (selectedDate) {
              onDateChange(selectedDate)
              setOpen(false)
            }
          }}
          locale={id}
        />
      </PopoverContent>
    </Popover>
  )
}
