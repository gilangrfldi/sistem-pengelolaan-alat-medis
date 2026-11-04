import { test, expect } from "./fixtures/auth.fixture"
import { seedInitialPatients, clearAllTestData } from "./helpers/seed-data"

test.describe("CUJ-2: Manajemen Pasien HCU (Kelola Pasien)", () => {
  test.beforeEach(async ({ authedPage }) => {
    // Siapkan data awal pasien uji coba
    await seedInitialPatients(authedPage)
  })

  test.afterEach(async ({ authedPage }) => {
    // Bersihkan data tes setelah tiap skenario
    await clearAllTestData(authedPage)
  })

  test("Menampilkan daftar pasien aktif yang telah terdaftar di HCU", async ({ authedPage }) => {
    await authedPage.goto("/kelola-pasien")
    await authedPage.waitForLoadState("domcontentloaded")

    // Memverifikasi data pasien awal dari seeding muncul di tabel
    const patientRow = authedPage.locator("tr", { hasText: "Tn. Joko Widodo (Pasien Tes 1)" })
    await expect(patientRow).toBeVisible({ timeout: 10000 })
    await expect(patientRow.getByText("99010203")).toBeVisible()
    await expect(patientRow.getByText("Bed 01")).toBeVisible()
    await expect(patientRow.getByText("Perawatan Total")).toBeVisible()
  })

  test("Pencarian pasien aktif berdasarkan nama dan no. RM", async ({ authedPage }) => {
    await authedPage.goto("/kelola-pasien")
    await expect(authedPage.getByText("Tn. Joko Widodo (Pasien Tes 1)")).toBeVisible({ timeout: 10000 })

    const searchInput = authedPage.getByPlaceholder("Cari nama, RM, bed...")
    await searchInput.fill("99010203")

    // Hanya Pasien Tes 1 yang tampil
    await expect(authedPage.getByText("Tn. Joko Widodo (Pasien Tes 1)")).toBeVisible()
    await expect(authedPage.getByText("Ny. Megawati (Pasien Tes 2)")).not.toBeVisible()

    // Bersihkan pencarian, kedua pasien kembali terlihat
    await searchInput.clear()
    await expect(authedPage.getByText("Ny. Megawati (Pasien Tes 2)")).toBeVisible()
  })

  test("Filter pasien berdasarkan klasifikasi tingkat perawatan", async ({ authedPage }) => {
    await authedPage.goto("/kelola-pasien")
    await expect(authedPage.getByText("Tn. Joko Widodo (Pasien Tes 1)")).toBeVisible({ timeout: 10000 })

    const filterSelect = authedPage.locator("select").first()
    // Filter hanya Perawatan Parsial
    await filterSelect.selectOption("parsial")
    await expect(authedPage.getByText("Ny. Megawati (Pasien Tes 2)")).toBeVisible()
    await expect(authedPage.getByText("Tn. Joko Widodo (Pasien Tes 1)")).not.toBeVisible()

    // Kembalikan ke Semua Perawatan
    await filterSelect.selectOption("semua")
    await expect(authedPage.getByText("Tn. Joko Widodo (Pasien Tes 1)")).toBeVisible()
  })

  test("Happy Path: Registrasi Pasien Masuk Baru ke Bed Kosong", async ({ authedPage }) => {
    await authedPage.goto("/kelola-pasien")
    await authedPage.waitForLoadState("domcontentloaded")

    // Buka modal registrasi pasien
    const addBtn = authedPage.getByTestId("btn-pasien-masuk").or(authedPage.getByRole("button", { name: /Pasien Masuk/i }))
    await addBtn.first().click()
    await expect(authedPage.getByRole("heading", { name: "Registrasi Pasien Masuk HCU" })).toBeVisible()

    // Pilih Bed 05 yang kosong (format tampilan tombol: "B-05")
    const bedButton = authedPage.getByTestId("bed-btn-bed-05").or(authedPage.locator("button:has-text('B-05'), button:has-text('Bed 05')"))
    await bedButton.first().click()

    // Pilih panggilan Tn.
    await authedPage.getByRole("button", { name: /Tn\. \(Laki-laki\)/i }).click()

    // Isi Nama Lengkap Pasien
    await authedPage.getByPlaceholder("Nama lengkap pasien...").fill("Ahmad Fauzi")

    // Isi Nomor Rekam Medis (RM)
    await authedPage.getByPlaceholder("Contoh: 0102098 (maks 10 digit)").fill("12345678")

    // Pilih klasifikasi Perawatan Total
    await authedPage.getByRole("button", { name: "Perawatan Total" }).click()

    // Klik Simpan Pasien Masuk
    await authedPage.getByRole("button", { name: "Simpan Pasien Masuk" }).click()

    // Modal tertutup dan pasien baru tampil di halaman
    await expect(authedPage.getByRole("heading", { name: "Registrasi Pasien Masuk HCU" })).not.toBeVisible()
    await expect(authedPage.getByText("Tn. Ahmad Fauzi")).toBeVisible({ timeout: 10000 })
  })

  test("Failure State: Validasi Form Registrasi (Bed & RM Wajib Diisi)", async ({ authedPage }) => {
    await authedPage.goto("/kelola-pasien")
    const addBtn = authedPage.getByTestId("btn-pasien-masuk").or(authedPage.getByRole("button", { name: /Pasien Masuk/i }))
    await addBtn.first().click()

    // Langsung submit tanpa mengisi nama
    await authedPage.getByRole("button", { name: "Simpan Pasien Masuk" }).click()

    // Muncul pesan validasi error
    const errorBanner = authedPage.locator(".bg-red-50, [class*='text-red-700']")
    await expect(errorBanner.first()).toBeVisible()
  })

  test("Failure State: Bed yang sudah terisi pasien lain tidak bisa dipilih", async ({ authedPage }) => {
    await authedPage.goto("/kelola-pasien")
    const addBtn = authedPage.getByTestId("btn-pasien-masuk").or(authedPage.getByRole("button", { name: /Pasien Masuk/i }))
    await addBtn.first().click()

    // Bed 01 sudah terisi oleh Pasien Tes 1 dari seed data (format tampilan tombol: "B-01")
    const occupiedBed01 = authedPage.getByTestId("bed-btn-bed-01").or(authedPage.locator("button:has-text('B-01'), button:has-text('Bed 01')"))
    await expect(occupiedBed01.first()).toBeDisabled()
  })

  test("Happy Path: Ubah / Edit Data Pasien Aktif", async ({ authedPage }) => {
    await authedPage.goto("/kelola-pasien")
    await expect(authedPage.getByText("Tn. Joko Widodo (Pasien Tes 1)")).toBeVisible({ timeout: 10000 })

    // Klik tombol Edit pada baris pasien Joko Widodo
    const patientRow = authedPage.locator("tr", { hasText: "Tn. Joko Widodo (Pasien Tes 1)" })
    await patientRow.getByRole("button", { name: /Edit/i }).click()

    // Modal Edit terbuka
    await expect(authedPage.getByRole("heading", { name: "Ubah Data Pasien" })).toBeVisible()

    // Ubah klasifikasi perawatan menjadi Perawatan Parsial
    await authedPage.getByRole("button", { name: "Perawatan Parsial" }).click()

    // Klik Simpan Perubahan
    await authedPage.getByRole("button", { name: "Simpan Perubahan" }).click()

    // Modal tertutup dan data terbarui
    await expect(authedPage.getByRole("heading", { name: "Ubah Data Pasien" })).not.toBeVisible()
    await expect(patientRow.getByText("Perawatan Parsial")).toBeVisible({ timeout: 10000 })
  })

  test("Happy Path: Pemulangan Pasien (BLPL) memindahkan pasien ke tab riwayat keluar", async ({ authedPage }) => {
    await authedPage.goto("/kelola-pasien")
    await expect(authedPage.getByText("Tn. Joko Widodo (Pasien Tes 1)")).toBeVisible({ timeout: 10000 })

    // Klik tombol Pulangkan pada baris pasien Joko Widodo
    const patientRow = authedPage.locator("tr", { hasText: "Tn. Joko Widodo (Pasien Tes 1)" })
    await patientRow.getByRole("button", { name: /Pulangkan/i }).click()

    // Modal konfirmasi pemulangan muncul
    await expect(authedPage.getByRole("heading", { name: "Konfirmasi Pemulangan Pasien" })).toBeVisible()

    // Konfirmasi pulangkan pasien
    await authedPage.getByRole("button", { name: "Konfirmasi Pulangkan" }).click()

    // Modal tertutup
    await expect(authedPage.getByRole("heading", { name: "Konfirmasi Pemulangan Pasien" })).not.toBeVisible()

    // Beralih ke tab Pasien Keluar (BLPL)
    const tabKeluar = authedPage.getByRole("button", { name: /Pasien Keluar \(BLPL\)/i })
    await tabKeluar.click()

    // Memverifikasi pasien muncul di tabel riwayat keluar
    const dischargedRow = authedPage.locator("tr", { hasText: "Tn. Joko Widodo (Pasien Tes 1)" })
    await expect(dischargedRow).toBeVisible({ timeout: 10000 })
    await expect(dischargedRow.getByText("Boleh Pulang (Sembuh)")).toBeVisible()
  })
})
