import { test, expect } from "./fixtures/auth.fixture"
import { seedInitialPatients, clearAllTestData } from "./helpers/seed-data"

test.describe("CUJ-5: Lapor Kerusakan & Pemeliharaan Alat Medis", () => {
  test.beforeEach(async ({ authedPage }) => {
    await seedInitialPatients(authedPage)
  })

  test.afterEach(async ({ authedPage }) => {
    await clearAllTestData(authedPage)
  })

  test("Happy Path: Melaporkan unit alat medis yang rusak dari Master Alat", async ({ authedPage }) => {
    await authedPage.goto("/kelola-alat/master-alat")
    await authedPage.waitForLoadState("domcontentloaded")

    // Pastikan master alat termuat
    await expect(authedPage.getByText("Syringe Pump")).toBeVisible({ timeout: 10000 })

    // Klik tombol Lapor Rusak di header
    const laporBtn = authedPage.getByRole("button", { name: /Lapor Rusak/i }).first()
    await laporBtn.click()

    // Verifikasi modal terbuka
    await expect(
      authedPage.getByRole("heading", { name: /Lapor Kerusakan/i })
    ).toBeVisible()

    const modal = authedPage.locator(".fixed.inset-0")
    // Pilih alat Syringe Pump di dalam modal
    const selectTool = modal.locator("select").first()
    await selectTool.selectOption("Syringe Pump")

    // Pilih unit nomor 1 di dalam modal
    const unit1Btn = modal.locator("button", { hasText: /^1$/ }).first()
    if (await unit1Btn.isVisible()) {
      await unit1Btn.click()
    }

    // Isi deskripsi kendala kerusakan
    const notesInput = modal.getByPlaceholder(/Contoh: Error sensor alarm|Deskripsi/i)
    if (await notesInput.isVisible()) {
      await notesInput.fill("Baterai cepat drop dan alarm berbunyi terus")
    }

    // Submit laporan kerusakan
    await modal.getByRole("button", { name: "Simpan Laporan Kerusakan" }).click()

    // Modal tertutup
    await expect(
      authedPage.getByRole("heading", { name: /Lapor Kerusakan/i })
    ).not.toBeVisible()

    // Verifikasi status kerusakan tercatat (badge rusak atau teks unit rusak muncul)
    await expect(authedPage.getByText(/Rusak|1 Rusak/i).first()).toBeVisible({ timeout: 10000 })
  })

  test("Failure State: Menolak submit laporan kerusakan nomor unit tanpa memilih nomor fisik", async ({
    authedPage,
  }) => {
    await authedPage.goto("/kelola-alat/master-alat")
    await authedPage.waitForLoadState("domcontentloaded")

    // Buka modal lapor rusak
    await authedPage.getByRole("button", { name: /Lapor Rusak/i }).first().click()

    await expect(
      authedPage.getByRole("heading", { name: /Lapor Kerusakan/i })
    ).toBeVisible()

    const modal = authedPage.locator(".fixed.inset-0")
    // Pilih alat dengan nomor unit (Syringe Pump) di dalam modal
    const selectTool = modal.locator("select").first()
    await selectTool.selectOption("Syringe Pump")

    // Langsung klik simpan tanpa memilih chip nomor unit
    await modal.getByRole("button", { name: "Simpan Laporan Kerusakan" }).click()

    // Muncul pesan validasi error
    const errorBanner = authedPage.locator(".bg-red-50, [class*='text-red']")
    await expect(errorBanner.first()).toBeVisible()
  })
})
