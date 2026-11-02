"use client"

import * as React from "react"
import { useState, useEffect, useMemo, useSyncExternalStore } from "react"
import { useRouter } from "next/navigation"
import {
  ShieldCheck,
  UserCheck,
  Users,
  Search,
  Trash2,
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  Ban,
  Mail,
  Shield,
  RotateCcw,
} from "lucide-react"
import { cn } from "cn"
import { AppModal } from "@/components/app-modal"
import { getInitials } from "@/components/nav-user"
import {
  NurseAccount,
  NurseStatus,
  fetchNurseAccounts,
  updateNurseStatusInDb,
  deleteNurseAccountInDb,
  transferOwnershipInDb,
} from "@/lib/services/nurse-service"
import { toast } from "@/components/ui/app-toast"

export default function KelolaPerawatPage() {
  const router = useRouter()

  // State Akun Perawat
  const [nurses, setNurses] = useState<NurseAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<"semua" | NurseStatus>("semua")

  const currentUserEmail = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("storage", onStoreChange)
      return () => window.removeEventListener("storage", onStoreChange)
    },
    () => {
      if (typeof window === "undefined") return ""
      return localStorage.getItem("sp_current_user_email") || ""
    },
    () => ""
  )

  // State Modal Hapus
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [nurseToDelete, setNurseToDelete] = useState<NurseAccount | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // State Modal Transfer Kepemilikan Super Admin
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [transferNewEmail, setTransferNewEmail] = useState("")
  const [transferNewName, setTransferNewName] = useState("")
  const [transferError, setTransferError] = useState<string | null>(null)
  const [isTransferring, setIsTransferring] = useState(false)
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null)

  // Muat data dari Supabase / LocalStorage
  const handleReload = async () => {
    setIsLoading(true)
    try {
      const res = await fetchNurseAccounts()
      setNurses(res.data)
    } catch (err) {
      console.warn("Gagal memuat akun perawat:", err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let ignore = false
    const load = async () => {
      setIsLoading(true)
      try {
        const res = await fetchNurseAccounts()
        if (!ignore) setNurses(res.data)
      } catch (err) {
        console.warn("Gagal memuat akun perawat:", err)
      } finally {
        if (!ignore) setIsLoading(false)
      }
    }
    void load()
    return () => {
      ignore = true
    }
  }, [])

  // Hitung Statistik
  const stats = useMemo(() => {
    const total = nurses.length
    const aktif = nurses.filter((n) => n.status === "aktif").length
    const pending = nurses.filter((n) => n.status === "pending").length
    const nonaktif = nurses.filter((n) => n.status === "nonaktif").length
    return { total, aktif, pending, nonaktif }
  }, [nurses])

  // Filter List Perawat
  const filteredNurses = useMemo(() => {
    return nurses.filter((n) => {
      const matchesSearch =
        n.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.email.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = filterStatus === "semua" || n.status === filterStatus
      return matchesSearch && matchesStatus
    })
  }, [nurses, searchQuery, filterStatus])

  // Toggle Switch Button Status Aktif/Nonaktif
  const handleToggleStatus = async (nurse: NurseAccount) => {
    if (nurse.role === "pengelola") return // Akun pengelola utama tidak bisa dinonaktifkan

    const nextStatus: NurseStatus = nurse.status === "aktif" ? "nonaktif" : "aktif"

    // Validasi aturan: Akses hanya bisa diaktifkan jika email perawat sudah diverifikasi
    if (!nurse.isVerified) {
      alert("Akses tidak dapat diaktifkan. Perawat harus memverifikasi email terlebih dahulu.")
      return
    }

    // Optimistic UI update
    setNurses((prev) =>
      prev.map((n) =>
        n.id === nurse.id
          ? {
              ...n,
              status: nextStatus,
            }
          : n
      )
    )

    await updateNurseStatusInDb(nurse.id, nextStatus)
    toast.success(nextStatus === "aktif" ? "Akses perawat diaktifkan" : "Akses perawat dinonaktifkan")
  }

  // Buka Konfirmasi Hapus Akun
  const handleOpenDeleteModal = (nurse: NurseAccount) => {
    if (nurse.role === "pengelola") return
    setNurseToDelete(nurse)
    setShowDeleteModal(true)
  }

  // Konfirmasi Hapus Akun
  const handleConfirmDelete = async () => {
    if (!nurseToDelete) return
    setIsDeleting(true)
    try {
      await deleteNurseAccountInDb(nurseToDelete.id)
      setNurses((prev) => prev.filter((n) => n.id !== nurseToDelete.id))
      setShowDeleteModal(false)
      setNurseToDelete(null)
      toast.success("Akun perawat berhasil dihapus")
    } finally {
      setIsDeleting(false)
    }
  }

  // Submit Transfer Kepemilikan Super Admin
  const handleConfirmTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    setTransferError(null)

    const trimmedEmail = transferNewEmail.trim().toLowerCase()
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setTransferError("Harap masukkan format email yang valid.")
      return
    }

    if (trimmedEmail === currentUserEmail.toLowerCase()) {
      setTransferError("Email pengelola baru tidak boleh sama dengan email akun Anda saat ini.")
      return
    }

    setIsTransferring(true)
    try {
      const res = await transferOwnershipInDb(currentUserEmail, trimmedEmail, transferNewName.trim())
      setTransferSuccess(res.message)
      toast.success("Kepemilikan berhasil ditransfer")

      // Bersihkan sesi aktif lokal dan alihkan ke login
      setTimeout(() => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("sp_current_user_name")
          localStorage.removeItem("sp_current_user_email")
          localStorage.removeItem("sp_current_user_role")
          localStorage.removeItem("sp_current_user_status")
          localStorage.removeItem("sp_remember_me")
        }
        router.push("/login")
      }, 2500)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setTransferError(msg)
      setIsTransferring(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-2 sm:p-4 max-w-7xl mx-auto w-full">
      {/* 1. Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#512da8]/10 text-[#512da8] dark:bg-purple-950/40 dark:text-purple-300">
              <ShieldCheck className="size-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-neutral-50 tracking-tight">
                  Kelola Akun Perawat HCU
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#512da8] text-white">
                  Super Admin
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Persetujuan pendaftaran staf, kontrol hak akses sistem, dan pemindahan kepemilikan pengelola.
              </p>
            </div>
          </div>
        </div>

        {/* Tombol Transfer Kepemilikan */}
        <button
          type="button"
          onClick={() => {
            setTransferNewEmail("")
            setTransferNewName("")
            setTransferError(null)
            setShowTransferModal(true)
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-xs sm:text-sm font-bold shadow-sm transition cursor-pointer shrink-0"
        >
          <ArrowRightLeft className="size-4" />
          <span>Transfer Kepemilikan Pengelola</span>
        </button>
      </div>

      {/* 2. Kartu Statistik Akun */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/70 dark:bg-sky-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-sky-800 dark:text-sky-300">Total Akun</span>
            <Users className="size-4.5 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-sky-950 dark:text-sky-100">
            {stats.total}
          </div>
          <span className="text-[11px] text-sky-700/80 dark:text-sky-400">Seluruh perawat terdaftar</span>
        </div>

        <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Akses Aktif</span>
            <UserCheck className="size-4.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-emerald-950 dark:text-emerald-100">
            {stats.aktif}
          </div>
          <span className="text-[11px] text-emerald-700/80 dark:text-emerald-400">Dapat akses dashboard HCU</span>
        </div>

        <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/20">
          <div className="mt-2 text-2xl sm:text-3xl font-black text-amber-950 dark:text-amber-100">
            {stats.pending}
          </div>
          <span className="text-[11px] text-amber-700/80 dark:text-amber-400">Perlu persetujuan pengelola</span>
        </div>

        <div className="p-4 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-800 dark:text-rose-300">Dinonaktifkan</span>
            <Ban className="size-4.5 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-rose-950 dark:text-rose-100">
            {stats.nonaktif}
          </div>
          <span className="text-[11px] text-rose-700/80 dark:text-rose-400">Akses dibekukan sementara</span>
        </div>
      </div>

      {/* 3. Baris Pencarian & Filter Status */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama atau email perawat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/50 focus:outline-hidden focus:ring-2 focus:ring-[#512da8]"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {(
            [
              { key: "semua", label: "Semua" },
              { key: "aktif", label: "Aktif" },
              { key: "nonaktif", label: "Nonaktif" },
            ] as const
          ).map((tab) => {
            const isSelected = filterStatus === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilterStatus(tab.key)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap cursor-pointer",
                  isSelected
                    ? "bg-[#512da8] text-white shadow-2xs"
                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                )}
              >
                {tab.label}
              </button>
            )
          })}

          <button
            type="button"
            onClick={handleReload}
            title="Muat Ulang Data"
            className="p-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-muted-foreground transition ml-1 cursor-pointer"
          >
            <RotateCcw className={cn("size-4", isLoading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* 4. Tabel Akun Perawat */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Perawat</th>
                <th className="py-3 px-4">Verifikasi Email</th>
                <th className="py-3 px-4">Status Akses</th>
                <th className="py-3 px-4 text-center">Beri Akses (Switch)</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
              {filteredNurses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    <Users className="size-8 mx-auto mb-2 opacity-30" />
                    Tidak ada akun perawat yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredNurses.map((nurse) => {
                  const isOwner = nurse.role === "pengelola"
                  const isCurrent = nurse.email.toLowerCase() === currentUserEmail.toLowerCase()
                  const isActive = nurse.status === "aktif"

                  return (
                    <tr
                      key={nurse.id}
                      className={cn(
                        "hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition",
                        isOwner && "bg-[#512da8]/3 dark:bg-purple-950/10"
                      )}
                    >
                      {/* Profil & Nama */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "flex size-9 items-center justify-center rounded-xl font-bold text-xs uppercase shrink-0 select-none",
                              isOwner
                                ? "bg-[#512da8] text-white shadow-xs"
                                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700"
                            )}
                          >
                            {getInitials(nurse.fullName)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-neutral-900 dark:text-neutral-100">
                                {nurse.fullName}
                              </span>
                              {isOwner && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#512da8]/15 text-[#512da8] dark:bg-purple-900/40 dark:text-purple-300">
                                  <Shield className="size-3" /> Pengelola Perawat
                                </span>
                              )}
                              {isCurrent && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300">
                                  (Anda)
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">{nurse.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Verifikasi Email */}
                      <td className="py-3 px-4">
                        {nurse.isVerified ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                            Terverifikasi
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                            <Clock className="size-3.5 shrink-0 text-amber-500" />
                            Belum Verifikasi
                          </span>
                        )}
                      </td>

                      {/* Status Akses Badge */}
                      <td className="py-3 px-4">
                        {!nurse.isVerified && !isOwner ? (
                          <span
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700"
                            title="Akun belum dapat diaktifkan sebelum email diverifikasi oleh staf perawat"
                          >
                            Belum Aktif
                          </span>
                        ) : nurse.status === "aktif" ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            Nonaktif
                          </span>
                        )}
                      </td>

                      {/* Switch Button (Toggle Akses) */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center">
                          {isOwner ? (
                            <span className="text-[11px] font-semibold text-muted-foreground italic">
                              Selalu Aktif
                            </span>
                          ) : !nurse.isVerified ? (
                            <div className="flex flex-col items-center gap-1">
                              <button
                                type="button"
                                disabled
                                aria-disabled="true"
                                title="Akses tidak dapat diaktifkan. Perawat harus memverifikasi email terlebih dahulu."
                                className="relative inline-flex h-6 w-11 shrink-0 cursor-not-allowed rounded-full border-2 border-transparent bg-neutral-200 dark:bg-neutral-800 opacity-60"
                              >
                                <span className="pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-xs translate-x-0" />
                              </button>
                              <span
                                className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded border border-amber-200/60 text-center select-none"
                                title="Perawat harus memverifikasi email terlebih dahulu sebelum Pengelola dapat mengaktifkan akses"
                              >
                                Terkunci (Belum Verifikasi)
                              </span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              role="switch"
                              aria-checked={isActive}
                              onClick={() => handleToggleStatus(nurse)}
                              title={
                                isActive
                                  ? "Klik untuk menonaktifkan akses perawat ini"
                                  : "Klik untuk mengaktifkan akses perawat ini ke dashboard"
                              }
                              className={cn(
                                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden",
                                isActive
                                  ? "bg-[#512da8]"
                                  : "bg-neutral-300 dark:bg-neutral-700"
                              )}
                            >
                              <span
                                className={cn(
                                  "pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                                  isActive ? "translate-x-5" : "translate-x-0"
                                )}
                              />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Aksi Hapus */}
                      <td className="py-3 px-4 text-right">
                        {isOwner ? (
                          <span className="text-xs text-muted-foreground">-</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenDeleteModal(nurse)}
                            title="Hapus akun perawat ini"
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                          >
                            <Trash2 className="size-4.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Modal Konfirmasi Hapus Akun Perawat */}
      <AppModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Konfirmasi Hapus Akun Perawat"
        maxWidth="sm"
        showFooter={false}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300">
            <AlertTriangle className="size-5 shrink-0 text-rose-600 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold">Peringatan Penghapusan Akun</p>
              <p>
                Apakah Anda yakin ingin menghapus akun perawat{" "}
                <strong>{nurseToDelete?.fullName}</strong> ({nurseToDelete?.email})?
              </p>
              <p className="text-[11px] text-rose-700/80 dark:text-rose-400">
                Akun yang dihapus tidak dapat lagi masuk ke dalam aplikasi sistem pengelolaan alat medis HCU.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={() => setShowDeleteModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleConfirmDelete}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition cursor-pointer shadow-sm disabled:opacity-50"
            >
              {isDeleting ? "Menghapus..." : "Ya, Hapus Akun"}
            </button>
          </div>
        </div>
      </AppModal>

      {/* 6. Modal Transfer Kepemilikan Super Admin */}
      <AppModal
        isOpen={showTransferModal}
        onClose={() => {
          if (!isTransferring && !transferSuccess) setShowTransferModal(false)
        }}
        title="Transfer Kepemilikan Pengelola Akun"
        maxWidth="md"
        showFooter={false}
      >
        {transferSuccess ? (
          <div className="space-y-4 py-4 text-center">
            <div className="size-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="size-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Transfer Kepemilikan Berhasil!
              </h3>
              <p className="text-xs text-muted-foreground mt-1.5">{transferSuccess}</p>
              <p className="text-[11px] text-[#512da8] font-semibold mt-3 animate-pulse">
                Mengalihkan ke halaman masuk dalam beberapa detik...
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleConfirmTransfer} className="space-y-4">
            {/* Box Info Akun Saat Ini */}
            <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/80 dark:bg-neutral-800/50 text-xs">
              <span className="text-muted-foreground">Pengelola Akun Saat Ini:</span>
              <div className="font-bold text-neutral-900 dark:text-neutral-100 mt-0.5">
                {currentUserEmail}
              </div>
            </div>

            {/* Input Email Pengelola Baru */}
            <div>
              <label className="block text-xs font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                Email Pengelola Baru (Super Admin) *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  placeholder="Contoh: rifaldi@gmail.com"
                  value={transferNewEmail}
                  onChange={(e) => setTransferNewEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-[#512da8]"
                />
              </div>
            </div>

            {/* Input Nama Lengkap Pengelola Baru */}
            <div>
              <label className="block text-xs font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                Nama Lengkap Pengelola Baru (Opsional)
              </label>
              <input
                type="text"
                placeholder="Contoh: Ns. Rifaldi, S.Kep"
                value={transferNewName}
                onChange={(e) => setTransferNewName(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-[#512da8]"
              />
            </div>

            {/* Kotak Peringatan Konsekuensi Transfer */}
            <div className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="size-4 text-amber-600 shrink-0" />
                <span>Ketentuan Transfer Kepemilikan Super Admin</span>
              </div>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-amber-800 dark:text-amber-300">
                <li>
                  Akun email <strong>{transferNewEmail || "[email baru]"}</strong> akan diberikan hak kendali penuh sebagai <strong>Pengelola Perawat (Super Admin)</strong>.
                </li>
                <li>
                  Akun Anda saat ini (<strong>{currentUserEmail}</strong>) akan <strong>diturunkan perannya menjadi Perawat Biasa</strong> (bukan lagi Pengelola/Super Admin), dan <strong>tetap aktif tersimpan</strong> di sistem.
                </li>
                <li>
                  Anda akan dialihkan keluar (*logout*) agar dapat masuk kembali dengan hak akses perawat.
                </li>
              </ul>
            </div>

            {transferError && (
              <div className="p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs font-medium">
                {transferError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                disabled={isTransferring}
                onClick={() => setShowTransferModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isTransferring}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#512da8] hover:bg-[#432588] text-white transition cursor-pointer shadow-sm disabled:opacity-50"
              >
                {isTransferring ? "Memproses Transfer..." : "Konfirmasi Transfer Kepemilikan"}
              </button>
            </div>
          </form>
        )}
      </AppModal>
    </div>
  )
}
