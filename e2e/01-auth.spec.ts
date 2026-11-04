import { test as baseTest, expect } from "@playwright/test"
import { test as authTest } from "./fixtures/auth.fixture"

baseTest.describe("CUJ-1: Autentikasi & Guard Akses Sesi", () => {
  baseTest("Unauthenticated user dialihkan ke /masuk saat membuka /beranda", async ({ page }) => {
    // Pastikan tidak ada sesi
    await page.goto("/beranda")
    await expect(page).toHaveURL(/\/masuk/)
  })

  baseTest("Unauthenticated user dialihkan ke /masuk saat membuka /kelola-pasien", async ({ page }) => {
    await page.goto("/kelola-pasien")
    await expect(page).toHaveURL(/\/masuk/)
  })

  baseTest("Gagal login dengan kata sandi salah menampilkan pesan error", async ({ page }) => {
    await page.goto("/masuk")
    await expect(page.getByRole("heading", { name: "Masuk", exact: true })).toBeVisible()

    // Isi kredensial salah
    await page.getByPlaceholder("Email terdaftar").fill("wrong.user@rsud-welasasih.id")
    await page.getByPlaceholder("Kata Sandi", { exact: true }).fill("salahPassword123")
    await page.getByRole("button", { name: "MASUK", exact: true }).click()

    // Memverifikasi munculnya peringatan error autentikasi
    const errorAlert = page.locator(".bg-red-50, [class*='text-red']")
    await expect(errorAlert.first()).toBeVisible({ timeout: 10000 })
  })

  baseTest("Bisa berpindah antara form Masuk dan Daftar", async ({ page }) => {
    await page.goto("/masuk")
    await expect(page.getByRole("heading", { name: "Masuk", exact: true })).toBeVisible()

    // Klik tombol DAFTAR di panel animasi geser desktop (atau fallback mobile)
    const switchButton = page.getByTestId("switch-to-signup")
    if (await switchButton.isVisible()) {
      await switchButton.click()
    } else {
      await page.locator("button:has-text('Daftar sekarang')").click()
    }

    await expect(page.getByRole("heading", { name: "Buat Akun" })).toBeVisible()
    await expect(page.getByPlaceholder("Masukkan Nama Lengkap")).toBeVisible()
  })

  baseTest("Form registrasi memvalidasi batas minimal kata sandi dan kriteria keamanan", async ({ page }) => {
    await page.goto("/daftar")
    await page.getByPlaceholder("Masukkan Nama Lengkap").fill("Perawat Baru")
    await page.getByPlaceholder("Masukkan Email").fill("perawat.baru@rsud-welasasih.id")
    
    const passwordInput = page.getByPlaceholder("Masukkan Kata Sandi")
    await passwordInput.fill("123") // Di bawah 8 karakter

    // Kriteria checklist tampil dalam Bahasa Indonesia
    await expect(page.getByText("Minimal 8 karakter")).toBeVisible()
    await expect(page.getByText("Setidaknya satu huruf kecil")).toBeVisible()
    await expect(page.getByText("Setidaknya satu huruf besar")).toBeVisible()
    await expect(page.getByText("Setidaknya satu angka")).toBeVisible()
  })
})

authTest.describe("CUJ-1 (Lanjutan): Pengguna Terautentikasi & Logout", () => {
  authTest("Perawat aktif berhasil mengakses /beranda dengan sesi tersimpan", async ({ authedPage }) => {
    await authedPage.goto("/beranda")
    await expect(authedPage).toHaveURL(/\/beranda/)
    await expect(authedPage.getByRole("heading", { name: "Ringkasan Sensus & Pasien" })).toBeVisible()
  })

  authTest("Perawat dapat melakukan logout dan sesi dibersihkan", async ({ authedPage }) => {
    await authedPage.goto("/beranda")
    await authedPage.waitForLoadState("domcontentloaded")

    // Buka menu user di sidebar
    const userTrigger = authedPage.locator("button:has-text('perawat.test@rsud-welasasih.id')").filter({ visible: true }).first()
    await expect(userTrigger).toBeVisible({ timeout: 10000 })
    await userTrigger.click()

    // Klik tombol Keluar di menu dropdown
    const logoutBtn = authedPage.getByRole("menuitem", { name: "Keluar" }).or(authedPage.getByTestId("logout-button"))
    await expect(logoutBtn.first()).toBeVisible({ timeout: 10000 })
    await logoutBtn.first().click()

    await expect(authedPage).toHaveURL(/\/masuk/)
  })
})
