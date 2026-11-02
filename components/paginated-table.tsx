"use client"

import * as React from "react"
import { useState, useMemo } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "cn"

export interface TableColumn<T> {
  header: React.ReactNode
  className?: string
  render: (item: T, index: number) => React.ReactNode
}

export interface PaginatedTableProps<T> {
  data: T[]
  columns: TableColumn<T>[]
  keyExtractor: (item: T) => string
  defaultPageSize?: number
  pageSizeOptions?: number[]
  emptyMessage?: string
  entityLabel?: string
  className?: string
}

export function PaginatedTable<T>({
  data,
  columns,
  keyExtractor,
  defaultPageSize = 10,
  pageSizeOptions = [10, 25, 50],
  emptyMessage = "Tidak ada data yang tersedia.",
  entityLabel = "data",
  className,
}: PaginatedTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)

  const totalPages = Math.ceil(data.length / pageSize) || 1

  // Pastikan currentPage tidak melebihi totalPages jika data berkurang
  const validPage = Math.min(currentPage, totalPages)

  const paginatedData = useMemo(() => {
    const start = (validPage - 1) * pageSize
    return data.slice(start, start + pageSize)
  }, [data, validPage, pageSize])

  const startRecord = data.length === 0 ? 0 : (validPage - 1) * pageSize + 1
  const endRecord = Math.min(validPage * pageSize, data.length)

  return (
    <div className={cn("overflow-hidden flex flex-col", className)}>
      {/* Tabel dengan scroll horizontal responsif */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm min-w-[640px]">
          <thead className="bg-neutral-50 dark:bg-neutral-800/50 border-b text-muted-foreground font-semibold">
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className={cn("py-3 px-4", col.className)}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-8 text-center text-muted-foreground text-xs"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((item, idx) => (
                <tr
                  key={keyExtractor(item)}
                  className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 transition-colors"
                >
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className={cn("py-3.5 px-4", col.className)}>
                      {col.render(item, (validPage - 1) * pageSize + idx)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Paginasi */}
      <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground bg-white dark:bg-neutral-900">
        {/* Info Jumlah Data */}
        <div>
          <span>
            Menampilkan{" "}
            <strong className="text-foreground">{startRecord}</strong> -{" "}
            <strong className="text-foreground">{endRecord}</strong> dari{" "}
            <strong className="text-foreground">{data.length}</strong> {entityLabel}
          </span>
        </div>

        {/* Kontrol Paginasi & Pilihan Page Size */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span>Per halaman:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setCurrentPage(1)
              }}
              className="bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md px-2 py-1 text-xs cursor-pointer outline-none"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={validPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-border hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Halaman Sebelumnya"
            >
              <ChevronLeft className="size-4" />
            </button>

            <span className="px-2 font-medium">
              Halaman {validPage} dari {totalPages}
            </span>

            <button
              type="button"
              disabled={validPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-border hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Halaman Selanjutnya"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

