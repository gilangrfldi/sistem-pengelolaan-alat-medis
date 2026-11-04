"use client"

// ==============================================================================
// UTILITAS EKSPOR CSV DAN RIWAYAT UNDUHAN
// ==============================================================================

export interface DownloadHistoryItem {
  id: string
  fileName: string
  category: "Rekap Pasien" | "Alat Terpasang" | "Alat Waktu" | "Alat Kali" | "Alat Rusak" | "Rekap Lengkap"
  periodType: "Harian" | "Mingguan" | "Bulanan" | "Triwulan"
  periodDetail: string
  totalRows: number
  fileSizeKb: number
  downloadedAt: string
  downloadedBy: string
}

const STORAGE_KEY = "sp_download_history"

/**
 * Menyimpan entri unduhan ke LocalStorage
 */
export function recordDownloadHistory(item: Omit<DownloadHistoryItem, "id" | "downloadedAt" | "downloadedBy">) {
  if (typeof window === "undefined") return

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const history: DownloadHistoryItem[] = raw ? JSON.parse(raw) : []
    const nurseName = localStorage.getItem("sp_nurse_name") || "Perawat HCU"

    const newEntry: DownloadHistoryItem = {
      ...item,
      id: `DL-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      downloadedAt: new Date().toISOString(),
      downloadedBy: nurseName,
    }

    const updated = [newEntry, ...history].slice(0, 100) // Simpan hingga 100 riwayat terakhir
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch (err) {
    console.warn("Gagal menyimpan riwayat unduhan:", err)
  }
}

/**
 * Ekspor array data menjadi file CSV dan trigger download di browser
 */
export function exportToCsv({
  fileName,
  headers,
  rows,
  category,
  periodType,
  periodDetail,
}: {
  fileName: string
  headers: string[]
  rows: (string | number | null | undefined)[][]
  category?: DownloadHistoryItem["category"]
  periodType?: DownloadHistoryItem["periodType"]
  periodDetail?: string
}) {
  if (typeof window === "undefined") return

  // Format cell CSV dengan sanitasi formula injection, tanda kutip, dan koma
  const formatCell = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return '""'
    let str = String(val)
    // Cegah CSV Formula Injection jika sel diawali karakter kendali spreadsheet
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`
    }
    str = str.replace(/"/g, '""')
    return `"${str}"`
  }

  // Gabungkan baris header dan data
  const csvContent = [
    headers.map(formatCell).join(","),
    ...rows.map((row) => row.map(formatCell).join(",")),
  ].join("\r\n")

  // Gunakan BOM (\uFEFF) agar Microsoft Excel pada Windows otomatis membaca UTF-8 dengan benar
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)

  const finalName = fileName.endsWith(".csv") ? fileName : `${fileName}.csv`

  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", finalName)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  // Catat riwayat jika kategori dan periode diisi
  if (category && periodType && periodDetail) {
    const fileSizeKb = Math.max(1, Math.round(blob.size / 1024))
    recordDownloadHistory({
      fileName: finalName,
      category,
      periodType,
      periodDetail,
      totalRows: rows.length,
      fileSizeKb,
    })
  }
}

