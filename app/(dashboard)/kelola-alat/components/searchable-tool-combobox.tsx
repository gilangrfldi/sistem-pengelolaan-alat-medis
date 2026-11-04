"use client"

import React, { useState, useRef, useEffect, useMemo } from "react"
import { Search, ChevronDown, Check, X, Stethoscope, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { MasterTool } from "@/lib/types/tool"

interface SearchableToolComboboxProps {
  category: "waktu" | "kali"
  tools: MasterTool[]
  value: string
  onChange: (toolName: string) => void
  label?: string
  required?: boolean
}

export function SearchableToolCombobox({
  category,
  tools,
  value,
  onChange,
  label,
}: SearchableToolComboboxProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Filter alat berdasarkan kategori
  const categoryTools = useMemo(
    () => tools.filter((m) => m.category === category),
    [tools, category]
  )

  // Filter alat berdasarkan query pencarian pengguna
  const filteredTools = useMemo(() => {
    if (!searchQuery.trim()) return categoryTools
    const q = searchQuery.toLowerCase().trim()
    return categoryTools.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.applicableLocations && m.applicableLocations.some((loc: string) => loc.toLowerCase().includes(q)))
    )
  }, [categoryTools, searchQuery])

  // Menutup dropdown popover saat pengguna mengklik di luar area combobox
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSearchQuery("")
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSelectTool = (toolName: string) => {
    onChange(toolName)
    setIsOpen(false)
    setSearchQuery("")
    if (inputRef.current) {
      inputRef.current.blur()
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {label && (
        <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1.5">
          {label}
        </label>
      )}

      {/* Input Field: Langsung bisa diketik untuk mencari alat */}
      <div className="relative flex items-center">
        <div className="absolute left-3 flex items-center pointer-events-none text-muted-foreground">
          {isOpen ? (
            <Search className="size-4 text-[#512da8] dark:text-purple-400" />
          ) : (
            <Stethoscope className="size-4 text-neutral-400" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          data-slot="combobox-tool-input"
          aria-label={label || "Pilih alat medis"}
          value={isOpen ? searchQuery : value}
          placeholder="Cari atau pilih alat medis..."
          onFocus={() => {
            setIsOpen(true)
            setSearchQuery("")
            setHighlightedIndex(0)
          }}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setHighlightedIndex(0)
            if (!isOpen) setIsOpen(true)
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setIsOpen(false)
              setSearchQuery("")
            } else if (e.key === "ArrowDown") {
              e.preventDefault()
              if (!isOpen) {
                setIsOpen(true)
              } else {
                setHighlightedIndex((prev) => (prev + 1 < filteredTools.length ? prev + 1 : 0))
              }
            } else if (e.key === "ArrowUp") {
              e.preventDefault()
              if (isOpen) {
                setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredTools.length - 1))
              }
            } else if (e.key === "Enter") {
              if (isOpen && filteredTools.length > 0 && filteredTools[highlightedIndex]) {
                e.preventDefault()
                handleSelectTool(filteredTools[highlightedIndex].name)
              }
            }
          }}
          className={cn(
            "w-full h-11 pl-9 pr-16 text-xs sm:text-sm font-medium rounded-xl border bg-white dark:bg-neutral-800 transition cursor-pointer shadow-2xs",
            isOpen
              ? "border-[#512da8] ring-2 ring-[#512da8]/20 dark:ring-purple-900/40 text-neutral-900 dark:text-neutral-100"
              : "border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:border-neutral-400"
          )}
        />

        {/* Tombol Clear Search & Toggle Chevron */}
        <div className="absolute right-2.5 flex items-center gap-1">
          {isOpen && searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("")
                inputRef.current?.focus()
              }}
              className="p-1 rounded-md text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            onClick={() => {
              if (isOpen) {
                setIsOpen(false)
                setSearchQuery("")
              } else {
                setIsOpen(true)
                inputRef.current?.focus()
              }
            }}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
          >
            <ChevronDown
              className={cn("size-4 transition-transform duration-200", isOpen && "rotate-180 text-[#512da8]")}
            />
          </button>
        </div>
      </div>

      {/* Select tersembunyi untuk aksesibilitas & kompatibilitas pengujian E2E */}
      <select
        aria-hidden="true"
        tabIndex={-1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only pointer-events-none"
      >
        {categoryTools.map((m) => (
          <option key={m.id} value={m.name}>
            {m.name}
          </option>
        ))}
      </select>

      {/* Popover Dropdown Hasil Pencarian dengan batas ketinggian max-h-56 */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">
          <div className="p-2 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 px-3 border-b border-neutral-100 dark:border-neutral-700/60 bg-neutral-50/80 dark:bg-neutral-800/80 flex justify-between items-center">
            <span>Daftar Alat {category === "kali" ? "Hitungan Kali" : "Hitungan Waktu"}</span>
            <span className="text-[10px] bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded-full font-bold">
              {filteredTools.length} alat
            </span>
          </div>

          <div className="max-h-56 overflow-y-auto p-1.5 space-y-1 divide-y divide-neutral-100 dark:divide-neutral-800/60">
            {filteredTools.length === 0 ? (
              <div className="p-4 text-center text-xs text-neutral-500 dark:text-neutral-400 flex flex-col items-center gap-1.5">
                <AlertCircle className="size-5 text-neutral-400" />
                <span>Tidak ditemukan alat medis yang cocok dengan &quot;{searchQuery}&quot;</span>
              </div>
            ) : (
              filteredTools.map((tool, index) => {
                const isSelected = tool.name === value
                const isHighlighted = highlightedIndex === index
                return (
                  <button
                    key={tool.id}
                    type="button"
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      handleSelectTool(tool.name)
                    }}
                    className={cn(
                      "w-full px-3 py-2.5 rounded-lg text-left text-xs sm:text-sm font-medium flex items-center justify-between transition cursor-pointer gap-2",
                      isSelected
                        ? "bg-[#512da8]/10 text-[#512da8] font-bold dark:bg-purple-950/40 dark:text-purple-300"
                        : isHighlighted
                        ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                        : "hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200"
                    )}
                  >
                    <div className="flex flex-col gap-0.5 truncate">
                      <span className="truncate">{tool.name}</span>
                      <span className="text-[10px] text-muted-foreground font-normal">
                        {tool.category === "kali"
                          ? "Tindakan Medis (Frekuensi)"
                          : tool.hasUnitNumber
                          ? `Unit #${tool.unitStartNumber || 1} - #${tool.unitEndNumber || tool.totalUnits}`
                          : tool.totalUnits > 0
                          ? `${tool.totalUnits} Unit Ruangan`
                          : "Sentral / Bebas Kuota"}
                      </span>
                    </div>
                    {isSelected && <Check className="size-4 text-[#512da8] dark:text-purple-400 shrink-0" />}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
