export type ShiftType = "pagi" | "siang" | "malam"

export interface ShiftInfo {
  type: ShiftType
  name: string
  label: string
  timeRange: string
  nextShiftTime: string
  shiftKey: string
}

export const DEFAULT_SHIFT_INFO: ShiftInfo = {
  type: "pagi",
  name: "Pagi",
  label: "Shift Pagi",
  timeRange: "07.00 - 14.00 WIB",
  nextShiftTime: "14.00 WIB",
  shiftKey: "2026-10-30-pagi",
}

export function getShiftInfo(now: Date = new Date()): ShiftInfo {
  const hours = now.getHours()
  const minutes = now.getMinutes()
  const timeVal = hours + minutes / 60

  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  const dateStr = `${y}-${m}-${d}`

  if (timeVal >= 7 && timeVal < 14) {
    return {
      type: "pagi",
      name: "Pagi",
      label: "Shift Pagi",
      timeRange: "07.00 - 14.00 WIB",
      nextShiftTime: "14.00 WIB",
      shiftKey: `${dateStr}-pagi`,
    }
  } else if (timeVal >= 14 && timeVal < 21) {
    return {
      type: "siang",
      name: "Siang",
      label: "Shift Siang",
      timeRange: "14.00 - 21.00 WIB",
      nextShiftTime: "21.00 WIB",
      shiftKey: `${dateStr}-siang`,
    }
  } else {
    let shiftDateStr = dateStr
    if (timeVal < 7) {
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      const yy = yesterday.getFullYear()
      const mm = String(yesterday.getMonth() + 1).padStart(2, "0")
      const dd = String(yesterday.getDate()).padStart(2, "0")
      shiftDateStr = `${yy}-${mm}-${dd}`
    }

    return {
      type: "malam",
      name: "Malam",
      label: "Shift Malam",
      timeRange: "21.00 - 07.00 WIB",
      nextShiftTime: "07.00 WIB",
      shiftKey: `${shiftDateStr}-malam`,
    }
  }
}

export function getFormattedDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = d.getFullYear()
  return `${day}-${month}-${year}`
}

export function getFormattedTime(d: Date): string {
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  const ss = String(d.getSeconds()).padStart(2, "0")
  return `${hh}:${mm}:${ss}`
}

export function formatDuration(minutes: number): string {
  if (minutes < 1) return "< 1 menit"
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} menit`
  if (m === 0) return `${h} jam`
  return `${h} jam ${m} menit`
}

export function calculateMinutesDifference(startStr: string, endStr: string): number {
  const [sh, sm] = startStr.split(":").map(Number)
  const [eh, em] = endStr.split(":").map(Number)
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return 0
  let diff = eh * 60 + em - (sh * 60 + sm)
  if (diff < 0) diff += 24 * 60
  return diff
}

