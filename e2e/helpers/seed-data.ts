import { type Page } from "@playwright/test"

/**
 * Helper untuk seeding (menyiapkan) dan cleanup (membersihkan) data tes
 * agar tiap pengujian berjalan dalam lingkungan terisolasi dan dapat diulang.
 */

export interface TestPatientData {
  id: string
  name: string
  gender: "L" | "P"
  rm: string
  bed: string
  careLevel: "total" | "parsial" | "minimal"
  admissionDate: string
  admissionTime: string
  admissionShiftKey: string
  nurseName: string
  status: "aktif" | "keluar"
}

export const SEED_PATIENTS: TestPatientData[] = [
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

export async function seedInitialPatients(page: Page, patients = SEED_PATIENTS) {
  // 1. Simulasikan data localStorage
  await page.addInitScript((data) => {
    window.localStorage.setItem("sp_hcu_patients", JSON.stringify(data))
  }, patients)

  const mockTimedTools: Record<string, unknown>[] = []
  const mockCountTools: Record<string, unknown>[] = []
  const mockDamagedTools: Record<string, unknown>[] = []

  // Intersep REST API alat_waktu agar pengujian terisolasi
  await page.route("**/rest/v1/alat_waktu*", async (route) => {
    const method = route.request().method()
    if (method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockTimedTools),
      })
    } else if (method === "POST") {
      let body: Record<string, unknown> | Record<string, unknown>[] = {}
      try {
        body = JSON.parse(route.request().postData() || "{}")
      } catch {}
      const item = Array.isArray(body) ? (body[0] || {}) : body
      const created = {
        id: `mock-time-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        ...item,
        created_at: new Date().toISOString(),
      }
      mockTimedTools.push(created)
      const isSingle = (route.request().headers()["accept"] || "").includes("application/vnd.pgrst.object")
      await route.fulfill({
        status: 201,
        contentType: isSingle ? "application/vnd.pgrst.object+json" : "application/json",
        body: JSON.stringify(isSingle ? created : [created]),
      })
    } else if (method === "PATCH") {
      await route.fulfill({
        status: 204,
        body: "",
      })
    } else if (method === "DELETE") {
      await route.fulfill({
        status: 204,
        body: "",
      })
    } else {
      await route.continue()
    }
  })

  // Intersep REST API alat_kali agar pengujian terisolasi
  await page.route("**/rest/v1/alat_kali*", async (route) => {
    const method = route.request().method()
    if (method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockCountTools),
      })
    } else if (method === "POST") {
      let body: Record<string, unknown> | Record<string, unknown>[] = {}
      try {
        body = JSON.parse(route.request().postData() || "{}")
      } catch {}
      const item = Array.isArray(body) ? (body[0] || {}) : body
      const created = {
        id: `mock-count-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        ...item,
        created_at: new Date().toISOString(),
      }
      mockCountTools.push(created)
      const isSingle = (route.request().headers()["accept"] || "").includes("application/vnd.pgrst.object")
      await route.fulfill({
        status: 201,
        contentType: isSingle ? "application/vnd.pgrst.object+json" : "application/json",
        body: JSON.stringify(isSingle ? created : [created]),
      })
    } else if (method === "PATCH") {
      await route.fulfill({
        status: 204,
        body: "",
      })
    } else if (method === "DELETE") {
      await route.fulfill({
        status: 204,
        body: "",
      })
    } else {
      await route.continue()
    }
  })

  // Intersep REST API alat_rusak agar pengujian terisolasi
  await page.route("**/rest/v1/alat_rusak*", async (route) => {
    const method = route.request().method()
    if (method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockDamagedTools),
      })
    } else if (method === "POST") {
      let body: Record<string, unknown> | Record<string, unknown>[] = {}
      try {
        body = JSON.parse(route.request().postData() || "{}")
      } catch {}
      const item = Array.isArray(body) ? (body[0] || {}) : body
      const created = {
        id: `mock-dmg-${Date.now()}`,
        ...item,
        created_at: new Date().toISOString(),
      }
      mockDamagedTools.push(created)
      const isSingle = (route.request().headers()["accept"] || "").includes("application/vnd.pgrst.object")
      await route.fulfill({
        status: 201,
        contentType: isSingle ? "application/vnd.pgrst.object+json" : "application/json",
        body: JSON.stringify(isSingle ? created : [created]),
      })
    } else if (method === "DELETE") {
      await route.fulfill({
        status: 204,
        body: "",
      })
    } else {
      await route.continue()
    }
  })

  // 2. Intersep panggilan REST API Supabase pasien_hcu agar fetchPatientsFromDb
  //    mengembalikan data seed dan tidak tertimpa data kosong dari database cloud
  await page.route("**/rest/v1/pasien_hcu*", async (route) => {
    const method = route.request().method()
    if (method === "GET") {
      const rows = patients.map((p) => ({
        id: p.id,
        name: p.name,
        gender: p.gender,
        rm: p.rm,
        bed: p.bed,
        care_level: p.careLevel,
        admission_date: p.admissionDate,
        admission_time: p.admissionTime,
        admission_shift_key: p.admissionShiftKey,
        nurse_name: p.nurseName,
        status: p.status,
        discharge_date: null,
        discharge_time: null,
        discharge_shift_key: null,
        discharge_reason: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(rows),
      })
    } else if (method === "POST") {
      let body: Record<string, unknown> | Record<string, unknown>[] = {}
      try {
        body = JSON.parse(route.request().postData() || "{}")
      } catch {}
      const item = Array.isArray(body) ? (body[0] || {}) : body
      const created = {
        id: `mock-pt-${Date.now()}`,
        ...item,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      const isSingle = (route.request().headers()["accept"] || "").includes("application/vnd.pgrst.object")
      await route.fulfill({
        status: 201,
        contentType: isSingle ? "application/vnd.pgrst.object+json" : "application/json",
        body: JSON.stringify(isSingle ? created : [created]),
      })
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      })
    }
  })
}

export async function clearAllTestData(page: Page) {
  await page.evaluate(() => {
    window.localStorage.removeItem("sp_hcu_patients")
    window.localStorage.removeItem("sp_hcu_timed_tools")
    window.localStorage.removeItem("sp_hcu_count_tools")
    window.localStorage.removeItem("sp_hcu_damaged_tools")
  })
}

