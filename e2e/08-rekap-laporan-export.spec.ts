import { test, expect } from "./fixtures/auth.fixture"
import { seedInitialPatients, clearAllTestData } from "./helpers/seed-data"

test.describe("CUJ-8: Rekapitulasi & Ekspor Laporan CSV", () => {
  test.beforeEach(async ({ authedPage }) => {
    await seedInitialPatients(authedPage)
  })

  test.afterEach(async ({ authedPage }) => {
    await clearAllTestData(authedPage)
  })

  test("Halaman Rekap Pasien: Navigasi, filter periode, dan pergantian tab", async ({ authedPage }) => {
    await authedPage.goto("/rekap/pasien")
    await authedPage.waitForLoadState("domcontentloaded")

    // Verifikasi heading halaman
    await expect(
      authedPage.getByRole("heading", { name: "Rekapitulasi Pasien HCU" })
    ).toBeVisible({ timeout: 10000 })

    // Memverifikasi filter periode (Harian, Mingguan, Bulanan, Triwulan)
    await expect(authedPage.getByRole("button", { name: /Harian/i })).toBeVisible()
    await expect(authedPage.getByRole("button", { name: /Mingguan/i })).toBeVisible()
    await expect(authedPage.getByRole("button", { name: /Bulanan/i })).toBeVisible()

    // Beralih ke filter Mingguan
    await authedPage.getByRole("button", { name: /Mingguan/i }).click()

    // Tab pergantian antara Pasien Aktif dan Pasien Keluar (spesifik pada segmented tab)
    const tabKeluar = authedPage.getByRole("button", { name: /Pasien Keluar \(BLPL\)/i }).first()
    await tabKeluar.click()
    const tabAktif = authedPage.getByRole("button", { name: /^Pasien Aktif/i }).or(authedPage.locator("div.select-none button:has-text('Pasien Aktif')")).first()
    await tabAktif.click()
  })

  test("Happy Path: Ekspor Rekap Pasien ke CSV", async ({ authedPage }) => {
    await authedPage.goto("/rekap/pasien")
    await expect(authedPage.getByText("Tn. Joko Widodo (Pasien Tes 1)")).toBeVisible({
      timeout: 10000,
    })

    // Menyiapkan pendengar event download
    const downloadPromise = authedPage.waitForEvent("download")

    // Klik tombol Download Rekap CSV
    const downloadBtn = authedPage.locator("button:has-text('Download Rekap CSV')").first()
    await downloadBtn.click()

    const download = await downloadPromise
    expect(download.suggestedFilename()).toContain(".csv")
  })

  test("Halaman Rekap Alat: Navigasi antar tab kategori alat", async ({ authedPage }) => {
    await authedPage.goto("/rekap/alat")
    await authedPage.waitForLoadState("domcontentloaded")

    // Verifikasi judul rekap alat medis
    await expect(
      authedPage.getByRole("heading", { name: "Rekapitulasi Alat Medis HCU" })
    ).toBeVisible({ timeout: 10000 })

    // Tab 1: Hitungan Waktu
    await expect(authedPage.getByRole("button", { name: /Hitungan Waktu/i }).first()).toBeVisible()

    // Beralih ke Tab 2: Hitungan Kali
    const kaliTab = authedPage.getByRole("button", { name: /Hitungan Kali/i }).first()
    await kaliTab.click()

    // Beralih ke Tab 3: Alat Rusak
    const rusakTab = authedPage.getByRole("button", { name: /Alat Rusak|Unit Rusak/i }).first()
    await rusakTab.click()
  })
})
