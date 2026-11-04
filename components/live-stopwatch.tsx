"use client"

import { useState, useEffect, useSyncExternalStore } from "react"
import { cn } from "cn"

interface LiveStopwatchProps {
  startedAtTimestamp?: number | string | null
  startTimeStr?: string | null
  className?: string
  showIcon?: boolean
}

// Hook resmi React untuk mendeteksi client mount secara aman tanpa memicu cascading render
const subscribe = () => () => {}
const getClientSnapshot = () => true
const getServerSnapshot = () => false

function useIsMounted(): boolean {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot)
}

export function calculateElapsedSeconds(
  startedAtTimestamp?: number | string | null,
  startTimeStr?: string | null
): number {
  let ts: number | null = null

  if (startedAtTimestamp) {
    const num = Number(startedAtTimestamp)
    if (!isNaN(num) && num > 0) {
      ts = num
    } else {
      const parsed = new Date(String(startedAtTimestamp)).getTime()
      if (!isNaN(parsed) && parsed > 0) ts = parsed
    }
  }

  // Jika timestamp valid, hitung selisih dari Date.now()
  if (ts && ts > 0) {
    return Math.max(0, Math.floor((Date.now() - ts) / 1000))
  }

  // Fallback: hitung selisih dari jam mulai (format HH:mm) hari ini
  if (startTimeStr) {
    const cleanTime = startTimeStr.replace(/[^0-9:]/g, "").trim()
    const [sh, sm] = cleanTime.split(":").map(Number)
    if (!isNaN(sh) && !isNaN(sm)) {
      const now = new Date()
      const start = new Date(now)
      start.setHours(sh, sm, 0, 0)
      if (start.getTime() > now.getTime()) {
        // Jika jam mulai lebih besar dari jam sekarang, asumsikan mulai kemarin malam
        start.setDate(start.getDate() - 1)
      }
      return Math.max(0, Math.floor((now.getTime() - start.getTime()) / 1000))
    }
  }

  return 0
}

export function formatStopwatch(totalSeconds: number): string {
  const days = Math.floor(totalSeconds / 86400)
  const remDays = totalSeconds % 86400
  const hours = Math.floor(remDays / 3600)
  const remHours = remDays % 3600
  const minutes = Math.floor(remHours / 60)
  const seconds = remHours % 60

  const pad = (n: number) => String(n).padStart(2, "0")

  if (days > 0) {
    return `${days} hari ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  }
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

export function LiveStopwatch({
  startedAtTimestamp,
  startTimeStr,
  className,
  showIcon = true,
}: LiveStopwatchProps) {
  const isMounted = useIsMounted()
  const [seconds, setSeconds] = useState<number>(() =>
    calculateElapsedSeconds(startedAtTimestamp, startTimeStr)
  )

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds(calculateElapsedSeconds(startedAtTimestamp, startTimeStr))
    }, 1000)

    return () => clearInterval(timer)
  }, [startedAtTimestamp, startTimeStr])

  const timeString = isMounted ? formatStopwatch(seconds) : "00:00:00"

  return (
    <span
      suppressHydrationWarning
      className={cn(
        "font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-800 inline-flex items-center gap-1.5 text-xs shadow-2xs",
        className
      )}
      title={`Durasi aktif berjalan: ${timeString}`}
    >
      {showIcon && (
        <span className="size-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
      )}
      <span suppressHydrationWarning>{timeString}</span>
    </span>
  )
}

export function getStartDateStr(
  startedAtTimestamp?: number | string | null,
  shiftKey?: string | null
): string {
  let ts: number | null = null
  if (startedAtTimestamp) {
    const num = Number(startedAtTimestamp)
    if (!isNaN(num) && num > 0) {
      ts = num
    } else {
      const parsed = new Date(String(startedAtTimestamp)).getTime()
      if (!isNaN(parsed) && parsed > 0) ts = parsed
    }
  }

  if (ts && ts > 0) {
    const d = new Date(ts)
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, "0")
      const month = String(d.getMonth() + 1).padStart(2, "0")
      const year = d.getFullYear()
      return `${day}-${month}-${year}`
    }
  }

  if (shiftKey) {
    const parts = shiftKey.split("-")
    if (parts.length >= 3) {
      const year = parts[0]
      const month = parts[1]
      const day = parts[2]
      if (day.length === 2 && month.length === 2) {
        return `${day}-${month}-${year}`
      }
    }
  }

  const now = new Date()
  const day = String(now.getDate()).padStart(2, "0")
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const year = now.getFullYear()
  return `${day}-${month}-${year}`
}
