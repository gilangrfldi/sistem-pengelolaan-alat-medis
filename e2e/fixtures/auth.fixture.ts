/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, type Page, type Route } from "@playwright/test"

export interface UserSessionConfig {
  email: string
  name: string
  role: "perawat" | "pengelola"
  status: "aktif" | "pending" | "nonaktif" | "ditolak"
  verified?: boolean
}

export const MOCK_PERAWAT: UserSessionConfig = {
  email: "perawat.test@rsud-welasasih.id",
  name: "Ns. Siti Rahmawati, S.Kep",
  role: "perawat",
  status: "aktif",
  verified: true,
}

export const MOCK_PENGELOLA: UserSessionConfig = {
  email: "admin.hcu@rsud-welasasih.id",
  name: "Ns. Hendra Pratama, S.Kep (Pengelola)",
  role: "pengelola",
  status: "aktif",
  verified: true,
}

export const MOCK_MASTER_TOOLS = [
  {
    id: "mt-1",
    name: "Infus Intravena perifer",
    category: "waktu",
    total_units: 0,
    has_unit_number: false,
    applicable_locations: ["Tangan Kanan", "Tangan Kiri", "Kaki Kanan", "Kaki Kiri"],
  },
  {
    id: "mt-2",
    name: "Syringe Pump",
    category: "waktu",
    total_units: 10,
    has_unit_number: true,
    unit_start_number: 1,
    unit_end_number: 10,
    numbered_units_count: 10,
  },
  {
    id: "mt-3",
    name: "EKG (Elektrokardiogram)",
    category: "kali",
    total_units: 0,
    has_unit_number: false,
  },
  {
    id: "mt-4",
    name: "Nebulizer",
    category: "kali",
    total_units: 0,
    has_unit_number: false,
  },
]

export const MOCK_DEFAULT_PATIENTS = [
  {
    id: "test-patient-01",
    name: "Tn. Joko Widodo (Pasien Tes 1)",
    gender: "L",
    rm: "99010203",
    bed: "Bed 01",
    care_level: "total",
    admission_date: "03-11-2026",
    admission_time: "08:00",
    admission_shift_key: "2026-11-03-pagi",
    nurse_name: "Ns. Siti Rahmawati, S.Kep",
    status: "aktif",
    discharge_date: null,
    discharge_time: null,
    discharge_shift_key: null,
    discharge_reason: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "test-patient-02",
    name: "Ny. Megawati (Pasien Tes 2)",
    gender: "P",
    rm: "99010204",
    bed: "Bed 02",
    care_level: "parsial",
    admission_date: "03-11-2026",
    admission_time: "09:30",
    admission_shift_key: "2026-11-03-pagi",
    nurse_name: "Ns. Siti Rahmawati, S.Kep",
    status: "aktif",
    discharge_date: null,
    discharge_time: null,
    discharge_shift_key: null,
    discharge_reason: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export async function injectAuthSession(page: Page, user: UserSessionConfig) {
  // 1. Simulasikan local storage sesi pengguna & data awal pasien
  await page.addInitScript((session) => {
    window.localStorage.setItem("sp_current_user_email", session.email)
    window.localStorage.setItem("sp_current_user_name", session.name)
    window.localStorage.setItem("sp_current_user_role", session.role)
    window.localStorage.setItem("sp_current_user_status", session.status)
    window.localStorage.setItem("sp_current_user_verified", session.verified ? "true" : "false")
    window.localStorage.setItem("sp_has_seen_tour", "true")

    const seedPatients = [
      {
        id: "test-patient-01",
        name: "Tn. Joko Widodo (Pasien Tes 1)",
        gender: "L",
        rm: "99010203",
        bed: "Bed 01",
        careLevel: "total",
        admissionDate: "03-11-2026",
        admissionTime: "08:00",
        admissionShiftKey: "2026-11-03-pagi",
        nurseName: "Ns. Siti Rahmawati, S.Kep",
        status: "aktif",
      },
      {
        id: "test-patient-02",
        name: "Ny. Megawati (Pasien Tes 2)",
        gender: "P",
        rm: "99010204",
        bed: "Bed 02",
        careLevel: "parsial",
        admissionDate: "03-11-2026",
        admissionTime: "09:30",
        admissionShiftKey: "2026-11-03-pagi",
        nurseName: "Ns. Siti Rahmawati, S.Kep",
        status: "aktif",
      },
    ]
    if (!window.localStorage.getItem("sp_hcu_patients")) {
      window.localStorage.setItem("sp_hcu_patients", JSON.stringify(seedPatients))
    }
  }, user)

  // 2. Netralkan overlay portal Next.js dev tools agar tidak menghalangi klik pointer
  await page.addInitScript(() => {
    const style = document.createElement("style")
    style.innerHTML = "nextjs-portal { pointer-events: none !important; opacity: 0.1 !important; }"
    if (document.head) {
      document.head.appendChild(style)
    } else {
      document.addEventListener("DOMContentLoaded", () => document.head?.appendChild(style))
    }
  })

  // 3. Intersep panggilan Supabase Auth
  await page.route("**/auth/v1/user*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "mock-user-e2e-id",
        email: user.email,
        role: "authenticated",
        user_metadata: {
          full_name: user.name,
        },
      }),
    })
  })

  await page.route("**/auth/v1/logout*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    })
  })

  // 4. Intersep panggilan Supabase Profiles (Presisi untuk Single Record vs List Akun)
  await page.route("**/rest/v1/profiles*", async (route) => {
    const method = route.request().method()
    if (method === "PATCH" || method === "POST" || method === "DELETE") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      })
      return
    }

    const url = route.request().url()
    const acceptHeader = route.request().headers()["accept"] || ""
    const isSingleObject = acceptHeader.includes("application/vnd.pgrst.object")

    const currentProfile = {
      id: "mock-user-e2e-id",
      email: user.email,
      full_name: user.name,
      role: user.role,
      status: user.status,
      is_verified: user.verified ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const secondaryNurse = {
      id: "mock-nurse-02",
      email: "perawat.test@rsud-welasasih.id",
      full_name: "Ns. Siti Rahmawati, S.Kep",
      role: "perawat" as const,
      status: "aktif" as const,
      is_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const thirdNurse = {
      id: "mock-nurse-03",
      email: "budi.test@rsud-welasasih.id",
      full_name: "Ns. Budi Santoso, S.Kep",
      role: "perawat" as const,
      status: "nonaktif" as const,
      is_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const allNurses = [currentProfile, secondaryNurse, thirdNurse]

    // Jika DashboardAccessGuard melakukan query profil spesifik via id=eq.* atau email=eq.*
    // PostgREST .maybeSingle() mewajibkan respons berupa array dengan TEPAT 1 elemen (atau single object)
    // agar PostgREST client tidak menolak dengan error PGRST116!
    if (url.includes("id=eq.") || url.includes("email=eq.")) {
      let matched = currentProfile
      if (url.toLowerCase().includes(secondaryNurse.email.toLowerCase()) || url.includes(secondaryNurse.id)) {
        matched = secondaryNurse
      } else if (url.toLowerCase().includes(thirdNurse.email.toLowerCase()) || url.includes(thirdNurse.id)) {
        matched = thirdNurse
      }

      if (isSingleObject) {
        await route.fulfill({
          status: 200,
          contentType: "application/vnd.pgrst.object+json",
          body: JSON.stringify(matched),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([matched]),
        })
      }
      return
    }

    // Untuk daftar staf perawat di halaman /kelola-perawat (query tanpa filter id/email tunggal)
    if (isSingleObject) {
      await route.fulfill({
        status: 200,
        contentType: "application/vnd.pgrst.object+json",
        body: JSON.stringify(currentProfile),
      })
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(allNurses),
      })
    }
  })

  // Helper untuk mock PostgREST REST endpoints
  const handlePostgrestMutation = async (route: Route, defaultItem: Record<string, unknown> = {}) => {
    const method = route.request().method()
    const headers = route.request().headers()
    const isSingle = (headers["accept"] || "").includes("application/vnd.pgrst.object")

    if (method === "POST") {
      let body: Record<string, unknown> | Record<string, unknown>[] = {}
      try {
        body = JSON.parse(route.request().postData() || "{}")
      } catch {}
      const item = Array.isArray(body) ? (body[0] || {}) : body
      const created = {
        id: `mock-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        ...defaultItem,
        ...item,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      await route.fulfill({
        status: 201,
        contentType: isSingle ? "application/vnd.pgrst.object+json" : "application/json",
        body: JSON.stringify(isSingle ? created : [created]),
      })
      return true
    } else if (method === "PATCH" || method === "DELETE") {
      await route.fulfill({
        status: 200,
        contentType: isSingle ? "application/vnd.pgrst.object+json" : "application/json",
        body: JSON.stringify(isSingle ? { success: true } : [{ success: true }]),
      })
      return true
    }
    return false
  }

  // 5. Intersep fallback Master Alat
  await page.route("**/rest/v1/master_alat*", async (route) => {
    if (await handlePostgrestMutation(route)) return
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_MASTER_TOOLS),
    })
  })

  // 6. Intersep fallback Alat Waktu
  await page.route("**/rest/v1/alat_waktu*", async (route) => {
    if (await handlePostgrestMutation(route)) return
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    })
  })

  // 7. Intersep fallback Alat Kali
  await page.route("**/rest/v1/alat_kali*", async (route) => {
    if (await handlePostgrestMutation(route)) return
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    })
  })

  // 8. Intersep fallback Alat Rusak
  await page.route("**/rest/v1/alat_rusak*", async (route) => {
    if (await handlePostgrestMutation(route)) return
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    })
  })

  // 9. Intersep fallback Pasien HCU
  await page.route("**/rest/v1/pasien_hcu*", async (route) => {
    if (await handlePostgrestMutation(route)) return
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_DEFAULT_PATIENTS),
    })
  })

  // 10. Intersep RPC Supabase
  await page.route("**/rest/v1/rpc/*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    })
  })
}

/**
 * Fixture Playwright yang mempercepat pengetesan dengan menginjeksi
 * sesi autentikasi tanpa harus login ulang via form di setiap test.
 */
export const test = base.extend<{
  authedPage: Page
  pengelolaPage: Page
}>({
  authedPage: async ({ page }, use) => {
    await injectAuthSession(page, MOCK_PERAWAT)
    await use(page)
  },
  pengelolaPage: async ({ page }, use) => {
    await injectAuthSession(page, MOCK_PENGELOLA)
    await use(page)
  },
})

export { expect } from "@playwright/test"
