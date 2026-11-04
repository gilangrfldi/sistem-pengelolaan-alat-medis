import { test, expect } from "./fixtures/auth.fixture"
import { seedInitialPatients, clearAllTestData } from "./helpers/seed-data"

test.describe("CUJ-4: Kelola Alat Medis - Frekuensi Tindakan (Hitungan Kali)", () => {
  test.beforeEach(async ({ authedPage }) => {
    await seedInitialPatients(authedPage)
  })

  test.afterEach(async ({ authedPage }) => {
    await clearAllTestData(authedPage)
  })

  test("Happy Path: Catat Tindakan Medis (Hitungan Kali) ke Bed Pasien", async ({ authedPage }) => {
    await authedPage.goto("/kelola-alat")
    await authedPage.waitForLoadState("domcontentloaded")
    await expect(authedPage.getByText("Tn. Joko Widodo (Pasien Tes 1)").first()).toBeVisible({ timeout: 10000 })

    // Klik tombol Pasang Alat di Bed Ini
    await authedPage.locator("button:has-text('Pasang Alat di Bed Ini')").first().click()

    // Verifikasi modal terbuka
    await expect(authedPage.getByRole("heading", { name: "Catat & Pasang Alat Medis HCU" })).toBeVisible()

    // Pilih kategori Hitungan Kali
    await authedPage.getByRole("button", { name: "Hitungan Kali", exact: true }).click()

    // Klik Simpan & Pasang Alat
    await authedPage.getByRole("button", { name: "Simpan & Pasang Alat" }).click()

    // Modal tertutup
    await expect(authedPage.getByRole("heading", { name: "Catat & Pasang Alat Medis HCU" })).not.toBeVisible()

    // Tindakan medis muncul di daftar dengan frekuensi 1x
    await expect(authedPage.getByText(/Frekuensi Tindakan Medis/i).first()).toBeVisible({ timeout: 10000 })
    const bedPanel = authedPage.locator("#detail-bed-panel")
    await expect(bedPanel.getByText("1x", { exact: true })).toBeVisible()
  })

  test("Interaksi Stepper Counter: Tambah (+) dan Kurangi (-) serta Simpan Tindakan", async ({ authedPage }) => {
    await authedPage.goto("/kelola-alat")
    await expect(authedPage.getByText("Tn. Joko Widodo (Pasien Tes 1)").first()).toBeVisible({ timeout: 10000 })

    // Pasang tindakan kali
    await authedPage.locator("button:has-text('Pasang Alat di Bed Ini')").first().click()
    await authedPage.getByRole("button", { name: "Hitungan Kali", exact: true }).click()
    await authedPage.getByRole("button", { name: "Simpan & Pasang Alat" }).click()
    const bedPanel = authedPage.locator("#detail-bed-panel")
    await expect(bedPanel.getByText("1x", { exact: true })).toBeVisible({ timeout: 10000 })

    // Sebelum diubah (+), tombol simpan harus disabled (redup)
    const saveCountBtn = bedPanel.locator("button:has-text('Simpan')").first()
    await expect(saveCountBtn).toBeDisabled()

    // Klik tombol Tambah (+) -> 1x berubah menjadi 2x
    const addStepBtn = bedPanel.locator("button[title='Tambah frekuensi tindakan']").first()
    await addStepBtn.click()
    await expect(bedPanel.getByText("2x", { exact: true })).toBeVisible()

    // Tombol simpan kini aktif
    await expect(saveCountBtn).toBeEnabled()
    await saveCountBtn.click()

    // Setelah disimpan, tombol simpan kembali disabled
    await expect(saveCountBtn).toBeDisabled()

    // Verifikasi tombol detail riwayat tindakan (icon mata) di panel riwayat
    const detailBtn = bedPanel.locator("button[title='Lihat rincian jam tindakan medis ini']").first()
    await expect(detailBtn).toBeVisible()
    await detailBtn.click()
    await expect(authedPage.getByRole("heading", { name: /Detail Riwayat Tindakan/i })).toBeVisible()
    // Tutup modal via tombol X (Tutup modal)
    await authedPage.getByRole("button", { name: "Tutup modal" }).click()
    await expect(authedPage.getByRole("heading", { name: /Detail Riwayat Tindakan/i })).not.toBeVisible()

    // Klik tombol Kurangi (-) -> 2x berubah kembali menjadi 1x
    const minusStepBtn = bedPanel.locator("button[title='Kurangi frekuensi tindakan']").first()
    await minusStepBtn.click()
    await expect(bedPanel.getByText("1x", { exact: true })).toBeVisible()
    await expect(saveCountBtn).toBeEnabled()
  })

  test("Happy Path: Hapus Catatan Tindakan Medis", async ({ authedPage }) => {
    await authedPage.goto("/kelola-alat")
    await expect(authedPage.getByText("Tn. Joko Widodo (Pasien Tes 1)").first()).toBeVisible({ timeout: 10000 })

    // Pasang tindakan
    await authedPage.locator("button:has-text('Pasang Alat di Bed Ini')").first().click()
    await authedPage.getByRole("button", { name: "Hitungan Kali", exact: true }).click()
    await authedPage.getByRole("button", { name: "Simpan & Pasang Alat" }).click()
    const bedPanel = authedPage.locator("#detail-bed-panel")
    await expect(bedPanel.getByText("1x", { exact: true })).toBeVisible({ timeout: 10000 })

    // Klik tombol icon sampah untuk menghapus tindakan
    await bedPanel.locator("button[title='Hapus rekaman tindakan ini']").first().click()

    // Modal konfirmasi hapus terbuka
    await expect(authedPage.getByRole("heading", { name: "Hapus Catatan Tindakan Medis?" })).toBeVisible()

    // Klik tombol konfirmasi Ya, Hapus Data
    await authedPage.getByRole("button", { name: "Ya, Hapus Data" }).click()

    // Modal tertutup dan tindakan terhapus
    await expect(authedPage.getByRole("heading", { name: "Hapus Catatan Tindakan Medis?" })).not.toBeVisible()
    await expect(authedPage.getByText("Belum ada tindakan medis yang dicatat di bed ini.")).toBeVisible()
  })

  test("Metode Waktu Tindakan Kali: Waktu Sekarang (Dapat Diedit) dan Sesuai Jam Masuk", async ({ authedPage }) => {
    await authedPage.goto("/kelola-alat")
    await expect(authedPage.getByText("Tn. Joko Widodo (Pasien Tes 1)").first()).toBeVisible({ timeout: 10000 })

    await authedPage.locator("button:has-text('Pasang Alat di Bed Ini')").first().click()
    await authedPage.getByRole("button", { name: "Hitungan Kali", exact: true }).click()

    // Verifikasi input tanggal di sebelah kiri dan input jam tindakan langsung tampil (default jam sekarang & bisa diedit)
    const dateInput = authedPage.locator("input[type='date']").first()
    await expect(dateInput).toBeVisible()
    const todayDateVal = await dateInput.inputValue()
    expect(todayDateVal).toBeTruthy()

    const timeInput = authedPage.locator("input[type='time']").first()
    await expect(timeInput).toBeVisible()
    await expect(authedPage.getByRole("button", { name: /Sesuai Jam Masuk/i })).toBeVisible()
    // Pastikan tidak ada tombol 'Input Rentang Jam Manual' maupun tombol terpisah 'Waktu Sekarang'
    await expect(authedPage.getByRole("button", { name: "Input Rentang Jam Manual" })).not.toBeVisible()
    await expect(authedPage.getByRole("button", { name: "Waktu Sekarang", exact: true })).not.toBeVisible()

    // Input jam tindakan dapat diedit langsung
    await timeInput.fill("14:30")

    await authedPage.getByRole("button", { name: "Simpan & Pasang Alat" }).click()
    await expect(authedPage.getByRole("heading", { name: "Catat & Pasang Alat Medis HCU" })).not.toBeVisible()

    // Verifikasi jam tindakan yang diedit muncul pada panel bed
    const bedPanel = authedPage.locator("#detail-bed-panel")
    await expect(bedPanel.getByText("14:30 WIB").first()).toBeVisible()
  })

  test("Pencarian Alat Medis (Hitungan Kali) melalui Searchable Dropdown", async ({ authedPage }) => {
    await authedPage.goto("/kelola-alat")
    await expect(authedPage.getByText("Tn. Joko Widodo (Pasien Tes 1)").first()).toBeVisible({ timeout: 10000 })

    await authedPage.locator("button:has-text('Pasang Alat di Bed Ini')").first().click()
    await authedPage.getByRole("button", { name: "Hitungan Kali", exact: true }).click()

    // Ketik pada dropdown combobox untuk mencari alat medis
    const toolInput = authedPage.locator("input[data-slot='combobox-tool-input']").first()
    await expect(toolInput).toBeVisible()
    await toolInput.click()
    await toolInput.fill("GDS")

    // Klik hasil pencarian 'Alat Cek Gula Darah (GDS)'
    const option = authedPage.getByRole("button", { name: /Alat Cek Gula Darah \(GDS\)/i }).first()
    await expect(option).toBeVisible()
    await option.click()

    // Simpan alat tindakan
    await authedPage.getByRole("button", { name: "Simpan & Pasang Alat" }).click()
    await expect(authedPage.getByRole("heading", { name: "Catat & Pasang Alat Medis HCU" })).not.toBeVisible()

    const bedPanel = authedPage.locator("#detail-bed-panel")
    await expect(bedPanel.getByText(/Alat Cek Gula Darah/i).first()).toBeVisible()
  })
})
