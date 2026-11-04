"use client"

import React, { useState, useRef, useEffect, useId } from "react"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface AppSelectOption {
  value: string
  label: string
  description?: string
}

export interface AppSelectProps {
  value: string
  onChange: (value: string) => void
  options: (AppSelectOption | string)[]
  placeholder?: string
  label?: string
  className?: string
  triggerClassName?: string
  icon?: React.ReactNode
  size?: "sm" | "md" | "lg"
  disabled?: boolean
  required?: boolean
  name?: string
  "aria-label"?: string
  headerTitle?: string
}

export function AppSelect({
  value,
  onChange,
  options,
  placeholder = "Pilih opsi...",
  label,
  className,
  triggerClassName,
  icon,
  size = "md",
  disabled = false,
  required = false,
  name,
  "aria-label": ariaLabel,
  headerTitle,
}: AppSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const uniqueId = useId()

  // Normalisasi opsi menjadi array AppSelectOption
  const normalizedOptions: AppSelectOption[] = options.map((opt) =>
    typeof opt === "string" ? { value: opt, label: opt } : opt
  )

  const selectedOption = normalizedOptions.find((opt) => opt.value === value)

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return
    if (e.key === "Escape") {
      setIsOpen(false)
      triggerRef.current?.focus()
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      if (!isOpen) {
        setIsOpen(true)
      } else {
        const currIndex = normalizedOptions.findIndex((o) => o.value === value)
        const nextIndex = currIndex + 1 < normalizedOptions.length ? currIndex + 1 : 0
        onChange(normalizedOptions[nextIndex].value)
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      if (!isOpen) {
        setIsOpen(true)
      } else {
        const currIndex = normalizedOptions.findIndex((o) => o.value === value)
        const prevIndex = currIndex > 0 ? currIndex - 1 : normalizedOptions.length - 1
        onChange(normalizedOptions[prevIndex].value)
      }
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      setIsOpen((prev) => !prev)
    }
  }

  const heightClass =
    size === "sm" ? "h-8.5 text-xs px-2.5" : size === "lg" ? "h-12 text-sm px-3.5" : "h-10 sm:h-11 text-xs sm:text-sm px-3"

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {label && (
        <label
          htmlFor={uniqueId}
          className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1.5"
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        id={uniqueId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || label || placeholder}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className={cn(
          "w-full rounded-xl border bg-white dark:bg-neutral-800 flex items-center justify-between gap-2 transition cursor-pointer shadow-2xs select-none",
          heightClass,
          isOpen
            ? "border-[#512da8] ring-2 ring-[#512da8]/20 dark:ring-purple-900/40 text-neutral-900 dark:text-neutral-100"
            : "border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:border-neutral-400 dark:hover:border-neutral-600",
          disabled && "opacity-50 cursor-not-allowed bg-neutral-100 dark:bg-neutral-900",
          triggerClassName
        )}
      >
        <div className="flex items-center gap-2 truncate min-w-0">
          {icon && <span className="shrink-0 text-[#512da8] dark:text-purple-400">{icon}</span>}
          <span className="truncate font-semibold text-neutral-900 dark:text-neutral-100">
            {selectedOption ? selectedOption.label : <span className="text-muted-foreground font-normal">{placeholder}</span>}
          </span>
        </div>

        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-neutral-400 transition-transform duration-200",
            isOpen && "rotate-180 text-[#512da8] dark:text-purple-400"
          )}
        />
      </button>

      {/* Hidden Native Select for Screen Readers, Form Submissions, and Playwright Test Compatibility */}
      <select
        aria-hidden="true"
        tabIndex={-1}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only pointer-events-none"
      >
        {normalizedOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Popover Menu Options */}
      {isOpen && (
        <div
          ref={listRef}
          role="listbox"
          tabIndex={-1}
          className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100 min-w-[200px]"
        >
          {(headerTitle || normalizedOptions.length > 0) && (
            <div className="p-2 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 px-3 border-b border-neutral-100 dark:border-neutral-700/60 bg-neutral-50/80 dark:bg-neutral-800/80 flex justify-between items-center">
              <span>{headerTitle || "Pilihan Opsi"}</span>
              <span className="text-[10px] bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded-full font-bold">
                {normalizedOptions.length} pilihan
              </span>
            </div>
          )}

          <div className="max-h-60 overflow-y-auto p-1.5 space-y-1">
            {normalizedOptions.map((opt) => {
              const isSelected = opt.value === value
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(opt.value)
                    setIsOpen(false)
                    triggerRef.current?.focus()
                  }}
                  className={cn(
                    "w-full px-3 py-2 rounded-lg text-left text-xs sm:text-sm font-medium flex items-center justify-between transition cursor-pointer gap-2",
                    isSelected
                      ? "bg-[#512da8]/10 text-[#512da8] font-bold dark:bg-purple-950/40 dark:text-purple-300"
                      : "hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200"
                  )}
                >
                  <div className="flex flex-col gap-0.5 truncate min-w-0">
                    <span className="truncate">{opt.label}</span>
                    {opt.description && (
                      <span className="text-[10px] text-muted-foreground font-normal truncate">
                        {opt.description}
                      </span>
                    )}
                  </div>
                  {isSelected && <Check className="size-4 text-[#512da8] dark:text-purple-400 shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

