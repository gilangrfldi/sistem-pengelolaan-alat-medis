import { test, expect } from "./fixtures/auth.fixture"
import { seedInitialPatients, clearAllTestData } from "./helpers/seed-data"

test.describe("CUJ-3: Kelola Alat Medis - Hitungan Waktu & Stopwatch", () => {
  test.beforeEach(async ({ authedPage }) => {
    // Siapkan pasien di Bed 01 & Bed 02
    await seedInitialPatients(authedPage)
  })

  test.afterEach(async ({ authedPage }) => {
    await clearAllTestData(authedPage)
  })

  test("Menampilkan daftar bed HCU dengan status pasien aktif", async ({ authedPage }) => {
    await authedPage.goto("/kelola-alat")
    await authedPage.waitForLoadState("domcontentloaded")

    // Bed 01 terpilih dan menampilkan nama pasien aktif
    await expect(authedPage.getByText("Bed 01").first()).toBeVisible({ timeout: 10000 })
    await expect(authedPage.getByText("Tn. Joko Widodo (Pasien Tes 1)").first()).toBeVisible()
    await expect(authedPage.getByText("Pasien Aktif").first()).toBeVisible()
  })

  test("Happy Path: Pasang Alat Hitungan Waktu ke Bed Pasien dan Stopwatch Berjalan", async ({ authedPage }) => {
    await authedPage.goto("/kelola-alat")
    await authedPage.waitForLoadState("domcontentloaded")

    // Pastikan bed terisi pasien aktif
    await expect(authedPage.getByText("Tn. Joko Widodo (Pasien Tes 1)").first()).toBeVisible({ timeout: 10000 })

    // Klik tombol Pasang Alat di Bed Ini
    const attachBtn = authedPage.locator("button:has-text('Pasang Alat di Bed Ini')").first()
    await attachBtn.click()

    // Verifikasi modal terbuka
    await expect(authedPage.getByRole("heading", { name: "Catat & Pasang Alat Medis HCU" })).toBeVisible()

    // Pilih kategori Hitungan Waktu
    await authedPage.getByRole("button", { name: "Hitungan Waktu", exact: true }).click()

    // Pilih alat Infus Intravena perifer agar memiliki lokasi anatomi
    const toolSelect = authedPage.locator("div[role='dialog'] select").or(authedPage.locator(".fixed select")).first()
    await toolSelect.selectOption("Infus Intravena perifer")

    // Pilih lokasi anatomi (Tangan Kanan) - berupa checkbox label
    const locCheckbox = authedPage.locator("label", { hasText: "Tangan Kanan" }).or(authedPage.getByText("Tangan Kanan")).first()
    if (await locCheckbox.isVisible()) {
      await locCheckbox.click()
    }

    // Klik Simpan & Pasang Alat
    await authedPage.getByRole("button", { name: "Simpan & Pasang Alat" }).click()

    // Modal tertutup
    await expect(authedPage.getByRole("heading", { name: "Catat & Pasang Alat Medis HCU" })).not.toBeVisible()

    // Memverifikasi alat terpasang dan tombol Lepas Sekarang tampil di kartu bed
    const bedPanel = authedPage.locator("#detail-bed-panel")
    await expect(bedPanel.getByText("Infus Intravena perifer")).toBeVisible({ timeout: 10000 })
    await expect(bedPanel.getByRole("button", { name: "Lepas Sekarang" })).toBeVisible()
  })

  test("Happy Path: Lepas / Selesai Alat Berdurasi", async ({ authedPage }) => {
    await authedPage.goto("/kelola-alat")
    await expect(authedPage.getByText("Tn. Joko Widodo (Pasien Tes 1)").first()).toBeVisible({ timeout: 10000 })

    // 1. Pasang alat terlebih dahulu
    await authedPage.locator("button:has-text('Pasang Alat di Bed Ini')").first().click()
    await authedPage.getByRole("button", { name: "Hitungan Waktu", exact: true }).click()
    const toolSelect2 = authedPage.locator("div[role='dialog'] select").or(authedPage.locator(".fixed select")).first()
    await toolSelect2.selectOption("Infus Intravena perifer")
    const locCheckbox = authedPage.locator("label", { hasText: "Tangan Kanan" }).or(authedPage.getByText("Tangan Kanan")).first()
    if (await locCheckbox.isVisible()) await locCheckbox.click()
    await authedPage.getByRole("button", { name: "Simpan & Pasang Alat" }).click()

    // 2. Klik tombol Lepas Sekarang
    const lepasBtn = authedPage.getByRole("button", { name: "Lepas Sekarang" })
    await expect(lepasBtn).toBeVisible({ timeout: 10000 })
    await lepasBtn.click()

    // 3. Modal konfirmasi selesai muncul
    await expect(authedPage.getByRole("heading", { name: "Konfirmasi Selesai & Lepas Alat" })).toBeVisible()

    // 4. Konfirmasi lepas alat
    await authedPage.getByRole("button", { name: "Konfirmasi & Lepas Alat" }).click()

    // Modal tertutup dan status berubah menjadi Selesai (atau Selesai / Dilepas)
    await expect(authedPage.getByRole("heading", { name: "Konfirmasi Selesai & Lepas Alat" })).not.toBeVisible()
    const bedPanel = authedPage.locator("#detail-bed-panel")
    await expect(bedPanel.getByText(/Selesai/i).first()).toBeVisible({ timeout: 10000 })
  })

  test("Happy Path: Hapus Catatan Alat Waktu dari Bed", async ({ authedPage }) => {
    await authedPage.goto("/kelola-alat")
    await expect(authedPage.getByText("Tn. Joko Widodo (Pasien Tes 1)").first()).toBeVisible({ timeout: 10000 })

    // Pasang alat
    await authedPage.locator("button:has-text('Pasang Alat di Bed Ini')").first().click()
    await authedPage.getByRole("button", { name: "Hitungan Waktu", exact: true }).click()
    const toolSelect3 = authedPage.locator("div[role='dialog'] select").or(authedPage.locator(".fixed select")).first()
    await toolSelect3.selectOption("Infus Intravena perifer")
    const locCheckbox2 = authedPage.locator("label", { hasText: "Tangan Kanan" }).or(authedPage.getByText("Tangan Kanan")).first()
    if (await locCheckbox2.isVisible()) await locCheckbox2.click()
    await authedPage.getByRole("button", { name: "Simpan & Pasang Alat" }).click()
    await expect(authedPage.getByText("Infus Intravena perifer").first()).toBeVisible({ timeout: 10000 })

    // Klik tombol icon sampah untuk menghapus
    await authedPage.locator("button[title='Hapus rekaman alat ini']").first().click()

    // Modal konfirmasi hapus terbuka
    await expect(authedPage.getByRole("heading", { name: "Hapus Catatan Alat Medis?" })).toBeVisible()

    // Klik konfirmasi hapus
    await authedPage.getByRole("button", { name: "Ya, Hapus Data" }).click()

    // Modal tertutup dan data alat terhapus
    await expect(authedPage.getByRole("heading", { name: "Hapus Catatan Alat Medis?" })).not.toBeVisible()
    await expect(authedPage.getByText("Tidak ada alat hitungan waktu yang sedang aktif di bed ini.")).toBeVisible()
  })
})
