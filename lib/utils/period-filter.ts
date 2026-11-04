// ==============================================================================
// UTILITAS FILTER PERIODE REKAP (HARIAN, MINGGUAN, BULANAN, TRIWULAN)
// ==============================================================================

export type FilterPeriodType = "harian" | "mingguan" | "bulanan" | "triwulan"

export interface PeriodFilterState {
  periodType: FilterPeriodType
  // Harian: tanggal dalam format "YYYY-MM-DD"
  selectedDate: string
  // Mingguan: tanggal awal minggu "YYYY-MM-DD"
  selectedWeekStart: string
  // Bulanan: bulan (1-12) dan tahun
  selectedMonth: number
  selectedYear: number
  // Triwulan: kuartal (1-4) dan tahun
  selectedQuarter: number
}

export const MONTH_NAMES_ID = [
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

export const QUARTER_NAMES_ID = [
  { q: 1, label: "Triwulan I (Jan - Mar)", months: [1, 2, 3] },
  { q: 2, label: "Triwulan II (Apr - Jun)", months: [4, 5, 6] },
  { q: 3, label: "Triwulan III (Jul - Sep)", months: [7, 8, 9] },
  { q: 4, label: "Triwulan IV (Okt - Des)", months: [10, 11, 12] },
]

/**
 * Parsing string tanggal berbagai format (DD-MM-YYYY, YYYY-MM-DD, ISO, timestamp) menjadi Date valid
 */
export function parseAnyDate(raw: string | number | Date | null | undefined): Date | null {
  if (!raw) return null
  if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw

  if (typeof raw === "number") {
    const d = new Date(raw)
    return isNaN(d.getTime()) ? null : d
  }

  const str = String(raw).trim()

  // Ekstrak pola DD-MM-YYYY jika berada di dalam teks (misal: "28-10-2026" atau "14:20 WIB (30-10-2026)")
  const dmyMatch = str.match(/(\d{2})-(\d{2})-(\d{4})/)
  if (dmyMatch) {
    const day = Number(dmyMatch[1])
    const month = Number(dmyMatch[2])
    const year = Number(dmyMatch[3])
    return new Date(year, month - 1, day, 12, 0, 0)
  }

  // Ekstrak pola YYYY-MM-DD jika berada di dalam teks (misal: "2026-10-28" atau "2026-10-30-malam")
  const ymdMatch = str.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (ymdMatch) {
    const year = Number(ymdMatch[1])
    const month = Number(ymdMatch[2])
    const day = Number(ymdMatch[3])
    return new Date(year, month - 1, day, 12, 0, 0)
  }

  // Coba parse ISO atau standar
  const d = new Date(str)
  if (!isNaN(d.getTime())) return d

  // Jika hanya berupa jam (misal: "23:25 WIB" atau "23:25"), gunakan tanggal hari ini
  const timeOnlyMatch = str.match(/^(\d{1,2})[:.](\d{2})/i)
  if (timeOnlyMatch) {
    const now = new Date()
    const hours = Number(timeOnlyMatch[1])
    const minutes = Number(timeOnlyMatch[2])
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0)
  }

  return null
}

/**
 * Format Date ke string "YYYY-MM-DD"
 */
export function formatYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/**
 * Mengambil tanggal awal minggu (Senin) dari suatu tanggal
 */
export function getMondayOfWeek(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
  date.setDate(diff)
  date.setHours(0, 0, 0, 0)
  return date
}

export const DEFAULT_PERIOD_FILTER_STATE: PeriodFilterState = {
  periodType: "bulanan",
  selectedDate: "2026-11-01",
  selectedWeekStart: "2026-10-26",
  selectedMonth: 11,
  selectedYear: 2026,
  selectedQuarter: 4,
}

/**
 * Membuat initial state filter periode yang stabil dan deterministik untuk SSR / Prerender
 */
export function getInitialPeriodFilterState(): PeriodFilterState {
  return DEFAULT_PERIOD_FILTER_STATE
}

/**
 * Mendapatkan state periode terkini berdasarkan waktu lokal perangkat pengguna
 */
export function getCurrentClientPeriodFilterState(): PeriodFilterState {
  const now = new Date()
  const monday = getMondayOfWeek(now)
  const month = now.getMonth() + 1
  const quarter = Math.ceil(month / 3)

  return {
    periodType: "bulanan",
    selectedDate: formatYmd(now),
    selectedWeekStart: formatYmd(monday),
    selectedMonth: month,
    selectedYear: Math.max(2026, now.getFullYear()),
    selectedQuarter: quarter,
  }
}

/**
 * Menghitung rentang tanggal (start & end) berdasarkan PeriodFilterState
 */
export function getPeriodRange(state: PeriodFilterState): {
  start: Date
  end: Date
  label: string
} {
  const { periodType, selectedDate, selectedWeekStart, selectedMonth, selectedYear, selectedQuarter } = state

  if (periodType === "harian") {
    const parsed = parseAnyDate(selectedDate) || new Date()
    const start = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 0, 0, 0, 0)
    const end = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 23, 59, 59, 999)
    const label = `Harian (${start.getDate()} ${MONTH_NAMES_ID[start.getMonth()]} ${start.getFullYear()})`
    return { start, end, label }
  }

  if (periodType === "mingguan") {
    const monday = parseAnyDate(selectedWeekStart) || getMondayOfWeek(new Date())
    const start = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate(), 0, 0, 0, 0)
    const sunday = new Date(start)
    sunday.setDate(start.getDate() + 6)
    const end = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate(), 23, 59, 59, 999)
    const label = `Mingguan (${start.getDate()} ${MONTH_NAMES_ID[start.getMonth()].slice(0, 3)} - ${sunday.getDate()} ${MONTH_NAMES_ID[sunday.getMonth()]} ${sunday.getFullYear()})`
    return { start, end, label }
  }

  if (periodType === "triwulan") {
    const qIndex = Math.max(1, Math.min(4, selectedQuarter))
    const startMonth = (qIndex - 1) * 3 // 0, 3, 6, 9
    const endMonth = startMonth + 2 // 2, 5, 8, 11

    const start = new Date(selectedYear, startMonth, 1, 0, 0, 0, 0)
    // Hari terakhir bulan akhir kuartal
    const lastDay = new Date(selectedYear, endMonth + 1, 0).getDate()
    const end = new Date(selectedYear, endMonth, lastDay, 23, 59, 59, 999)

    const qLabel = QUARTER_NAMES_ID.find((q) => q.q === qIndex)?.label || `Triwulan ${qIndex}`
    const label = `${qLabel} ${selectedYear}`
    return { start, end, label }
  }

  // Bulanan (default)
  const monthIdx = Math.max(0, Math.min(11, selectedMonth - 1))
  const start = new Date(selectedYear, monthIdx, 1, 0, 0, 0, 0)
  const lastDay = new Date(selectedYear, monthIdx + 1, 0).getDate()
  const end = new Date(selectedYear, monthIdx, lastDay, 23, 59, 59, 999)
  const label = `Bulan ${MONTH_NAMES_ID[monthIdx]} ${selectedYear}`

  return { start, end, label }
}

/**
 * Mengecek apakah suatu tanggal masuk ke dalam rentang periode yang aktif
 */
export function isDateWithinPeriod(
  dateInput: string | number | Date | null | undefined,
  state: PeriodFilterState
): boolean {
  const d = parseAnyDate(dateInput)
  if (!d) return false

  const { start, end } = getPeriodRange(state)
  const time = d.getTime()
  return time >= start.getTime() && time <= end.getTime()
}

/**
 * Mengecek apakah state periode yang dipilih berada di masa depan (melebihi waktu saat ini)
 */
export function isPeriodInFuture(state: PeriodFilterState): boolean {
  const now = new Date()
  const todayYmd = formatYmd(now)

  if (state.periodType === "harian") {
    return state.selectedDate > todayYmd
  }

  if (state.periodType === "mingguan") {
    const curMondayYmd = formatYmd(getMondayOfWeek(now))
    return state.selectedWeekStart > curMondayYmd
  }

  if (state.periodType === "bulanan") {
    const curYear = now.getFullYear()
    const curMonth = now.getMonth() + 1
    return (
      state.selectedYear > curYear ||
      (state.selectedYear === curYear && state.selectedMonth > curMonth)
    )
  }

  if (state.periodType === "triwulan") {
    const curYear = now.getFullYear()
    const curQuarter = Math.ceil((now.getMonth() + 1) / 3)
    return (
      state.selectedYear > curYear ||
      (state.selectedYear === curYear && state.selectedQuarter > curQuarter)
    )
  }

  return false
}

/**
 * Ekstrak jam (0-23) dari string waktu (misal: "08:15 WIB", "14:20", "23:05")
 */
export function extractHourFromTimeStr(timeStr?: string | null): number | null {
  if (!timeStr) return null
  const m = timeStr.match(/(\d{1,2})[:.](\d{2})/)
  if (m) {
    const h = Number(m[1])
    if (!isNaN(h) && h >= 0 && h <= 23) return h
  }
  return null
}

/**
 * Cek apakah jam tertentu masuk dalam shift
 * Pagi: 07.00 - 13.59 (7 <= h < 14)
 * Siang: 14.00 - 20.59 (14 <= h < 21)
 * Malam: 21.00 - 06.59 (h >= 21 || h < 7)
 */
export function isHourInShift(hour: number, shift: string): boolean {
  const s = shift.toLowerCase()
  if (s === "semua") return true
  if (s.includes("pagi")) return hour >= 7 && hour < 14
  if (s.includes("siang")) return hour >= 14 && hour < 21
  if (s.includes("malam")) return hour >= 21 || hour < 7
  return true
}

