import { test, expect } from "./fixtures/auth.fixture"
import { seedInitialPatients, clearAllTestData } from "./helpers/seed-data"

test.describe("CUJ-6: Manajemen Katalog Master Alat Medis HCU", () => {
  test.beforeEach(async ({ authedPage }) => {
    await seedInitialPatients(authedPage)
  })

  test.afterEach(async ({ authedPage }) => {
    await clearAllTestData(authedPage)
  })

  test("Menampilkan tabel katalog master alat medis", async ({ authedPage }) => {
    await authedPage.goto("/kelola-alat/master-alat")
    await authedPage.waitForLoadState("domcontentloaded")

    // Verifikasi judul dan data awal master alat tampil
    await expect(authedPage.getByRole("heading", { name: /Master Alat Medis HCU/i })).toBeVisible({
      timeout: 10000,
    })
    await expect(authedPage.getByText("Infus Intravena perifer")).toBeVisible()
    await expect(authedPage.getByText("Syringe Pump")).toBeVisible()
  })

  test("Pencarian dan filter kategori master alat", async ({ authedPage }) => {
    await authedPage.goto("/kelola-alat/master-alat")
    await expect(authedPage.getByText("Infus Intravena perifer")).toBeVisible({ timeout: 10000 })

    // Cari alat "Syringe"
    const searchInput = authedPage.getByPlaceholder("Cari nama alat, subtipe...").or(authedPage.getByPlaceholder(/Cari nama alat/i)).first()
    await searchInput.fill("Syringe")

    await expect(authedPage.getByText("Syringe Pump")).toBeVisible()
    await expect(authedPage.getByText("Infus Intravena perifer")).not.toBeVisible()

    // Bersihkan pencarian
    await searchInput.clear()
    await expect(authedPage.getByText("Infus Intravena perifer")).toBeVisible()
  })

  test("Happy Path: Tambah Alat Medis Baru ke Master HCU", async ({ authedPage }) => {
    await authedPage.goto("/kelola-alat/master-alat")
    await authedPage.waitForLoadState("domcontentloaded")

    // Klik tombol Tambah Alat Baru
    await authedPage.getByRole("button", { name: "Tambah Alat Baru" }).click()

    // Modal tambah terbuka
    await expect(
      authedPage.getByRole("heading", { name: "Tambah Alat Medis Baru ke Master HCU" })
    ).toBeVisible()

    // Isi nama alat baru
    await authedPage
      .getByPlaceholder("Contoh: Ventilator Transport, Blood Warmer...")
      .fill("Defibrilator Portabel HCU")

    // Klik Simpan ke Katalog Master
    await authedPage.getByRole("button", { name: "Simpan ke Katalog Master" }).click()

    // Modal tertutup dan alat baru tampil di tabel
    await expect(
      authedPage.getByRole("heading", { name: "Tambah Alat Medis Baru ke Master HCU" })
    ).not.toBeVisible()
    await expect(authedPage.getByText("Defibrilator Portabel HCU")).toBeVisible({ timeout: 10000 })
  })

  test("Happy Path: Ubah / Edit Data Master Alat", async ({ authedPage }) => {
    await authedPage.goto("/kelola-alat/master-alat")
    await expect(authedPage.getByText("Syringe Pump")).toBeVisible({ timeout: 10000 })

    // Klik Edit pada baris Syringe Pump
    const row = authedPage.locator("tr", { hasText: "Syringe Pump" })
    await row.getByRole("button", { name: /Edit/i }).click()

    // Modal Edit terbuka
    await expect(authedPage.getByRole("heading", { name: "Ubah Data Alat Medis" })).toBeVisible()

    // Klik Simpan Perubahan
    await authedPage.getByRole("button", { name: "Perbarui Data Alat" }).click()

    // Modal tertutup
    await expect(authedPage.getByRole("heading", { name: "Ubah Data Alat Medis" })).not.toBeVisible()
    await expect(authedPage.getByText("Syringe Pump")).toBeVisible()
  })

  test("Happy Path: Hapus Alat dari Master Inventaris", async ({ authedPage }) => {
    await authedPage.goto("/kelola-alat/master-alat")
    await expect(authedPage.getByText("Syringe Pump")).toBeVisible({ timeout: 10000 })

    // Tambah alat sementara untuk dihapus
    await authedPage.getByRole("button", { name: "Tambah Alat Baru" }).click()
    await authedPage
      .getByPlaceholder("Contoh: Ventilator Transport, Blood Warmer...")
      .fill("Alat Uji Coba Hapus")
    await authedPage.getByRole("button", { name: "Simpan ke Katalog Master" }).click()
    await expect(authedPage.getByText("Alat Uji Coba Hapus")).toBeVisible({ timeout: 10000 })

    // Klik icon hapus pada alat uji coba
    const testRow = authedPage.locator("tr", { hasText: "Alat Uji Coba Hapus" })
    await testRow.locator("button[title*='Hapus master'], button:has-text('Hapus')").or(testRow.locator("button").last()).click()

    // Modal konfirmasi hapus terbuka
    await expect(
      authedPage.getByRole("heading", { name: "Hapus Alat dari Master Inventaris" })
    ).toBeVisible()

    // Klik tombol konfirmasi hapus
    await authedPage.getByRole("button", { name: "Ya, Hapus Alat" }).click()

    // Modal tertutup dan alat terhapus
    await expect(
      authedPage.getByRole("heading", { name: "Hapus Alat dari Master Inventaris" })
    ).not.toBeVisible()
    await expect(authedPage.getByText("Alat Uji Coba Hapus")).not.toBeVisible()
  })
})
